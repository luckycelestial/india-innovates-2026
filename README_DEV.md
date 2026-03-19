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

## Development Workflow (2-Branch Model)

This project follows a simplified **2-branch Vercel flow**:

1. **`main` Branch**: Production branch. Hooked to Vercel Production.
2. **`preview` Branch**: The single active development branch. Hooked to Vercel Preview.

### Vibe Coding Workflow
1. **Plan & Implement**: All work happens on the `preview` branch.
2. **Auto-Deploy**: Every push to `preview` triggers a **Vercel Preview Deployment**.
3. **Mandatory Verification**: You must use the browser to visit the Vercel Preview URL of the `preview` branch. Verify the fix/feature personally before reporting.
4. **Promotion**: Once verified on `preview`, prepare a merge description and request approval to merge `preview` into `main` for production.

### Git Hygiene
- Do not create individual feature branches. Use only `preview`.
- Use descriptive commit messages.
- Never commit secrets or `.env` files.

### Running Locally (Optional)
- **Frontend**: `npm run dev` in `praja/frontend`
- **Backend**: `uvicorn main:app --reload` (or similar) in `praja/backend`

## Verification Checklist
- [ ] Push changes to `preview` branch.
- [ ] Wait for Vercel Preview Deployment.
- [ ] Verify functionality on the Vercel Preview URL.
- [ ] Request approval for production merge to `main`.
