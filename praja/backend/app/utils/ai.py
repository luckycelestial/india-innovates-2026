import re
import json
import httpx
from groq import Groq
from app.config import settings

groq_client = Groq(api_key=settings.GROQ_API_KEY)

CATEGORIES = [
    "Water Supply", "Roads", "Electricity", "Sanitation",
    "Drainage", "Parks", "Health", "Education", "General"
]

def detect_language(text: str) -> str:
    """Detect language using Unicode script ranges."""
    if any('\u0900' <= c <= '\u097F' for c in text): return "Hindi"
    if any('\u0B80' <= c <= '\u0BFF' for c in text): return "Tamil"
    if any('\u0C00' <= c <= '\u0C7F' for c in text): return "Telugu"
    if any('\u0C80' <= c <= '\u0CFF' for c in text): return "Kannada"
    if any('\u0D00' <= c <= '\u0D7F' for c in text): return "Malayalam"
    if any('\u0980' <= c <= '\u09FF' for c in text): return "Bengali"
    return "English"

def translate_to_english(text: str) -> str:
    """Uses Bhashini for Translating Text to English for consistency."""
    lang = detect_language(text)
    if lang == "English":
        return text
        
    bhashini_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
    bhashini_lang_mapping = {
        "Hindi": "hi", "Tamil": "ta", "Telugu": "te", "Kannada": "kn", 
        "Malayalam": "ml", "Bengali": "bn"
    }
    source_lang = bhashini_lang_mapping.get(lang, "hi")

    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": "en"
                    },
                    "serviceId": "ai4bharat/indictrans-v2-all-gpu--t4"
                }
            }
        ],
        "inputData": {
            "input": [{"source": text}]
        }
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": settings.BHASHINI_API_KEY
    }

    try:
        with httpx.Client(timeout=10) as client:
            res = client.post(bhashini_url, json=payload, headers=headers)
            if res.status_code == 200:
                data = res.json()
                return data["pipelineResponse"][0]["output"][0]["target"]
    except Exception as e:
        print(f"Bhashini failed: {e}")
    return text

def agentic_chat_with_groq(history: list, user_name: str = "Citizen") -> dict:
    prompt = f"""You are PRAJA Bot, an official Voice Assistant for Indian Citizens to register grievances.
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
"""
    messages = [{"role": "system", "content": prompt}] + history
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=350,
            temperature=0.2,
        )
        content = (response.choices[0].message.content or "").strip()
        
        if "{" in content and "category" in content:
            raw = re.sub(r"^```json\s*|^```\s*|```$", "", content, flags=re.MULTILINE).strip()
            match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
            if match:
                raw = match.group(0)
            data = json.loads(raw)
            res_data = data.get("data", data)
            if isinstance(res_data, dict):
                if res_data.get("category") not in CATEGORIES:
                    res_data["category"] = "General"
                return {"type": "complete", "data": res_data}
            return {"type": "question", "text": content}
        else:
            return {"type": "question", "text": content}
    except Exception as e:
        print("Groq Error:", e)
        return {"type": "question", "text": "I'm having trouble understanding. Could you please repeat your issue and location?"}

def classify_with_groq(text: str) -> dict:
    try:
        prompt = f"""Classify this grievance, responding ONLY with valid JSON.
Text: "{text}"
JSON Format:
{{"category": "Water Supply|Roads|Electricity|Sanitation|General", "priority": "low|medium|high|critical", "sentiment": "negative|neutral|positive", "title": "...", "clean_description": "..."}}
"""
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        content = (response.choices[0].message.content or "").strip()
        raw = re.sub(r"^```json\s*|^```\s*|```$", "", content, flags=re.MULTILINE).strip()
        match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise Exception("No JSON found")
    except Exception:
        return {"category": "General", "priority": "medium", "sentiment": "neutral", "title": text[:40], "clean_description": text}
