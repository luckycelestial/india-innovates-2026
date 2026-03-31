from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # DEMO ONLY — move all secrets to .env for production
    SUPABASE_URL:         str = "https://bbakxtofuxkxzfbexlll.supabase.co"
    SUPABASE_ANON_KEY:    str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYWt4dG9mdXhreHpmYmV4bGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDk5ODgsImV4cCI6MjA4ODEyNTk4OH0.mIo2NFZxTm_tvXVTH2o0ErNvwXBfaXBkA12N0KIDyAY"
    SUPABASE_SERVICE_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYWt4dG9mdXhreHpmYmV4bGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0OTk4OCwiZXhwIjoyMDg4MTI1OTg4fQ.kZyjDiimKO39YPoXzrG3Sgz6Np34TV8pxXE-wmEgG1Q"
    SECRET_KEY: str = "praja-hackathon-2026-secret-key-india-innovates"
    ALGORITHM:  str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    TWILIO_ACCOUNT_SID:     str = ""
    TWILIO_AUTH_TOKEN:      str = ""
    TWILIO_WHATSAPP_NUMBER: str = "whatsapp:+14155238886"
    TWILIO_PHONE_NUMBER:    str = "+12362043968"   # Canadian SMS+Voice number
    MSG91_API_KEY:           str = ""
    MSG91_SENDER_ID:         str = "PRAJA2"
    GROQ_API_KEY:      str = ""
    OPENAI_API_KEY:    str = ""
    OPENAI_MODEL:      str = "gpt-4o-mini"
    GEMINI_API_KEY:    str = ""  # DEMO ONLY — set via .env
    BHASHINI_USER_ID:  str = ""
    BHASHINI_API_KEY:  str = ""
    ENVIRONMENT:  str = "development"
    FRONTEND_URL: str = "https://prajavox.vercel.app"
    BACKEND_URL:  str = "https://prajavox-backend.vercel.app"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
