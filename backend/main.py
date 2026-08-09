from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from urllib.parse import urlparse

app = FastAPI(
    title="LinkSentry API",
    description="Backend API for LinkSentry phishing detection",
    version="0.2.0",
)

# Allow the React development server to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class URLScanRequest(BaseModel):
    url: str


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "LinkSentry API",
        "version": "0.2.0",
    }


@app.post("/api/scan/url")
def scan_url(request: URLScanRequest):
    url = request.url.strip()

    risk_score = 0
    indicators = []

    # Basic URL validation
    parsed = urlparse(url)

    if parsed.scheme not in ["http", "https"] or not parsed.netloc:
        return {
            "verdict": "invalid",
            "risk_score": 0,
            "confidence": 1.0,
            "url": url,
            "indicators": ["Invalid URL format"],
        }

    hostname = parsed.hostname.lower()

    # Temporary rule-based checks
    if parsed.scheme != "https":
        risk_score += 20
        indicators.append("Connection does not use HTTPS")

    suspicious_keywords = [
        "login",
        "verify",
        "account",
        "secure",
        "update",
        "password",
        "bank",
    ]

    found_keywords = [
        word for word in suspicious_keywords
        if word in url.lower()
    ]

    if found_keywords:
        risk_score += min(len(found_keywords) * 10, 30)
        indicators.append(
            f"Suspicious keywords detected: {', '.join(found_keywords)}"
        )

    if "@" in url:
        risk_score += 25
        indicators.append("URL contains an @ symbol")

    if len(url) > 100:
        risk_score += 15
        indicators.append("Unusually long URL")

    risk_score = min(risk_score, 100)

    if risk_score >= 60:
        verdict = "phishing"
    elif risk_score >= 30:
        verdict = "suspicious"
    else:
        verdict = "safe"

    return {
        "verdict": verdict,
        "risk_score": risk_score,
        "confidence": 0.70,
        "url": url,
        "domain": hostname,
        "indicators": indicators,
        "engine": "temporary-rule-based-detector",
    }