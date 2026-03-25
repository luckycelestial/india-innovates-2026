from fastapi import APIRouter, Query, Response
from fastapi.responses import JSONResponse
import httpx
import base64
from app.config import settings

router = APIRouter()

@router.get("/generate")
async def generate_tts(text: str = Query(...), lang: str = Query("hi")):
    """
    Generate audio perfectly translating the supplied text into the targeted regional language TTS via Bhashini.
    """
    bhashini_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
    
    # Map high-level languages to proper tts source code and specific TTS services
    # Dravidian uses specific serviceId, Indo-Aryan uses another, English has its own
    bhashini_tts_config = {
        "hi": {"code": "hi", "serviceId": "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4"},
        "ta": {"code": "ta", "serviceId": "ai4bharat/indic-tts-coqui-dravidian-gpu--t4"},
        "te": {"code": "te", "serviceId": "ai4bharat/indic-tts-coqui-dravidian-gpu--t4"},
        "kn": {"code": "kn", "serviceId": "ai4bharat/indic-tts-coqui-dravidian-gpu--t4"},
        "ml": {"code": "ml", "serviceId": "ai4bharat/indic-tts-coqui-dravidian-gpu--t4"},
        "bn": {"code": "bn", "serviceId": "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4"},
        "en": {"code": "en", "serviceId": "ai4bharat/indic-tts-coqui-misc-gpu--t4"},
    }

    # "Hindi" -> "hi", "English" -> "en"
    lang_map = {
        "Hindi": "hi", "Tamil": "ta", "Telugu": "te", 
        "Kannada": "kn", "Malayalam": "ml", "Bengali": "bn", "English": "en"
    }
    
    # Normalize input string safely
    safe_lang_code = lang_map.get(lang, lang)
    if safe_lang_code not in bhashini_tts_config:
        safe_lang_code = "en"

    config = bhashini_tts_config[safe_lang_code]

    payload = {
        "pipelineTasks": [
            {
                "taskType": "tts",
                "config": {
                    "language": {
                        "sourceLanguage": config["code"]
                    },
                    "serviceId": config["serviceId"],
                    "gender": "female",
                    "samplingRate": 8000
                }
            }
        ],
        "inputData": {
            "input": [{"source": text}]
        }
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": settings.BHASHINI_API_KEY
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(bhashini_url, json=payload, headers=headers)
            
            if res.status_code == 200:
                data = res.json()
                audio_base64 = data["pipelineResponse"][0]["audio"][0]["audioContent"]
                audio_bytes = base64.b64decode(audio_base64)
                
                # Twilio requires audio formats (mp3, wav, ogg). 
                # Bhashini returns standard WAV raw audio bytes usually.
                return Response(content=audio_bytes, media_type="audio/wav")
            else:
                return JSONResponse(status_code=res.status_code, content={"error": "Bhashini API Error", "details": res.text})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
