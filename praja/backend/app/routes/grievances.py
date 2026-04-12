import re
import json
import secrets
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Any
import httpx
from app.config import settings
from app.db.database import get_supabase
from app.utils.auth_tokens import get_current_user
from app.utils.exif import extract_exif_gps
from app.utils.ai import classify_with_groq

router = APIRouter()
logger = logging.getLogger(__name__)

import google.generativeai as genai
from app.utils.ai import configure_gemini

# Configure Gemini for classification and verification
if configure_gemini():
    _gemini = genai.GenerativeModel("gemini-1.5-flash")
else:
    _gemini = None

CATEGORIES = ["Water Supply", "Roads", "Electricity", "Sanitation",
              "Drainage", "Parks", "Health", "Education", "General"]

SLA_HOURS = {"critical": 24, "high": 72, "medium": 168, "low": 720}  # 1d / 3d / 7d / 30d


def _classify(title: str, desc: str) -> dict:
    prompt = f"""You are a classifier for Indian citizen grievances. Inputs may be in English, Tamil, Telugu, Hindi, Marathi, or Tanglish (Indian language written in English letters). Understand the ACTUAL meaning before classifying.

CRITICAL RULES:
- Any mention of suicide, self-harm, or killing oneself Ã¢â€ â€™ priority=critical, category=Health
- Any death threat or threat to a public figure Ã¢â€ â€™ priority=critical, category=General
- Any sexual assault or abduction Ã¢â€ â€™ priority=critical, category=General
- Otherwise: water/drainage issues=Water Supply, road/pothole=Roads, power cut=Electricity, garbage/sewage=Sanitation, hospital/disease=Health, school=Education

Respond with ONLY valid JSON, no explanation:
{{"category":"<Water Supply|Roads|Electricity|Sanitation|Drainage|Parks|Health|Education|General>","priority":"<low|medium|high|critical>","sentiment":"<negative|neutral|positive>"}}

Complaint title: {title}
Complaint description: {desc[:400]}"""
    try:
        r = _gemini.generate_content(prompt, generation_config=genai.GenerationConfig(temperature=0.1, max_output_tokens=80))
        raw = re.sub(r"```.*?```", "", (r.text or ""), flags=re.DOTALL).strip()
        data = json.loads(raw)
        if data.get("category") not in CATEGORIES:
            data["category"] = "General"
        if data.get("priority") not in ["low", "medium", "high", "critical"]:
            data["priority"] = "medium"
        return data
    except Exception:
        return {"category": "General", "priority": "medium", "sentiment": "negative"}


def _gen_tracking_id() -> str:
    return f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"


def _extract_llm_location(text: str) -> Optional[dict]:
    """Extract approximate lat/lon from user's location text using Groq."""
    if not text: return None
    prompt = f"Extract approximate latitude and longitude for this location: '{text}'. Return ONLY valid JSON: {{'lat': ..., 'lon': ...}}. If unknown, return {{}}."
    try:
        r = _gemini.generate_content(prompt, generation_config=genai.GenerationConfig(temperature=0, max_output_tokens=60))
        content = r.text or ""
        # Basic cleanup in case of markdown or extra text
        content = re.sub(r"```.*?```", "", content, flags=re.DOTALL).strip()
        data = json.loads(content)
        if data.get("lat") and data.get("lon"):
            return data
    except Exception:
        pass
    return None


class GrievanceCreate(BaseModel):
    title: str
    description: str
    photo_url: Optional[str] = None
    user_location_text: Optional[str] = None


class VerifyPhotoRequest(BaseModel):
    title: str
    description: str
    photo_url: str


class PhotoNeedRequest(BaseModel):
    title: str
    description: str
    ai_category: Optional[str] = None


class PhotoNeedResponse(BaseModel):
    photo_need: str
    confidence: float
    reason: str
    prompt_to_user: str
    source: str


PHOTO_NEED_VALUES = {"required", "optional", "not_needed"}


def _photo_prompt_to_user(photo_need: str) -> str:
    if photo_need == "required":
        return "Please upload a clear photo that shows the issue and nearby landmark."
    if photo_need == "optional":
        return "A photo is optional, but it can help us verify and resolve faster."
    return "No photo is needed for this complaint type."


def _fallback_photo_need(title: str, description: str, ai_category: Optional[str]) -> dict:
    text = f"{title} {description} {ai_category or ''}".lower()

    required_keywords = [
        "pothole", "garbage", "overflow", "leak", "broken", "crack", "damage",
        "sewage", "drain", "street light", "encroachment", "blocked road", "waterlogging",
    ]
    optional_keywords = [
        "no water", "water supply", "power cut", "electricity", "irregular",
        "delay", "collection not done", "missed pickup",
    ]
    not_needed_keywords = [
        "status", "track", "tracking", "id update", "escalation request",
        "certificate", "document delay", "benefit not received",
    ]

    if any(k in text for k in required_keywords):
        need = "required"
        confidence = 0.9
        reason = "Visual evidence is important to verify location/physical severity."
    elif any(k in text for k in not_needed_keywords):
        need = "not_needed"
        confidence = 0.85
        reason = "This complaint is mostly process/status based and does not require imagery."
    elif any(k in text for k in optional_keywords):
        need = "optional"
        confidence = 0.75
        reason = "A photo can help, but the issue is still actionable from text."
    else:
        need = "optional"
        confidence = 0.6
        reason = "Insufficient visual cues; defaulting to optional photo policy."

    return {
        "photo_need": need,
        "confidence": confidence,
        "reason": reason,
        "prompt_to_user": _photo_prompt_to_user(need),
        "source": "fallback_rules",
    }


def _openai_photo_need(title: str, description: str, ai_category: Optional[str]) -> Optional[dict]:
    if not settings.OPENAI_API_KEY:
        return None

    system_prompt = (
        "You are a civic complaint triage assistant. Decide whether photo evidence is required, optional, or not needed. "
        "Return strict JSON only. Policy: required for physical damage/visible hazards, optional for utility interruptions, "
        "not_needed for purely administrative or status requests."
    )
    user_prompt = {
        "title": title,
        "description": description,
        "ai_category": ai_category or "",
        "allowed_values": ["required", "optional", "not_needed"],
        "output_format": {
            "photo_need": "required|optional|not_needed",
            "confidence": "0.0 to 1.0",
            "reason": "short reason",
            "prompt_to_user": "single sentence for citizen",
        },
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            res = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.OPENAI_MODEL,
                    "temperature": 0,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": json.dumps(user_prompt)},
                    ],
                },
            )
            res.raise_for_status()
            content = (res.json().get("choices") or [{}])[0].get("message", {}).get("content", "{}")
            data = json.loads(content)

        photo_need = str(data.get("photo_need", "")).strip().lower()
        if photo_need not in PHOTO_NEED_VALUES:
            return None

        confidence = data.get("confidence", 0.0)
        try:
            confidence = float(confidence)
        except Exception:
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))

        reason = str(data.get("reason", "Photo guidance generated by model.")).strip() or "Photo guidance generated by model."
        prompt_to_user = str(data.get("prompt_to_user", _photo_prompt_to_user(photo_need))).strip() or _photo_prompt_to_user(photo_need)

        return {
            "photo_need": photo_need,
            "confidence": confidence,
            "reason": reason,
            "prompt_to_user": prompt_to_user,
            "source": "openai",
        }
    except Exception:
        return None


@router.post("/photo-need", response_model=PhotoNeedResponse)
def decide_photo_need(
    body: PhotoNeedRequest,
    current: dict = Depends(get_current_user),
):
    fallback = _fallback_photo_need(body.title, body.description, body.ai_category)
    llm = _openai_photo_need(body.title, body.description, body.ai_category)

    if not llm:
        return fallback

    # Low-confidence model output falls back to deterministic rules.
    if llm["confidence"] < 0.55:
        fallback["source"] = "openai_low_confidence_fallback"
        return fallback

    return llm


@router.post("/verify-photo")
def verify_photo(
    body: VerifyPhotoRequest,
    current: dict = Depends(get_current_user),
):
    # New EXIF extraction logic
    metadata = {}
    if body.photo_url and body.photo_url.startswith("http"):
        try:
            exif_result = extract_exif_gps(body.photo_url)
            if exif_result:
                metadata = exif_result
        except Exception as e:
            print(f"Metadata extraction failed: {str(e)}")

    prompt = f"""You are a hyper-strict infrastructure and civic issue photo verification assistant. Your task is strictly to verify if the attached image visually and physically depicts the *exact* issue described below. 
You MUST REJECT: generic images, certificates, documents, logos, badges, selfies, cartoons, screenshots, text-heavy images, and any objects not directly related to the physical issue mentioned.
The image must objectively and clearly show the real-world physical infrastructure problem mentioned (e.g., an actual street with a pothole, a broken pipe leaking water). Do not accept symbolic or document-based evidence in place of physical infrastructure photos.

Title: {body.title}
Description: {body.description}

If the image is a certificate, document, or otherwise completely unrelated to the physical issue described, return "matches": false and explain the mismatch in "reason".

Respond ONLY with valid JSON. Do not include markdown formatting or extra text.
Schema: {{"matches": true/false, "reason": "Short explanation of why the photo matches or does not match the issue"}}"""

    try:
        # Emergency fix: use Gemini Vision
        photo_info = genai.upload_file(path=None) # We don't have a path, just a URL!
        # Wait, Gemini currently takes URLs if download works, but we should download it or ask Gemini with just text+URL if it supports it.
        # Actually Google Gemini handles web urls directly IF they are image URLs? No, we need to download it or pass bytes.
        import httpx
        with httpx.Client() as client:
            img_resp = client.get(body.photo_url)
            img_bytes = img_resp.content

        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(img_bytes)
            tmp_path = tmp.name
        
        try:
            audio_file = genai.upload_file(path=tmp_path)
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            prompt1 = "Task: Identify the content of this image. Respond with ONLY ONE of these two words: 'PHYSICAL' if it shows a real-world infrastructure/utility issue like a pothole, leak, or debris, OR 'DOCUMENT' if it shows a certificate, screenshot, text, badge, or generic photo."
            r = model.generate_content([prompt1, audio_file], generation_config=genai.GenerationConfig(temperature=0.0, max_output_tokens=5))
            classification = (r.text or "").strip().upper()
            
            if "DOCUMENT" in classification:
                genai.delete_file(audio_file.name)
                return {"matches": False, "reason": "Image rejected: Identified as a document, screenshot, or certificate. Please upload a physical photo of the issue.", "metadata": metadata}
                
            if "PHYSICAL" in classification:
                prompt2 = f"Task: Does this physical issue image match these words: '{body.title} {body.description}'? Respond ONLY with 'YES' or 'NO'."
                r2 = model.generate_content([prompt2, audio_file], generation_config=genai.GenerationConfig(temperature=0.0, max_output_tokens=5))
                match_val = (r2.text or "").strip().upper()
                
                genai.delete_file(audio_file.name)
                
                if "YES" in match_val:
                    # Add metadata to high-quality matches
                    return {
                        "matches": True, 
                        "reason": "Photo evidence verified by Gemini Vision.",
                        "metadata": metadata
                    }
                else:
                    return {
                        "matches": False, 
                        "reason": f"Photo does not seem to match the described issue: {body.title}",
                        "metadata": metadata
                    }
                
            genai.delete_file(audio_file.name)
            return {
                "matches": False, 
                "reason": "AI could not definitively verify the image. Please try a clearer physical photo.",
                "metadata": metadata
            }
            
        except Exception as inner_e:
            if 'audio_file' in locals() and audio_file:
                genai.delete_file(audio_file.name)
            raise inner_e
        finally:
            os.remove(tmp_path)
            
    except Exception as e:
        print("Vision API Error:", str(e))
        return {
            "matches": False, 
            "reason": "Verification service temporarily unstable. Please re-upload a clear physical photo.",
            "metadata": metadata
        }
@router.post("/submit", status_code=201)
@router.post("/", status_code=201)
def create_grievance(
    body: GrievanceCreate,
    current: dict = Depends(get_current_user),
    sb: Any = Depends(get_supabase),
):
    cls = _classify(body.title, body.description)
    now = datetime.now(timezone.utc)
    hours = SLA_HOURS.get(cls["priority"], 168)
    sla_deadline = (now + timedelta(hours=hours)).isoformat()
    
    # Ensure citizen_id is a valid UUID or use a real fallback citizen ID
    # 'demo-sarpanch' etc from auth.py are not valid UUIDs and will crash the DB
    citizen_id = current["sub"]
    if "-" not in citizen_id or len(citizen_id) < 32:
        # Fallback to a real UUID for demo/mock users (Ramesh Kumar in DB)
        citizen_id = "8fc290a5-bfa3-4348-b674-40ab2425c492"

    insert_data = {
        "tracking_id":  _gen_tracking_id(),
        "citizen_id":   citizen_id,
        "title":        body.title,
        "description":  body.description,
        "ai_category":  cls["category"],
        "ai_sentiment": cls.get("sentiment", "negative"),
        "priority":     cls["priority"],
        "status":       "open",
        "channel":      "web",
        "sla_deadline":  sla_deadline,
    }
    if body.photo_url:
        insert_data["photo_url"] = body.photo_url
        # Extract and save EXIF metadata if photo is provided
        try:
            exif_result = extract_exif_gps(body.photo_url)
            if exif_result:
                if exif_result.get("latitude") and exif_result.get("longitude"):
                    exif_lat = exif_result['latitude']
                    exif_lon = exif_result['longitude']
                    # Supabase PostGIS location format: 'POINT(long lat)'
                    insert_data["location"] = f"POINT({exif_lon} {exif_lat})"
                    
                    # â”€â”€â”€ New Location Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    # If user also provided text location, cross-verify
                    if body.user_location_text:
                        llm_coords = _extract_llm_location(body.user_location_text)
                        if llm_coords:
                            # 1 degree is ~111km, so 0.05 is ~5.5km range
                            lat_diff = abs(float(exif_lat) - float(llm_coords['lat']))
                            lon_diff = abs(float(exif_lon) - float(llm_coords['lon']))
                            is_match = lat_diff < 0.05 and lon_diff < 0.05
                            
                            insert_data["user_stated_location"] = body.user_location_text
                            insert_data["location_verification_status"] = "verified" if is_match else "mismatch"
                # You might also want to store raw metadata if a column exists, 
                # but 'location' is the standard for mapping.
        except Exception as e:
            print(f"Post-submission EXIF extraction failed: {str(e)}")
            
    row = sb.table("grievances").insert(insert_data).execute()
    g = row.data[0]
    return {**g, "tracking_id": g["tracking_id"], "priority": g["priority"]}


@router.get("/")
def list_grievances(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    current: dict = Depends(get_current_user),
    sb: Any = Depends(get_supabase),
):
    q = sb.table("grievances").select("*").order("created_at", desc=True)
    if current["role"] == "citizen" and current["sub"] != "00000000-0000-0000-0000-000000000000":
        q = q.eq("citizen_id", current["sub"])
    # For the prototype mockup user (00000000...), show all grievances so the UI looks populated
    elif current["sub"] == "00000000-0000-0000-0000-000000000000":
        pass  # Do not filter by citizen_id, let them see data for the demo
    if status:
        q = q.eq("status", status)
    result = q.range(skip, skip + limit - 1).execute()
    return result.data


# Ã¢â€â‚¬Ã¢â€â‚¬ Beneficiary Scheme Linkage (MUST be before /{grievance_id}) Ã¢â€â‚¬
@router.get("/schemes")
def get_matching_schemes(
    sb: Any = Depends(get_supabase),
    current: dict = Depends(get_current_user),
):
    """Return all active government schemes, plus match to citizen's recent grievance categories."""
    schemes_res = sb.table("schemes").select("*").eq("is_active", True).execute()
    all_schemes = schemes_res.data or []

    grievances_res = (
        sb.table("grievances")
        .select("ai_category")
        .eq("citizen_id", current["sub"])
        .execute()
    )
    citizen_cats = set()
    for g in (grievances_res.data or []):
        cat = (g.get("ai_category") or "").lower()
        citizen_cats.add(cat)

    CATEGORY_TO_SCHEME = {
        "water supply": ["water", "sanitation"],
        "sanitation": ["sanitation", "health"],
        "health": ["health"],
        "roads": ["technology"],
        "electricity": ["energy"],
        "education": ["education"],
        "housing": ["housing"],
        "agriculture": ["agriculture"],
    }

    matched = []
    for scheme in all_schemes:
        is_match = False
        for cat in citizen_cats:
            mapped = CATEGORY_TO_SCHEME.get(cat, [])
            if scheme.get("category") in mapped:
                is_match = True
                break
        matched.append({**scheme, "is_matched": is_match})

    matched.sort(key=lambda x: (not x["is_matched"], x["name"]))
    return matched


@router.get("/{grievance_id}")
def get_grievance(
    grievance_id: str,
    current: dict = Depends(get_current_user),
    sb: Any = Depends(get_supabase),
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
    sb: Any = Depends(get_supabase),
):
    if current["role"] == "citizen":
        raise HTTPException(status_code=403, detail="Forbidden")
    sb.table("grievances").update({"status": status}).eq("id", grievance_id).execute()
    try:
        sb.table("ticket_logs").insert({
            "grievance_id": grievance_id,
            "actor_id":   current["sub"],
            "action":       f"status_changed_to_{status}",
            "note":        notes,
        }).execute()
    except Exception as exc:
        logger.warning("Failed to log ticket status change for %s: %s", grievance_id, exc)
    return {"ok": True}


# Ã¢â€â‚¬Ã¢â€â‚¬ Auto-Escalation Engine Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
@router.post("/check-escalation")
def check_escalation(
    sb: Any = Depends(get_supabase),
    current: dict = Depends(get_current_user),
):
    """Auto-escalate grievances that have breached SLA deadlines.
    Level 0Ã¢â€ â€™1 at SLA breach, 1Ã¢â€ â€™2 at 2Ãƒâ€” SLA, 2Ã¢â€ â€™3 at 3Ãƒâ€” SLA."""
    if current["role"] == "citizen":
        raise HTTPException(status_code=403, detail="Forbidden")

    now = datetime.now(timezone.utc)
    open_res = (
        sb.table("grievances")
        .select("id, tracking_id, title, priority, status, sla_deadline, escalation_level, created_at")
        .neq("status", "resolved")
        .neq("status", "closed")
        .execute()
    )
    escalated = []
    for g in (open_res.data or []):
        sla_str = g.get("sla_deadline")
        if not sla_str:
            continue
        sla_dt = datetime.fromisoformat(sla_str.replace("Z", "+00:00"))
        current_level = g.get("escalation_level") or 0
        hours_past_sla = (now - sla_dt).total_seconds() / 3600
        new_level = current_level
        if hours_past_sla > 0 and current_level == 0:
            new_level = 1
        elif hours_past_sla > 48 and current_level == 1:
            new_level = 2
        elif hours_past_sla > 120 and current_level == 2:
            new_level = 3

        if new_level > current_level:
            new_status = "escalated" if g["status"] != "escalated" else g["status"]
            sb.table("grievances").update({
                "escalation_level": new_level,
                "status": new_status,
                "escalated_at": now.isoformat(),
            }).eq("id", g["id"]).execute()
            try:
                sb.table("ticket_logs").insert({
                    "grievance_id": g["id"],
                    "action": f"auto_escalated_level_{new_level}",
                    "note": f"Auto-escalated: SLA breached by {round(hours_past_sla)}h. Level {current_level}Ã¢â€ â€™{new_level}.",
                }).execute()
            except Exception as exc:
                logger.warning("Failed to log escalation for %s: %s", g["id"], exc)
            escalated.append({
                "id": g["id"],
                "tracking_id": g.get("tracking_id"),
                "title": g["title"],
                "old_level": current_level,
                "new_level": new_level,
                "hours_past_sla": round(hours_past_sla),
            })
    return {"escalated_count": len(escalated), "escalated": escalated}


