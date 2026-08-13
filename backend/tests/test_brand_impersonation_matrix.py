"""
LinkSentry API Security Suite: Brand Impersonation & Spoofing Matrix
Verifies that legitimate domains of major protected brands remain safe, while unauthorized
deceptive domains using brand names with credential and verification lures are accurately classified as threats.
"""

import pytest
from backend.detector import analyze_url, _check_brand_impersonation, KNOWN_BRANDS


class TestLegitimateBrandDomains:
    """Verifies that legitimate brand portals are recognized as safe with low risk scores."""

    @pytest.mark.parametrize("brand,legit_url", [
        ("paypal", "https://www.paypal.com/signin"),
        ("paypal", "https://paypal-objects.com/webstatic/icon.png"),
        ("microsoft", "https://login.microsoftonline.com/common/oauth2"),
        ("microsoft", "https://portal.azure.com/"),
        ("google", "https://accounts.google.com/signin"),
        ("google", "https://mail.google.com/mail/u/0/"),
        ("apple", "https://appleid.apple.com/account"),
        ("apple", "https://www.icloud.com/find"),
        ("amazon", "https://www.amazon.com/ap/signin"),
        ("amazon", "https://aws.amazon.com/console/"),
        ("netflix", "https://www.netflix.com/login"),
        ("facebook", "https://www.facebook.com/login.php"),
        ("instagram", "https://www.instagram.com/accounts/login/"),
        ("whatsapp", "https://web.whatsapp.com/"),
        ("chase", "https://www.chase.com/personal/banking"),
        ("wellsfargo", "https://www.wellsfargo.com/help/"),
        ("bankofamerica", "https://www.bankofamerica.com/homepage/"),
        ("binance", "https://accounts.binance.com/en/login"),
        ("coinbase", "https://www.coinbase.com/signin"),
        ("metamask", "https://metamask.io/download/"),
        ("steam", "https://store.steampowered.com/login/"),
        ("dropbox", "https://www.dropbox.com/login"),
        ("adobe", "https://account.adobe.com/"),
    ])
    def test_legitimate_brand_domains_evaluated_as_safe(self, brand, legit_url):
        result = analyze_url(legit_url)
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30
        # Must not generate a brand impersonation warning on legitimate brand domains
        assert not any("imitating brand" in i.lower() or "unverified third-party" in i.lower() for i in result["indicators"])


class TestDeceptiveBrandImpersonations:
    """Verifies that lookalike hostnames containing brand names on unverified domains are flagged."""

    @pytest.mark.parametrize("brand,deceptive_url", [
        ("paypal", "http://paypal-security-verification.xyz/login"),
        ("microsoft", "http://microsoft-verify-365.net/account/update"),
        ("google", "http://google-drive-security-check.xyz/auth"),
        ("apple", "http://appleid-support-alert.xyz/verify"),
        ("amazon", "http://amazon-order-confirmation.click/invoice"),
        ("netflix", "http://netflix-billing-renew.top/account"),
        ("chase", "http://chase-banking-security.buzz/portal"),
        ("wellsfargo", "http://wellsfargo-online-update.rest/login"),
        ("bankofamerica", "http://bankofamerica-verify-alert.cf/signin"),
        ("binance", "http://binance-wallet-security.icu/2fa"),
        ("coinbase", "http://coinbase-pro-auth.vip/login"),
        ("metamask", "http://metamask-seed-phrase.cam/restore"),
        ("steam", "http://steam-trade-gift.top/claim"),
        ("dropbox", "http://dropbox-shared-document.buzz/download"),
    ])
    def test_deceptive_brand_spoofing_flagged_with_brand_indicator(self, brand, deceptive_url):
        result = analyze_url(deceptive_url)
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 35
        # Must specifically identify the targeted brand in indicators
        assert any(brand.lower() in i.lower() for i in result["indicators"])


class TestBrandImpersonationHelperDirect:
    """Direct unit tests for the _check_brand_impersonation internal function."""

    def test_exact_legitimate_brand_returns_zero(self):
        score, indicator = _check_brand_impersonation("paypal.com")
        assert score == 0
        assert indicator is None

    def test_subdomain_of_legitimate_brand_returns_zero(self):
        score, indicator = _check_brand_impersonation("accounts.google.com")
        assert score == 0
        assert indicator is None

    def test_brand_with_lure_keyword_returns_high_score(self):
        score, indicator = _check_brand_impersonation("paypal-login-verification.com")
        assert score >= 35
        assert "paypal" in indicator.lower()
        assert "imitating brand" in indicator.lower()

    def test_brand_without_lures_returns_moderate_score(self):
        score, indicator = _check_brand_impersonation("my-paypal-blog.com")
        assert score >= 20
        assert "paypal" in indicator.lower()
