import re
import json

with open("praja/backend/app/routes/whatsapp.py", "r", encoding="utf-8") as f:
    content = f.read()

# Replace classify_with_groq with agentic_chat_with_groq
old_func = re.search(r"def classify_with_groq\(text: str\) -> dict:.*?return {\"category\": \"General\", \"priority\": \"medium\", \"title\": text\[:50\], \"sentiment\": \"negative\", \"clean_description\": text}", content, re.DOTALL)

new_func = """def agentic_chat_with_groq(history: list) -> dict:
    prompt = \"\"\"You are PRAJA Bot, an official WhatsApp Assistant for Indian Citizens to register grievances.
Your goal is to collect enough information to file a complete ticket.

Required Info:
1. Core Issue / Complaint (What is the problem?)
2. Exact Location / Landmark (Where is it?)
3. Name of the person reporting (Who is reporting?)

Instructions:
- If ANY of the required info is missing or ambiguous, ask a polite, short question in the language the user is speaking to get the missing info. Respond with ONLY normal text (NO JSON).
- Only when you have ALL 3 pieces of information, and feel ready to file the ticket, you must respond with ONLY a valid JSON block and absolutely no other text.

JSON FORMAT:
{
  "status": "complete",
  "data": {
    "category": "<Water Supply|Roads|Electricity|Sanitation|Drainage|Parks|Health|Education|General>",
    "priority": "<low|medium|high|critical>",
    "title": "<accurate 5-8 word English title capturing the true meaning>",
    "sentiment": "<negative|neutral|positive>",
    "location": "<Extracted location>",
    "clean_description": "<Include FULL details of issue, name, and location. Formatting Rules: 1. If English: return ONLY the English text. 2. If ANY other language: return exactly '[Native Script] (English: [Translation])'. 3. Correct any phonetic typos.>"
  }
}

Rules for Classification:
- Any mention of suicide, severe domestic abuse/toxicity, or self-harm -> priority=critical, category=Health or General
- Any death threat or threat to public figure -> priority=critical, category=General
- Sexual assault / abduction -> priority=critical, category=General
\"\"\"
    messages = [{"role": "system", "content": prompt}] + history
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=350,
            temperature=0.2,
        )
        content = (response.choices[0].message.content or "").strip()
        
        if "{" in content and "category" in content and "clean_description" in content:
            raw = re.sub(r"^```json\s*|^```\s*|```$", "", content, flags=re.MULTILINE).strip()
            match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
            if match:
                raw = match.group(0)
            data = json.loads(raw)
            res_data = data.get("data", data)
            if res_data.get("category") not in CATEGORIES:
                res_data["category"] = "General"
            if res_data.get("priority") not in ["low", "medium", "high", "critical"]:
                res_data["priority"] = "medium"
            return {"type": "complete", "data": res_data}
        else:
            return {"type": "question", "text": content}
    except Exception as e:
        print("Groq Error:", e)
        return {"type": "question", "text": "I'm having trouble processing that. Could you please state your issue, name, and location clearly?"}"""

if old_func:
    content = content.replace(old_func.group(0), new_func)
else:
    print("Could not find old classify_with_groq")

# Now handle _handle_message changes 
old_handle = re.search(r"    user_id = get_or_create_user\(sender, sb\).*?resp\.message\(reply\)\n    return", content, re.DOTALL)

new_handle = """    user_id = get_or_create_user(sender, sb)

    # Check if user has an ongoing draft ticket
    drafts = sb.table("grievances").select("id, resolution_note").eq("citizen_id", user_id).eq("status", "draft").execute()
    
    if drafts.data:
        draft = drafts.data[0]
        history_str = draft.get("resolution_note")
        try:
            history = json.loads(history_str) if history_str else []
        except:
            history = []
        
        history.append({"role": "user", "content": text})
        groq_resp = agentic_chat_with_groq(history)
        
        if groq_resp["type"] == "question":
            ans = groq_resp["text"]
            history.append({"role": "assistant", "content": ans})
            sb.table("grievances").update({"resolution_note": json.dumps(history)}).eq("id", draft["id"]).execute()
            resp.message(ans)
            return
        elif groq_resp["type"] == "complete":
            classification = groq_resp["data"]
            final_text = classification.get("clean_description", text)
            location_text = classification.get("location", "Not specified")
            lang = detect_language(final_text)
            
            sb.table("grievances").update({
                "title":        classification.get("title", final_text[:80]),
                "description":  final_text,
                "ai_category":  classification.get("category", "General"),
                "ai_sentiment": classification.get("sentiment", "negative"),
                "priority":     classification.get("priority", "medium"),
                "status":       "open",
                "resolution_note": None
            }).eq("id", draft["id"]).execute()
            
            g_rows = sb.table("grievances").select("tracking_id").eq("id", draft["id"]).execute()
            tracking_id = g_rows.data[0]["tracking_id"] if g_rows.data else "Unknown"
            
            prio = classification['priority']
            prio_label = {"low": "P3", "medium": "P2", "high": "P1", "critical": "P0"}.get(prio, "P2")
            sentiment = classification.get('sentiment', 'negative').title()
            sentiment_emoji = {"Negative": "😡", "Positive": "😄", "Neutral": "😐"}.get(sentiment, "💬")
            
            reply = (
                f"🤖 *AI Processing Complete*\\n"
                f"───────────────────\\n\\n"
                f"✅ Language: *{lang}*\\n"
                f"🏷️ Department: *{classification.get('category', 'General')}*\\n"
                f"⚡ Priority: *{prio.title()} ({prio_label})*\\n"
                f"📍 Location: *{location_text}*\\n"
                f"{sentiment_emoji} Sentiment: *{sentiment}*\\n\\n"
                f"───────────────────\\n"
                f"🆔 Ticket *{tracking_id}* created.\\n"
                f"📤 Routed to *{classification.get('category', 'General')} Department*.\\n"
                f"📲 Officer notified.\\n\\n"
                f"🎯 *SLA Timeline:* 72 hours to resolve\\n\\n"
                f"Track: reply *track {tracking_id}*"
            )
            resp.message(reply)
            return

    else:
        # No draft exists, start fresh
        history = [{"role": "user", "content": text}]
        groq_resp = agentic_chat_with_groq(history)
        
        if groq_resp["type"] == "question":
            ans = groq_resp["text"]
            history.append({"role": "assistant", "content": ans})
            
            tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"
            sb.table("grievances").insert({
                "tracking_id":  tracking_id,
                "citizen_id":   user_id,
                "title":        "Draft Ticket",
                "description":  text,
                "status":       "draft",
                "channel":      "whatsapp",
                "resolution_note": json.dumps(history)
            }).execute()
            resp.message(ans)
            return
        elif groq_resp["type"] == "complete":
            classification = groq_resp["data"]
            final_text = classification.get("clean_description", text)
            location_text = classification.get("location", "Not specified")
            lang = detect_language(final_text)
      
            tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"
            sb.table("grievances").insert({
                "tracking_id":  tracking_id,
                "citizen_id":   user_id,
                "title":        classification.get("title", final_text[:80]),
                "description":  final_text,
                "ai_category":  classification.get("category", "General"),
                "ai_sentiment": classification.get("sentiment", "negative"),
                "priority":     classification.get("priority", "medium"),
                "status":       "open",
                "channel":      "whatsapp",
            }).execute()
            
            prio = classification['priority']
            prio_label = {"low": "P3", "medium": "P2", "high": "P1", "critical": "P0"}.get(prio, "P2")
            sentiment = classification.get('sentiment', 'negative').title()
            sentiment_emoji = {"Negative": "😡", "Positive": "😄", "Neutral": "😐"}.get(sentiment, "💬")
            
            reply = (
                f"🤖 *AI Processing Complete*\\n"
                f"───────────────────\\n\\n"
                f"✅ Language: *{lang}*\\n"
                f"🏷️ Department: *{classification.get('category', 'General')}*\\n"
                f"⚡ Priority: *{prio.title()} ({prio_label})*\\n"
                f"📍 Location: *{location_text}*\\n"
                f"{sentiment_emoji} Sentiment: *{sentiment}*\\n\\n"
                f"───────────────────\\n"
                f"🆔 Ticket *{tracking_id}* created.\\n"
                f"📤 Routed to *{classification.get('category', 'General')} Department*.\\n"
                f"📲 Officer notified.\\n\\n"
                f"🎯 *SLA Timeline:* 72 hours to resolve\\n\\n"
                f"Track: reply *track {tracking_id}*"
            )
            resp.message(reply)
            return"""

if old_handle:
    content = content.replace(old_handle.group(0), new_handle)
else:
    print("Could not find old handle_message")
    
with open("praja/backend/app/routes/whatsapp.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched successfully")
