# PRAJA â€” Copilot Workspace Instructions

This file is read automatically by GitHub Copilot on every request.
It is the single source of truth for project constraints and context.

---

## Agent Verification Protocol (MANDATORY)

After EVERY code change push to GitHub:
1. Use Chrome DevTools (activate browser tools) to open the live Vercel URL
2. Check the Console tab for errors
3. Check the Network tab for failed requests (red rows)
4. Visually verify the changed UI element looks correct
5. If anything is broken, FIX IT and push again before reporting success to the user
6. Only report "Done" / success to the user AFTER the deployed site is verified working in Chrome

**Never report success before verifying in Chrome.**

---

## Hard Constraints

- **$0 budget â€” no paid services, ever.** Every dependency, API, and platform must have a free tier that covers the entire hackathon (March 3â€“28, 2026). Before suggesting any service, confirm it has a free tier that fits.
- **Hackathon deadline: March 28, 2026.** Prefer working code over perfect code.
- **Team is not a company.** No credit cards, no trials that auto-charge.

---

## Project: PRAJA

AI-powered Citizen Grievance & Constituency Intelligence Platform.
India Innovates 2026 hackathon entry.

### Two modules:
1. **GrievanceOS** â€” Citizens report complaints via web or WhatsApp. Auto-classifies department + priority.
2. **SentinelPulse** â€” Real-time ward-level sentiment heatmap from social posts. Alerts when mood goes critical.

---

## Tech Stack (all free)

| Layer | Technology | Free Plan |
|---|---|---|
| Backend | FastAPI + Python 3.14 | Self-hosted |
| Database | Supabase (project: `grcaskbmwpvxnmrdkqte`, region: ap-south-1) | Free tier |
| AI / LLM | Groq API — `llama-3.3-70b-versatile` | Free (14,400 req/day) |
| Frontend | React 18 + Vite | Self-hosted |
| Auth | Custom Token (bcrypt) | Self-hosted |
| WhatsApp | Twilio Sandbox | Free (demo/testing only) |
| Hosting | Vercel (frontend & backend) | Free |

---

## Supabase Project

- Project ID: `grcaskbmwpvxnmrdkqte`
- URL: `https://grcaskbmwpvxnmrdkqte.supabase.co`
