import os
import httpx
import tempfile
import base64
import subprocess
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.config import settings
from groq import Groq

router = APIRouter()
groq_client = Groq(api_key=settings.GROQ_API_KEY)

def convert_webm_to_wav_base64(webm_bytes: bytes) -> str:
    """Converts browser WebM audio to strict 16kHz Mono WAV using ffmpeg, then base64 encodes it"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_in:
        tmp_in.write(webm_bytes)
        in_path = tmp_in.name
        
    out_path = in_path.replace(".webm", ".wav")
    
    try:
        # Bhashini strictly requires 16kHz mono WAV for high accuracy
        subprocess.run(
            ['ffmpeg', '-i', in_path, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', '-y', out_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True
        )
        
        with open(out_path, "rb") as f:
            wav_data = f.read()
            
        return base64.b64encode(wav_data).decode("utf-8")
    finally:
        if os.path.exists(in_path): os.remove(in_path)
        if os.path.exists(out_path): os.remove(out_path)


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Receives an audio blob from the frontend, converts it to 16kHz WAV,
    uses Bhashini ASR to convert speech to Indian language text,
    and then uses Groq to translate it to English.
    """
    try:
        audio_bytes = await audio.read()
        
        try:
            # Must convert to wav first because Bhashini rejects raw browser webm blobs
            base64_audio = convert_webm_to_wav_base64(audio_bytes)
        except Exception as e:
            print("FFMPEG conversion failed, falling back to direct base64:", e)
            base64_audio = base64.b64encode(audio_bytes).decode("utf-8")
        
        bhashini_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {"sourceLanguage": "hi"},
                        "serviceId": "ai4bharat/conformer-hi-gpu--t4", 
                        "audioFormat": "wav",
                        "samplingRate": 16000
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
            
            try:
                native_text = data["pipelineResponse"][0]["output"][0]["source"]
            except (KeyError, IndexError):
                native_text = ""
            
        if not native_text:
            return {"original_text": "No speech detected by Bhashini.", "english_text": ""}
            
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
        raise HTTPException(status_code=500, detail=str(e))
