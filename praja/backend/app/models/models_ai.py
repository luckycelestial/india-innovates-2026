import google.generativeai as genai
from groq import Groq
from app.config import settings

# Fast path - Groq
whatsapp_bot = Groq(api_key=settings.GROQ_API_KEY).chat.completions if settings.GROQ_API_KEY else None
transcription = Groq(api_key=settings.GROQ_API_KEY).audio.transcriptions if settings.GROQ_API_KEY else None

# Quality path - Gemini  
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
photo_verify = genai.GenerativeModel(model_name='gemini-1.5-flash') if settings.GEMINI_API_KEY else None
schemes = genai.GenerativeModel(model_name='gemini-1.5-flash') if settings.GEMINI_API_KEY else None
