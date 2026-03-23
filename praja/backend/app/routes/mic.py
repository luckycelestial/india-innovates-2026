import os
import httpx
import base64
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.config import settings
from groq import Groq

router = APIRouter()
groq_client = Groq(api_key=settings.GROQ_API_KEY)

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    \"\"\"
    Receives an audio blob from the frontend, uses Bhashini ASR to convert
    speech to Indian language text, and then uses Groq to translate it to English.
    \"\"\"
    try:
        audio_bytes = await audio.read()
        base64_audio = base64.b64encode(audio_bytes).decode("utf-8")
        
        # 1. Bhashini ASR Pipeline
        bhashini_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {"sourceLanguage": "hi"}, # Auto-detects in inference
                        "audioFormat": "webm" # Browsers usually record in webm
                    }
                }
            ],
            "inputData": {
                "audio": [{"audioContent": base64_audio}]
            }
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": settings.BHASHINI_API_KEY
        }

        with httpx.Client(timeout=30) as client:
            res = client.post(bhashini_url, json=payload, headers=headers)
            res.raise_for_status()
            data = res.json()
            native_text = data["pipelineResponse"][0]["output"][0]["source"]
            
        if not native_text:
            return {"original_text": "", "english_text": ""}
            
        # 2. Groq LLM Translation
        prompt = f\"\"\"Translate the following text into English. Return ONLY the English translation, no other words or conversational text.
        Text: {native_text}
        \"\"\"
        
        completion = groq_client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        english_text = completion.choices[0].message.content.strip()

        return {
            "original_text": native_text,
            "english_text": english_text
        }
            
    except Exception as e:
        print(f"Error in transcription route: {e}")
        raise HTTPException(status_code=500, detail=str(e))
