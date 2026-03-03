from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from supabase._sync.client import SyncClient as Client
from app.db.database import get_supabase
from app.utils.jwt import get_current_user

router = APIRouter()


class GrievanceCreate(BaseModel):
    title: str
    description: str
    category: str = "General"
    ward_id:  Optional[int] = None
    location: Optional[str] = None
    address:  Optional[str] = None
    media_urls: Optional[list[str]] = None


@router.post("/", status_code=201)
def create_grievance(
    body: GrievanceCreate,
    current: dict = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    payload = {
        "citizen_id":   current["sub"],
        "title":        body.title,
        "description":  body.description,
        "category":     body.category,
        "ward_id":      body.ward_id,
        "location":     body.location,
        "address":      body.address,
        "media_urls":   body.media_urls or [],
        "status":       "open",
        "priority":     "medium",
    }
    row = sb.table("grievances").insert(payload).execute()
    return row.data[0]


@router.get("/")
def list_grievances(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    current: dict = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("grievances").select("*")
    if current["role"] == "citizen":
        q = q.eq("citizen_id", current["sub"])
    if status:
        q = q.eq("status", status)
    result = q.range(skip, skip + limit - 1).execute()
    return result.data


@router.get("/{grievance_id}")
def get_grievance(
    grievance_id: str,
    current: dict = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    row = sb.table("grievances").select("*").eq("id", grievance_id).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Not found")
    return row.data[0]


@router.put("/{grievance_id}/status")
def update_status(
    grievance_id: str,
    status: str,
    notes: str = "",
    current: dict = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    if current["role"] == "citizen":
        raise HTTPException(status_code=403, detail="Forbidden")
    sb.table("grievances").update({"status": status}).eq("id", grievance_id).execute()
    sb.table("ticket_logs").insert({
        "grievance_id": grievance_id,
        "officer_id":   current["sub"],
        "action":       f"status_changed_to_{status}",
        "notes":        notes,
    }).execute()
    return {"ok": True}
