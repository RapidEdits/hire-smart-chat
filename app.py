from flask import Flask, request, jsonify
import os, json
from fuzzywuzzy import fuzz
import pandas as pd
from datetime import datetime
import requests
import re

app = Flask(__name__)

STATE_FILE = 'state.json'
CHATLOG_DIR = 'chatlogs'
DATA_FILE = 'data.csv'
FAQ_FILE = 'faq.csv'
FLOW_FILE = 'flow.json'
ADMIN_WA_ID = '916200083509@c.us'

# Supabase URL for calling the edge function
SUPABASE_URL = "https://prhvwjzfpayezelqlmri.supabase.co"

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

# Updated qualification criteria with more specific rules
QUALIFICATION_CRITERIA = {
    'min_experience': 2,        # Minimum years of experience
    'min_ctc': 1,              # Minimum CTC in LPA
    'max_ctc': 6,              # Maximum CTC in LPA
    'notice_period_max': 60,   # Maximum notice period in days
    'allowed_products': ['home loan', 'housing loan', 'hl', 'loan against property', 'lap', 'mortgage loan']
}

INTEREST_KEYWORDS = [
    "yes", "interested", "sure", "okay", "ok", "haan", "ha", "theek hai", "chalega",
    "kyun nahi", "bilkul", "zaroor", "ready", "main hoon", "done", "i am interested"
]

ACKNOWLEDGEMENT_WORDS = [
    "ok", "okay", "fine", "no problem", "understood", "thanks", "thank you",
    "thik hai", "theek hai", "samajh gaya", "shukriya", "dhanyawaad"
]

UNEMPLOYED_PATTERNS = [
    r".*\b(berozgar|be rozgar|naukri nahi|bina kaam|kaam nahi karta|kaam nahi kar raha|no job|not working|currently no job|jobless|main unemployed hoon|main job nahi kar raha|job nahi hai|kahi kaam nahi karta hu|kahi nahi|kaam nahi karta hu)\b.*"
]

FRESHER_KEYWORDS = [
    "fresher", "koi anubhav nahi", "no experience", "0 years", "zero experience", "abhi graduate kiya hai"
]

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
    return any(fuzz.partial_ratio(message.lower(), k.lower()) > 80 for k in keywords)

def detect_faq(message):
    message = message.lower()
    for key, response in FAQ_RESPONSES.items():
        variants = [key.lower()]
        if key.lower() == "ctc":
            variants += ["package", "salary", "pay", "ctc kya hai", "kitni salary", "paise", "compensation"]
        elif key.lower() == "location":
            variants += ["branch", "location", "job location", "kahan", "place"]
        elif key.lower() == "profile":
            variants += ["role", "position", "job role", "kya kaam hoga", "kaunsa role"]
        elif key.lower() == "company":
            variants += ["company", "kaunsi company", "organization", "employer"]
        elif key.lower() == "work from home":
            variants += ["wfh", "work from home", "remote", "ghar se kaam", "ghar se"]
        for v in variants:
            if fuzz.partial_ratio(message, v) > 90:
                return key
    return None

def is_unemployed(message):
    message = message.lower().strip()
    clean = re.sub(r'[^\w\s]', '', message)
    return any(re.match(p, clean) for p in UNEMPLOYED_PATTERNS)

def is_fresher(message):
    return any(k in message.lower() for k in FRESHER_KEYWORDS)

def detect_interest(message):
    return any(k in message.lower() for k in INTEREST_KEYWORDS)

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
        
        if 'day' in notice_str.lower():
            notice = float(''.join(c for c in notice_str if c.isdigit() or c == '.') or '0')
        elif 'week' in notice_str.lower():
            notice = float(''.join(c for c in notice_str if c.isdigit() or c == '.') or '0') * 7
        elif 'month' in notice_str.lower():
            notice = float(''.join(c for c in notice_str if c.isdigit() or c == '.') or '0') * 30
        else:
            notice = float(''.join(c for c in notice_str if c.isdigit() or c == '.') or '0')
        
        # Check product
        product = answers.get('product', '').lower()
        product_match = any(p in product for p in QUALIFICATION_CRITERIA['allowed_products'])
        
        # Check if candidate meets all criteria
        return (
            experience >= QUALIFICATION_CRITERIA['min_experience'] and 
            ctc >= QUALIFICATION_CRITERIA['min_ctc'] and 
            ctc <= QUALIFICATION_CRITERIA['max_ctc'] and 
            notice <= QUALIFICATION_CRITERIA['notice_period_max'] and
            product_match
        )
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

@app.route('/store-candidate', methods=['POST'])
def store_candidate():
    """Store candidate data from server.js"""
    try:
        data = request.json
        if not data or 'phone' not in data or 'answers' not in data:
            return jsonify({"success": False, "error": "Missing required fields"}), 400
            
        phone = data['phone']
        answers = data['answers']
        
        # Save to candidates.json for local backup
        if os.path.exists('candidates.json'):
            with open('candidates.json', 'r') as f:
                candidates = json.load(f)
        else:
            candidates = []
        
        # Check if candidate with this phone number already exists
        existing_candidate = next((c for c in candidates if c.get('phone') == phone.split('@')[0]), None)
        
        if existing_candidate:
            # Update existing candidate
            existing_candidate.update({
                'name': answers.get('company', 'Unknown'),
                'experience': answers.get('experience', 'Unknown'),
                'ctc': answers.get('ctc', 'Unknown'),
                'notice': answers.get('notice', 'Unknown'),
                'product': answers.get('product', 'Unknown'),
                'qualified': answers.get('qualified') == 'qualified',
                'date_updated': datetime.now().isoformat()
            })
        else:
            # Add new candidate
            candidates.append({
                'id': len(candidates) + 1,
                'name': answers.get('company', 'Unknown'),
                'phone': phone.split('@')[0],
                'company': answers.get('company', 'Unknown'),
                'experience': answers.get('experience', 'Unknown'),
                'ctc': answers.get('ctc', 'Unknown'),
                'product': answers.get('product', 'Unknown'),
                'notice': answers.get('notice', 'Unknown'),
                'qualified': answers.get('qualified') == 'qualified',
                'date_added': datetime.now().isoformat()
            })
        
        with open('candidates.json', 'w') as f:
            json.dump(candidates, f, indent=2)
        
        # Now try to store in Supabase directly
        try:
            # Importing within the function to avoid global imports
            import requests
            
            # Prepare data for Supabase
            clean_phone = phone.split('@')[0]
            
            # Make a request to our server.js endpoint that calls Supabase
            supabase_payload = {
                "phone": clean_phone,
                "name": answers.get('company', 'Unknown'), 
                "experience": answers.get('experience'),
                "ctc": answers.get('ctc'),
                "notice_period": answers.get('notice'),
                "qualification": 'qualified' if answers.get('qualified') == 'qualified' else 'not_qualified',
                "status": 'new'
            }
            
            response = requests.post(
                "http://localhost:3000/supabase-store",
                json=supabase_payload
            )
            
            if response.status_code != 200:
                print(f"Error storing in Supabase: {response.text}")
        
        except Exception as e:
            print(f"Error storing candidate in Supabase: {e}")
        
        return jsonify({"success": True, "message": "Candidate stored successfully"})
            
    except Exception as e:
        print(f"Error in store_candidate: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/ask', methods=['POST'])
def ask():
    data = request.json
    sender = data['sender']
    message = data['message'].strip()

    state = load_state()
    user = state.get(sender, {"step": "interest", "answers": {}, "flags": {}})

    # Store conversation history for AI context
    conversation_history = user.get('conversation_history', [])
    
    # Check if we should use Mistral AI instead of rule-based responses
    use_mistral = os.environ.get('USE_MISTRAL', 'false').lower() == 'true'
    
    if use_mistral:
        try:
            # Prepare flow and FAQ data
            with open(DATA_FILE, 'r') as f:
                flow_data = f.read()
                
            with open(FAQ_FILE, 'r') as f:
                faq_data = f.read()
            
            # Add the user message to conversation history
            conversation_history.append({"role": "user", "content": message})
            
            # Call Mistral edge function
            response = requests.post(
                f"{SUPABASE_URL}/functions/v1/mistral-chat",
                json={
                    "message": message,
                    "sender": sender,
                    "conversationHistory": conversation_history
                }
            )
            
            if response.status_code == 200:
                mistral_reply = response.json().get('reply')
                
                # Add AI response to conversation history
                conversation_history.append({"role": "assistant", "content": mistral_reply})
                
                # Limit conversation history to last 10 messages
                if len(conversation_history) > 10:
                    conversation_history = conversation_history[-10:]
                
                # Update user state
                user['conversation_history'] = conversation_history
                state[sender] = user
                save_state(state)
                
                # Log the conversation
                with open(f'{CHATLOG_DIR}/{sender}.txt', 'a', encoding='utf-8') as f:
                    f.write(f"{datetime.now().isoformat()} - User: {message}\n")
                    f.write(f"{datetime.now().isoformat()} - AI: {mistral_reply}\n")
                
                return jsonify({"reply": mistral_reply})
            else:
                print(f"Error from Mistral edge function: {response.text}")
                # Fall back to rule-based approach
        except Exception as e:
            print(f"Error calling Mistral: {e}")
            # Fall back to rule-based approach

    # 🔁 Global "not interested" check
    if any(kw in message.lower() for kw in ["no", "not interested", "nahi", "na", "nope", "not intrested"]):
        user['flags']['blocked'] = True
        user['flags']['acknowledged'] = True
        state[sender] = user
        save_state(state)
        return jsonify({"reply": "Ok, No Problem"})

    if is_fresher(message):
        user['flags']['blocked'] = True
        user['flags']['acknowledged'] = False
        state[sender] = user
        save_state(state)
        return jsonify({"reply": "Sorry, currently we require candidates with experience."})

    if user.get('flags', {}).get('blocked'):
        if not user['flags'].get('acknowledged'):
            if any(word in message.lower() for word in ACKNOWLEDGEMENT_WORDS):
                user['flags']['acknowledged'] = True
                state[sender] = user
                save_state(state)
                return jsonify({"reply": "Thanks for understanding 🙏"})
        return jsonify({"reply": None})

    current_step = user["step"]
    current_index = step_order.index(current_step)

    # CTC detection
    ctc_amounts = re.findall(r'(\d+\.?\d*)\s*(lpa|l|lakhs|k|₹|rs|inr)?', message.lower())
    ctc_detected = any(kw in message.lower() for kw in ["ctc", "lpa", "package", "salary", "lakhs", "₹", "rs", "pay", "paise"])
    if (ctc_detected and ctc_amounts):
        try:
            raw_ctc = float(ctc_amounts[0][0])
            if ctc_amounts[0][1] in ['k']:
                raw_ctc = raw_ctc / 100
            if raw_ctc >= 6:
                user['flags']['blocked'] = True
                user['flags']['acknowledged'] = False
                state[sender] = user
                save_state(state)
                return jsonify({"reply": "Sorry, our maximum CTC range is up to 6 LPA only."})
            else:
                if current_step == 'ctc':
                    user['answers']['ctc'] = message
                state[sender] = user
                save_state(state)
        except:
            pass

    # FAQ detection
    if not (ctc_detected and ctc_amounts):
        faq_key = detect_faq(message)
        if faq_key:
            reply = FAQ_RESPONSES[faq_key]
            return jsonify({"reply": reply + "\n\n" + step_map[current_step]['ask']})

    # Step-wise logic
    if current_step == 'interest':
        match_str = step_map[current_step].get('match', '')
        if detect_interest(message):
            pass  # continue normally
        elif any(k in message.lower() for k in ["no", "not interested", "nahi", "na", "nope"]):
            user['flags']['blocked'] = True
            user['flags']['acknowledged'] = True
            state[sender] = user
            save_state(state)
            return jsonify({"reply": "Ok, No Problem"})
        elif not fuzzy_match(message, match_str):
            return jsonify({"reply": None})

    if current_step == 'company':
        clean_msg = re.sub(r'[^\w\s]', '', message.lower().strip())
        if is_unemployed(clean_msg):
            user['flags']['unemployed'] = True
            user['answers']['company'] = message
            user['step'] = 'prev_company'
            state[sender] = user
            save_state(state)
            return jsonify({"reply": step_map['prev_company']['ask']})
        else:
            user['answers']['company'] = message

    if current_step == 'prev_company':
        if is_unemployed(message):
            return jsonify({"reply": "Please mention your previous company name."})

    if current_step == 'product':
        allowed_products = [
            'home loan', 'housing loan', 'hl', 'loan against property', 'lap', 'mortgage loan',
            'ghar ka loan', 'home finance', 'loan housing'
        ]
        message_lower = message.lower()
        if not any(p in message_lower for p in allowed_products):
            user['flags']['blocked'] = True
            user['flags']['acknowledged'] = False
            state[sender] = user
            save_state(state)
            return jsonify({"reply": "Sorry, currently we are only hiring for HL, LAP, Mortgage Loan profiles. We will get back to you if there's a fit in future."})

    user["answers"][current_step] = message

    # Move to next step
    next_index = current_index + 1
    while next_index < len(step_order):
        next_step = step_order[next_index]
        if next_step == 'notice' and user.get('flags', {}).get('unemployed'):
            next_index += 1
            continue
        if next_step == 'product' and user.get('flags', {}).get('unemployed'):
            reply = "Ok, Which product were you handling previously?"
        elif next_step == 'prev_company' and not user.get('flags', {}).get('unemployed'):
            next_index += 1
            continue
        else:
            raw_ask = step_map[next_step]["ask"]
            reply = raw_ask.format(**user["answers"])
        user["step"] = next_step
        break
    else:
        # All questions done — check qualification and save candidate data
        answers = user["answers"]
        qualified = is_qualified(answers)
        
        # Add qualification status to the answers
        answers['qualified'] = "Yes" if qualified else "No"
        answers['phone'] = sender.split('@')[0]
        
        try:
            # Save to candidates.json for local backup
            if os.path.exists('candidates.json'):
                with open('candidates.json', 'r') as f:
                    candidates = json.load(f)
            else:
                candidates = []
            
            candidate = {
                'id': len(candidates) + 1,
                'name': answers.get('company', 'Unknown'),
                'phone': sender.split('@')[0],
                'company': answers.get('company', 'Unknown'),
                'experience': answers.get('experience', 'Unknown'),
                'ctc': answers.get('ctc', 'Unknown'),
                'product': answers.get('product', 'Unknown'),
                'notice': answers.get('notice', 'Unknown'),
                'qualified': qualified,
                'date_added': datetime.now().isoformat()
            }
            
            candidates.append(candidate)
            
            with open('candidates.json', 'w') as f:
                json.dump(candidates, f, indent=2)
            
            # Create Supabase record
            response = requests.post(
                'http://localhost:3000/store-candidate',
                json={'phone': sender, 'answers': answers}
            )
            
            if response.status_code != 200:
                print(f"Error storing candidate in Supabase: {response.text}")
            
        except Exception as e:
            print(f"Error saving candidate data: {e}")
        
        # Format message with qualification status
        qualification_status = "✅ QUALIFIED" if qualified else "❌ NOT QUALIFIED"
        admin_message = f"{qualification_status}\nInfo from {sender}:\n"
        admin_message += "\n".join([f"{k}: {v}" for k, v in answers.items()])

        try:
            requests.post(
                "http://localhost:3000/notify",
                json={"to": ADMIN_WA_ID, "message": admin_message}
            )
        except Exception as e:
            print(f"Error notifying admin: {e}")

        reply = "__COMPLETE__"
        state.pop(sender, None)
        save_state(state)
        return jsonify({"reply": reply})

    state[sender] = user
    save_state(state)

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
