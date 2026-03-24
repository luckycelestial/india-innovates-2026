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

This project follows a streamlined **Single-Branch Model**:

1. **`main` Branch**: All development, testing, and production occurs on `main`.
2. **Vibe Coding Flow**:
   - **Plan & Implement**: Direct implementation on the `main` branch.
   - **Verification**: Mandatory verification of the production/live URL after every commit.
   - **Push Often**: Keep local and origin synced frequently.

### Git Hygiene
- Use descriptive commit messages.
- Never commit secrets or `.env` files. (Ensure .gitignore covers these).
- Run `git pull origin main --rebase` before pushing to avoid conflicts.

### Running Locally (Optional)
- **Frontend**: `npm run dev` in `praja/frontend`
- **Backend**: `uvicorn main:app --reload` (or similar) in `praja/backend`

## Final Sprint Checklist (Deadline: March 28)
- [ ] Push features directly to `main`.
- [ ] Verify functionality on the live production URL.
- [ ] Maintain a clean workspace (no untracked experiment files).
