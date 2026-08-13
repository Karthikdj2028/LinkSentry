"""
LinkSentry API Security Suite: URL Safety, Scheme Validation, and Private IP Handling
Validates how the threat detection engine analyzes private network addresses, localhost,
dangerous non-HTTP schemes, userinfo prefixes, and structural URL anomalies without making network calls.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.detector import analyze_url, _is_ip_address, ENGINE_NAME

client = TestClient(app)


class TestPrivateIpAndLocalhostDetection:
    """Verifies that direct IP addresses and internal network identifiers are identified and scored."""

    def test_ipv4_loopback_address_flagged(self):
        result = analyze_url("http://127.0.0.1/admin/login")
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 30
        assert any("raw IP address" in i or "IP address" in i for i in result["indicators"])
        assert result["domain"] == "127.0.0.1"

    def test_ipv4_private_class_a_flagged(self):
        result = analyze_url("http://10.0.0.1:8080/internal/dashboard")
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 30
        assert any("raw IP address" in i or "IP address" in i for i in result["indicators"])

    def test_ipv4_private_class_b_flagged(self):
        result = analyze_url("http://172.16.0.1/service/auth")
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 30
        assert any("raw IP address" in i or "IP address" in i for i in result["indicators"])

    def test_ipv4_private_class_c_flagged(self):
        result = analyze_url("http://192.168.1.100/router/login")
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 30
        assert any("raw IP address" in i or "IP address" in i for i in result["indicators"])

    def test_cloud_metadata_ip_flagged(self):
        # 169.254.169.254 is link-local / AWS / GCP metadata address
        result = analyze_url("http://169.254.169.254/latest/meta-data/")
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 30
        assert any("raw IP address" in i or "IP address" in i for i in result["indicators"])

    def test_zero_address_flagged(self):
        result = analyze_url("http://0.0.0.0:8000/api")
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 30
        assert any("raw IP address" in i or "IP address" in i for i in result["indicators"])

    def test_ipv6_bracketed_localhost_parsed(self):
        result = analyze_url("http://[::1]:8080/metrics")
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 30
        assert any("raw IP address" in i or "IP address" in i for i in result["indicators"])

    def test_ipv6_bracketed_global_address(self):
        result = analyze_url("http://[2001:db8::1]/status")
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 30
        assert any("raw IP address" in i or "IP address" in i for i in result["indicators"])


class TestDangerousSchemesRejection:
    """Verifies that non-web or dangerous protocol schemes are classified as invalid."""

    def test_file_scheme_rejected(self):
        result = analyze_url("file:///etc/passwd")
        assert result["verdict"] == "invalid"
        assert result["risk_score"] == 0

    def test_ftp_scheme_rejected(self):
        result = analyze_url("ftp://ftp.example.com/archive.zip")
        assert result["verdict"] == "invalid"
        assert result["risk_score"] == 0

    def test_gopher_scheme_rejected(self):
        result = analyze_url("gopher://gopher.example.com/1")
        assert result["verdict"] == "invalid"

    def test_javascript_pseudo_scheme_rejected(self):
        result = analyze_url("javascript:alert(document.cookie)")
        assert result["verdict"] == "invalid"

    def test_data_uri_scheme_rejected(self):
        result = analyze_url("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")
        assert result["verdict"] == "invalid"

    def test_dict_scheme_rejected(self):
        result = analyze_url("dict://localhost:11211/stats")
        assert result["verdict"] == "invalid"

    def test_ldap_scheme_rejected(self):
        result = analyze_url("ldap://localhost:389/dc=example,dc=com")
        assert result["verdict"] == "invalid"


class TestUserinfoAndEmbeddedCredentials:
    """Verifies that @ symbols and userinfo authentication components are detected as deception indicators."""

    def test_userinfo_with_password(self):
        result = analyze_url("https://admin:secret123@portal.phish-target.com/dashboard")
        assert result["risk_score"] >= 30
        assert any("@" in i or "userinfo" in i.lower() for i in result["indicators"])

    def test_userinfo_spoofing_legitimate_domain(self):
        result = analyze_url("https://google.com@malicious-redirect.com/login")
        assert result["risk_score"] >= 30
        assert any("@" in i or "userinfo" in i.lower() for i in result["indicators"])
        assert result["domain"] == "malicious-redirect.com"

    def test_userinfo_without_password(self):
        result = analyze_url("http://victim@evil-server.net/verify")
        assert result["risk_score"] >= 30
        assert any("@" in i or "userinfo" in i.lower() for i in result["indicators"])


class TestIpAddressHelperUnit:
    """Tests the internal _is_ip_address helper function directly."""

    def test_is_ip_address_valid_ipv4(self):
        assert _is_ip_address("192.168.1.1") is True
        assert _is_ip_address("10.0.0.1") is True
        assert _is_ip_address("127.0.0.1") is True
        assert _is_ip_address("8.8.8.8") is True

    def test_is_ip_address_valid_ipv6(self):
        assert _is_ip_address("::1") is True
        assert _is_ip_address("[::1]") is True
        assert _is_ip_address("2001:db8::1") is True
        assert _is_ip_address("[2001:db8::1]") is True

    def test_is_ip_address_regular_hostnames(self):
        assert _is_ip_address("example.com") is False
        assert _is_ip_address("google.com") is False
        assert _is_ip_address("sub.domain.co.uk") is False
        assert _is_ip_address("") is False
        assert _is_ip_address("192.168.1.com") is False
