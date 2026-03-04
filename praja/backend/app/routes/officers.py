from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.db.database import get_supabase
from app.utils.jwt import get_current_user

router = APIRouter()


def require_officer(current: dict = Depends(get_current_user)):
    if current["role"] not in ("officer", "leader", "admin"):
        raise HTTPException(status_code=403, detail="Officers only")
    return current


@router.get("/dashboard")
def officer_dashboard(
    current: dict = Depends(require_officer),
    sb: Client = Depends(get_supabase),
):
    open_g   = sb.table("grievances").select("id").eq("status", "open").execute()
    active_g = sb.table("grievances").select("id").eq("status", "in_progress").execute()
    closed_g = sb.table("grievances").select("id").eq("status", "resolved").execute()
    return {
        "open":        len(open_g.data),
        "in_progress": len(active_g.data),
        "resolved":    len(closed_g.data),
    }


@router.post("/grievances/{grievance_id}/assign")
def assign_grievance(
    grievance_id: str,
    officer_id: str,
    current: dict = Depends(require_officer),
    sb: Client = Depends(get_supabase),
):
    sb.table("grievances").update({
        "assigned_officer_id": officer_id,
        "status": "in_progress",
    }).eq("id", grievance_id).execute()
    sb.table("ticket_logs").insert({
        "grievance_id": grievance_id,
        "officer_id":   current["sub"],
        "action":       "assigned",
        "notes":        f"Assigned to {officer_id}",
    }).execute()
    return {"ok": True}


@router.post("/grievances/{grievance_id}/resolve")
def resolve_grievance(
    grievance_id: str,
    resolution_notes: str = "",
    current: dict = Depends(require_officer),
    sb: Client = Depends(get_supabase),
):
    sb.table("grievances").update({
        "status": "resolved",
        "resolution_notes": resolution_notes,
    }).eq("id", grievance_id).execute()
    sb.table("ticket_logs").insert({
        "grievance_id": grievance_id,
        "officer_id":   current["sub"],
        "action":       "resolved",
        "notes":        resolution_notes,
    }).execute()
    return {"ok": True}


@router.post("/grievances/{grievance_id}/escalate")
def escalate_grievance(
    grievance_id: str,
    reason: str = "",
    current: dict = Depends(require_officer),
    sb: Client = Depends(get_supabase),
):
    sb.table("grievances").update({"status": "escalated", "priority": "high"}).eq("id", grievance_id).execute()
    sb.table("ticket_logs").insert({
        "grievance_id": grievance_id,
        "officer_id":   current["sub"],
        "action":       "escalated",
        "notes":        reason,
    }).execute()
    return {"ok": True}
