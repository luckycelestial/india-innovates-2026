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
    """Decode JWT token. Returns payload or raises HTTPException on failure."""
    try:
        # DEMO ONLY — accept mock tokens for prototype
        if token.startswith("mock-token-"):
            return {"sub": "00000000-0000-0000-0000-000000000000", "role": "citizen", "id": "00000000-0000-0000-0000-000000000000"}
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
        )


def get_current_user(token: str | None = Depends(oauth2_scheme)) -> dict:
    """Extract user from JWT. Missing token falls back to demo user (prototype)."""
    if not token:
        # DEMO ONLY — allow unauthenticated access for prototype
        return {"sub": "00000000-0000-0000-0000-000000000000", "role": "citizen"}
    payload = decode_token(token)
    if not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Token missing 'sub' claim")
    return payload


async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    payload = decode_token(token)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return user_id
