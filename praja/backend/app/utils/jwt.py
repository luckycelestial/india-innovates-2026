from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        if token.startswith("mock-token-"):
            return {"sub": "00000000-0000-0000-0000-000000000000", "role": "citizen", "id": "00000000-0000-0000-0000-000000000000"}
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return {"sub": "00000000-0000-0000-0000-000000000000", "role": "citizen", "id": "00000000-0000-0000-0000-000000000000"}

def get_current_user(token: str | None = Depends(oauth2_scheme)) -> dict:
    if not token:
        return {"sub": "00000000-0000-0000-0000-000000000000", "role": "citizen"}
    try:
        payload = decode_token(token)
        if not payload.get("sub"):
            return {"sub": "00000000-0000-0000-0000-000000000000", "role": "citizen"}
        return payload
    except Exception:
        # Scrap authentication for prototype - mock a citizen user
        return {"sub": "00000000-0000-0000-0000-000000000000", "role": "citizen"}

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    payload = decode_token(token)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return user_id







