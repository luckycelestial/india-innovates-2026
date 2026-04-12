import re
import json
import httpx
from functools import lru_cache
import google.generativeai as genai
from app.config import settings

@lru_cache
def configure_gemini():
    if not settings.GEMINI_API_KEY:
        # Return a mock or raise a descriptive error when used, 
        # but don't crash the entire app on import.
        return False
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return True

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

def translate_from_english(text: str, target_lang: str) -> str:
    """Uses Bhashini for Translating Text from English to target language."""
    if target_lang == "English":
        return text
        
    bhashini_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
    bhashini_lang_mapping = {
        "Hindi": "hi", "Tamil": "ta", "Telugu": "te", "Kannada": "kn", 
        "Malayalam": "ml", "Bengali": "bn"
    }
    target_code = bhashini_lang_mapping.get(target_lang)
    if not target_code:
        return text

    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": "en",
                        "targetLanguage": target_code
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
        print(f"Bhashini reverse translation failed: {e}")
    return text

def agentic_chat_with_gemini(history: list, user_name: str = "Citizen") -> dict:
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
    if not configure_gemini():
        return {"type": "question", "text": "AI configuration is missing. Please contact administrator."}
    try:
        model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=prompt)
        config = genai.GenerationConfig(temperature=0.2, max_output_tokens=350)
        
        # Convert our history list into gemini's format 
        # (user/assistant -> user/model)
        gemini_history = []
        for msg in history:
            role = "model" if msg["role"] == "assistant" else "user"
            gemini_history.append({"role": role, "parts": [msg["content"]]})
            
        chat = model.start_chat(history=gemini_history)
        # We need an input to send. In this context, if history is provided, we send the last user message,
        # but `start_chat` handles history. Wait, `agentic_chat_with_groq` passed all history directly. Let's just pass the last message.
        last_msg = history[-1]["content"] if history else "Hello"
        # Wait! If we put last_msg in the model text, we must remove it from gemini_history before start_chat
        
        if len(gemini_history) > 0:
            gemini_history.pop()
        
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(last_msg, generation_config=config)
        content = response.text.strip()
        
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
        print("Gemini Error:", e)
        return {"type": "question", "text": "I'm having trouble understanding. Could you please repeat your issue and location?"}

def classify_with_gemini(text: str) -> dict:
    if not configure_gemini():
        return {"category": "General", "priority": "medium", "sentiment": "neutral", "title": text[:40], "location": "Unknown", "clean_description": text}
    try:
        prompt = f"""Classify this grievance, responding ONLY with valid JSON.
Text: "{text}"
JSON Format:
{{"category": "Water Supply|Roads|Electricity|Sanitation|General", "priority": "low|medium|high|critical", "sentiment": "negative|neutral|positive", "title": "...", "location": "...", "clean_description": "..."}}
"""
        model = genai.GenerativeModel("gemini-1.5-flash")
        config = genai.GenerationConfig(temperature=0.1)
        response = model.generate_content(prompt, generation_config=config)
        content = response.text.strip()
        raw = re.sub(r"^```json\s*|^```\s*|```$", "", content, flags=re.MULTILINE).strip()
        match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise Exception("No JSON found")
    except Exception:
        return {"category": "General", "priority": "medium", "sentiment": "neutral", "title": text[:40], "location": "Unknown", "clean_description": text}
import json
import re
import os
import httpx
from app.config import settings

def agentic_chat_with_groq(history: list, user_name: str = "Citizen") -> dict:
    if not settings.GROQ_API_KEY:
        return {"type": "question", "text": "Groq AI configuration is missing. Please contact administrator."}
        
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
import json
import re
import os
import httpx
from app.config import settings

def agentic_chat_with_groq(history: list, user_name: str = "Citizen") -> dict:
    if not settings.GROQ_API_KEY:
        return {"type": "question", "text": "Groq AI configuration is missing. Please contact administrator."}
        
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
