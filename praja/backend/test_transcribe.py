import os, httpx, base64, json
from dotenv import load_dotenv

load_dotenv()

BHASHINI_API_KEY = os.getenv("BHASHINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def test_bhashini(audio_path):
    print("Testing Bhashini...")
    with open(audio_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode("utf-8")
    
    url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
    payload = {
        "pipelineTasks": [
            {
                "taskType": "asr",
                "config": {
                    "language": {
                        "sourceLanguage": "hi"
                    }
                }
            }
        ],
        "inputData": {
            "audio": [{"audioContent": audio_b64}]
        }
    }
    headers = {"Authorization": BHASHINI_API_KEY}
    try:
        resp = httpx.post(url, json=payload, headers=headers)
        print("Bhashini Res:", resp.status_code, resp.text)
    except Exception as e:
        print("Bhashini Err:", e)

def test_groq(audio_path):
    print("Testing Groq...")
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
    files = {
        "file": (os.path.basename(audio_path), open(audio_path, "rb"), "audio/ogg"),
        "model": (None, "whisper-large-v3", "text/plain"),
    }
    try:
        resp = httpx.post(url, headers=headers, files=files)
        print("Groq Res:", resp.status_code, resp.text)
    except Exception as e:
        print("Groq Err:", e)
        
if __name__=="__main__":
    # Create a small dummy audio to test connection format
    with open("dummy.ogg", "wb") as f: f.write(b"OggS")
    test_bhashini("dummy.ogg")
    test_groq("dummy.ogg")
