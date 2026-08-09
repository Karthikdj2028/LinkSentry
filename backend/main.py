"""
LinkSentry FastAPI Application
Production-hardened threat analysis API with environment-based CORS,
input validation, rate limiting, and sanitized error handling.
"""

import os
import logging
from typing import Any
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

try:
    from backend.detector import analyze_url
    from backend.message_detector import analyze_message
    from backend.rate_limiter import limiter
except ImportError:
    from detector import analyze_url
    from message_detector import analyze_message
    from rate_limiter import limiter

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("linksentry.api")

# -----------------------------------------------------------------------------
# FastAPI Application Definition
# -----------------------------------------------------------------------------
app = FastAPI(
    title="LinkSentry API",
    description="Production-hardened backend API for LinkSentry multi-vector threat detection",
    version="0.5.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# -----------------------------------------------------------------------------
# Environment-Based CORS Configuration
# -----------------------------------------------------------------------------
def get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("LINKSENTRY_ALLOWED_ORIGINS")
    if raw_origins and raw_origins.strip():
        # Parse comma-separated list of production origins
        origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
        logger.info(f"Loaded CORS allowed origins from environment: {origins}")
        return origins
    # Default local development origins
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
)

# -----------------------------------------------------------------------------
# Global Exception Handlers (Prevent Stack Trace Leakage)
# -----------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Sanitized validation error response without internal details."""
    errors = []
    for err in exc.errors():
        field_loc = " -> ".join(str(loc) for loc in err.get("loc", []))
        errors.append(f"{field_loc}: {err.get('msg', 'Invalid input')}")
    
    logger.warning(f"Validation error on {request.url.path}: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": errors if len(errors) > 1 else errors[0]}
    )


@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    """Sanitized internal server error response avoiding stack trace disclosure."""
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal error occurred while processing the threat scan."}
    )

# -----------------------------------------------------------------------------
# Pydantic Request Models with Input & Size Constraints
# -----------------------------------------------------------------------------
class URLScanRequest(BaseModel):
    url: str = Field(
        ...,
        min_length=1,
        max_length=2048,
        description="Target URL string to evaluate (maximum 2,048 characters)"
    )

    @field_validator("url")
    @classmethod
    def validate_and_strip_url(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("URL cannot be empty or whitespace only.")
        return trimmed


class MessageScanRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Message or SMS text to evaluate (maximum 10,000 characters)"
    )

    @field_validator("message")
    @classmethod
    def validate_and_strip_message(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Message body cannot be empty or whitespace only.")
        return trimmed

# -----------------------------------------------------------------------------
# API Endpoints
# -----------------------------------------------------------------------------
@app.get("/api/health")
def health_check() -> dict[str, str]:
    """
    Minimal health check endpoint for monitoring, container probes, and load balancers.
    Does not expose sensitive environment or system information.
    """
    return {
        "status": "ok",
        "service": "LinkSentry API",
        "version": "0.5.0",
    }


@app.post("/api/scan/url")
def scan_url(request_data: URLScanRequest, request: Request) -> dict[str, Any]:
    """
    Scans a given URL for phishing indicators, deceptive patterns, and risk signals.
    Applies rate limiting per client IP.
    """
    limiter.check_rate_limit(request)
    logger.info(f"URL scan requested for payload length {len(request_data.url)}")
    return analyze_url(request_data.url)


@app.post("/api/scan/message")
def scan_message(request_data: MessageScanRequest, request: Request) -> dict[str, Any]:
    """
    Scans user-provided message/SMS text for phishing, smishing, social engineering,
    and fraud indicators. Applies rate limiting per client IP.
    """
    limiter.check_rate_limit(request)
    logger.info(f"Message scan requested for payload length {len(request_data.message)}")
    return analyze_message(request_data.message)


if __name__ == "__main__":
    import uvicorn
    runtime_port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=runtime_port, reload=False)