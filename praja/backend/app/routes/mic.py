import os
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from app.config import settings
from app.utils.ai import detect_language, configure_gemini
import google.generativeai as genai

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), engine: str = Query("bhashini")):
    if not configure_gemini():
        raise HTTPException(status_code=500, detail="Gemini API Key missing")
        
    try:
        audio_bytes = await audio.read()
        
        tmp_path = None
        import tempfile
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name
                
            audio_file = genai.upload_file(path=tmp_path)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content([
                "Please accurately transcribe this audio recording in its original language.", 
                audio_file
            ])
            native_text = response.text
            genai.delete_file(audio_file.name)

        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        if not native_text:
            return {"original_text": "", "english_text": ""}
            
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
                    print(f"Bhashini translation failed, falling back to Gemini: {e}")
                    prompt = f"Translate the following text into English. Return ONLY the English translation, no other words.\nText: {native_text}"
                    completion = model.generate_content(prompt)
                    english_text = completion.text.strip()

        return {
            "original_text": native_text,
            "english_text": english_text
        }
            
    except Exception as e:
        print(f"Error in transcription route: {e}")
        raise HTTPException(status_code=500, detail=str(e))
