from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/health")
@app.get("/")
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def root(path: str = ""):
    return {"status": "healthy", "message": "PRAJA minimal test", "path": path}
