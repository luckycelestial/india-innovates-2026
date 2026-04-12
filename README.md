# PRAJA 🇮🇳

**Next-Gen GrievanceOS for Citizens and Government**

PRAJA is a comprehensive Grievance Operating System designed to streamline communication between citizens and the government. It leverages AI to ingest, translate, classify, and route complaints across multiple channels (WhatsApp, Web, Voice) to the appropriate officials while maintaining strict service-level agreements (SLAs).

## 🚀 Core Features

- **Omnichannel Intake**: Submit grievances via WhatsApp, SMS, or the Web portal.
- **AI-Powered Processing**: Automatic translation, sentiment analysis, and classification (Category, Urgency, SLA).
- **Smart Routing**: Auto-assignment to departments, wards, and officers.
- **SentinelPulse Heatmap**: Geographical hotspot analysis and public mood tracking.
- **Automated Workflow**: Real-time updates via SMS/WhatsApp notifications.

## 🛠 Tech Stack

- **Frontend**: [React 18](https://reactjs.org/), [Vite](https://vitejs.dev/), [React Router](https://reactrouter.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Edge Functions, RLS)
- **AI Engine**: [Groq](https://groq.com/) (LLaMA-3.3-70B), [Twilio](https://www.twilio.com/) (Messaging/Voice API)

## ⚙️ Project Structure

- `praja/frontend/`: React application (Vite-based).
- `supabase/`: Database migrations and Edge Functions for the serverless backend.

## 🚀 Getting Started

### Prerequisites
- Node.js & npm
- Supabase CLI (optional for local dev)

### Setup
1. **Frontend**:
   ```bash
   cd praja/frontend
   npm install
   npm run dev
   ```

2. **Backend**:
   Managed via Supabase. Environment variables for the frontend are located in `praja/frontend/.env.local`.
