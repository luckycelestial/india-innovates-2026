---
marp: true
theme: default
paginate: true
---

# 🇮🇳 PRAJA

### AI-Powered Citizen Grievance & Constituency Intelligence Platform

India Innovates 2026

---

# The Problem

- CPGRAMS resolves only **40%** of complaints on time
- Average resolution: **45–90 days** per complaint
- Portal is English-only — illiterate citizens are excluded
- Leaders have **zero** real-time ward visibility
- Citizens re-submit to the **wrong ministry** repeatedly

> PRAJA fixes all five with AI + multi-channel access

---

# Three Modules

**📢 GrievanceOS**
Citizens file via Web, WhatsApp, SMS, or Voice call
Auto-classifies department and scores priority

**🧠 NayakAI**
AI assistant for elected leaders
Morning brief, Q&A, document summarizer, speech drafter

**📡 SentinelPulse**
Ward-level sentiment heatmap
Alerts leaders when mood turns critical

---

# Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + Python 3.12 |
| Database | Supabase PostgreSQL |
| AI / LLM | Groq — LLaMA 3.3-70b (free) |
| Frontend | React 18 + Vite |
| Auth | JWT + bcrypt |
| Messaging | Twilio SMS + Voice + WhatsApp |
| Hosting | Vercel frontend + backend |

**Total cost: $0** — all free tiers

---

# System Architecture

```
Citizen  →  FastAPI Backend  →  Groq AI (classify + priority)
                ↓
         Supabase Database
                ↓
    React Dashboard  →  Officer & Leader views
                ↓
         Twilio  →  SMS reply to citizen
```

---

# GrievanceOS — Filing Flow

1. Citizen sends message in any Indian language
2. Google Translate detects and converts to English
3. Groq LLM classifies department + priority (P1–P5)
4. Stored in Supabase, unique **PRJ-XXXXXX** ID issued
5. Citizen gets SMS confirmation with tracking ID
6. Officer dashboard shows new complaint, auto-routed

---

# Priority Levels

| Priority | Label | SLA |
|---|---|---|
| P1 | Critical | 24 hours |
| P2 | High | 72 hours |
| P3 | Medium | 7 days |
| P4 | Low | Standard |
| P5 | Info | No SLA |

Breaching SLA → **auto-escalate** to next tier

---

# Escalation Ladder

```
Citizen
  → Ward Officer      (P1: 24h, P2: 72h)
    → Municipality    (if unresolved)
      → MLA / MP      (if still pending)
        → State Dept  (final escalation)
```

Each step:
- Notifies next tier via SMS
- Logs timestamp in audit trail
- Shows on leader dashboard live

---

# Input Channels

**Web Portal**
React form → authenticated, supports photo + GPS

**WhatsApp**
Twilio +14155238886 → any language, no app needed

**SMS**
Twilio +1-236-204-3968 → works on any basic phone

**Voice IVR**
Call +1-236-204-3968 → speak → AI classifies → SMS reply

---

# NayakAI Features

**Morning Brief** — daily summary of unresolved complaints, SLA breaches, sentiment score

**Governance Q&A** — ask anything about your constituency, Groq answers from live data

**Document Summarizer** — upload PDF → AI extracts key points and eligibility

**Speech Drafter** — event context → full inauguration or rally speech in Hindi + English

---

# SentinelPulse

**How it works**
- Ingests complaint volume + resolution rate per ward every 15 minutes
- Computes a mood index: 🟢 Calm · 🟡 Tense · 🔴 Critical

**Alerts**
- SMS push to elected leader when ward crosses threshold
- Dashboard notification with ward name and top issues
- 7-day and 30-day trend charts for root-cause analysis

---

# Roles & Security

| Role | Access |
|---|---|
| Citizen | File, track, chat |
| Officer | View assigned, update status |
| Leader | NayakAI, SentinelPulse, all wards |
| Admin | Full system, user management |

- JWT 60-min tokens · bcrypt hashing
- Supabase Row-Level Security
- HTTPS enforced on Vercel

---

# Deployment

**Frontend** — React + Vite on Vercel CDN

**Backend** — FastAPI on Vercel serverless (`api/index.py`)

**Database** — Supabase PostgreSQL, region ap-south-1 Mumbai

**Twilio Webhooks**
- `/api/whatsapp/inbound`
- `/api/sms/inbound`
- `/api/voice/inbound`

---

# Impact

| Metric | Value |
|---|---|
| Citizens reachable via SMS/Voice | 800 Million+ |
| Misdirected complaints reduced | ~70% |
| Languages supported | 10+ Indian languages |
| Infrastructure cost | $0 |

**GrievanceOS · NayakAI · SentinelPulse**
*Bridging citizens and governance with AI*

🇮🇳 India Innovates 2026
