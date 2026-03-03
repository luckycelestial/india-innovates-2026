# PRAJA — Copilot Workspace Instructions

This file is read automatically by GitHub Copilot on every request.
It is the single source of truth for project constraints and context.

---

## Hard Constraints

- **$0 budget — no paid services, ever.** Every dependency, API, and platform must have a free tier that covers the entire hackathon (March 3–28, 2026). Before suggesting any service, confirm it has a free tier that fits.
- **Hackathon deadline: March 28, 2026.** Prefer working code over perfect code.
- **Team is not a company.** No credit cards, no trials that auto-charge.

---

## Project: PRAJA

AI-powered Citizen Grievance & Constituency Intelligence Platform.
India Innovates 2026 hackathon entry.

### Three modules:
1. **GrievanceOS** — Citizens report complaints via web or WhatsApp. Auto-classifies department + priority.
2. **NayakAI** — AI assistant for elected leaders: governance Q&A, document summarizer, speech drafter, morning brief.
3. **SentinelPulse** — Real-time ward-level sentiment heatmap from social posts. Alerts when mood goes critical.

---

## Tech Stack (all free)

| Layer | Technology | Free Plan |
|---|---|---|
| Backend | FastAPI + Python 3.14 | Self-hosted |
| Database | Supabase (project: `bbakxtofuxkxzfbexlll`, region: ap-south-1) | Free tier |
| AI / LLM | Groq API — `llama-3.3-70b-versatile` | Free (14,400 req/day) |
| Frontend | React 18 + Vite | Self-hosted |
| Auth | Custom JWT (python-jose + bcrypt) | Self-hosted |
| WhatsApp | Twilio Sandbox | Free (demo/testing only) |
| Hosting | Vercel (frontend) + Render free tier (backend) | Free |

---

## Supabase Project

- Project ID: `bbakxtofuxkxzfbexlll`
- URL: `https://bbakxtofuxkxzfbexlll.supabase.co`
