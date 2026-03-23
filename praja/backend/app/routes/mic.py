import os
import httpx
import tempfile
import base64
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.config import settings
from groq import Groq

router = APIRouter()
groq_client = Groq(api_key=settings.GROQ_API_KEY)

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Receives an audio blob from the frontend, saves it temporarily,
    and uses Groq Whisper API to transcribe and translate it.
    """
    try:
        audio_bytes = await audio.read()
        
        # Save bytes to a temporary webm file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            with open(tmp_path, "rb") as f:
                # 1. Transcribe the audio using Groq Whisper (multi-language support)
                transcription = groq_client.audio.transcriptions.create(
                    file=("audio.webm", f.read()),
                    model="whisper-large-v3",
                    prompt="Citizen grievance audio. Languages: English, Hindi, Marathi, Tamil, Telugu."
                )
            
            native_text = transcription.text
            
            if not native_text:
                return {"original_text": "", "english_text": ""}
                
            # 2. Translate to English explicitly just to format it cleanly
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
            
        finally:
            # Clean up the temp file
            os.remove(tmp_path)
            
    except Exception as e:
        print(f"Error in transcription route: {e}")
        raise HTTPException(status_code=500, detail=str(e))
