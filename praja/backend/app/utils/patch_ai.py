import json
import re
import os
import httpx
from app.config import settings

def agentic_chat_with_groq(history: list, user_name: str = "Citizen") -> dict:
    if not settings.GROQ_API_KEY:
        return {"type": "question", "text": "Groq AI configuration is missing. Please contact administrator."}
        
    prompt = f\"\"\"You are PRAJA Bot, an official Voice Assistant for Indian Citizens to register grievances.
The citizen's name is {user_name}.
Your goal is to collect enough information to file a complete ticket via VOICE CONVERSATION.

Required Info:
1. Core Issue / Complaint (What is the problem?)
2. Exact Location / Landmark (Where is it? -> Must be a SPECIFIC area, street name, ward, or public landmark).

Instructions:
- Keep your responses VERY SHORT and CONVERSATIONAL (Max 15-20 words).
- If information is missing, ask for it politely.
- If the user provides a vague location, ask for a specific landmark or street.
- Once you have all details, respond with ONLY a valid JSON block.

JSON FORMAT:
  {{
    "status": "complete",
    "data": {{
      "category": "<Water Supply|Roads|Electricity|Sanitation|Drainage|Parks|Health|Education|General>",
      "priority": "<low|medium|high|critical>",
      "title": "<Short English title>",
      "sentiment": "<negative|neutral|positive>",
      "location": "<Extracted location>",
      "clean_description": "<Final summary of the issue>"
    }}
  }}
\"\"\"
    try:
        messages = [{"role": "system", "content": prompt}]
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
            
        groq_url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 350
        }
        
        with httpx.Client(timeout=10) as client:
            res = client.post(groq_url, headers=headers, json=payload)
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"].strip()
            
        if "{" in content and "category" in content:
            raw = re.sub(r"^`json\s*|^`\s*|`$", "", content, flags=re.MULTILINE).strip()
            try:
                data = json.loads(raw)
                return {"type": "complete", "data": data.get("data", data)}
            except Exception:
                pass
        return {"type": "question", "text": content}
    except Exception as e:
        return {"type": "question", "text": f"Error connecting to fast AI. Try again. {str(e)}"}
