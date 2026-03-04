import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()
diag = {"steps": [], "error": None, "error_type": None}

# Try importing each module one at a time
import traceback

def try_step(name, fn):
    try:
        fn()
        diag["steps"].append(f"OK: {name}")
        return True
    except BaseException as e:
        diag["error"] = f"{name}: {type(e).__name__}: {e}"
        diag["error_type"] = type(e).__name__
        diag["traceback"] = traceback.format_exc()
        return False

try_step("import fastapi", lambda: __import__("fastapi"))
try_step("import supabase", lambda: __import__("supabase"))
try_step("import groq", lambda: __import__("groq"))
try_step("import twilio", lambda: __import__("twilio"))
try_step("import passlib", lambda: __import__("passlib"))
try_step("import jose", lambda: __import__("jose"))
try_step("import app.config", lambda: __import__("app.config"))
try_step("import app.db", lambda: __import__("app.db.database"))
try_step("import app.routes.auth", lambda: __import__("app.routes.auth"))
try_step("import app.routes.grievances", lambda: __import__("app.routes.grievances"))
try_step("import app.routes.officers", lambda: __import__("app.routes.officers"))
try_step("import app.routes.nayakai", lambda: __import__("app.routes.nayakai"))
try_step("import app.routes.sentinel", lambda: __import__("app.routes.sentinel"))
try_step("import app.routes.whatsapp", lambda: __import__("app.routes.whatsapp"))
try_step("import app.main", lambda: __import__("app.main"))


@app.get("/health")
async def health():
    return JSONResponse(content=diag, status_code=200 if not diag["error"] else 500)


@app.get("/")
async def root():
    return JSONResponse(content=diag, status_code=200 if not diag["error"] else 500)
