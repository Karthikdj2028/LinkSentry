"""
LinkSentry API Security Suite: URL Edge Cases, Punycode, Path Structures, and Redirects
Verifies parser resilience, IDN / punycode handling, deep subdomain trees, open-redirect queries,
and executable payload detection.
"""

import pytest
from backend.detector import analyze_url


class TestPunycodeAndInternationalizedDomains:
    """Verifies handling of Internationalized Domain Names (IDN) and punycode representations."""

    def test_valid_punycode_domain_analyzed(self):
        # xn--e1afmkfd.xn--p1ai represents a legitimate Cyrillic IDN
        result = analyze_url("https://xn--e1afmkfd.xn--p1ai/home")
        assert result["verdict"] in ["safe", "suspicious"]
        assert result["domain"] == "xn--e1afmkfd.xn--p1ai"
        assert 0 <= result["risk_score"] <= 100

    def test_punycode_with_phishing_path_flagged(self):
        result = analyze_url("http://xn--pple-43d.com/login/verify.php")
        assert result["risk_score"] >= 20
        assert result["domain"] == "xn--pple-43d.com"


class TestDeepSubdomainsAndLongDomains:
    """Verifies that unusually deep subdomain hierarchies and long domains receive elevated risk scores."""

    def test_five_level_subdomain_hierarchy(self):
        result = analyze_url("https://secure.auth.login.portal.service.target-corp.com/index")
        assert result["risk_score"] >= 15
        assert any("deep subdomain" in i.lower() or "subdomain" in i.lower() for i in result["indicators"])

    def test_four_level_subdomain_hierarchy(self):
        result = analyze_url("https://account.verify.online.domain.org/signin")
        assert result["risk_score"] >= 8
        assert any("subdomain" in i.lower() for i in result["indicators"])

    def test_unusually_long_hostname_flagged(self):
        long_host = "https://very-long-account-verification-portal-service-node-45.secure-auth-system.com/login"
        result = analyze_url(long_host)
        assert result["risk_score"] >= 10
        assert any("long domain" in i.lower() or "characters" in i.lower() for i in result["indicators"])

    def test_excessive_hyphens_in_hostname(self):
        result = analyze_url("https://secure-login-account-update-portal.com/home")
        assert result["risk_score"] >= 10
        assert any("hyphen" in i.lower() for i in result["indicators"])


class TestOpenRedirectParameters:
    """Verifies that query parameters often leveraged in open-redirect attacks are flagged."""

    @pytest.mark.parametrize("param_name", [
        "redirect", "redirect_url", "redirect_uri", "return", "returnurl",
        "return_url", "next", "url", "dest", "destination", "continue", "target"
    ])
    def test_open_redirect_parameters_detected(self, param_name):
        url = f"https://example.com/login?{param_name}=https://malicious-external-site.com/auth"
        result = analyze_url(url)
        assert result["risk_score"] >= 15
        assert any("open-redirect" in i.lower() or param_name in i for i in result["indicators"])


class TestExecutableAndPayloadExtensions:
    """Verifies detection of direct links to executables, archives, and installable payloads."""

    @pytest.mark.parametrize("ext", [
        ".exe", ".scr", ".zip", ".iso", ".bat", ".cmd", ".apk", ".msi"
    ])
    def test_dangerous_payload_extension_flagged(self, ext):
        url = f"http://download-center-update.com/files/security_patch{ext}"
        result = analyze_url(url)
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 35
        assert any("executable" in i.lower() or "payload" in i.lower() or "archive" in i.lower() for i in result["indicators"])


class TestPercentEncodingAndObfuscation:
    """Verifies detection of percent-encoded slashes, at-symbols, and colons in URLs."""

    def test_encoded_slash_detected(self):
        result = analyze_url("https://example.com/path%2F%2Flogin")
        assert result["risk_score"] >= 15
        assert any("encoding" in i.lower() or "obfuscation" in i.lower() for i in result["indicators"])

    def test_encoded_at_symbol_detected(self):
        result = analyze_url("https://example.com/%40admin/login")
        assert result["risk_score"] >= 15
        assert any("encoding" in i.lower() or "obfuscation" in i.lower() for i in result["indicators"])

    def test_encoded_colon_detected(self):
        result = analyze_url("https://example.com/resource%3Aview")
        assert result["risk_score"] >= 15
        assert any("encoding" in i.lower() or "obfuscation" in i.lower() for i in result["indicators"])
