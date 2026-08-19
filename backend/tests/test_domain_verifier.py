"""
LinkSentry V3.4 Domain Verifier & Reachability Test Suite
Comprehensive deterministic tests with mocked DNS/HTTP for:
- Valid reachable domain (200 OK)
- Known trusted reachable domain
- DNS NXDOMAIN / non-existent domain
- Resolved IP with connection failure / timeout
- Reachable HTTP 404
- Reachable HTTP 500
- TLS handshake / certificate failure
- Malformed URLs & invalid hostnames
- SSRF prevention against private / loopback IP ranges
- HTTP redirects & excessive redirect limits
- Typosquatting / brand similarity detection
- V3.4 Decision Fusion layer integration
"""

import socket
import ssl
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
import httpx

from backend.domain_verifier import (
    verify_domain_reachability,
    resolve_domain_dns,
    is_private_or_restricted_ip,
)
from backend.ml.inference.url_model import (
    detect_typosquatting_domain,
    analyze_url_ml,
)
from backend.main import app

client = TestClient(app)


# -----------------------------------------------------------------------------
# 1. SSRF & IP Restriction Tests
# -----------------------------------------------------------------------------
class TestSSRFProtection:
    def test_private_ipv4_ranges_blocked(self):
        assert is_private_or_restricted_ip("127.0.0.1") is True
        assert is_private_or_restricted_ip("10.0.0.1") is True
        assert is_private_or_restricted_ip("192.168.1.1") is True
        assert is_private_or_restricted_ip("172.16.0.1") is True
        assert is_private_or_restricted_ip("169.254.169.254") is True
        assert is_private_or_restricted_ip("0.0.0.0") is True

    def test_private_ipv6_ranges_blocked(self):
        assert is_private_or_restricted_ip("::1") is True
        assert is_private_or_restricted_ip("fe80::1") is True
        assert is_private_or_restricted_ip("fc00::1") is True

    def test_public_ips_allowed(self):
        assert is_private_or_restricted_ip("8.8.8.8") is False
        assert is_private_or_restricted_ip("1.1.1.1") is False
        assert is_private_or_restricted_ip("142.250.190.46") is False

    @patch("socket.getaddrinfo")
    def test_dns_resolution_blocks_private_ip(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 0))
        ]
        res = resolve_domain_dns("internal-admin.local")
        assert res["resolved"] is False
        assert res["status"] == "ssrf_blocked"
        assert "private/restricted" in res["error"]


# -----------------------------------------------------------------------------
# 2. DNS Resolution Tests
# -----------------------------------------------------------------------------
class TestDNSResolution:
    @patch("socket.getaddrinfo")
    def test_successful_dns_resolution(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))
        ]
        res = resolve_domain_dns("example.com")
        assert res["resolved"] is True
        assert "93.184.216.34" in res["ips"]
        assert "Resolved" in res["status"]

    @patch("socket.getaddrinfo", side_effect=socket.gaierror(-2, "Name or service not known"))
    def test_dns_nxdomain_failure(self, _mock):
        res = resolve_domain_dns("nonexistent-random-domain-xyz123.org")
        assert res["resolved"] is False
        assert "NXDOMAIN" in res["status"]
        assert len(res["ips"]) == 0

    @patch("socket.getaddrinfo", side_effect=socket.timeout("DNS query timed out"))
    def test_dns_timeout_failure(self, _mock):
        res = resolve_domain_dns("slow-dns.example.org")
        assert res["resolved"] is False
        assert "timed out" in res["status"].lower()


# -----------------------------------------------------------------------------
# 3. HTTP/HTTPS Reachability Verifier Unit Tests
# -----------------------------------------------------------------------------
class TestDomainReachabilityVerifier:
    def test_malformed_url_syntax(self):
        res = verify_domain_reachability("http://")
        assert res["status"] == "invalid"
        assert res["dns_resolved"] is False

    def test_invalid_hostname_missing_tld(self):
        res = verify_domain_reachability("https://justastringnodot")
        assert res["status"] == "invalid"

    @patch("backend.domain_verifier.resolve_domain_dns")
    def test_non_existent_domain_returns_non_existent(self, mock_dns):
        mock_dns.return_value = {
            "resolved": False,
            "status": "Domain not found (NXDOMAIN)",
            "ips": [],
            "error": "DNS lookup failed"
        }
        res = verify_domain_reachability("https://random-nonexistent-domain.xyz")
        assert res["status"] == "non_existent"
        assert res["dns_resolved"] is False
        assert res["http_reachable"] is False

    @patch("backend.domain_verifier.resolve_domain_dns")
    @patch("httpx.Client.head")
    def test_reachable_200_ok(self, mock_head, mock_dns):
        mock_dns.return_value = {
            "resolved": True,
            "status": "Resolved (93.184.216.34)",
            "ips": ["93.184.216.34"],
            "error": None
        }
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.history = []
        mock_resp.url = "https://example.com/"
        mock_head.return_value = mock_resp

        res = verify_domain_reachability("https://example.com")
        assert res["status"] == "reachable"
        assert res["dns_resolved"] is True
        assert res["http_reachable"] is True
        assert res["http_status"] == 200
        assert res["tls_valid"] is True

    @patch("backend.domain_verifier.resolve_domain_dns")
    @patch("httpx.Client.head")
    def test_reachable_404_not_found(self, mock_head, mock_dns):
        mock_dns.return_value = {
            "resolved": True,
            "status": "Resolved (93.184.216.34)",
            "ips": ["93.184.216.34"],
            "error": None
        }
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.history = []
        mock_resp.url = "https://example.com/missing-page"
        mock_head.return_value = mock_resp

        res = verify_domain_reachability("https://example.com/missing-page")
        assert res["status"] == "reachable"
        assert res["http_status"] == 404
        assert res["http_reachable"] is True

    @patch("backend.domain_verifier.resolve_domain_dns")
    @patch("httpx.Client.head")
    def test_reachable_500_server_error(self, mock_head, mock_dns):
        mock_dns.return_value = {
            "resolved": True,
            "status": "Resolved (93.184.216.34)",
            "ips": ["93.184.216.34"],
            "error": None
        }
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.history = []
        mock_resp.url = "https://example.com/error"
        mock_head.return_value = mock_resp

        res = verify_domain_reachability("https://example.com/error")
        assert res["status"] == "reachable"
        assert res["http_status"] == 500
        assert res["http_reachable"] is True

    @patch("backend.domain_verifier.resolve_domain_dns")
    @patch("httpx.Client.head", side_effect=httpx.ConnectTimeout("Connect timeout"))
    def test_connect_timeout_returns_unreachable(self, _mock_head, mock_dns):
        mock_dns.return_value = {
            "resolved": True,
            "status": "Resolved (93.184.216.34)",
            "ips": ["93.184.216.34"],
            "error": None
        }
        res = verify_domain_reachability("https://slow-server.example.com")
        assert res["status"] == "unreachable"
        assert res["http_reachable"] is False
        assert "timed out" in res["error"].lower()

    @patch("backend.domain_verifier.resolve_domain_dns")
    @patch("httpx.Client.head", side_effect=httpx.ConnectError("SSL certificate verification failed"))
    def test_tls_failure_returns_unreachable_with_tls_false(self, _mock_head, mock_dns):
        mock_dns.return_value = {
            "resolved": True,
            "status": "Resolved (93.184.216.34)",
            "ips": ["93.184.216.34"],
            "error": None
        }
        res = verify_domain_reachability("https://bad-ssl.example.com")
        assert res["status"] == "unreachable"
        assert res["tls_valid"] is False

    @patch("backend.domain_verifier.resolve_domain_dns")
    @patch("httpx.Client.head", side_effect=httpx.TooManyRedirects("Exceeded redirect limit"))
    def test_excessive_redirects_returns_unreachable(self, _mock_head, mock_dns):
        mock_dns.return_value = {
            "resolved": True,
            "status": "Resolved (93.184.216.34)",
            "ips": ["93.184.216.34"],
            "error": None
        }
        res = verify_domain_reachability("https://infinite-loop.example.com")
        assert res["status"] == "unreachable"
        assert "redirect" in res["error"].lower()

    @patch("backend.domain_verifier.resolve_domain_dns")
    @patch("httpx.Client.head")
    def test_redirect_captured_correctly(self, mock_head, mock_dns):
        mock_dns.return_value = {
            "resolved": True,
            "status": "Resolved (93.184.216.34)",
            "ips": ["93.184.216.34"],
            "error": None
        }
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.history = [MagicMock(status_code=301)]
        mock_resp.url = "https://example.com/final-dest"
        mock_head.return_value = mock_resp

        res = verify_domain_reachability("http://example.com")
        assert res["status"] == "reachable"
        assert res["redirect_count"] == 1
        assert res["final_url"] == "https://example.com/final-dest"


# -----------------------------------------------------------------------------
# 4. Typosquatting / Brand Similarity Tests
# -----------------------------------------------------------------------------
class TestTyposquattingDetection:
    def test_detects_deliberate_typosquats(self):
        cases = [
            ("ggle.com", "google.com", "google"),
            ("gooogle.com", "google.com", "google"),
            ("goolge.com", "google.com", "google"),
            ("micros0ft.com", "microsoft.com", "microsoft"),
            ("app1e.com", "apple.com", "apple"),
        ]
        for domain, expected_canonical, expected_brand in cases:
            canonical, brand = detect_typosquatting_domain(domain)
            assert canonical == expected_canonical, f"Failed for {domain}"
            assert brand == expected_brand, f"Failed for {domain}"

    def test_legitimate_brand_domain_not_flagged(self):
        canonical, brand = detect_typosquatting_domain("google.com")
        assert canonical is None
        assert brand is None

        canonical, brand = detect_typosquatting_domain("paypal.com")
        assert canonical is None
        assert brand is None

    def test_legitimate_regional_domains_not_flagged(self):
        regional_domains = [
            "amazon.in",
            "amazon.co.uk",
            "amazon.de",
            "google.co.in",
            "google.co.uk",
            "microsoft.co.uk",
            "apple.co.uk",
            "apple.in",
        ]
        for domain in regional_domains:
            canonical, brand = detect_typosquatting_domain(domain)
            assert canonical is None, f"Regional domain {domain} was incorrectly flagged with canonical {canonical}"
            assert brand is None, f"Regional domain {domain} was incorrectly flagged with brand {brand}"


# -----------------------------------------------------------------------------
# 5. Full API Endpoint & V3.4 Decision Fusion Tests
# -----------------------------------------------------------------------------
class TestScanUrlEndpointV34:
    @patch("backend.main.verify_domain_reachability")
    def test_safe_reachable_trusted_domain(self, mock_verify):
        mock_verify.return_value = {
            "status": "reachable",
            "dns_resolved": True,
            "dns_status": "Resolved (142.250.190.46)",
            "resolved_ips": ["142.250.190.46"],
            "http_reachable": True,
            "https_reachable": True,
            "http_status": 200,
            "final_url": "https://google.com/",
            "redirect_count": 0,
            "response_time_ms": 120,
            "tls_valid": True,
            "error": None
        }

        response = client.post("/api/scan/url", json={"url": "https://google.com"})
        assert response.status_code == 200
        data = response.json()

        assert data["verdict"] == "safe"
        assert data["risk_score"] == 0
        assert data["trusted_domain"] is True
        assert data["domain_verification"]["status"] == "reachable"
        assert data["domain_verification"]["dns_resolved"] is True
        assert data["threat_analysis"]["verdict"] == "safe"
        assert data["engine"] == "LinkSentry V3.4 ML + Reachability Engine"
        assert data["model_version"] == "V3.4"

    @patch("backend.main.verify_domain_reachability")
    def test_non_existent_domain_returns_non_existent_verdict(self, mock_verify):
        mock_verify.return_value = {
            "status": "non_existent",
            "dns_resolved": False,
            "dns_status": "Domain not found (NXDOMAIN)",
            "resolved_ips": [],
            "http_reachable": False,
            "https_reachable": False,
            "http_status": None,
            "final_url": None,
            "redirect_count": 0,
            "response_time_ms": 45,
            "tls_valid": None,
            "error": "DNS resolution failed: NXDOMAIN"
        }

        response = client.post("/api/scan/url", json={"url": "https://random-nonexistent-domain-xyz.com"})
        assert response.status_code == 200
        data = response.json()

        assert data["verdict"] == "non_existent"
        assert data["domain_verification"]["status"] == "non_existent"
        assert data["domain_verification"]["dns_resolved"] is False
        assert any("NXDOMAIN" in ind for ind in data["indicators"])

    @patch("backend.main.verify_domain_reachability")
    def test_unreachable_benign_domain_returns_unreachable_verdict(self, mock_verify):
        mock_verify.return_value = {
            "status": "unreachable",
            "dns_resolved": True,
            "dns_status": "Resolved (1.2.3.4)",
            "resolved_ips": ["1.2.3.4"],
            "http_reachable": False,
            "https_reachable": False,
            "http_status": None,
            "final_url": None,
            "redirect_count": 0,
            "response_time_ms": 2000,
            "tls_valid": None,
            "error": "Connection timed out after 2.0s."
        }

        response = client.post("/api/scan/url", json={"url": "https://example.com/status"})
        assert response.status_code == 200
        data = response.json()

        assert data["verdict"] == "unreachable"
        assert data["domain_verification"]["status"] == "unreachable"
        assert data["domain_verification"]["http_reachable"] is False

    @patch("backend.main.verify_domain_reachability")
    def test_reachable_phishing_fixture_returns_phishing_verdict(self, mock_verify):
        mock_verify.return_value = {
            "status": "reachable",
            "dns_resolved": True,
            "dns_status": "Resolved (198.51.100.1)",
            "resolved_ips": ["198.51.100.1"],
            "http_reachable": True,
            "https_reachable": False,
            "http_status": 200,
            "final_url": "http://paypal-security-verification.xyz/",
            "redirect_count": 0,
            "response_time_ms": 150,
            "tls_valid": None,
            "error": None
        }

        response = client.post("/api/scan/url", json={"url": "http://paypal-security-verification.xyz"})
        assert response.status_code == 200
        data = response.json()

        assert data["verdict"] in ("phishing", "suspicious")
        assert data["risk_score"] > 50
        assert data["domain_verification"]["status"] == "reachable"
        assert data["threat_analysis"]["verdict"] in ("phishing", "suspicious")

    @patch("backend.main.verify_domain_reachability")
    def test_typosquat_lookalike_domain_is_flagged_with_brand_evidence(self, mock_verify):
        mock_verify.return_value = {
            "status": "reachable",
            "dns_resolved": True,
            "dns_status": "Resolved (198.51.100.5)",
            "resolved_ips": ["198.51.100.5"],
            "http_reachable": True,
            "https_reachable": True,
            "http_status": 200,
            "final_url": "https://paypa1.com/",
            "redirect_count": 0,
            "response_time_ms": 180,
            "tls_valid": True,
            "error": None
        }

        response = client.post("/api/scan/url", json={"url": "https://paypa1.com/login"})
        assert response.status_code == 200
        data = response.json()

        assert data["typosquat_domain"] == "paypal.com"
        assert data["potential_brand"] == "paypal"
        assert data["verdict"] in ("suspicious", "phishing")
        assert any("paypa1.com" in ind or "paypal" in ind for ind in data["indicators"])

    @patch("backend.main.verify_domain_reachability")
    def test_amazon_in_is_safe_and_not_typosquat(self, mock_verify):
        mock_verify.return_value = {
            "status": "reachable",
            "dns_resolved": True,
            "dns_status": "Resolved (52.95.116.115)",
            "resolved_ips": ["52.95.116.115"],
            "http_reachable": True,
            "https_reachable": True,
            "http_status": 200,
            "final_url": "https://www.amazon.in/",
            "redirect_count": 0,
            "response_time_ms": 120,
            "tls_valid": True,
            "error": None
        }

        response = client.post("/api/scan/url", json={"url": "https://www.amazon.in"})
        assert response.status_code == 200
        data = response.json()

        assert data["verdict"] == "safe"
        assert data["risk_score"] == 0
        assert data["trusted_domain"] is True
        assert data["typosquat_domain"] is None
        assert data["potential_brand"] is None
        assert not any("resembles protected brand" in ind for ind in data["indicators"])

    @patch("backend.main.verify_domain_reachability")
    def test_google_co_in_is_safe_and_not_typosquat(self, mock_verify):
        mock_verify.return_value = {
            "status": "reachable",
            "dns_resolved": True,
            "dns_status": "Resolved (142.250.190.35)",
            "resolved_ips": ["142.250.190.35"],
            "http_reachable": True,
            "https_reachable": True,
            "http_status": 200,
            "final_url": "https://www.google.co.in/",
            "redirect_count": 0,
            "response_time_ms": 110,
            "tls_valid": True,
            "error": None
        }

        response = client.post("/api/scan/url", json={"url": "https://www.google.co.in"})
        assert response.status_code == 200
        data = response.json()

        assert data["verdict"] == "safe"
        assert data["risk_score"] == 0
        assert data["trusted_domain"] is True
        assert data["typosquat_domain"] is None
        assert data["potential_brand"] is None
        assert not any("resembles protected brand" in ind for ind in data["indicators"])

    @patch("backend.main.verify_domain_reachability")
    def test_micros0ft_com_retains_threat_verdict_even_if_non_existent(self, mock_verify):
        mock_verify.return_value = {
            "status": "non_existent",
            "dns_resolved": False,
            "dns_status": "Domain not found (NXDOMAIN)",
            "resolved_ips": [],
            "http_reachable": False,
            "https_reachable": False,
            "http_status": None,
            "final_url": None,
            "redirect_count": 0,
            "response_time_ms": 40,
            "tls_valid": None,
            "error": "DNS resolution failed: NXDOMAIN"
        }

        response = client.post("/api/scan/url", json={"url": "https://www.micros0ft.com"})
        assert response.status_code == 200
        data = response.json()

        assert data["potential_brand"] == "microsoft"
        assert data["typosquat_domain"] == "microsoft.com"
        assert data["trusted_domain"] is False
        assert data["verdict"] != "safe"
        assert data["verdict"] != "non_existent"
        assert data["verdict"] in ("suspicious", "phishing")
        assert data["risk_score"] >= 60
        assert data["domain_verification"]["status"] == "non_existent"
        assert any("NXDOMAIN" in ind for ind in data["indicators"])
        assert any("microsoft" in ind for ind in data["indicators"])
