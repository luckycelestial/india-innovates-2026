import httpx
import json
import jwt
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://prajavox.vercel.app/api"
# The user mentioned verify-photo point. Based on the file structure it's /api/grievances/verify-photo
# But in vercel.json it might be mapped differently. 
# Looking at grievances.py, it's @router.post("/verify-photo")
# If the backend is mounted at /api, it might be /api/grievances/verify-photo or just /api/verify-photo

SECRET_KEY = "praja-hackathon-2026-secret-key-india-innovates"
ALGORITHM = "HS256"

def create_test_token():
    payload = {
        "sub": "test_user",
        "exp": datetime.utcnow() + timedelta(minutes=10)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def test_rejection():
    token = create_test_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Using a known certificate image URL (sample certificate)
    # This one is a clear certificate/document
    photo_url = "https://www.adobe.com/content/dam/cc/us/en/creative-cloud/pbe/certificate-design/creative-cloud-how-to-design-certificate-intro-800x450.jpg.img.jpg"
    
    payload = {
        "title": "Llama-4-Scout Trigger",
        "description": "Trigger word test",
        "photo_url": photo_url
    }
    
    # Try both common paths
    endpoints = [
        "https://prajavox-backend.vercel.app/api/grievances/verify-photo"
    ]
    
    for url in endpoints:
        print(f"\nTesting endpoint: {url}")
        try:
            resp = httpx.post(url, json=payload, headers=headers, timeout=30.0)
            print(f"Status Code: {resp.status_code}")
            print(f"Response Body: {resp.text}")
            print(f"Server Header: {resp.headers.get('server')}")
            print(f"X-Vercel-Id: {resp.headers.get('x-vercel-id')}")
            print(f"Date: {resp.headers.get('date')}")
        except Exception as e:
            print(f"Error testing {url}: {e}")

if __name__ == "__main__":
    test_rejection()
