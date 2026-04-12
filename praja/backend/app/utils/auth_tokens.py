from fastapi import Request, HTTPException

def create_access_token(data: dict, expires_delta=None) -> str:
    return "no-token"

def decode_token(token: str) -> dict:
    return {"sub": "00000000-0000-0000-0000-000000000000", "role": "officer"}

def get_current_user(request: Request) -> dict:
    user_id = request.headers.get("x-user-id", "00000000-0000-0000-0000-000000000000")
    user_role = request.headers.get("x-user-role", "citizen")
    return {"sub": user_id, "role": user_role}

async def get_current_user_id(request: Request) -> str:
    return request.headers.get("x-user-id", "00000000-0000-0000-0000-000000000000")
