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
    from backend.ml.inference.url_model import analyze_url_ml
except ImportError:
    from detector import analyze_url
    from message_detector import analyze_message
    from rate_limiter import limiter
    from ml.inference.url_model import analyze_url_ml

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
# CORS Configuration
# -----------------------------------------------------------------------------

# Default development origins for local and LAN testing
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:4173",
    "http://localhost:4174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:4174",
    "http://127.0.0.1:3000",
    "http://192.168.29.123:5173",
    "http://192.168.29.123:5174",
    "http://192.168.29.123:4173",
    "http://192.168.29.123:4174",
    "http://192.168.29.123:3000",
]

# Safe regular expression to match localhost, loopback, and LAN private network ports.
# This prevents preflight failures when Vite dynamically switches to another port.
CORS_ORIGIN_REGEX = (
    r"^https?://("
    r"localhost"
    r"|127\.0\.0\.1"
    r"|192\.168\.\d{1,3}\.\d{1,3}"
    r"|10\.\d{1,3}\.\d{1,3}\.\d{1,3}"
    r"|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
    r")(:\d+)?$"
)


def normalize_origin(raw_origin: str) -> str:
    """
    Sanitizes and normalizes an origin string.
    Strips accidental Markdown syntax, surrounding quotes, whitespace, and trailing slashes.
    """
    if not raw_origin:
        return ""
    origin = raw_origin.strip()
    # Strip markdown link format e.g. [http://192.168.29.123:4174](http://192.168.29.123:4174) or [label](url)
    import re
    md_match = re.match(r"^\[.*?\]\((https?://[^)]+)\)$", origin)
    if md_match:
        origin = md_match.group(1).strip()
    # Strip surrounding quotes
    origin = origin.strip("'\"`")
    # Strip trailing slash
    origin = origin.rstrip("/")
    return origin


def get_allowed_origins() -> list[str]:
    """
    Retrieves the authoritative list of allowed CORS origins.
    If the LINKSENTRY_ALLOWED_ORIGINS environment variable is present,
    it is parsed as a comma-separated list of normalized origins.
    Otherwise, default development and LAN origins are returned.
    """
    env_origins = os.getenv("LINKSENTRY_ALLOWED_ORIGINS")
    if env_origins:
        cleaned_origins = []
        for item in env_origins.split(","):
            norm = normalize_origin(item)
            if norm and (norm.startswith("http://") or norm.startswith("https://")):
                if norm not in cleaned_origins:
                    cleaned_origins.append(norm)
        if cleaned_origins:
            return cleaned_origins
    return [normalize_origin(o) for o in DEFAULT_ALLOWED_ORIGINS if o]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Authorization",
        "Content-Language",
        "Content-Type",
        "X-Requested-With",
    ],
    max_age=600,
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
    Scans a URL using the LinkSentry V3.3 ML + rule-fusion engine.

    The legacy heuristic detector remains available for message/SMS
    embedded-link analysis.
    """
    limiter.check_rate_limit(request)

    url = request_data.url

    logger.info(
        f"URL scan requested for payload length {len(url)}"
    )

    try:
        result = analyze_url_ml(url)

        prediction = str(
            result.get("prediction", "benign")
        ).lower()

        confidence = float(
            result.get("confidence", 0.0)
        )

        # Convert V3.3 classification into the existing
        # frontend risk-score format.
        if prediction == "phishing":
            risk_score = max(
                70,
                min(100, round(confidence * 100))
            )
            verdict = "phishing"

        elif prediction == "malware":
            risk_score = max(
                70,
                min(100, round(confidence * 100))
            )
            verdict = "phishing"

        elif prediction == "defacement":
            risk_score = max(
                50,
                min(100, round(confidence * 100))
            )
            verdict = "suspicious"

        else:
            risk_score = 0
            verdict = "safe"

        indicators = []

        suspicious_signals = result.get(
            "suspicious_signals",
            []
        )

        if suspicious_signals:
            indicators.extend(
                str(signal)
                for signal in suspicious_signals
            )

        if result.get("trusted_domain"):
            indicators.append(
                "Trusted domain recognized by LinkSentry trusted-domain layer"
            )

        if result.get("typosquat_domain"):
            indicators.append(
                "Possible typosquatting of trusted domain: "
                f"{result['typosquat_domain']}"
            )

        if result.get("impersonated_domain"):
            indicators.append(
                "Possible trusted-brand impersonation: "
                f"{result['impersonated_domain']}"
            )

        if result.get("rule_override"):
            indicators.append(
                "Decision-fusion rule override applied"
            )

        if not indicators:
            if verdict == "safe":
                indicators.append(
                    "No significant threat indicators detected"
                )
            else:
                indicators.append(
                    f"V3.3 classified URL as {prediction}"
                )

        return {
            "verdict": verdict,
            "risk_score": risk_score,
            "confidence": confidence,
            "url": url,
            "domain": result.get(
                "hostname",
                ""
            ),
            "indicators": indicators,
            "engine": result.get(
                "model_type",
                "LinkSentry V3.3 URL ML Engine"
            ),

            # V3.3 diagnostic information
            "ml_prediction": result.get(
                "ml_prediction"
            ),
            "model_prediction": prediction,
            "trusted_domain": result.get(
                "trusted_domain",
                False
            ),
            "trust_override": result.get(
                "trust_override",
                False
            ),
            "rule_override": result.get(
                "rule_override",
                False
            ),
            "impersonated_domain": result.get(
                "impersonated_domain"
            ),
            "typosquat_domain": result.get(
                "typosquat_domain"
            ),
            "suspicious_signals": suspicious_signals,
            "decision_scores": result.get(
                "decision_scores",
                {}
            ),
            "model_version": result.get(
                "model_version",
                "V3.3"
            ),
        }

    except ValueError as exc:
        logger.warning(
            f"Invalid URL scan input: {exc}"
        )

        return {
            "verdict": "invalid",
            "risk_score": 0,
            "confidence": 1.0,
            "url": url,
            "domain": "",
            "indicators": [
                str(exc)
            ],
            "engine": "LinkSentry V3.3 URL ML Engine",
        }

    except Exception as exc:
        logger.error(
            f"V3.3 URL analysis failed: {exc}",
            exc_info=True
        )

        raise HTTPException(
            status_code=500,
            detail="URL threat analysis failed."
        )

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