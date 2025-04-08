from flask import Flask, request, jsonify
import os, json
from fuzzywuzzy import fuzz
import pandas as pd
from datetime import datetime
import requests

app = Flask(__name__)

STATE_FILE = 'state.json'
CHATLOG_DIR = 'chatlogs'
DATA_FILE = 'data.csv'
FAQ_FILE = 'faq.csv'
FLOW_FILE = 'flow.json'
ADMIN_WA_ID = '919987257230@c.us'

if not os.path.exists(CHATLOG_DIR):
    os.makedirs(CHATLOG_DIR)

if not os.path.exists(STATE_FILE):
    with open(STATE_FILE, 'w') as f:
        json.dump({}, f)

# Load flow from CSV
df = pd.read_csv(DATA_FILE)
flow = df.to_dict(orient='records')
step_order = [q['step'] for q in flow]
step_map = {q['step']: q for q in flow}

# Save flow to JSON for server.js to use
with open(FLOW_FILE, 'w') as f:
    json.dump(flow, f, indent=2)

# Load FAQs from CSV
faq_df = pd.read_csv(FAQ_FILE) if os.path.exists(FAQ_FILE) else pd.DataFrame(columns=['key', 'response'])
FAQ_RESPONSES = dict(zip(faq_df['key'], faq_df['response']))

# Qualification criteria - will be updated from server.js
QUALIFICATION_CRITERIA = {
    'min_experience': 2,        # Minimum years of experience
    'min_ctc': 1,               # Minimum CTC in LPA
    'max_ctc': 6,               # Maximum CTC in LPA
    'notice_period_max': 60,    # Maximum notice period in days
    'min_incentive': 5000       # Minimum incentive amount
}

def load_state():
    with open(STATE_FILE) as f:
        return json.load(f)

def save_state(state):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)

def fuzzy_match(message, match_str):
    if not match_str or not isinstance(match_str, str):
        return True
    keywords = match_str.split('|')
    return any(fuzz.partial_ratio(message.lower(), k.lower()) > 70 for k in keywords)

def detect_faq(message):
    message = message.lower()
    for key in FAQ_RESPONSES:
        if key.lower() in message:
            return key
    return None

def is_qualified(answers):
    """Determine if a candidate is qualified based on their answers"""
    try:
        # Extract experience (convert to float)
        exp_str = answers.get('experience', '0')
        experience = float(''.join(c for c in exp_str if c.isdigit() or c == '.') or '0')
        
        # Extract CTC (convert to float)
        ctc_str = answers.get('ctc', '0')
        ctc = float(''.join(c for c in ctc_str if c.isdigit() or c == '.') or '0')
        
        # Extract notice period (convert to days)
        notice_str = answers.get('notice', '0')
        notice = 0
        
        # Handle different notice period formats (days, weeks, months)
        if 'day' in notice_str.lower():
            notice = float(''.join(c for c in notice_str if c.isdigit() or c == '.') or '0')
        elif 'week' in notice_str.lower():
            notice = float(''.join(c for c in notice_str if c.isdigit() or c == '.') or '0') * 7
        elif 'month' in notice_str.lower():
            notice = float(''.join(c for c in notice_str if c.isdigit() or c == '.') or '0') * 30
        else:
            # Default to days if no unit specified
            notice = float(''.join(c for c in notice_str if c.isdigit() or c == '.') or '0')
            
        # Extract incentive if available
        incentive_str = answers.get('incentive', '0')
        incentive = float(''.join(c for c in incentive_str if c.isdigit() or c == '.') or '0')
            
        # Check if candidate meets all criteria
        return (experience >= QUALIFICATION_CRITERIA['min_experience'] and 
                ctc >= QUALIFICATION_CRITERIA['min_ctc'] and 
                ctc <= QUALIFICATION_CRITERIA['max_ctc'] and 
                notice <= QUALIFICATION_CRITERIA['notice_period_max'] and
                (incentive >= QUALIFICATION_CRITERIA['min_incentive'] if 'incentive' in answers else True))
    except Exception as e:
        print(f"Error in qualification assessment: {e}")
        return False

@app.route('/ping', methods=['GET'])
def ping():
    return "pong", 200

@app.route('/update-criteria', methods=['POST'])
def update_criteria():
    """Update qualification criteria from Node.js server"""
    try:
        data = request.json
        if 'criteria' in data:
            criteria = data['criteria']
            
            # Update qualification criteria
            if 'experienceThreshold' in criteria:
                QUALIFICATION_CRITERIA['min_experience'] = criteria['experienceThreshold']
            
            if 'ctcThreshold' in criteria:
                QUALIFICATION_CRITERIA['min_ctc'] = criteria['ctcThreshold']
            
            if 'incentiveThreshold' in criteria:
                QUALIFICATION_CRITERIA['min_incentive'] = criteria['incentiveThreshold']
                
            return jsonify({"success": True, "criteria": QUALIFICATION_CRITERIA})
    except Exception as e:
        print(f"Error updating criteria: {e}")
        
    return jsonify({"success": False, "error": "Failed to update criteria"})

@app.route('/ask', methods=['POST'])
def ask():
    data = request.json
    sender = data['sender']
    message = data['message'].strip()

    state = load_state()
    user = state.get(sender, {"step": "interest", "answers": {}})
    current_step = user["step"]
    current_index = step_order.index(current_step)

    # Check for FAQ
    faq_key = detect_faq(message)
    if faq_key:
        reply = FAQ_RESPONSES[faq_key]
        # Don't advance step, just repeat current question after FAQ reply
        return jsonify({"reply": reply + "\n\n" + step_map[current_step]['ask']})

    # Step 1 fuzzy match
    if current_index == 0:
        match_str = step_map[current_step].get('match', '')
        if not fuzzy_match(message, match_str):
            return jsonify({"reply": None})

    # Save the user's response
    user["answers"][current_step] = message

    if current_index + 1 < len(step_order):
        # Move to next question
        next_step = step_order[current_index + 1]
        user["step"] = next_step
        next_question = step_map[next_step]["ask"]
        next_question = next_question.format(**user["answers"])  # dynamic fill
        reply = next_question
    else:
        # All questions done — check qualification and send to admin
        answers = user["answers"]
        qualified = is_qualified(answers)
        
        # Add qualification status to the answers
        answers['qualified'] = "Yes" if qualified else "No"
        answers['phone'] = sender.split('@')[0]  # Extract phone number
        
        # Format message with qualification status
        final_info = '\n'.join([f"{k}: {v}" for k, v in answers.items()])
        qualification_status = "✅ QUALIFIED" if qualified else "❌ NOT QUALIFIED"
        admin_message = f"{qualification_status}\nInfo from {sender}:\n{final_info}"

        try:
            # Save candidate to candidates.json if file exists
            candidates_file = 'candidates.json'
            candidates = []
            
            if os.path.exists(candidates_file):
                with open(candidates_file, 'r') as f:
                    candidates = json.load(f)
            
            # Create candidate record
            candidate = {
                'id': len(candidates) + 1,
                'name': answers.get('company', 'Unknown'),  # We don't collect name, use company as identifier
                'phone': sender.split('@')[0],
                'company': answers.get('company', 'Unknown'),
                'experience': answers.get('experience', 'Unknown'),
                'ctc': answers.get('ctc', 'Unknown'),
                'product': answers.get('product', 'Unknown'),
                'notice': answers.get('notice', 'Unknown'),
                'qualified': qualified,
                'date_added': datetime.now().isoformat(),
                'interview_scheduled': qualified  # Auto-schedule interview for qualified candidates
            }
            
            candidates.append(candidate)
            
            # Save updated candidates list
            with open(candidates_file, 'w') as f:
                json.dump(candidates, f, indent=2)
            
            # Notify admin
            requests.post("http://localhost:3000/notify", json={
                "message": admin_message
            })
        except Exception as e:
            print(f"[ERROR] Failed to process candidate: {e}")

        reply = "__COMPLETE__"  # for Node.js to detect end
        state.pop(sender, None)  # clear conversation state
        save_state(state)

        return jsonify({"reply": reply})

    state[sender] = user
    save_state(state)

    # Log message
    with open(f'{CHATLOG_DIR}/{sender}.txt', 'a', encoding='utf-8') as f:
        f.write(f"{datetime.now().isoformat()} - {current_step}: {message}\n")

    return jsonify({"reply": reply})

@app.route('/candidates', methods=['GET'])
def get_candidates():
    """API endpoint to get all candidates"""
    candidates_file = 'candidates.json'
    
    if not os.path.exists(candidates_file):
        return jsonify([])
    
    with open(candidates_file, 'r') as f:
        candidates = json.load(f)
    
    return jsonify(candidates)

@app.route('/qualified-candidates', methods=['GET'])
def get_qualified_candidates():
    """API endpoint to get only qualified candidates"""
    candidates_file = 'candidates.json'
    
    if not os.path.exists(candidates_file):
        return jsonify([])
    
    with open(candidates_file, 'r') as f:
        candidates = json.load(f)
    
    qualified = [c for c in candidates if c.get('qualified', False)]
    return jsonify(qualified)

if __name__ == '__main__':
    app.run(port=5000)
