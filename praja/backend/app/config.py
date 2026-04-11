from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase (Loaded from .env)
    SUPABASE_URL:         str = ""
    SUPABASE_ANON_KEY:    str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # Security
    SECRET_KEY: str = "dev-secret-key-praja"
    ALGORITHM:  str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Twilio (Loaded from .env)
    TWILIO_ACCOUNT_SID:     str = ""
    TWILIO_AUTH_TOKEN:      str = ""
    TWILIO_WHATSAPP_NUMBER: str = "whatsapp:+14155238886"
    TWILIO_PHONE_NUMBER:    str = ""

    # AI & External APIs (Loaded from .env)
    GEMINI_API_KEY:    str = "AIzaSyDymjTOrhj-2VMVAN20WymPi7eS24Ra7t0"
    BHASHINI_API_KEY:  str = ""
    BHASHINI_USER_ID:  str = ""
    OPENAI_API_KEY:    str = ""
    OPENAI_MODEL:      str = "gpt-4o-mini"
    GEMINI_API_KEY:    str = "AIzaSyDymjTOrhj-2VMVAN20WymPi7eS24Ra7t0"
    MSG91_API_KEY:     str = ""
    MSG91_SENDER_ID:   str = "PRAJA2"

    # Environment
    ENVIRONMENT:  str = "development"
    FRONTEND_URL: str = "https://prajavox.vercel.app"
    BACKEND_URL:  str = "https://prajavox-backend.vercel.app"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
