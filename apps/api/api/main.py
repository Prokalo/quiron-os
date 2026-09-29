# apps/api/api/main.py
from fastapi import FastAPI

app = FastAPI(title="Quirón CRM API", version="0.1.0")


@app.get("/health")
def health_check():
    return {"status": "ok", "app": "api"}
