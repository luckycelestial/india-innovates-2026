import os
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from app.config import settings

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), engine: str = Query("bhashini")):
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API Key missing")
        
    try:
        audio_bytes = await audio.read()
        
        tmp_path = None
        import tempfile
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name
                
            headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
            with open(tmp_path, "rb") as f:
                res = httpx.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers=headers,
                    files={"file": (f.name, f, "audio/webm")},
                    data={"model": "whisper-large-v3-turbo"},
                    timeout=20.0
                )
            if res.status_code != 200:
                print(res.text)
                raise Exception("Groq transcription failed")
            native_text = res.json().get("text", "")

        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        if not native_text:
            return {"original_text": "", "english_text": ""}
            
        bhashini_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        
        from app.utils.ai import detect_language
        lang = detect_language(native_text)
        bhashini_lang_mapping = {
            "Hindi": "hi", "Tamil": "ta", "Telugu": "te", "Kannada": "kn", 
            "Malayalam": "ml", "Bengali": "bn", "English": "en"
        }
        source_lang = bhashini_lang_mapping.get(lang, "hi")

        english_text = native_text
        if source_lang != "en":
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
                    "input": [{"source": native_text}]
                }
            }

            b_headers = {
                "Content-Type": "application/json",
                "Authorization": settings.BHASHINI_API_KEY
            }

            try:
                with httpx.Client(timeout=15) as client:
                    res = client.post(bhashini_url, json=payload, headers=b_headers)
                    if res.status_code == 200:
                        data = res.json()
                        translated_text = data["pipelineResponse"][0]["output"][0]["target"]
                        if translated_text:
                            english_text = translated_text
                    else:
                        raise Exception(f"Bhashini returned {res.status_code}")
            except Exception as e:
                print(f"Bhashini translation failed, falling back to Groq: {e}")
                prompt = f"Translate the following text into English. Return ONLY the English translation, no other words.\nText: {native_text}"
                
                groq_payload = {
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.0
                }
                res = httpx.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=groq_payload, timeout=8.0)
                english_text = res.json()["choices"][0]["message"]["content"].strip()

        return {
            "original_text": native_text,
            "english_text": english_text
        }
            
    except Exception as e:
        print(f"Error in transcription route: {e}")
        raise HTTPException(status_code=500, detail=str(e))
