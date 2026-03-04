from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.routes import auth, grievances, officers, nayakai, sentinel, whatsapp
import re, traceback

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
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "type": type(exc).__name__, "traceback": traceback.format_exc()},
    )

app.include_router(auth.router,        prefix="/api/auth",       tags=["Auth"])
app.include_router(grievances.router,  prefix="/api/grievances", tags=["Grievances"])
app.include_router(officers.router,    prefix="/api/officers",   tags=["Officers"])
app.include_router(nayakai.router,     prefix="/api/nayakai",    tags=["NayakAI"])
app.include_router(sentinel.router,    prefix="/api/sentinel",   tags=["SentinelPulse"])
app.include_router(whatsapp.router,    prefix="/api/whatsapp",   tags=["WhatsApp"])

@app.get("/")
def root():
    return {"status": "ok", "project": "PRAJA", "db": "Supabase"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/debug-env")
def debug_env():
    import os
    svc = settings.SUPABASE_SERVICE_KEY
    env_svc = os.environ.get("SUPABASE_SERVICE_KEY", "NOT_IN_OS_ENV")
    return {
        "settings_key_prefix": svc[:20] if svc else "EMPTY",
        "settings_key_suffix": svc[-10:] if svc else "EMPTY",
        "os_env_key_prefix": env_svc[:20],
        "os_env_key_suffix": env_svc[-10:],
        "supabase_url": settings.SUPABASE_URL,
    }
