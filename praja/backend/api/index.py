import sys
import os
import traceback

# Build: 2025-03-06-v2 — blueprint features
# Ensure project root is in sys.path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.main import app
except BaseException as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    import logging

    app = FastAPI()
    _error = traceback.format_exc()
    _etype = type(e).__name__
    _emsg = str(e)
    logging.error("PRAJA app failed to start: %s\n%s", _emsg, _error)

    @app.get("/health")
    @app.get("/")
    async def error_health():
        return JSONResponse(
            status_code=500,
            content={"error": "Application failed to start", "type": _etype},
        )

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def error_catch_all(path: str = ""):
        return JSONResponse(
            status_code=500,
            content={"error": "Application failed to start", "type": _etype},
        )
