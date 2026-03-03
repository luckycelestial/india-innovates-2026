from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    SUPABASE_URL:         str = "https://bbakxtofuxkxzfbexlll.supabase.co"
    SUPABASE_ANON_KEY:    str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYWt4dG9mdXhreHpmYmV4bGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDk5ODgsImV4cCI6MjA4ODEyNTk4OH0.mIo2NFZxTm_tvXVTH2o0ErNvwXBfaXBkA12N0KIDyAY"
    SUPABASE_SERVICE_KEY: str = ""
    SECRET_KEY: str = "change_this_to_a_long_random_secret_key"
    ALGORITHM:  str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    TWILIO_ACCOUNT_SID:     str = ""
    TWILIO_AUTH_TOKEN:      str = ""
    TWILIO_WHATSAPP_NUMBER: str = "whatsapp:+14155238886"
    GROQ_API_KEY:      str = ""
    ENVIRONMENT:  str = "development"
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
