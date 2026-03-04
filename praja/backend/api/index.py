from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "healthy", "message": "PRAJA minimal test"}

@app.get("/")
async def root():
    return {"status": "ok"}
