from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Optional
from datetime import datetime, timezone, timedelta
from app.db.database import get_supabase
from app.utils.jwt import get_current_user

router = APIRouter()


def require_officer(current: dict = Depends(get_current_user)):
    if current["role"] in ("citizen",):
        raise HTTPException(status_code=403, detail="Officers only")
    return current


@router.get("/dashboard")
def officer_dashboard(
    current: dict = Depends(require_officer),
    sb: Any = Depends(get_supabase),
):
    open_g   = sb.table("grievances").select("id").eq("status", "open").execute()
    active_g = sb.table("grievances").select("id").eq("status", "in_progress").execute()
    closed_g = sb.table("grievances").select("id").eq("status", "resolved").execute()
    return {
        "open":        len(open_g.data),
        "in_progress": len(active_g.data),
        "resolved":    len(closed_g.data),
    }


@router.get("/tickets")
def list_tickets(
    status:   Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    skip:     int = 0,
    limit:    int = 50,
    current:  dict = Depends(require_officer),
    sb:       Any  = Depends(get_supabase),
):
    q = sb.table("grievances").select("*").order("created_at", desc=True)
    if status:
        q = q.eq("status", status)
    if priority:
        q = q.eq("priority", priority)
    result = q.range(skip, skip + limit - 1).execute()
    return result.data


@router.post("/grievances/{grievance_id}/assign")
def assign_grievance(
    grievance_id: str,
    officer_id: str,
    current: dict = Depends(require_officer),
    sb: Any = Depends(get_supabase),
):
    sb.table("grievances").update({
        "officer_id": officer_id,
        "status": "in_progress",
    }).eq("id", grievance_id).execute()
    sb.table("ticket_logs").insert({
        "grievance_id": grievance_id,
        "actor_id":   current["sub"],
        "action":       "assigned",
        "note":        f"Assigned to {officer_id}",
    }).execute()
    return {"ok": True}


@router.post("/grievances/{grievance_id}/resolve")
def resolve_grievance(
    grievance_id: str,
    resolution_notes: str = "",
    current: dict = Depends(require_officer),
    sb: Any = Depends(get_supabase),
):
    sb.table("grievances").update({
        "status": "resolved",
        "resolution_note": resolution_notes,
    }).eq("id", grievance_id).execute()
    sb.table("ticket_logs").insert({
        "grievance_id": grievance_id,
        "actor_id":   current["sub"],
        "action":       "resolved",
        "note":        resolution_notes,
    }).execute()
    return {"ok": True}


@router.post("/grievances/{grievance_id}/escalate")
def escalate_grievance(
    grievance_id: str,
    reason: str = "",
    current: dict = Depends(require_officer),
    sb: Any = Depends(get_supabase),
):
    sb.table("grievances").update({"status": "escalated", "priority": "high"}).eq("id", grievance_id).execute()
    sb.table("ticket_logs").insert({
        "grievance_id": grievance_id,
        "actor_id":   current["sub"],
        "action":       "escalated",
        "note":        reason,
    }).execute()
    return {"ok": True}


# ── Department Performance Dashboard ────────────────────────────
@router.get("/performance")
def department_performance(
    current: dict = Depends(require_officer),
    sb: Any = Depends(get_supabase),
):
    """Department-level performance: SLA compliance, avg resolution time, category breakdown."""
    now = datetime.now(timezone.utc)

    all_res = sb.table("grievances").select(
        "id, ai_category, priority, status, sla_deadline, created_at, resolved_at, updated_at"
    ).execute()
    rows = all_res.data or []

    total = len(rows)
    resolved = [r for r in rows if r["status"] == "resolved"]
    open_tickets = [r for r in rows if r["status"] not in ("resolved", "closed")]
    escalated = [r for r in rows if r["status"] == "escalated"]

    # SLA compliance: resolved tickets that met their SLA deadline
    sla_met = 0
    for r in resolved:
        sla_str = r.get("sla_deadline")
        resolved_str = r.get("resolved_at") or r.get("updated_at")
        if sla_str and resolved_str:
            sla_dt = datetime.fromisoformat(sla_str.replace("Z", "+00:00"))
            res_dt = datetime.fromisoformat(resolved_str.replace("Z", "+00:00"))
            if res_dt <= sla_dt:
                sla_met += 1
    sla_compliance = round((sla_met / len(resolved) * 100)) if resolved else 100

    # Average resolution time in hours
    resolution_hours = []
    for r in resolved:
        created = r.get("created_at")
        resolved_at = r.get("resolved_at") or r.get("updated_at")
        if created and resolved_at:
            c_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            r_dt = datetime.fromisoformat(resolved_at.replace("Z", "+00:00"))
            resolution_hours.append((r_dt - c_dt).total_seconds() / 3600)
    avg_resolution = round(sum(resolution_hours) / len(resolution_hours), 1) if resolution_hours else 0

    # Category breakdown
    cat_stats: dict[str, dict] = {}
    for r in rows:
        cat = r.get("ai_category") or "General"
        if cat not in cat_stats:
            cat_stats[cat] = {"total": 0, "resolved": 0, "open": 0, "escalated": 0}
        cat_stats[cat]["total"] += 1
        if r["status"] == "resolved":
            cat_stats[cat]["resolved"] += 1
        elif r["status"] == "escalated":
            cat_stats[cat]["escalated"] += 1
        elif r["status"] not in ("resolved", "closed"):
            cat_stats[cat]["open"] += 1
    categories = [{"category": k, **v} for k, v in sorted(cat_stats.items(), key=lambda x: x[1]["total"], reverse=True)]

    # Priority breakdown
    priority_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for r in open_tickets:
        p = r.get("priority", "medium")
        priority_counts[p] = priority_counts.get(p, 0) + 1

    # SLA breached count
    sla_breached = 0
    for r in open_tickets:
        sla_str = r.get("sla_deadline")
        if sla_str:
            sla_dt = datetime.fromisoformat(sla_str.replace("Z", "+00:00"))
            if now > sla_dt:
                sla_breached += 1

    return {
        "total_grievances": total,
        "total_resolved": len(resolved),
        "total_open": len(open_tickets),
        "total_escalated": len(escalated),
        "sla_compliance_pct": sla_compliance,
        "avg_resolution_hours": avg_resolution,
        "sla_breached": sla_breached,
        "priority_breakdown": priority_counts,
        "category_breakdown": categories,
    }
