"""
Unit and Integration Tests for LinkSentry URL Threat Detection Engine
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.detector import analyze_url, ENGINE_NAME

client = TestClient(app)


class TestUrlDetectorUnit:
    """Unit tests for the heuristic detection logic"""

    def test_safe_example_domain(self):
        result = analyze_url("https://example.com")
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30
        assert result["domain"] == "example.com"
        assert result["engine"] == ENGINE_NAME
        assert 0.0 <= result["confidence"] <= 1.0

    def test_safe_github_login(self):
        # Legitimate login paths on legitimate domains should remain safe
        result = analyze_url("https://github.com/login")
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30
        assert result["domain"] == "github.com"

    def test_safe_microsoft_domain(self):
        result = analyze_url("https://www.microsoft.com/")
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30
        assert result["domain"] == "www.microsoft.com"

    def test_safe_google_accounts(self):
        result = analyze_url("https://accounts.google.com/")
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30
        assert result["domain"] == "accounts.google.com"

    def test_suspicious_lure_domain(self):
        result = analyze_url("http://login-account-verification.xyz/secure/login")
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 30
        assert any("HTTPS" in i for i in result["indicators"])
        assert any(".xyz" in i for i in result["indicators"])

    def test_phishing_brand_impersonation_lure(self):
        result = analyze_url("http://paypal-security-verification.xyz/account/login.php?verify=1")
        assert result["verdict"] == "phishing"
        assert result["risk_score"] >= 70
        assert result["confidence"] >= 0.85
        assert any("paypal" in i.lower() for i in result["indicators"])

    def test_ip_address_hostname(self):
        result = analyze_url("http://192.168.1.10/login")
        assert result["risk_score"] >= 30
        assert any("IP address" in i for i in result["indicators"])

    def test_userinfo_deception(self):
        result = analyze_url("https://example.com@evil.example/login")
        assert result["risk_score"] >= 30
        assert any("@" in i or "userinfo" in i for i in result["indicators"])

    def test_obfuscated_encoding(self):
        result = analyze_url("https://example.com/%2F%2Flogin%3Fverify%3D1")
        assert any("encoding" in i.lower() or "obfuscation" in i.lower() for i in result["indicators"])

    def test_deep_subdomain_hierarchy(self):
        result = analyze_url("https://secure.login.verify.account.example.com/login")
        assert result["risk_score"] > 0
        assert any("subdomain" in i.lower() for i in result["indicators"])

    def test_empty_url(self):
        result = analyze_url("")
        assert result["verdict"] == "invalid"
        assert result["risk_score"] == 0

    def test_missing_scheme_or_malformed(self):
        result = analyze_url("not_a_valid_url")
        assert result["verdict"] == "invalid"
        assert result["risk_score"] == 0

    def test_non_http_scheme(self):
        result = analyze_url("ftp://example.com/file.txt")
        assert result["verdict"] == "invalid"

    def test_score_and_confidence_bounds(self):
        test_urls = [
            "https://example.com",
            "http://1.2.3.4/login",
            "https://secure-login-account-verify-portal-update.xyz/verify?token=123",
            "http://test.com",
            "https://domain.com/path",
        ]
        for url in test_urls:
            res = analyze_url(url)
            assert 0 <= res["risk_score"] <= 100
            assert 0.0 <= res["confidence"] <= 1.0
            assert res["verdict"] in ["safe", "suspicious", "phishing", "invalid"]
            assert isinstance(res["indicators"], list)


class TestFastApiEndpoints:
    """Integration tests for the FastAPI API endpoints"""

    def test_health_check(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_scan_url_endpoint_contract(self):
        payload = {"url": "https://example.com"}
        response = client.post("/api/scan/url", json=payload)
        assert response.status_code == 200
        data = response.json()

        # Verify strict contract preservation
        assert "verdict" in data
        assert "risk_score" in data
        assert "confidence" in data
        assert "url" in data
        assert "domain" in data
        assert "indicators" in data
        assert "engine" in data

        assert data["verdict"] == "safe"
        assert data["risk_score"] == 0
        assert data["domain"] == "example.com"
        assert "engine" in data and len(data["engine"]) > 0

    def test_scan_url_phishing_endpoint(self):
        payload = {"url": "http://paypal-security-verification.xyz/account/login.php?verify=1"}
        response = client.post("/api/scan/url", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["verdict"] == "phishing"
        assert data["risk_score"] >= 70
