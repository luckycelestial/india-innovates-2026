from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import auth, grievances, officers, nayakai, sentinel, whatsapp

app = FastAPI(title="PRAJA API", description="AI-powered Citizen Grievance Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
