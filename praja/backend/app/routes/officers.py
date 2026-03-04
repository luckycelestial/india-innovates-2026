from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Optional
from datetime import datetime, timezone, timedelta
from app.db.database import get_supabase
from app.utils.jwt import get_current_user

router = APIRouter()


def require_officer(current: dict = Depends(get_current_user)):
    # Bypassed strict officer check for prototype. Allow everyone to view it.
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


# ── Analytics: 30-day Daily Trends ──────────────────────────────
@router.get("/analytics/trends")
def analytics_trends(
    current: dict = Depends(require_officer),
    sb: Any = Depends(get_supabase),
):
    """Daily created & resolved counts for the last 30 days."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=30)
    since_iso = since.isoformat()

    rows = (
        sb.table("grievances")
        .select("created_at, resolved_at, status")
        .gte("created_at", since_iso)
        .execute()
    ).data or []

    # build day buckets
    buckets: dict[str, dict] = {}
    for d in range(31):
        key = (now - timedelta(days=30 - d)).strftime("%Y-%m-%d")
        buckets[key] = {"date": key, "created": 0, "resolved": 0}

    for r in rows:
        day = r["created_at"][:10]
        if day in buckets:
            buckets[day]["created"] += 1
        res_at = r.get("resolved_at")
        if res_at and r["status"] == "resolved":
            res_day = res_at[:10]
            if res_day in buckets:
                buckets[res_day]["resolved"] += 1

    return sorted(buckets.values(), key=lambda x: x["date"])


# ── Analytics: Resolution Time Distribution ─────────────────────
@router.get("/analytics/resolution-times")
def analytics_resolution_times(
    current: dict = Depends(require_officer),
    sb: Any = Depends(get_supabase),
):
    """Histogram of resolution durations for resolved tickets."""
    rows = (
        sb.table("grievances")
        .select("created_at, resolved_at, updated_at")
        .eq("status", "resolved")
        .execute()
    ).data or []

    labels = ["0-6h", "6-12h", "12-24h", "1-2d", "2-3d", "3-5d", "5d+"]
    limits = [6, 12, 24, 48, 72, 120, float("inf")]
    counts = [0] * len(labels)

    for r in rows:
        created = r.get("created_at")
        resolved = r.get("resolved_at") or r.get("updated_at")
        if not (created and resolved):
            continue
        c_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        r_dt = datetime.fromisoformat(resolved.replace("Z", "+00:00"))
        hours = (r_dt - c_dt).total_seconds() / 3600
        for i, lim in enumerate(limits):
            if hours <= lim:
                counts[i] += 1
                break

    return [{"bucket": labels[i], "count": counts[i]} for i in range(len(labels))]


# ── Analytics: Hourly Heatmap ───────────────────────────────────
@router.get("/analytics/hourly-heatmap")
def analytics_hourly_heatmap(
    current: dict = Depends(require_officer),
    sb: Any = Depends(get_supabase),
):
    """7×24 matrix of submission counts (day-of-week × hour, IST)."""
    rows = (
        sb.table("grievances")
        .select("created_at")
        .execute()
    ).data or []

    ist = timezone(timedelta(hours=5, minutes=30))
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    matrix: list[dict] = []

    grid: dict[tuple[int, int], int] = {}
    for r in rows:
        dt = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")).astimezone(ist)
        key = (dt.weekday(), dt.hour)
        grid[key] = grid.get(key, 0) + 1

    for dow in range(7):
        for hr in range(24):
            matrix.append({
                "day": day_names[dow],
                "hour": hr,
                "count": grid.get((dow, hr), 0),
            })

    return matrix

# ?? AI Morning Briefing ??
@router.get("/briefing")
def get_ai_briefing(
    current: dict = Depends(require_officer),
    sb: Any = Depends(get_supabase),
):
    """Generate an AI morning briefing based on recent grievances."""
    # Fetch recent open or escalated tickets
    res = sb.table("grievances").select("title, ai_category, priority, status").neq("status", "resolved").order("created_at", desc=True).limit(50).execute()
    tickets = res.data or []
    
    if not tickets:
        return {"briefing": "Good morning. There are no pending critical issues. Your ward is clear."}
        
    summary_text = '\n'.join([f"- {t['title']} ({t.get('ai_category', 'General')}, Priority: {t.get('priority', 'medium')}, Status: {t.get('status', 'open')})" for t in tickets[:20]])
    
    prompt = f"""You are an AI Chief of Staff for a government official. Write a short, punchy morning briefing based on these active citizen grievances. 
Format it nicely in Markdown. Include:
1. A quick executive summary.
2. The Top 3 critical issues requiring immediate attention.
3. A suggested action item for today.

Here is the raw grievance data:
{summary_text}"""

    try:
        r = _groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.3,
        )
        briefing = r.choices[0].message.content
        return {"briefing": briefing}
    except Exception as e:
        return {"briefing": f"Failed to generate briefing. Raw data shows {len(tickets)} open issues."}


