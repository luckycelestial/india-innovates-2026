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
    """
    Receives an audio blob from the frontend, uses Bhashini ASR to convert
    speech to Indian language text, and then uses Groq to translate it to English.
    """
    try:
        audio_bytes = await audio.read()
        base64_audio = base64.b64encode(audio_bytes).decode("utf-8")
        
        # 1. Bhashini ASR Pipeline (Using Udyat Token)
        bhashini_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {"sourceLanguage": "hi"},
                        "serviceId": "ai4bharat/conformer-hi-gpu--t4", # Fixed Model ID from pipeline response
                        "audioFormat": "webm"
                    }
                }
            ],
            "inputData": {
                "audio": [{"audioContent": base64_audio}]
            }
        }

        # The authorization token MUST be the generated key or the direct auth key
        headers = {
            "Content-Type": "application/json",
            "Authorization": settings.BHASHINI_API_KEY
        }

        with httpx.Client(timeout=30) as client:
            res = client.post(bhashini_url, json=payload, headers=headers)
            res.raise_for_status()
            data = res.json()
            
            try:
                native_text = data["pipelineResponse"][0]["output"][0]["source"]
            except (KeyError, IndexError):
                native_text = ""
            
        if not native_text:
            return {"original_text": "", "english_text": ""}
            
        # 2. Translate to English using Groq
        prompt = f"""Translate the following text into English. Return ONLY the English translation, no other words. If it is already in English, just return the text as is.
        Text: {native_text}"""
        
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
        print(f"Error in Bhashini transcription route: {e}")
        # Fallback to Groq Whisper if Bhashini errors out
        import tempfile
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name
                
            with open(tmp_path, "rb") as f:
                transcription = groq_client.audio.transcriptions.create(
                    file=("audio.webm", f.read()),
                    model="whisper-large-v3",
                    prompt="Citizen grievance audio. Languages: English, Hindi, Marathi, Tamil, Telugu."
                )
            os.remove(tmp_path)
            
            native_text = transcription.text
            prompt = f"""Translate the following text into English. Return ONLY the English translation. Text: {native_text}"""
            completion = groq_client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1
            )
            return {
                "original_text": native_text,
                "english_text": completion.choices[0].message.content.strip()
            }
        except Exception as groq_e:
            raise HTTPException(status_code=500, detail=str(e))
