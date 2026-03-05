from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from app.db.database import get_supabase
from app.utils.jwt import create_access_token, get_password_hash, verify_password, get_current_user

router = APIRouter()


class UserLogin(BaseModel):
    aadhaar_number: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


@router.post("/login", response_model=Token)
def login(body: UserLogin, sb: Any = Depends(get_supabase)):
    aadhaar = body.aadhaar_number.replace(" ", "").replace("-", "")
    if len(aadhaar) != 12 or not aadhaar.isdigit():
        raise HTTPException(status_code=400, detail="Aadhaar number must be 12 digits")
    rows = sb.table("users").select("*").eq("aadhaar_number", aadhaar).execute()
    if not rows.data:
        raise HTTPException(status_code=401, detail="Aadhaar not registered or invalid credentials")
    user = rows.data[0]
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user["full_name"] = user.get("name", "")
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



class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: str = ""
    constituency: str = ""
    role: str = "citizen"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


@router.post("/register", response_model=Token, status_code=201)
def register(body: UserRegister, sb: Any = Depends(get_supabase)):
    existing = sb.table("users").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = get_password_hash(body.password)
    insert_data: dict = {
        "name":          body.full_name,
        "email":         body.email,
        "password_hash": hashed,
    }
    if body.phone:
        insert_data["phone"] = body.phone
    if body.constituency:
        insert_data["constituency"] = body.constituency
    if body.role:
        insert_data["role"] = body.role

    row = sb.table("users").insert(insert_data).execute()
    user = row.data[0]
    # Alias 'name' → 'full_name' for frontend compatibility
    user["full_name"] = user.get("name", "")
    token = create_access_token({"sub": str(user["id"]), "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=Token)
def login(body: UserLogin, sb: Any = Depends(get_supabase)):
    rows = sb.table("users").select("*").eq("email", body.email).execute()
    if not rows.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = rows.data[0]
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user["full_name"] = user.get("name", "")
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
