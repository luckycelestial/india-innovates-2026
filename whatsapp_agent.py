import os
import sys
import time
import requests
import json
from collections import deque
from neonize.client import NewClient
from neonize.events import ConnectedEv, MessageEv
from neonize.utils.jid import build_jid

# Reconfigure stdout/stderr to use utf-8 to prevent encoding crashes on Windows terminal
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Load .env.local file to retrieve environment variables
def load_env():
    env_path = ".env.local"
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    # Remove quotes if present
                    if v.startswith('"') and v.endswith('"'):
                        v = v[1:-1]
                    elif v.startswith("'") and v.endswith("'"):
                        v = v[1:-1]
                    os.environ[k] = v

load_env()

# Verify GROQ_API_KEY
api_key = os.environ.get("GROQ_API_KEY")

if not api_key:
    print("[ERROR] GROQ_API_KEY is not set in .env.local")
    sys.exit(1)

# In-memory dictionary mapping user JID to their conversation history
chat_histories = {}
# Keep track of recent messages sent by the bot to prevent self-triggering loop
sent_messages_cache = deque(maxlen=20)

SYSTEM_PROMPT = """You are PRAJA's interactive WhatsApp Citizen Complaint Registration Agent. Your job is to have a natural conversation with the citizen to register a civic complaint.

You MUST gather the following information step-by-step:
1. Title (brief summary of the issue, e.g. "Broken street light on Main Road")
2. Category (you must map their issue to exactly one of the following: "road", "water", "electricity", "sanitation", "streetlight", "drainage", "waste", "parks", "noise", "other")
3. Description (a detailed description, must be at least 20 characters long)
4. Location (Area, ward, or street where the issue is located)
5. Landmark (Optional, ask for it but let the user skip it if they want)
6. Priority (map to one of: "low", "medium", "high", "urgent")
7. Anonymous Submission (True/False - ask if they want to hide their name on the portal)

Conversational Guidelines:
- Keep it natural. Do NOT ask for everything at once. Ask for 1 or 2 items at a time (e.g., start by asking what the issue is, then ask where it is located, etc.).
- If the user provides multiple details in one message, parse them and update your internal state.
- Once you have collected ALL 7 details, display a clean, formatted summary of the details to the user and ask them to confirm by replying YES or CONFIRM.
- Once they confirm, you must append this exact command format on a new line at the very end of your message:
[SUBMIT_COMPLAINT] {"title": "...", "category": "...", "description": "...", "location": "...", "landmark": "...", "priority": "...", "is_anonymous": true/false}

Important: The JSON payload must match the keys exactly, be valid JSON, and use only double quotes.
"""

def get_ai_reply_with_history(user_message: str, chat_user: str) -> str:
    global chat_histories
    
    # Initialize history for new chat user
    if chat_user not in chat_histories:
        chat_histories[chat_user] = []
        
    # Allow resetting the state
    if user_message.strip().lower() in ["/reset", "/new", "reset"]:
        chat_histories[chat_user] = []
        return "Chat history reset! Let's start over. What issue would you like to report today?"

    chat_histories[chat_user].append({"role": "user", "content": user_message})
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + list(chat_histories[chat_user])
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": messages,
        "temperature": 0.5
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=25)
        if response.status_code == 200:
            data = response.json()
            reply = data["choices"][0]["message"]["content"].strip()
            chat_histories[chat_user].append({"role": "assistant", "content": reply})
            
            # Keep history bounded to avoid massive payload size
            if len(chat_histories[chat_user]) > 30:
                chat_histories[chat_user] = chat_histories[chat_user][-30:]
                
            return reply
        else:
            return f"Error: Groq API returned status {response.status_code}"
    except Exception as e:
        return f"Error: Failed to contact AI agent ({str(e)})"

def submit_to_local_db(data: dict):
    # Map category to department (matching getCategoryDept in frontend)
    category_depts = {
        'road': 'Public Works Department',
        'water': 'Water Supply Board',
        'electricity': 'Electricity Department',
        'sanitation': 'Sanitation Department',
        'streetlight': 'Street Lighting Division',
        'drainage': 'Storm Water Drains Department',
        'waste': 'Solid Waste Management',
        'parks': 'Parks & Gardens Department',
        'noise': 'Pollution Control Board',
        'other': 'General Administration',
    }
    category = data.get('category', 'other')
    dept = category_depts.get(category, 'General Administration')
    
    payload = {
        "title": data.get("title", "").strip(),
        "category": category,
        "description": data.get("description", "").strip(),
        "location": data.get("location", "").strip(),
        "landmark": data.get("landmark", "").strip() or None,
        "priority": data.get("priority", "medium"),
        "is_anonymous": bool(data.get("is_anonymous", False)),
        "submitted_by": None,
        "department": dept
    }

    url = "http://127.0.0.1:3000/api/db"
    headers = {
        "Content-Type": "application/json"
    }
    req_payload = {
        "action": "insert",
        "table": "complaints",
        "payload": payload,
        "single": True
    }
    
    try:
        response = requests.post(url, headers=headers, json=req_payload, timeout=20)
        if response.status_code in [200, 201]:
            res_data = response.json()
            if res_data and "data" in res_data:
                return res_data["data"], None
            return None, "Empty response from database insert."
        else:
            return None, f"Database insert failed (status {response.status_code}): {response.text}"
    except Exception as e:
        return None, f"Network error inserting to database: {str(e)}"

# Initialize Client
client = NewClient("whatsapp_session.db")

@client.event(ConnectedEv)
def on_connected(_: NewClient, __: ConnectedEv):
    print("\n[OK] Successfully connected to WhatsApp! Bot is active.")

@client.event(MessageEv)
def on_message(cl: NewClient, message: MessageEv):
    global chat_histories
    try:
        # Extract message text
        msg_body = message.Message
        if not msg_body:
            return

        text = None
        if msg_body.conversation:
            text = msg_body.conversation
        elif msg_body.extendedTextMessage and msg_body.extendedTextMessage.text:
            text = msg_body.extendedTextMessage.text

        if not text:
            return

        text_stripped = text.strip()

        # Check sender & chat JID
        chat_jid = message.Info.MessageSource.Chat
        sender_jid = message.Info.MessageSource.Sender

        chat_user = getattr(chat_jid, "User", str(chat_jid)) if chat_jid else "unknown"
        sender_user = getattr(sender_jid, "User", str(sender_jid)) if sender_jid else "unknown"
        device_id = getattr(sender_jid, "Device", 0) if sender_jid else 0
        is_from_me = getattr(message.Info, "IsFromMe", False)

        # Ignore group chats or newsletter broadcasts
        chat_server = getattr(chat_jid, "Server", "") if chat_jid else ""
        if chat_server not in ["s.whatsapp.net", "lid"]:
            return

        # Resolve LID JID to Phone Number if applicable for clean history key
        if chat_jid and chat_server == "lid":
            try:
                pn_jid = cl.get_pn_from_lid(chat_jid)
                if pn_jid and getattr(pn_jid, "User", None):
                    chat_user = pn_jid.User
            except Exception:
                pass

        # Log incoming event immediately for debugging
        with open("whatsapp_bot.log", "a", encoding="utf-8") as f:
            f.write(f"--- MSG EVENT ---\n")
            f.write(f"text: {text_stripped}\n")
            f.write(f"chat_user: {chat_user}\n")
            f.write(f"sender_user: {sender_user}\n")
            f.write(f"device_id: {device_id}\n")
            f.write(f"is_from_me: {is_from_me}\n")
            f.write(f"-----------------\n\n")
            f.flush()

        # Avoid loops: Ignore messages sent by our own account session
        if is_from_me:
            return

        # Avoid loops: Ignore if text is identical to a message the bot recently sent
        if text_stripped in sent_messages_cache:
            return

        print(f"\n[MSG] Message from {sender_user}: {text_stripped}")

        # Get response from Groq LLM (llama-3.3-70b-versatile)
        reply = get_ai_reply_with_history(text_stripped, chat_user)
        
        # Check if reply contains the special submit command
        if "[SUBMIT_COMPLAINT]" in reply:
            try:
                parts = reply.split("[SUBMIT_COMPLAINT]")
                confirm_prefix = parts[0].strip()
                json_str = parts[1].strip()
                
                # Send confirmation text if present
                if confirm_prefix:
                    cl.send_message(chat_jid, confirm_prefix)
                    sent_messages_cache.append(confirm_prefix)
                
                complaint_data = json.loads(json_str)
                
                # Submit to local database
                res, err = submit_to_local_db(complaint_data)
                if err:
                    err_msg = f"Failed to submit complaint to PRAJA database: {err}"
                    print(f"[ERROR] {err_msg}")
                    cl.send_message(chat_jid, f"⚠️ {err_msg}")
                    sent_messages_cache.append(f"⚠️ {err_msg}")
                else:
                    ticket_id = res.get("complaint_number", "PRJ-UNKNOWN")
                    success_msg = (
                        f"🎉 *Complaint Submitted Successfully!*\n\n"
                        f"🎫 *Ticket Number:* {ticket_id}\n"
                        f"📋 *Title:* {res.get('title')}\n"
                        f"🛣️ *Category:* {res.get('category')}\n"
                        f"📍 *Location:* {res.get('location')}\n"
                        f"🏢 *Department:* {res.get('department')}\n\n"
                        f"Thank you for raising this. We will assign it shortly."
                    )
                    print(f"[AI] AI Response: {success_msg}")
                    cl.send_message(chat_jid, success_msg)
                    sent_messages_cache.append(success_msg)
                    
                    # Clear history upon successful submission
                    chat_histories[chat_user] = []
            except Exception as ex:
                print(f"[ERROR] Error parsing submission JSON: {ex}")
                error_msg = "⚠️ Error processing submission details. Please start over by typing reset."
                cl.send_message(chat_jid, error_msg)
                sent_messages_cache.append(error_msg)
        else:
            print(f"[AI] AI Response: {reply}")
            sent_messages_cache.append(reply)
            cl.send_message(chat_jid, reply)

    except Exception as e:
        print(f"[ERROR] Error handling message: {e}", file=sys.stderr)

if __name__ == "__main__":
    print("[INFO] Starting WhatsApp AI Agent...")
    print("[INFO] If QR code appears, scan it using WhatsApp linked devices.")
    print("[INFO] Agent is locked to respond to all individual private chats.")
    client.connect()
