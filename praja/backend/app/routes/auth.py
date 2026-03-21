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
    if len(aadhaar) != 12 or not aadhaar.isdigit():
        raise HTTPException(status_code=400, detail="Aadhaar number must be exactly 12 digits")

    try:
        rows = sb.table("users").select("*").eq("aadhaar_number", aadhaar).execute()
        if not rows.data:
            raise HTTPException(status_code=401, detail="Aadhaar not registered in system")

        user = rows.data[0]
        # Ensure full_name exists so the frontend doesn't crash
        user["full_name"] = user.get("name", "Unknown User")
        
        token = create_access_token({"sub": str(user["id"]), "role": user["role"]})
        return {"access_token": token, "token_type": "bearer", "user": user}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/me")
def me(current: dict = Depends(get_current_user), sb: Any = Depends(get_supabase)):
    rows = sb.table("users").select("*").eq("id", current["sub"]).execute()
    if not rows.data:
        raise HTTPException(status_code=404, detail="User not found")
    user = rows.data[0]
    user["full_name"] = user.get("name", "")
    return user

