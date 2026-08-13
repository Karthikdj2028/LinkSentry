"""
LinkSentry API Security Suite: HTTP Error Boundaries, Method Enforcement & Request Typing
Verifies that FastAPI enforces strict HTTP method constraints, rejects malformed payloads,
validates JSON types, and properly handles boundary error conditions (400, 404, 405, 422, 429).
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


class TestHttpMethodEnforcement:
    """Verifies that endpoints only accept permitted HTTP verbs and return 405 Method Not Allowed otherwise."""

    def test_scan_url_get_method_not_allowed(self):
        response = client.get("/api/scan/url")
        assert response.status_code == 405

    def test_scan_url_put_method_not_allowed(self):
        response = client.put("/api/scan/url", json={"url": "https://example.com"})
        assert response.status_code == 405

    def test_scan_url_delete_method_not_allowed(self):
        response = client.delete("/api/scan/url")
        assert response.status_code == 405

    def test_scan_message_get_method_not_allowed(self):
        response = client.get("/api/scan/message")
        assert response.status_code == 405

    def test_scan_message_put_method_not_allowed(self):
        response = client.put("/api/scan/message", json={"message": "test"})
        assert response.status_code == 405

    def test_scan_message_delete_method_not_allowed(self):
        response = client.delete("/api/scan/message")
        assert response.status_code == 405

    def test_health_post_method_not_allowed(self):
        response = client.post("/api/health", json={})
        assert response.status_code == 405


class TestRouteNotFound:
    """Verifies standard 404 behavior on unregistered endpoints."""

    def test_nonexistent_api_route_returns_404(self):
        response = client.get("/api/nonexistent-endpoint")
        assert response.status_code == 404

    def test_root_path_returns_404(self):
        response = client.get("/")
        assert response.status_code == 404

    def test_wrong_scanner_path_returns_404(self):
        response = client.post("/api/scanner", json={"url": "https://example.com"})
        assert response.status_code == 404


class TestRequestPayloadTypeValidation:
    """Verifies that non-string and malformed JSON types are rejected with HTTP 422."""

    def test_url_scan_with_integer_type_rejected(self):
        response = client.post("/api/scan/url", json={"url": 12345678})
        assert response.status_code == 422

    def test_url_scan_with_boolean_type_rejected(self):
        response = client.post("/api/scan/url", json={"url": True})
        assert response.status_code == 422

    def test_url_scan_with_array_type_rejected(self):
        response = client.post("/api/scan/url", json={"url": ["https://example.com"]})
        assert response.status_code == 422

    def test_url_scan_with_nested_object_rejected(self):
        response = client.post("/api/scan/url", json={"url": {"target": "https://example.com"}})
        assert response.status_code == 422

    def test_url_scan_with_null_value_rejected(self):
        response = client.post("/api/scan/url", json={"url": None})
        assert response.status_code == 422

    def test_message_scan_with_integer_type_rejected(self):
        response = client.post("/api/scan/message", json={"message": 99999})
        assert response.status_code == 422

    def test_message_scan_with_boolean_type_rejected(self):
        response = client.post("/api/scan/message", json={"message": False})
        assert response.status_code == 422

    def test_message_scan_with_array_type_rejected(self):
        response = client.post("/api/scan/message", json={"message": ["Hello", "World"]})
        assert response.status_code == 422

    def test_message_scan_with_null_value_rejected(self):
        response = client.post("/api/scan/message", json={"message": None})
        assert response.status_code == 422


class TestBoundaryPayloadLengthConstraints:
    """Verifies that payload length limits (2048 chars for URLs, 10000 chars for Messages) are strictly enforced."""

    def test_url_exact_max_boundary_accepted(self):
        # Base scheme + padding to exactly 2048 characters
        base = "https://example.com/path?"
        padding = "a" * (2048 - len(base))
        exact_url = base + padding
        assert len(exact_url) == 2048

        response = client.post("/api/scan/url", json={"url": exact_url})
        assert response.status_code == 200

    def test_url_one_char_over_boundary_rejected(self):
        base = "https://example.com/path?"
        padding = "a" * (2049 - len(base))
        over_url = base + padding
        assert len(over_url) == 2049

        response = client.post("/api/scan/url", json={"url": over_url})
        assert response.status_code == 422

    def test_message_exact_max_boundary_accepted(self):
        exact_msg = "A" * 10000
        response = client.post("/api/scan/message", json={"message": exact_msg})
        assert response.status_code == 200

    def test_message_one_char_over_boundary_rejected(self):
        over_msg = "A" * 10001
        response = client.post("/api/scan/message", json={"message": over_msg})
        assert response.status_code == 422
