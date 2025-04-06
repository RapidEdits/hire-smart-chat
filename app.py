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

@app.route('/ask', methods=['POST'])
def ask():
    data = request.json
    sender = data['sender']
    message = data['message'].strip()

    state = load_state()
    user = state.get(sender, {"step": "interest", "answers": {}})
    current_step = user["step"]
    current_index = step_order.index(current_step)

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
        # All questions done — send to admin
        final_info = '\n'.join([f"{k}: {v}" for k, v in user["answers"].items()])
        admin_message = f"✅ Info collected from {sender}:\n{final_info}"

        try:
            requests.post("http://localhost:3000/notify", json={
                "message": admin_message  # ✅ Fixed: removed "to"
            })
        except Exception as e:
            print(f"[ERROR] Failed to notify admin: {e}")

        reply = None  # Don't reply to user
        state.pop(sender, None)  # clear conversation state
        save_state(state)

        return jsonify({"reply": "__COMPLETE__"})  # for Node.js to detect end

    state[sender] = user
    save_state(state)

    # Log message
    with open(f'{CHATLOG_DIR}/{sender}.txt', 'a', encoding='utf-8') as f:
        f.write(f"{datetime.now().isoformat()} - {current_step}: {message}\n")

    return jsonify({"reply": reply})

if __name__ == '__main__':
    app.run(port=5000)
