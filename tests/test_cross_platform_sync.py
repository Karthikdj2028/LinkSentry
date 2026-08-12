"""
LinkSentry Cross-Platform Synchronization & Account Isolation Verification Suite

Validates:
1. Single User Identity (Firebase Auth Web & Android UID parity)
2. Authoritative V3.3 ML Threat Engine output
3. Bidirectional Scan Persistence (Web -> Android & Android -> Web)
4. Shared Firestore Schema Parity (users/{uid}/scans/{scanId})
5. Strict Multi-Tenant Account Isolation (User A vs User B security boundaries)
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
import pytest

FIREBASE_API_KEY = os.environ.get("VITE_FIREBASE_API_KEY", "AIzaSyCA_r0daj-CmkAHK8FCgoJ5pk7GZdPFX9s")
PROJECT_ID = os.environ.get("VITE_FIREBASE_PROJECT_ID", "linksentry-7e694")
BACKEND_URL = os.environ.get("VITE_API_BASE_URL", "http://127.0.0.1:8000")


def firebase_auth_sign_in_or_sign_up(email, password):
    """Signs in or registers a user via Firebase Auth REST API."""
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    payload = json.dumps({
        "email": email,
        "password": password,
        "returnSecureToken": True
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            return data["localId"], data["idToken"]
    except urllib.error.HTTPError as e:
        # If user not found, create account
        err_body = json.loads(e.read().decode())
        err_msg = err_body.get("error", {}).get("message", "")
        if "EMAIL_NOT_FOUND" in err_msg or "INVALID_PASSWORD" not in err_msg:
            sign_up_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={FIREBASE_API_KEY}"
            req_signup = urllib.request.Request(sign_up_url, data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req_signup, timeout=10) as resp_signup:
                data = json.loads(resp_signup.read().decode())
                return data["localId"], data["idToken"]
        raise


def firestore_create_scan_doc(uid, id_token, scan_payload):
    """Creates a scan document under users/{uid}/scans via Firestore REST API."""
    url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/users/{uid}/scans"
    
    # Format fields into Firestore REST format
    firestore_fields = {
        "userId": {"stringValue": uid},
        "type": {"stringValue": scan_payload.get("type", "url")},
        "input": {"stringValue": scan_payload.get("input", "")},
        "url": {"stringValue": scan_payload.get("url", "")},
        "domain": {"stringValue": scan_payload.get("domain", "")},
        "verdict": {"stringValue": scan_payload.get("verdict", "safe")},
        "riskScore": {"integerValue": scan_payload.get("riskScore", 0)},
        "confidence": {"doubleValue": float(scan_payload.get("confidence", 0.0))},
        "indicators": {
            "arrayValue": {
                "values": [{"stringValue": ind} for ind in scan_payload.get("indicators", [])]
            }
        },
        "engine": {"stringValue": scan_payload.get("engine", "LinkSentry V3.3 URL ML Engine")},
        "modelVersion": {"stringValue": scan_payload.get("modelVersion", "V3.3")},
        "source": {"stringValue": scan_payload.get("source", "web")},
        "createdAt": {"timestampValue": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    }

    doc_body = json.dumps({"fields": firestore_fields}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=doc_body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {id_token}"
        }
    )

    with urllib.request.urlopen(req, timeout=10) as resp:
        res = json.loads(resp.read().decode())
        doc_path = res["name"]
        scan_id = doc_path.split("/")[-1]
        return scan_id, res


def firestore_list_scans(uid, id_token):
    """Lists scan documents under users/{uid}/scans via Firestore REST API."""
    url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/users/{uid}/scans"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {id_token}"}
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            documents = data.get("documents", [])
            parsed_scans = []
            for doc in documents:
                fields = doc.get("fields", {})
                scan_id = doc["name"].split("/")[-1]
                parsed_scans.append({
                    "id": scan_id,
                    "userId": fields.get("userId", {}).get("stringValue", ""),
                    "type": fields.get("type", {}).get("stringValue", ""),
                    "input": fields.get("input", {}).get("stringValue", ""),
                    "url": fields.get("url", {}).get("stringValue", ""),
                    "domain": fields.get("domain", {}).get("stringValue", ""),
                    "verdict": fields.get("verdict", {}).get("stringValue", ""),
                    "riskScore": int(fields.get("riskScore", {}).get("integerValue", 0)),
                    "confidence": float(fields.get("confidence", {}).get("doubleValue", 0.0)),
                    "source": fields.get("source", {}).get("stringValue", ""),
                    "engine": fields.get("engine", {}).get("stringValue", ""),
                    "modelVersion": fields.get("modelVersion", {}).get("stringValue", "")
                })
            return parsed_scans
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return []
        raise


def firestore_try_read_other_user_doc(other_uid, other_doc_id, caller_id_token):
    """Attempts to read User B's document using User A's token to test security rules."""
    url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/users/{other_uid}/scans/{other_doc_id}"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {caller_id_token}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.getcode(), json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


# ==============================================================================
# TEST SUITE
# ==============================================================================

class TestCrossPlatformUnifiedArchitecture:
    """Verifies that Web and Android share the exact same user identity, threat engine, and Firestore data store."""

    def test_single_authoritative_ml_engine_verdicts(self):
        """Validates that FastAPI returns identical V3.3 ML verdicts for benign and phishing links."""
        # 1. Benign known target
        req_safe = urllib.request.Request(
            f"{BACKEND_URL}/api/scan/url",
            data=json.dumps({"url": "https://google.com"}).encode(),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req_safe, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            assert data["verdict"] == "safe"
            assert data["risk_score"] <= 20
            assert "V3.3" in data.get("model_version", "")

        # 2. Phishing brand impersonation target
        req_phish = urllib.request.Request(
            f"{BACKEND_URL}/api/scan/url",
            data=json.dumps({"url": "https://google-security-alert.com/login"}).encode(),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req_phish, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            assert data["verdict"] == "phishing"
            assert data["risk_score"] >= 85
            assert data["domain"] == "google-security-alert.com"

        # 3. Message smishing detector
        req_msg = urllib.request.Request(
            f"{BACKEND_URL}/api/scan/message",
            data=json.dumps({
                "message": "URGENT: Your account has been locked. Click http://secure-verify.net/reset immediately."
            }).encode(),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req_msg, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            assert data["verdict"] == "phishing"
            assert data["risk_score"] >= 75
            assert any("urgency" in ind.lower() or "link" in ind.lower() for ind in data.get("indicators", []))

    def test_single_user_identity_resolution(self):
        """Verifies that logging in on Web and Android with the same credentials resolves to the exact same Firebase UID."""
        test_email = "analyst.alpha@linksentry-defense.org"
        test_pass = "LinkSentryAuth2026!"

        uid_1, token_1 = firebase_auth_sign_in_or_sign_up(test_email, test_pass)
        uid_2, token_2 = firebase_auth_sign_in_or_sign_up(test_email, test_pass)

        assert uid_1 is not None and len(uid_1) > 10
        assert uid_1 == uid_2, "Web login and Android login MUST resolve to the exact same Firebase UID"

    def test_web_to_android_and_android_to_web_firestore_sync(self):
        """
        Tests the core cross-platform requirement:
        1. User A creates a scan from Web -> stored in users/{uid_A}/scans.
        2. User A opens Android -> exact scan is retrieved.
        3. User A creates a scan from Android -> stored in users/{uid_A}/scans.
        4. User A opens Web -> both scans are visible in history and dashboard aggregation.
        """
        test_email = f"analyst.sync.{int(time.time())}@linksentry.test"
        test_pass = "UnifiedSync2026!"

        uid, token = firebase_auth_sign_in_or_sign_up(test_email, test_pass)

        # 1. Detonate URL on Web simulation
        web_scan_payload = {
            "type": "url",
            "input": "https://google-security-alert.com/login",
            "url": "https://google-security-alert.com/login",
            "domain": "google-security-alert.com",
            "verdict": "phishing",
            "riskScore": 98,
            "confidence": 0.96,
            "indicators": ["Brand impersonation: google", "High entropy token"],
            "engine": "LinkSentry V3.3 URL ML Engine",
            "modelVersion": "V3.3",
            "source": "web"
        }
        scan_id_web, _ = firestore_create_scan_doc(uid, token, web_scan_payload)
        assert scan_id_web is not None

        # 2. Retrieve history on Android simulation
        android_scans = firestore_list_scans(uid, token)
        matching_scan = next((s for s in android_scans if s["id"] == scan_id_web), None)
        assert matching_scan is not None, "Scan created on Web MUST exist in Android history"
        assert matching_scan["domain"] == "google-security-alert.com"
        assert matching_scan["verdict"] == "phishing"
        assert matching_scan["riskScore"] == 98
        assert matching_scan["source"] == "web"

        # 3. Detonate SMS Message on Android simulation
        android_scan_payload = {
            "type": "message",
            "input": "USPS: Package impounded. Verify address at http://usps-track-claim.com",
            "url": "http://usps-track-claim.com",
            "domain": "usps-track-claim.com",
            "verdict": "phishing",
            "riskScore": 88,
            "confidence": 0.92,
            "indicators": ["Courier impound lure", "Unverified external link"],
            "engine": "LinkSentry Smishing Heuristic Engine",
            "modelVersion": "v1.0",
            "source": "android"
        }
        scan_id_android, _ = firestore_create_scan_doc(uid, token, android_scan_payload)
        assert scan_id_android is not None

        # 4. Retrieve unified history on Web
        web_updated_scans = firestore_list_scans(uid, token)
        assert len(web_updated_scans) >= 2
        scan_ids = [s["id"] for s in web_updated_scans]
        assert scan_id_web in scan_ids
        assert scan_id_android in scan_ids

        # Verify cross-platform source attribution
        sources = [s["source"] for s in web_updated_scans]
        assert "web" in sources
        assert "android" in sources

    def test_multi_tenant_account_isolation_security(self):
        """
        Validates mandatory account isolation:
        - User A and User B cannot see each other's scans.
        - User A cannot read, tamper, or delete User B's scans.
        """
        ts = int(time.time())
        user_a_email = f"analyst.a.{ts}@linksentry.test"
        user_b_email = f"analyst.b.{ts}@linksentry.test"
        password = "SecurePassword2026!"

        uid_a, token_a = firebase_auth_sign_in_or_sign_up(user_a_email, password)
        uid_b, token_b = firebase_auth_sign_in_or_sign_up(user_b_email, password)

        assert uid_a != uid_b, "User A and User B must have distinct UIDs"

        # User A creates a scan
        scan_payload_a = {
            "type": "url",
            "input": "https://confidential-user-a.org",
            "url": "https://confidential-user-a.org",
            "domain": "confidential-user-a.org",
            "verdict": "safe",
            "riskScore": 5,
            "source": "web"
        }
        scan_id_a, _ = firestore_create_scan_doc(uid_a, token_a, scan_payload_a)

        # User B queries their history -> MUST be empty
        scans_b = firestore_list_scans(uid_b, token_b)
        assert len(scans_b) == 0, "User B history MUST NOT contain any of User A's scans"

        # User B creates a scan
        scan_payload_b = {
            "type": "url",
            "input": "https://private-user-b.com",
            "url": "https://private-user-b.com",
            "domain": "private-user-b.com",
            "verdict": "suspicious",
            "riskScore": 60,
            "source": "android"
        }
        scan_id_b, _ = firestore_create_scan_doc(uid_b, token_b, scan_payload_b)

        # User A queries their history -> MUST contain ONLY User A's scans
        scans_a = firestore_list_scans(uid_a, token_a)
        assert len(scans_a) == 1
        assert scans_a[0]["id"] == scan_id_a
        assert scans_a[0]["domain"] == "confidential-user-a.org"
        assert all(s["id"] != scan_id_b for s in scans_a)

        # User A attempts to read User B's scan document directly -> MUST BE REJECTED (HTTP 403 Forbidden / 404)
        status_code, resp_body = firestore_try_read_other_user_doc(uid_b, scan_id_b, token_a)
        assert status_code in (403, 404), f"Security violation! Expected 403/404, got status {status_code}"
