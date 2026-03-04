from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from supabase import Client
from app.db.database import get_supabase
from app.utils.jwt import create_access_token, get_password_hash, verify_password, get_current_user

router = APIRouter()


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
def register(body: UserRegister, sb: Client = Depends(get_supabase)):
    existing = sb.table("users").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    dept_row = sb.table("departments").select("id").eq("name", "General").execute()
    dept_id = dept_row.data[0]["id"] if dept_row.data else None

    hashed = get_password_hash(body.password)
    row = sb.table("users").insert({
        "full_name":     body.full_name,
        "email":         body.email,
        "phone":         body.phone,
        "constituency":  body.constituency,
        "role":          body.role,
        "password_hash": hashed,
        "department_id": dept_id,
    }).execute()
    user = row.data[0]
    token = create_access_token({"sub": str(user["id"]), "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=Token)
def login(body: UserLogin, sb: Client = Depends(get_supabase)):
    rows = sb.table("users").select("*").eq("email", body.email).execute()
    if not rows.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = rows.data[0]
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user["id"]), "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me")
def me(current: dict = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    rows = sb.table("users").select("*").eq("id", current["sub"]).execute()
    if not rows.data:
        raise HTTPException(status_code=404, detail="User not found")
    return rows.data[0]
