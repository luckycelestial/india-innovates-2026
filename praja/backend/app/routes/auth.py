from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any
from app.db.database import get_supabase
from app.utils.jwt import create_access_token, get_current_user

router = APIRouter()


class UserLogin(BaseModel):
    aadhaar_number: str
    password: str  # accepted but not checked (prototype mode)


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


@router.post("/login", response_model=Token)
def login(body: UserLogin, sb: Any = Depends(get_supabase)):
    aadhaar = body.aadhaar_number.replace(" ", "").replace("-", "")
    
    # 1. HARDCODED DEMO MOCK LOGIN (Bypasses DB entirely)
    DEMO_MOCKS = {
        "234567890123": {"id": "demo-citizen", "name": "Ramesh Kumar", "role": "citizen", "constituency": "Delhi North"},
        "111122223333": {"id": "demo-sarpanch", "name": "Lakshmi Devi", "role": "sarpanch", "constituency": "Gram Panchayat Ranpur"},
        "789012345678": {"id": "demo-collector", "name": "Vikram Singh", "role": "district_collector", "constituency": "Delhi North"},
        "901234567890": {"id": "demo-mla", "name": "Arjun Mehta", "role": "mla", "constituency": "Delhi North"},
        "444455556666": {"id": "demo-mp", "name": "Rajendra Prasad", "role": "mp", "constituency": "Delhi North Lok Sabha"},
    }

    if aadhaar in DEMO_MOCKS:
        user = DEMO_MOCKS[aadhaar]
        user["full_name"] = user["name"]
        token = create_access_token({"sub": str(user["id"]), "role": user["role"]})
        return {"access_token": token, "token_type": "bearer", "user": user}

    # 2. FALLBACK TO DATABASE FOR OTHERS
    if len(aadhaar) != 12 or not aadhaar.isdigit():
        raise HTTPException(status_code=400, detail="Aadhaar number must be exactly 12 digits")

    try:
        rows = sb.table("users").select("*").eq("aadhaar_number", aadhaar).execute()
        if not rows.data:
            # If not in DB, create a dummy user on the fly so login NEVER fails
            user = {
                "id": f"dummy-{aadhaar}",
                "name": "Demo User",
                "role": "citizen",
                "full_name": "Demo User"
            }
            token = create_access_token({"sub": str(user["id"]), "role": user["role"]})
            return {"access_token": token, "token_type": "bearer", "user": user}

        user = rows.data[0]
        user["full_name"] = user.get("name", "Unknown User")
        token = create_access_token({"sub": str(user["id"]), "role": user["role"]})
        return {"access_token": token, "token_type": "bearer", "user": user}
    except Exception as e:
        # Failsafe: Just let them in as citizen if DB is down
        user = {
            "id": f"dummy-{aadhaar}",
            "name": "Demo User",
            "role": "citizen",
            "full_name": "Demo User"
        }
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


