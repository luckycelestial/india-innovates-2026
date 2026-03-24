import os
import httpx
import base64
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from app.config import settings
from groq import Groq

router = APIRouter()
groq_client = Groq(api_key=settings.GROQ_API_KEY)

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), engine: str = Query("bhashini")):
    """
    Receives an audio blob from the frontend, uses the chosen engine (bhashini or groq) 
    to convert speech to Indian language text, and then uses Groq to translate it to English.
    """
    try:
        audio_bytes = await audio.read()
        
        import tempfile
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
        if not native_text:
            return {"original_text": "", "english_text": ""}
            
        prompt = f"""Translate the following text into English. Return ONLY the English translation, no other words. If it is already in English, just return the text as is.
Text: {native_text}"""
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
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
