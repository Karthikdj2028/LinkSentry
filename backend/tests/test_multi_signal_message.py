"""
Tests for Multi-Signal Message Threat Engine (LinkSentry V3.3)
"""

import pytest
from backend.message_detector import analyze_message, ENGINE_NAME


class TestMultiSignalMessageDetection:
    """Validates multi-signal decision fusion, unsolicited loan detection, and embedded URL analysis"""

    def test_unsolicited_loan_offer_with_shortlink_and_phone(self):
        msg = "PERSONAL LOAN OFFER up to Rs.75000. Chat https://a.bflcomm.in/BAJAJF/1Oq9z, Call us 7757000000"
        result = analyze_message(msg)
        assert result["verdict"] in ["phishing", "suspicious"]
        assert result["risk_score"] >= 65
        assert result["engine"] == ENGINE_NAME
        assert any("loan" in i.lower() for i in result["indicators"])
        assert any("contact" in i.lower() or "phone" in i.lower() for i in result["indicators"])
        assert "message_risk" in result
        assert "embedded_urls" in result
        assert len(result["embedded_urls"]) >= 1

    def test_legitimate_conversational_message_with_phone_number(self):
        """Legitimate message with phone number must NOT be falsely marked as phishing"""
        msg = "Hey Karthik, please call me at 9876543210 when you finish the meeting."
        result = analyze_message(msg)
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30

    def test_message_with_embedded_phishing_url(self):
        msg = "Important update regarding your account. Please review here: http://paypal-security-verification.xyz/login"
        result = analyze_message(msg)
        assert result["verdict"] in ["phishing", "suspicious"]
        assert result["risk_score"] >= 70
        assert len(result["embedded_urls"]) == 1
        assert "message_risk" in result

    def test_message_with_clean_educational_link(self):
        msg = "Here are the notes from today's lecture: https://wikipedia.org/wiki/Computer_security"
        result = analyze_message(msg)
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30

    def test_instant_loan_preapproved_scam(self):
        msg = "Congratulations! You are pre-approved for an instant loan of Rs. 5,00,000 with zero collateral. Apply now: https://bit.ly/fast-loan-claim"
        result = analyze_message(msg)
        assert result["verdict"] == "phishing"
        assert result["risk_score"] >= 70
        assert any("loan" in i.lower() for i in result["indicators"])
