# PRAJA — India Innovates 2026 | Hackathon Checklist

> **Deadline:** March 28, 2026 · Team: India Innovates · Budget: $0

---

## 🏗️ Infrastructure

- [x] Supabase project created (`bbakxtofuxkxzfbexlll`, ap-south-1)
- [x] Supabase schema — `users`, `grievances`, `departments`, `wards`, `ticket_logs` tables
- [x] Supabase RLS policies enabled
- [x] FastAPI backend scaffolded (`praja/backend`)
- [x] React + Vite frontend scaffolded (`praja/frontend`)
- [x] Backend deployed on Vercel (`praja-backend.vercel.app`)
- [x] Frontend deployed on Vercel (`prajavox.vercel.app`)
- [x] Custom domain (optional)

---

## 🔐 Auth

- [x] JWT auth (register / login) working
- [x] Roles: `citizen`, `officer`, `leader`, `admin`
- [x] Test accounts created (`test99@test.com`, `officer@test.com`, `leader@test.com` — pw: `Test1234`)
- [x] Password hashing with `pbkdf2_hmac` (Python 3.12 compatible)
- [ ] Password reset flow
- [ ] Email verification (optional for hackathon)

---

## 📢 Module 1 · GrievanceOS

- [x] Citizen can submit grievance via web UI
- [x] `POST /api/grievances/submit` returns `tracking_id` (format: `PRJ-YYMMDD-XXXXXX`)
- [x] AI auto-classifies department + priority (Groq `llama-3.3-70b-versatile`)
- [x] Tamil / Hindi / Tanglish translation via `deep-translator` (Google Translate) before classification
- [x] Critical auto-flag: suicide/threats → `priority=critical`
- [x] WhatsApp bot (Twilio sandbox) — receive complaint, save to DB, reply with tracking ID
- [x] WhatsApp `track PRJ-...` command to check status
- [ ] Officer web dashboard — accept / resolve / escalate tickets ✅ (UI done, API needs test)
- [x] SLA deadline auto-set on ticket creation
- [ ] Push notification when ticket status changes
- [ ] Attach photo/image to grievance (media_url)

---

## 🤖 Module 2 · NayakAI

- [x] `POST /api/nayakai/morning-brief` — daily constituency summary
- [x] `POST /api/nayakai/summarize` — summarize long document
- [x] `POST /api/nayakai/speech` — draft public speech from key points
- [x] `POST /api/nayakai/letter` — draft formal government letter
- [x] Leader dashboard UI with tab nav (Morning Brief / Alerts / NayakAI / Heatmap)
- [x] NayakAI Q&A / chat interface
- [ ] Export speech/letter as PDF/DOCX

---

## 🛰️ Module 3 · SentinelPulse

- [x] `GET /api/sentinel/alerts` — ward-level sentiment alerts
- [x] `GET /api/sentinel/heatmap` — ward sentiment scores
- [x] Leaflet.js ward heatmap on leader dashboard
- [ ] Auto-alert when ward sentiment < threshold
- [ ] Sentiment trend graph (line chart)

---

## 🎨 Frontend / UX

- [x] Light theme — saffron / navy / green (Indian tricolor palette)
- [x] Tricolor strip on all pages
- [x] Hindi / bilingual labels (Noto Sans Devanagari)
- [x] Citizen dashboard — submit complaint + view ticket history
- [x] Officer dashboard — filter / update tickets
- [x] Leader dashboard — brief, alerts, NayakAI, heatmap placeholder
- [ ] Mobile responsive polish
- [ ] Loading skeletons / empty states
- [x] Toast notifications on submit success/error

---

## 🧪 Testing

- [ ] Test WhatsApp bot end-to-end with Twilio sandbox
- [ ] Test Tamil/Tanglish complaint classification accuracy
- [ ] Test critical complaint auto-flag (suicide/threat keywords)
- [ ] Stress test Groq rate limits (14,400 req/day)
- [x] Load test Supabase free tier (500MB DB, 2GB bandwidth)

---

## 📦 Submission

- [ ] Demo video (3–5 min)
- [ ] Final README with setup instructions
- [ ] Slide deck (10 slides max)
- [ ] GitHub repo public
- [ ] Submit on India Innovates portal by **March 28, 2026 11:59 PM IST**

---

## 🔗 Quick Links

| Resource | URL |
|---|---|
| Frontend | https://prajavox.vercel.app |
| Backend API | https://praja-backend.vercel.app |
| Supabase Dashboard | https://supabase.com/dashboard/project/bbakxtofuxkxzfbexlll |
| Backend Vercel | https://vercel.com/luckycelestials-projects/praja-backend |
| Frontend Vercel | https://vercel.com/luckycelestials-projects/india-innovates-2026 |
| GitHub Repo | https://github.com/luckycelestial/india-innovates-2026 |
| Twilio Sandbox | WhatsApp `+1 415 523 8886` · join code: see Twilio console |