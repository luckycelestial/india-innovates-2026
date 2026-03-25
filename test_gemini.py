import base64
import json
import httpx
import re

with open('praja/frontend/src/assets/azure.png', 'rb') as f:
    b64_data = base64.b64encode(f.read()).decode('utf-8')

gemini_url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=AIzaSyDyItytJkG8uUwOZUcygzYGoGtxYmOfEew'

prompt = '''You are a strict verification assistant. Your task is to verify if the attached image visually depicts the civic issue described below. 
You MUST REJECT generic images, logos, badges, selfies, cartoons, screenshots, and any unrelated objects. The image must clearly and physically show the real-world problem mentioned.

Title: broken road with deep pothole
Description: large pathole

If the image is unrelated, return "matches": false and explain why in "reason".

Respond ONLY with valid JSON. Do not include markdown formatting or extra text.
Schema: {"matches": true/false, "reason": "Short explanation of why the photo matches or does not match the issue"}'''

payload = {
    'contents': [{
        'parts': [
            {'text': prompt},
            {
                'inline_data': {
                    'mime_type': 'image/png',
                    'data': b64_data
                }
            }
        ]
    }],
    'generationConfig': {
        'temperature': 0.1,
        'response_mime_type': 'application/json'
    }
}

try:
    with httpx.Client() as client:
        res = client.post(gemini_url, json=payload)
        print(res.status_code)
        res_data = res.json()
        print('SUCCESS')
        print(json.dumps(res_data, indent=2))
        raw = res_data['candidates'][0]['content']['parts'][0]['text'].strip()
        print("RAW RESPONSE:")
        print(raw)
except Exception as e:
    print('ERROR:', e)
