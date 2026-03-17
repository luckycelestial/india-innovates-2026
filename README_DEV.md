# PRAJA Developer Guide

## Tech Stack
- **Frontend**: React + Vite (located in `praja/frontend`)
- **Backend**: Python FastAPI (located in `praja/backend`)
- **Database/Auth**: Supabase
- **MCP Server**: Custom Node.js/Express server (located in `praja/mcp-server`)

## Environment Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
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
3. **MCP Server**:
   ```bash
   cd praja/mcp-server
   npm install
   ```

## Development Workflow

### Vercel Integration
This project is wired to Vercel for both frontend and backend.
- **Main Branch**: Connected to Production and triggers production deployments.
- **Feature Branches**: Every push to a `feature/*` branch creates a **Vercel Preview Deployment**.
- **Verification**: All changes must be verified against Vercel Preview URLs before merging.

### Git Hygiene
- Always work on a feature branch: `feature/<short-name>`.
- Use descriptive commit messages.
- Merge to `main` only after preview verification and approval.

### Running Locally (Optional)
- **Frontend**: `npm run dev` in `praja/frontend`
- **Backend**: `uvicorn main:app --reload` (or similar) in `praja/backend`
- **MCP Server**: `node index.js` in `praja/mcp-server`

## Verification Checklist
- [ ] Push to feature branch.
- [ ] Wait for Vercel Preview Deployment.
- [ ] Verify functionality on the preview URL.
- [ ] Merge to `main` after approval.
