from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.routes import auth, mic, grievances, officers, sentinel, whatsapp, whatsapp_voice, sms, voice, tts
import traceback, logging

logger = logging.getLogger(__name__)

app = FastAPI(title="PRAJA API", description="AI-powered Citizen Grievance Platform", version="1.0.0")

allow_origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "https://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "type": type(exc).__name__},
    )

app.include_router(auth.router,        prefix="/api/auth",       tags=["Auth"])
app.include_router(grievances.router,  prefix="/api/grievances", tags=["Grievances"])
app.include_router(officers.router,    prefix="/api/officers",   tags=["Officers"])
app.include_router(sentinel.router,    prefix="/api/sentinel",   tags=["SentinelPulse"])
app.include_router(whatsapp.router,       prefix="/api/whatsapp",   tags=["WhatsApp"])
app.include_router(whatsapp_voice.router, prefix="/api/whatsapp",   tags=["WhatsApp Voice"])
app.include_router(sms.router,         prefix="/api/sms",        tags=["SMS"])
app.include_router(voice.router,       prefix="/api/voice",      tags=["Voice"])
app.include_router(mic.router,         prefix="/api/mic",        tags=["Mic"])
app.include_router(tts.router,         prefix="/api/tts",        tags=["TTS Voice Notes"])

@app.get("/")
def root():
    return {"status": "ok", "project": "PRAJA", "db": "Supabase"}

@app.get("/health")
def health():
    return {"status": "healthy"}

