from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import hashlib, os, base64, hmac
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

_ITERATIONS = 260_000
_ALGO = "sha256"


def get_password_hash(plain: str) -> str:
    """PBKDF2-SHA256, 260k iterations — stdlib only, no C-extension deps."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac(_ALGO, plain.encode(), salt, _ITERATIONS)
    return base64.b64encode(salt + dk).decode()


def verify_password(plain: str, hashed: str) -> bool:
    decoded = base64.b64decode(hashed.encode())
    salt, dk = decoded[:16], decoded[16:]
    new_dk = hashlib.pbkdf2_hmac(_ALGO, plain.encode(), salt, _ITERATIONS)
    return hmac.compare_digest(new_dk, dk)


hash_password = get_password_hash


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_token(token)
    if not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return payload


async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    payload = decode_token(token)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return user_id
