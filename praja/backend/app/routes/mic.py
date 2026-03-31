import os
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from app.config import settings
from app.utils.ai import detect_language
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
        
        tmp_path = None
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
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        native_text = transcription.text
        if not native_text:
            return {"original_text": "", "english_text": ""}
            
        # Using Bhashini for Translating Text to prove API Usage in Gov Hackathon
        # Groq Llama fallback if Bhashini fails
        bhashini_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        

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

            headers = {
                "Content-Type": "application/json",
                "Authorization": settings.BHASHINI_API_KEY
            }

            with httpx.Client(timeout=15) as client:
                try:
                    res = client.post(bhashini_url, json=payload, headers=headers)
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
