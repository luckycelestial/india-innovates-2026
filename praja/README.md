# PRAJA 🇮🇳

**Next-Gen GrievanceOS for Citizens and Government**
*India Innovates Hackathon Finalist (Top 873 / 26,865)*

PRAJA is an end-to-end Grievance Operating System designed to bridge the gap between citizens and the government. It uses blazing-fast AI to ingest, translate, classify, and route complaints across multiple channels (WhatsApp, Web, Voice) to the appropriate officials while maintaining strict SLAs.

## 🚀 Core Features

- **Omnichannel Intake**: Citizens can submit grievances via WhatsApp, SMS, or the Web portal.
- **Groq AI Engine**: Powered by LLaMA-3.3-70B, PRAJA automatically:
  - **Translates** 22+ Indian languages to English on the fly.
  - **Extracts** key data (Category, Sentiment, Location, Summary).
  - **Classifies** urgency and automatically sets SLAs (24h, 48h, 7 days).
- **Smart Routing**: Auto-assigns tickets to the exact department, ward, and officer required.
- **Role-Based Dashboards**: Tailored views and analytics for MLAs, MPs, Councillors, Officers, and Citizens.
- **SentinelPulse Heatmap**: Live geographical map showing grievance hotspots and public mood across wards.
- **Automated Loop**: Keeps citizens updated via Twilio SMS/WhatsApp notifications when tickets change state.

## 🗺️ Roadmap / Coming Soon
- **Smart Schedule / AI Briefing**: Auto-generated morning briefings and speech drafts for political leaders based on overnight ward data.

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, React Router, Recharts, Leaflet
- **Backend**: Python 3.11, FastAPI
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
- **AI & Integrations**: Groq (LLaMA-3.3-70B), Twilio (Messaging API)
- **Deployment**: Vercel (Frontend), Vercel (Backend)

## ⚙️ Local Setup

### 1. Clone & Install
```bash
# Clone the repo
git clone <repository-url>
cd praja
```

### 2. Backend Setup (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Set up your environment variables
cp .env.example .env

# Run the server
uvicorn app.main:app --reload
```

### 3. Frontend Setup (React/Vite)
```bash
cd frontend
npm install

# Set up your environment variables
cp .env.local.example .env.local

# Run the dev server
npm run dev
```

## 🛡️ Architecture & Security
- **Role-Based Access Control (RBAC)** ensures that officials only see data relevant to their specific ward or jurisdiction.
- **Hierarchical Escalation**: If an SLA breaches, the ticket automatically flags to the next level of management.

