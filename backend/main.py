from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from backend.detector import analyze_url
    from backend.message_detector import analyze_message
except ImportError:
    from detector import analyze_url
    from message_detector import analyze_message

app = FastAPI(
    title="LinkSentry API",
    description="Backend API for LinkSentry phishing detection",
    version="0.4.0",
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


class MessageScanRequest(BaseModel):
    message: str


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "LinkSentry API",
        "version": "0.4.0",
    }


@app.post("/api/scan/url")
def scan_url(request: URLScanRequest):
    """
    Scans a given URL for phishing indicators, deceptive patterns, and risk signals.
    Endpoint contract:
      Request JSON:  {"url": "https://example.com"}
      Response JSON: {
        "verdict": "safe" | "suspicious" | "phishing" | "invalid",
        "risk_score": 0..100,
        "confidence": 0.0..1.0,
        "url": str,
        "domain": str,
        "indicators": list[str],
        "engine": "linksentry-heuristic-v1"
      }
    """
    return analyze_url(request.url)


@app.post("/api/scan/message")
def scan_message(request: MessageScanRequest):
    """
    Scans a user-provided message/SMS text for phishing, smishing, social engineering,
    and fraud indicators.
    Endpoint contract:
      Request JSON:  {"message": "..."}
      Response JSON: {
        "verdict": "safe" | "suspicious" | "phishing" | "invalid",
        "risk_score": 0..100,
        "confidence": 0.0..1.0,
        "message": str,
        "indicators": list[str],
        "engine": "linksentry-message-heuristic-v1"
      }
    """
    return analyze_message(request.message)