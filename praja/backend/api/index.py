import sys
import os
import traceback

# Ensure project root is in sys.path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.main import app
except BaseException as e:
    # Catch EVERYTHING (including SystemExit, BaseException) so Vercel gets a handler
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI()
    _error = traceback.format_exc()
    _etype = type(e).__name__

    @app.get("/health")
    @app.get("/")
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def error_route(path: str = ""):
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "type": _etype, "traceback": _error},
        )
