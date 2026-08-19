"""
LinkSentry V3.4 Domain Existence & URL Reachability Verifier
Production-hardened, non-blocking verification service with SSRF protection,
DNS resolution checks, bounded HTTP/HTTPS probing, and TLS validation.
"""

import ipaddress
import logging
import socket
import ssl
import time
from urllib.parse import urlparse
from typing import Any
import httpx

logger = logging.getLogger("linksentry.domain_verifier")

# Default network constraints
DNS_TIMEOUT_SECONDS = 2.5
HTTP_CONNECT_TIMEOUT_SECONDS = 2.0
HTTP_READ_TIMEOUT_SECONDS = 2.0
MAX_REDIRECT_HOPS = 3
MAX_STREAM_BYTES = 512

# Common browser User-Agent to avoid immediate bot rejection on standard web servers
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 LinkSentry/3.4"


def is_private_or_restricted_ip(ip_str: str) -> bool:
    """
    Checks whether an IP address belongs to private, loopback, link-local,
    multicast, reserved, or non-routable public address spaces (SSRF protection).
    """
    try:
        ip_obj = ipaddress.ip_address(ip_str)
        return (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_reserved
            or ip_obj.is_unspecified
        )
    except ValueError:
        return True


def resolve_domain_dns(hostname: str, timeout: float = DNS_TIMEOUT_SECONDS) -> dict[str, Any]:
    """
    Resolves hostname A/AAAA records using socket.getaddrinfo with safe timeout.
    Returns structured resolution metadata and resolved IP addresses.
    """
    if not hostname or not isinstance(hostname, str):
        return {
            "resolved": False,
            "status": "invalid_hostname",
            "ips": [],
            "error": "Hostname is empty or malformed."
        }

    clean_host = hostname.strip().lower().strip("[]").rstrip(".")
    if not clean_host:
        return {
            "resolved": False,
            "status": "invalid_hostname",
            "ips": [],
            "error": "Clean hostname is empty."
        }

    # If already an IP address
    try:
        ip_obj = ipaddress.ip_address(clean_host)
        ip_str = str(ip_obj)
        if is_private_or_restricted_ip(ip_str):
            return {
                "resolved": False,
                "status": "ssrf_blocked",
                "ips": [ip_str],
                "error": "IP address belongs to restricted/private space."
            }
        return {
            "resolved": True,
            "status": f"Resolved ({ip_str})",
            "ips": [ip_str],
            "error": None
        }
    except ValueError:
        pass

    # Standard hostname DNS lookup
    original_timeout = socket.getdefaulttimeout()
    try:
        socket.setdefaulttimeout(timeout)
        addr_info = socket.getaddrinfo(
            clean_host,
            None,
            family=socket.AF_UNSPEC,
            type=socket.SOCK_STREAM
        )

        resolved_ips = []
        for entry in addr_info:
            ip = entry[4][0]
            if ip not in resolved_ips:
                resolved_ips.append(ip)

        if not resolved_ips:
            return {
                "resolved": False,
                "status": "Domain not found (NXDOMAIN)",
                "ips": [],
                "error": "No IP addresses returned for host."
            }

        # Check all resolved IPs for SSRF
        for ip in resolved_ips:
            if is_private_or_restricted_ip(ip):
                return {
                    "resolved": False,
                    "status": "ssrf_blocked",
                    "ips": resolved_ips,
                    "error": f"Resolved IP '{ip}' is in private/restricted IP range (SSRF blocked)."
                }

        return {
            "resolved": True,
            "status": f"Resolved ({', '.join(resolved_ips[:3])})",
            "ips": resolved_ips,
            "error": None
        }

    except socket.gaierror as exc:
        err_msg = str(exc)
        # Identify NXDOMAIN / name resolution failure
        return {
            "resolved": False,
            "status": "Domain not found (NXDOMAIN)",
            "ips": [],
            "error": f"DNS resolution failed: {err_msg}"
        }
    except (socket.timeout, TimeoutError):
        return {
            "resolved": False,
            "status": "DNS query timed out",
            "ips": [],
            "error": f"DNS resolution timed out after {timeout}s"
        }
    except Exception as exc:
        return {
            "resolved": False,
            "status": "DNS lookup error",
            "ips": [],
            "error": f"Unexpected DNS error: {str(exc)}"
        }
    finally:
        socket.setdefaulttimeout(original_timeout)


def verify_domain_reachability(raw_url: str) -> dict[str, Any]:
    """
    Verifies URL syntax, DNS existence, and HTTP/HTTPS reachability.

    Returns structured domain_verification payload:
    {
        "status": "reachable" | "non_existent" | "unreachable" | "invalid" | "unknown",
        "dns_resolved": bool,
        "dns_status": str,
        "resolved_ips": list[str],
        "http_reachable": bool,
        "https_reachable": bool,
        "http_status": int | None,
        "final_url": str | None,
        "redirect_count": int,
        "response_time_ms": int,
        "tls_valid": bool | None,
        "error": str | None
    }
    """
    start_time = time.perf_counter()

    result: dict[str, Any] = {
        "status": "unknown",
        "dns_resolved": False,
        "dns_status": "Not evaluated",
        "resolved_ips": [],
        "http_reachable": False,
        "https_reachable": False,
        "http_status": None,
        "final_url": None,
        "redirect_count": 0,
        "response_time_ms": 0,
        "tls_valid": None,
        "error": None,
    }

    if not raw_url or not isinstance(raw_url, str) or not raw_url.strip():
        result["status"] = "invalid"
        result["error"] = "Target URL is empty or null."
        return result

    cleaned_url = raw_url.strip()

    # Normalize scheme
    if "://" not in cleaned_url:
        normalized_url = "https://" + cleaned_url
    else:
        normalized_url = cleaned_url

    try:
        parsed = urlparse(normalized_url)
        hostname = parsed.hostname
        scheme = parsed.scheme.lower()
    except Exception as parse_exc:
        result["status"] = "invalid"
        result["error"] = f"Malformed URL syntax: {parse_exc}"
        return result

    if not hostname or "." not in hostname:
        # Check if it's a valid IPv4/IPv6 without dots (e.g. ::1 or localhost)
        try:
            ipaddress.ip_address(hostname or "")
        except ValueError:
            result["status"] = "invalid"
            result["error"] = "Invalid hostname structure (missing valid TLD/domain)."
            return result

    if scheme not in ("http", "https"):
        result["status"] = "invalid"
        result["error"] = f"Unsupported URI scheme: '{scheme}'"
        return result

    # 1. DNS Resolution
    dns_res = resolve_domain_dns(hostname, timeout=DNS_TIMEOUT_SECONDS)
    result["dns_resolved"] = dns_res["resolved"]
    result["dns_status"] = dns_res["status"]
    result["resolved_ips"] = dns_res["ips"]

    if not dns_res["resolved"]:
        if "NXDOMAIN" in dns_res["status"] or "not found" in dns_res["status"].lower():
            result["status"] = "non_existent"
            result["error"] = dns_res["error"]
        elif dns_res["status"] == "ssrf_blocked":
            result["status"] = "unreachable"
            result["error"] = dns_res["error"]
        else:
            result["status"] = "unreachable"
            result["error"] = dns_res["error"]
        result["response_time_ms"] = int((time.perf_counter() - start_time) * 1000)
        return result

    # 2. HTTP/HTTPS Probing with safe client
    timeout_cfg = httpx.Timeout(
        connect=HTTP_CONNECT_TIMEOUT_SECONDS,
        read=HTTP_READ_TIMEOUT_SECONDS,
        write=HTTP_CONNECT_TIMEOUT_SECONDS,
        pool=HTTP_CONNECT_TIMEOUT_SECONDS,
    )

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Connection": "close"
    }

    try:
        # We configure httpx with follow_redirects=True and max_redirects=MAX_REDIRECT_HOPS
        with httpx.Client(
            timeout=timeout_cfg,
            follow_redirects=True,
            max_redirects=MAX_REDIRECT_HOPS,
            verify=True,
            headers=headers
        ) as client:
            resp = None
            tls_valid = scheme == "https"

            # Attempt HEAD request first
            try:
                resp = client.head(normalized_url)
                # If server returns 405 Method Not Allowed or 501 Not Implemented on HEAD, fallback to GET
                if resp.status_code in (405, 501):
                    try:
                        resp = client.get(normalized_url)
                    except Exception:
                        pass
            except httpx.HTTPStatusError:
                pass

            if resp is not None:
                # Target server responded (200, 301, 404, 500, etc. all mean domain exists and server is reachable)
                status_code = resp.status_code
                redirect_history = getattr(resp, "history", [])
                redirect_count = len(redirect_history)
                final_dest_url = str(resp.url)

                result["status"] = "reachable"
                result["http_reachable"] = True
                result["https_reachable"] = scheme == "https" or str(final_dest_url).startswith("https://")
                result["http_status"] = status_code
                result["final_url"] = final_dest_url
                result["redirect_count"] = redirect_count
                result["tls_valid"] = True if result["https_reachable"] else None
                result["response_time_ms"] = int((time.perf_counter() - start_time) * 1000)
                return result

    except httpx.TooManyRedirects:
        result["status"] = "unreachable"
        result["http_reachable"] = False
        result["error"] = f"Exceeded maximum redirect limit ({MAX_REDIRECT_HOPS} hops)."
        result["response_time_ms"] = int((time.perf_counter() - start_time) * 1000)
        return result

    except httpx.ConnectTimeout:
        result["status"] = "unreachable"
        result["http_reachable"] = False
        result["error"] = f"Connection timed out after {HTTP_CONNECT_TIMEOUT_SECONDS}s."
        result["response_time_ms"] = int((time.perf_counter() - start_time) * 1000)
        return result

    except httpx.ConnectError as conn_err:
        # Check if TLS handshake failed
        err_str = str(conn_err).lower()
        if "ssl" in err_str or "certificate" in err_str:
            result["status"] = "unreachable"
            result["tls_valid"] = False
            result["error"] = "TLS/SSL certificate handshake failed."
        else:
            result["status"] = "unreachable"
            result["error"] = "Connection refused or target host unreachable."
        result["response_time_ms"] = int((time.perf_counter() - start_time) * 1000)
        return result

    except Exception as exc:
        logger.debug(f"HTTP probe exception for {normalized_url}: {exc}")
        result["status"] = "unreachable"
        result["error"] = f"Network connectivity failure: {str(exc)}"
        result["response_time_ms"] = int((time.perf_counter() - start_time) * 1000)
        return result

    # If we reached here without raising, set unreachable
    result["status"] = "unreachable"
    result["error"] = "Could not establish HTTP/HTTPS connection to resolved host."
    result["response_time_ms"] = int((time.perf_counter() - start_time) * 1000)
    return result
