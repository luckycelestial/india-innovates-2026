# Vercel entrypoint for PRAJA Backend
import sys
import os

# Ensure the root folder (/praja/backend) is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

try:
    from app.main import app
except Exception as e:
    import traceback
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    
    app = FastAPI()
    _error_trace = traceback.format_exc()
    
    @app.get("/{path:path}")
    async def startup_error(path: str = ""):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend application failed to initialize",
                "details": str(e),
                "traceback": _error_trace
            }
        )

# Vercel needs 'app' to be exported at the top level
app = app
