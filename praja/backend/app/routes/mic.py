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
        
        # We must fallback to Groq temporarily because Bhashini is throwing 403 Forbidden 
        # for your API key on the pipeline endpoint. To ensure the demo works, we use Groq.
        
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
            
            prompt = f"""Translate the following text into English. Return ONLY the English translation. If it's already English, just return it.
            Text: {native_text}"""
            
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
            raise HTTPException(status_code=500, detail=str(groq_e))
            
    except Exception as e:
        print(f"Error in transcription route: {e}")
        raise HTTPException(status_code=500, detail=str(e))
