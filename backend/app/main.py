"""LegalFlow — AI Contract Review API."""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

# Serve static frontend
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")


@app.get("/favicon.svg")
async def favicon():
    return FileResponse("static/favicon.svg")


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Serve frontend index.html for SPA routing."""
    import os
    static_dir = "static"
    file_path = os.path.join(static_dir, full_path)
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse("static/index.html")
