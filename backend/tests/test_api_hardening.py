"""
Tests for LinkSentry API Production Hardening
Covers input validation, size limits, error handling, health checks, rate limiting, and CORS.
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import Request
from backend.main import app, get_allowed_origins
from backend.rate_limiter import InMemoryRateLimiter

client = TestClient(app)


class TestHealthEndpoint:
    """Tests for GET /api/health"""

    def test_health_check_success(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "LinkSentry API"
        assert "version" in data
        # Ensure no private environment or filesystem paths leaked
        assert "env" not in data
        assert "firebase" not in data
        assert "key" not in data


class TestUrlInputValidation:
    """Tests for URL input validation and size constraints"""

    def test_valid_url_scan(self):
        response = client.post("/api/scan/url", json={"url": "https://example.com"})
        assert response.status_code == 200
        data = response.json()
        assert data["verdict"] == "safe"
        assert data["engine"] == "linksentry-heuristic-v1"

    def test_empty_url_rejected(self):
        response = client.post("/api/scan/url", json={"url": ""})
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_whitespace_url_rejected(self):
        response = client.post("/api/scan/url", json={"url": "   "})
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_oversized_url_rejected(self):
        oversized = "https://example.com/" + ("a" * 2050)
        response = client.post("/api/scan/url", json={"url": oversized})
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_missing_url_field_rejected(self):
        response = client.post("/api/scan/url", json={})
        assert response.status_code == 422


class TestMessageInputValidation:
    """Tests for Message input validation and size constraints"""

    def test_valid_message_scan(self):
        response = client.post("/api/scan/message", json={"message": "Meeting is tomorrow at 10 AM."})
        assert response.status_code == 200
        data = response.json()
        assert data["verdict"] == "safe"
        assert data["engine"] == "linksentry-message-heuristic-v1"

    def test_empty_message_rejected(self):
        response = client.post("/api/scan/message", json={"message": ""})
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_whitespace_message_rejected(self):
        response = client.post("/api/scan/message", json={"message": "    \n\t   "})
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_oversized_message_rejected(self):
        oversized = "A" * 10050
        response = client.post("/api/scan/message", json={"message": oversized})
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_missing_message_field_rejected(self):
        response = client.post("/api/scan/message", json={})
        assert response.status_code == 422


class TestRateLimiter:
    """Unit tests for InMemoryRateLimiter"""

    def test_rate_limiter_allows_under_limit(self):
        limiter = InMemoryRateLimiter(requests_per_minute=5)
        # Mock request with client IP
        scope = {"type": "http", "client": ("192.168.1.100", 1234), "headers": []}
        req = Request(scope)

        for _ in range(5):
            limiter.check_rate_limit(req)  # Should not raise

    def test_rate_limiter_blocks_over_limit(self):
        from fastapi import HTTPException
        limiter = InMemoryRateLimiter(requests_per_minute=3)
        scope = {"type": "http", "client": ("192.168.1.101", 1234), "headers": []}
        req = Request(scope)

        for _ in range(3):
            limiter.check_rate_limit(req)

        with pytest.raises(HTTPException) as exc_info:
            limiter.check_rate_limit(req)

        assert exc_info.value.status_code == 429
        assert "Rate limit exceeded" in exc_info.value.detail


class TestCorsConfiguration:
    """Tests for environment-based CORS helper"""

    def test_default_cors_origins(self, monkeypatch):
        monkeypatch.delenv("LINKSENTRY_ALLOWED_ORIGINS", raising=False)
        origins = get_allowed_origins()
        assert "http://localhost:5173" in origins
        assert "http://127.0.0.1:5173" in origins

    def test_custom_cors_origins(self, monkeypatch):
        monkeypatch.setenv("LINKSENTRY_ALLOWED_ORIGINS", "https://linksentry.app, https://admin.linksentry.app")
        origins = get_allowed_origins()
        assert "https://linksentry.app" in origins
        assert "https://admin.linksentry.app" in origins
        assert len(origins) == 2
