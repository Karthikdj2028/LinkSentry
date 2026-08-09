"""
Unit and Integration Tests for LinkSentry Message Threat Detection Engine
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.message_detector import analyze_message, ENGINE_NAME

client = TestClient(app)


class TestMessageDetectorUnit:
    """Unit tests for the message heuristic detection logic"""

    def test_safe_routine_message(self):
        msg = "Meeting is scheduled for tomorrow at 10 AM."
        result = analyze_message(msg)
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30
        assert result["engine"] == ENGINE_NAME
        assert 0.0 <= result["confidence"] <= 1.0

    def test_safe_account_message(self):
        msg = "Your account settings were updated successfully."
        result = analyze_message(msg)
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30

    def test_safe_subscription_renewal(self):
        msg = "Your cloud storage subscription renews automatically on September 1."
        result = analyze_message(msg)
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30

    def test_safe_monthly_invoice(self):
        msg = "Your monthly invoice is available in your account."
        result = analyze_message(msg)
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30

    def test_safe_billing_documentation_link(self):
        msg = "Read our billing documentation: https://example.com/billing"
        result = analyze_message(msg)
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30

    def test_target_cloud_storage_false_negative_fix(self):
        """Regression test for the false-negative cloud storage renewal phishing message"""
        msg = (
            "Dear user, your cloud storage subscription could not renew automatically. "
            "To keep your files safe, check billing at http://cloud-storage-renewal-fix.net/pay today."
        )
        result = analyze_message(msg)
        assert result["verdict"] in ["phishing", "suspicious"]
        assert result["risk_score"] >= 70
        assert any("billing" in i.lower() or "subscription" in i.lower() for i in result["indicators"])
        assert any("embedded link" in i.lower() or "anomalies" in i.lower() for i in result["indicators"])

    def test_suspicious_account_message(self):
        msg = "Your account has been locked. Verify your account now."
        result = analyze_message(msg)
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 30
        assert any("account" in i.lower() or "restriction" in i.lower() for i in result["indicators"])

    def test_billing_with_suspicious_url(self):
        msg = "Your payment failed. Review your billing here: http://payment-update-example.xyz/verify"
        result = analyze_message(msg)
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 40

    def test_billing_with_urgency_and_suspicious_url(self):
        msg = "Your subscription could not renew. Update billing today: http://cloud-storage-renewal-fix.net/pay"
        result = analyze_message(msg)
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 50

    def test_otp_scam_social_engineering(self):
        msg = "Your bank account is suspended. Send the OTP immediately to restore access."
        result = analyze_message(msg)
        assert result["verdict"] == "phishing"
        assert result["risk_score"] >= 70
        assert any("otp" in i.lower() or "code" in i.lower() for i in result["indicators"])

    def test_payment_scam_lure(self):
        msg = "Your payment failed. Confirm your card details immediately using the link below."
        result = analyze_message(msg)
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 50
        assert any("financial" in i.lower() or "payment" in i.lower() or "card" in i.lower() for i in result["indicators"])

    def test_prize_lottery_scam(self):
        msg = "Congratulations! You won a ₹50,000 reward. Claim your prize now by verifying your account."
        result = analyze_message(msg)
        assert result["verdict"] == "phishing"
        assert result["risk_score"] >= 70
        assert any("prize" in i.lower() or "reward" in i.lower() or "won" in i.lower() for i in result["indicators"])

    def test_brand_impersonation_with_phishing_url(self):
        msg = "PayPal: Your account has been suspended. Verify your password immediately: http://login-account-verification.xyz/secure/login"
        result = analyze_message(msg)
        assert result["verdict"] == "phishing"
        assert result["risk_score"] >= 70
        assert any("paypal" in i.lower() or "brand" in i.lower() for i in result["indicators"])
        assert any("embedded link" in i.lower() or "phishing destination" in i.lower() for i in result["indicators"])

    def test_brand_subscription_phishing(self):
        msg = "Your PayPal subscription payment failed. Verify your account immediately: http://paypal-security-verification.xyz/account/login"
        result = analyze_message(msg)
        assert result["verdict"] == "phishing"
        assert result["risk_score"] >= 70
        assert any("paypal" in i.lower() or "brand" in i.lower() for i in result["indicators"])

    def test_safe_url_in_message(self):
        msg = "Here is the documentation: https://example.com"
        result = analyze_message(msg)
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30

    def test_url_shortener_with_urgency(self):
        msg = "Your account will be closed today. Verify now: https://bit.ly/example"
        result = analyze_message(msg)
        assert result["verdict"] in ["suspicious", "phishing"]
        assert result["risk_score"] >= 30
        assert any("shorten" in i.lower() for i in result["indicators"])

    def test_empty_message(self):
        result = analyze_message("")
        assert result["verdict"] == "invalid"
        assert result["risk_score"] == 0

    def test_whitespace_message(self):
        result = analyze_message("     ")
        assert result["verdict"] == "invalid"
        assert result["risk_score"] == 0

    def test_very_long_message(self):
        long_msg = "Hello security team. " * 500
        result = analyze_message(long_msg)
        assert result["verdict"] in ["safe", "suspicious", "phishing"]
        assert isinstance(result["indicators"], list)
        assert len(result["message"]) > 1000

    def test_score_and_confidence_bounds(self):
        samples = [
            "Meeting at 3pm",
            "Urgent: password reset needed at http://evil.xyz",
            "Share your OTP with support",
            "You won free gift card",
            "FedEx delivery pending. Pay $2 fee at https://bit.ly/delivery-fee"
        ]
        for s in samples:
            res = analyze_message(s)
            assert 0 <= res["risk_score"] <= 100
            assert 0.0 <= res["confidence"] <= 1.0
            assert res["verdict"] in ["safe", "suspicious", "phishing", "invalid"]


class TestFastApiMessageEndpoint:
    """Integration tests for the /api/scan/message endpoint"""

    def test_scan_message_endpoint_contract(self):
        payload = {"message": "Meeting is scheduled for tomorrow at 10 AM."}
        response = client.post("/api/scan/message", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert "verdict" in data
        assert "risk_score" in data
        assert "confidence" in data
        assert "message" in data
        assert "indicators" in data
        assert "engine" in data

        assert data["verdict"] == "safe"
        assert data["risk_score"] == 0
        assert data["engine"] == ENGINE_NAME

    def test_scan_message_phishing_endpoint(self):
        payload = {
            "message": "URGENT: Your PayPal account is suspended! Send your OTP code immediately: http://paypal-fake.xyz"
        }
        response = client.post("/api/scan/message", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["verdict"] == "phishing"
        assert data["risk_score"] >= 70
