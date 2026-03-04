from supabase import create_client
from typing import Any
from app.config import settings

_client: Any = None


def get_supabase() -> Any:
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _client
