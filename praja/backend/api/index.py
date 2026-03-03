import sys
import os
import traceback

# Ensure project root is in sys.path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.main import app
except Exception as e:
    # If import fails, create a minimal app that returns the error
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI()
    _error = traceback.format_exc()

    @app.get("/health")
    @app.get("/")
    async def error_route():
        return JSONResponse(status_code=500, content={"error": str(e), "traceback": _error})
