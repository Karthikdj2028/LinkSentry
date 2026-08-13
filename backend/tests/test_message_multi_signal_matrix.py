"""
LinkSentry API Security Suite: Multi-Signal Message Threat Intelligence Matrix
Verifies embedded URL extraction, mixed link threat detonation, phone number / contact harvesting detection,
unsolicited loan smishing heuristics, and false-positive immunity on legitimate transactional notices.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.message_detector import analyze_message, _extract_urls, _matches_any_pattern, CONTACT_SOLICITATION_PATTERNS, ENGINE_NAME

client = TestClient(app)


class TestMultipleEmbeddedUrlsInMessages:
    """Verifies that messages with multiple embedded links are extracted and detonated individually."""

    def test_message_with_multiple_benign_urls(self):
        msg = "Check the docs at https://python.org and the repo at https://github.com for full details."
        result = analyze_message(msg)
        assert result["verdict"] == "safe"
        assert len(result["embedded_urls"]) == 2
        assert all(u["verdict"] == "safe" for u in result["embedded_urls"])

    def test_message_with_mixed_verdicts_elevates_to_highest_threat(self):
        # 1 Benign URL + 1 Phishing URL -> Overall verdict must be Phishing
        msg = "Hi! Review documentation at https://google.com or resolve your suspended account at http://paypal-security-verification.xyz/login"
        result = analyze_message(msg)
        assert result["verdict"] == "phishing"
        assert result["risk_score"] >= 70
        assert len(result["embedded_urls"]) == 2
        # Verify individual URL breakdown
        verdicts = [u["verdict"] for u in result["embedded_urls"]]
        assert "safe" in verdicts
        assert "phishing" in verdicts

    def test_message_with_three_embedded_urls(self):
        msg = "Visit https://example.com, or check https://wikipedia.org, or verify at http://bank-update-alert.top/signin"
        result = analyze_message(msg)
        assert len(result["embedded_urls"]) == 3
        assert result["risk_score"] >= 30


class TestContactSolicitationPatterns:
    """Verifies regex matching and identification of contact solicitation in smishing lures."""

    def test_match_call_us_solicitation(self):
        msg = "Call us at 9876543210 to claim your pre-approved loan."
        matches = _matches_any_pattern(CONTACT_SOLICITATION_PATTERNS, msg)
        assert len(matches) >= 1

    def test_match_helpline_solicitation(self):
        msg = "Helpline: 18001234567 available 24/7 for urgent verification."
        matches = _matches_any_pattern(CONTACT_SOLICITATION_PATTERNS, msg)
        assert len(matches) >= 1

    def test_match_toll_free_solicitation(self):
        msg = "Toll-free 18005550199 call now before account is frozen."
        matches = _matches_any_pattern(CONTACT_SOLICITATION_PATTERNS, msg)
        assert len(matches) >= 1


class TestTransactionalLegitimateMessages:
    """Verifies that legitimate business and routine transactional messages are not falsely flagged."""

    def test_flight_booking_confirmation(self):
        msg = "Your flight 6E-204 from BLR to DEL is confirmed for 15 Aug, 10:30 AM. Terminal 1, Gate 4."
        result = analyze_message(msg)
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30

    def test_package_delivery_notification(self):
        msg = "Your package has been delivered to your front door. Thank you for shopping with us!"
        result = analyze_message(msg)
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30

    def test_doctor_appointment_reminder(self):
        msg = "Reminder: Your appointment with Dr. Sharma is scheduled for tomorrow at 4:30 PM. Please arrive 10 minutes early."
        result = analyze_message(msg)
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30

    def test_legitimate_wifi_password_share(self):
        msg = "Hey here is the guest Wi-Fi password for the office: Welcome2026! Network name is OfficeGuest."
        result = analyze_message(msg)
        assert result["verdict"] == "safe"
        assert result["risk_score"] < 30


class TestMultiSignalMessageEndpointContract:
    """Integration test via FastAPI TestClient verifying complete schema structure."""

    def test_scan_message_response_schema_invariants(self):
        payload = {
            "message": "URGENT LOAN: Pre-approved Rs. 50,000 credit limit. Call us at 9876500000 or click http://fast-loan-claim.top/apply"
        }
        response = client.post("/api/scan/message", json=payload)
        assert response.status_code == 200
        data = response.json()

        # Contract assertions
        assert "verdict" in data
        assert "risk_score" in data
        assert "confidence" in data
        assert "message" in data
        assert "indicators" in data
        assert "engine" in data
        assert "message_risk" in data
        assert "embedded_urls" in data

        assert isinstance(data["risk_score"], int)
        assert 0 <= data["risk_score"] <= 100
        assert isinstance(data["confidence"], (int, float))
        assert 0.0 <= data["confidence"] <= 1.0
        assert isinstance(data["indicators"], list)
        assert isinstance(data["embedded_urls"], list)
        assert len(data["embedded_urls"]) >= 1
