# PRAJA Developer Guide

## Tech Stack
- **Frontend**: React + Vite (located in `praja/frontend`)
- **Backend**: Python FastAPI (located in `praja/backend`)
- **Database/Auth**: Supabase

## Environment Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.11+)
- Vercel CLI (`npm install -g vercel`)

### Local Installation
1. **Frontend**:
   ```bash
   cd praja/frontend
   npm install
   ```
2. **Backend**:
   ```bash
   cd praja/backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

## Development Workflow (Single-Branch Model)

This project follows a streamlined **Single-Branch Workflow**:

1. **`main` Branch**: All development, testing, and production occurs on `main`. Hooked to Vercel Production.

### Vibe Coding Workflow
1. **Plan & Implement**: Directly work on the `main` branch.
2. **Auto-Deploy**: Every push to `main` triggers a **Vercel Production Deployment**.
3. **Mandatory Verification**: Use the browser tool to visit the production URL to verify the fix or feature personally before reporting.
4. **Autonomous Flow**: AI Lead handles planning, implementation, and git operations (commit/push) autonomously.

### Git Hygiene
- Use only the `main` branch.
- AI Lead uses descriptive commit messages.
- NEVER commit secrets or `.env` files.

### Running Locally (Optional)
- **Frontend**: `npm run dev` in `praja/frontend`
- **Backend**: `uvicorn main:app --reload` (or similar) in `praja/backend`

## Verification Checklist
- [ ] Push changes to `main` branch.
- [ ] Wait for Vercel Production Deployment.
- [ ] AI Lead verifies functionality on the live URL.
- [ ] Report completed task to User.
