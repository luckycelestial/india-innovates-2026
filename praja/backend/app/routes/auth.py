import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any
from app.db.database import get_supabase
from app.utils.jwt import create_access_token, get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


class UserLogin(BaseModel):
    aadhaar_number: str
    password: str  # accepted but not verified (prototype — Aadhaar-only auth)


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


# Hardcoded demo users for hackathon demonstration
DEMO_MOCKS = {
    "234567890123": {"id": "demo-citizen",    "name": "Ramesh Kumar",    "role": "citizen",            "constituency": "Delhi North"},
    "111122223333": {"id": "demo-sarpanch",   "name": "Lakshmi Devi",    "role": "sarpanch",           "constituency": "Gram Panchayat Ranpur"},
    "789012345678": {"id": "demo-collector",  "name": "Vikram Singh",    "role": "district_collector", "constituency": "Delhi North"},
    "901234567890": {"id": "demo-mla",        "name": "Arjun Mehta",     "role": "mla",                "constituency": "Delhi North"},
    "444455556666": {"id": "demo-mp",         "name": "Rajendra Prasad", "role": "mp",                 "constituency": "Delhi North Lok Sabha"},
}


@router.post("/login", response_model=Token)
def login(body: UserLogin, sb: Any = Depends(get_supabase)):
    aadhaar = body.aadhaar_number.replace(" ", "").replace("-", "")

    if len(aadhaar) != 12 or not aadhaar.isdigit():
        raise HTTPException(status_code=400, detail="Aadhaar number must be exactly 12 digits")

    # 1. Check hardcoded demo users first
    if aadhaar in DEMO_MOCKS:
        user = {**DEMO_MOCKS[aadhaar], "full_name": DEMO_MOCKS[aadhaar]["name"]}
        token = create_access_token({"sub": str(user["id"]), "role": user["role"]})
        return {"access_token": token, "token_type": "bearer", "user": user}

    # 2. Look up in Supabase
    try:
        rows = sb.table("users").select("*").eq("aadhaar_number", aadhaar).execute()
    except Exception as exc:
        logger.error("Database error during login: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable. Please try again.")

    if not rows.data:
        raise HTTPException(status_code=404, detail="No account found for this Aadhaar number")

    user = rows.data[0]
    user["full_name"] = user.get("name", "Unknown User")
    token = create_access_token({"sub": str(user["id"]), "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me")
def me(current: dict = Depends(get_current_user), sb: Any = Depends(get_supabase)):
    rows = sb.table("users").select("*").eq("id", current["sub"]).execute()
    if not rows.data:
        raise HTTPException(status_code=404, detail="User not found")
    user = rows.data[0]
    user["full_name"] = user.get("name", "")
    return user
