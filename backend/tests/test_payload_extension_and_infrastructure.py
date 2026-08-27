"""
LinkSentry High-Risk Payload Extension & Shared Infrastructure Regression Tests

Verifies:
1. Malicious .hta on shared infrastructure (r2.dev) is detected with high-risk payload signal.
2. Benign normal .html URLs do not trigger high-risk payload signals.
3. First-party legitimate domains (Google, Amazon, etc.) preserve trusted status.
4. Existing brand impersonation & typosquatting logic remains intact.
5. Dangerous executable/script extensions (.exe, .js, .ps1, .msi, .apk, .vbs) are safely flagged as suspicious signals.
"""

import pytest
from fastapi.testclient import TestClient

from backend.ml.inference.url_model import (
    analyze_url_ml,
    extract_payload_extension,
    HIGH_RISK_PAYLOAD_EXTENSIONS,
)
from backend.main import app

client = TestClient(app)


class TestPayloadExtensionExtraction:
    def test_extract_various_extensions(self):
        assert extract_payload_extension("https://example.com/file.hta") == "hta"
        assert extract_payload_extension("https://example.com/app.EXE") == "exe"
        assert extract_payload_extension("https://example.com/script.ps1?v=1#sec") == "ps1"
        assert extract_payload_extension("https://example.com/index.html") == "html"
        assert extract_payload_extension("https://example.com/noext/path/") == ""
        assert extract_payload_extension("https://example.com/") == ""
        assert extract_payload_extension("https://pub-eab9eb7761644f51bceeecfefdf0ec2b.r2.dev/teddywon.hta") == "hta"


class TestHighRiskPayloadSignals:
    def test_r2_dev_malicious_hta_sample(self):
        url = "https://pub-eab9eb7761644f51bceeecfefdf0ec2b.r2.dev/teddywon.hta"
        res = analyze_url_ml(url)

        assert res["trusted_domain"] is False
        assert res["trust_override"] is False
        assert res["prediction"] in ("phishing", "malware")
        assert res["payload_extension"] == "hta"
        assert "high_risk_payload_extension" in res["suspicious_signals"]

    def test_benign_normal_html_url(self):
        url = "https://example.com/docs/index.html"
        res = analyze_url_ml(url)

        assert res["payload_extension"] == "html"
        assert "high_risk_payload_extension" not in res["suspicious_signals"]

    def test_benign_first_party_domain(self):
        url = "https://accounts.google.com/signin"
        res = analyze_url_ml(url)

        assert res["trusted_domain"] is True
        assert res["trust_override"] is True
        assert res["prediction"] == "benign"

    def test_existing_phishing_brand_impersonation(self):
        url = "https://google.com.evil.xyz/login"
        res = analyze_url_ml(url)

        assert res["impersonated_domain"] == "google.com"
        assert res["prediction"] == "phishing"
        assert "trusted_brand_impersonation" in res["suspicious_signals"]

    @pytest.mark.parametrize("ext", ["exe", "js", "ps1", "scr", "vbs", "msi", "apk", "iso"])
    def test_high_risk_extensions_flagged_as_signals(self, ext):
        url = f"https://cdn-delivery-network.net/downloads/installer.{ext}"
        res = analyze_url_ml(url)

        assert res["payload_extension"] == ext
        assert "high_risk_payload_extension" in res["suspicious_signals"]


class TestApiIntegrationWithPayloadSignal:
    def test_r2_dev_api_scan_response(self):
        url = "https://pub-eab9eb7761644f51bceeecfefdf0ec2b.r2.dev/teddywon.hta"
        resp = client.post("/api/scan/url", json={"url": url})
        assert resp.status_code == 200
        data = resp.json()

        assert data["verdict"] in ("phishing", "malware")
        assert data["risk_score"] >= 70
        assert data["trusted_domain"] is False
        assert data["trust_override"] is False
        assert data["ml_prediction"] in ("phishing", "malware")
        assert data["threat_analysis"]["ml_prediction"] in ("phishing", "malware")
        assert "high_risk_payload_extension" in data["suspicious_signals"]
        assert any("high_risk_payload_extension" in ind for ind in data["indicators"])

    def test_first_party_amazon_in_preserves_safe(self):
        url = "https://www.amazon.in"
        resp = client.post("/api/scan/url", json={"url": url})
        assert resp.status_code == 200
        data = resp.json()

        assert data["verdict"] == "safe"
        assert data["risk_score"] == 0
        assert data["trusted_domain"] is True
        assert data["trust_override"] is True
