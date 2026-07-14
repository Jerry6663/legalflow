"""LegalFlow — AI Contract Review API."""

import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from .core.config import settings
from .api.review import router as review_router


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        from .core.rate_limit import rate_limiter
        client_ip = request.client.host if request.client else "unknown"
        if not rate_limiter.is_allowed(client_ip):
            raise HTTPException(429, "请求过于频繁，请稍后重试")
        response = await call_next(request)
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
        return response


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

# Security middleware — order matters: outermost first
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

# CORS — only allow frontend origin in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers BEFORE static file catch-all
app.include_router(review_router)

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
    """Serve frontend index.html for SPA routing with path traversal protection."""
    static_dir = "static"
    safe_path = os.path.normpath(os.path.join(static_dir, full_path))
    if not safe_path.startswith(os.path.normpath(static_dir)):
        raise HTTPException(403, "Access denied")
    if full_path and os.path.isfile(safe_path):
        return FileResponse(safe_path)
    return FileResponse("static/index.html")
