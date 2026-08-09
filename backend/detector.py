"""
LinkSentry URL Threat Detection Engine
Engine Version: linksentry-heuristic-v1

This is a transparent, explainable heuristic-based URL threat assessment engine.
It analyzes static lexical, syntactic, and structural characteristics of a target URL
without visiting, resolving, or executing remote network connections.
"""

from urllib.parse import urlparse, parse_qs, unquote
import ipaddress
import re

# Engine identification metadata
ENGINE_NAME = "linksentry-heuristic-v1"

# Suspicious / high-risk Top-Level Domains frequently observed in disposable phishing infrastructure
SUSPICIOUS_TLDS = {
    "xyz", "top", "click", "buzz", "work", "rest", "gq", "cf", "tk",
    "ml", "ga", "country", "stream", "kim", "fit", "surf", "casa",
    "cam", "link", "monster", "icu", "cyou", "vip", "sbs", "quest",
    "racing", "men", "date", "faith", "party", "review", "trade", "accountant"
}

# Categorized phishing lure keywords
KEYWORD_CATEGORIES = {
    "auth": {
        "login", "log-in", "signin", "sign-in", "password", "credential",
        "authentication", "auth", "2fa", "otp", "passcode", "securitycode"
    },
    "verification": {
        "verify", "verification", "secure", "security", "update", "confirm",
        "confirmation", "recovery", "reactivate", "restore", "validate", "validation"
    },
    "financial": {
        "bank", "banking", "wallet", "payment", "billing", "invoice",
        "refund", "card", "credit", "debit", "checkout", "paypal", "crypto"
    },
    "account": {
        "account", "portal", "client", "member", "support", "helpdesk"
    }
}

# Common targeted brand tokens and their legitimate base domains
KNOWN_BRANDS = {
    "paypal": ["paypal.com", "paypal-objects.com"],
    "microsoft": ["microsoft.com", "live.com", "office.com", "microsoftonline.com", "azure.com"],
    "google": ["google.com", "googleapis.com", "googleusercontent.com", "gstatic.com"],
    "apple": ["apple.com", "icloud.com"],
    "amazon": ["amazon.com", "aws.amazon.com", "media-amazon.com"],
    "netflix": ["netflix.com"],
    "facebook": ["facebook.com", "fb.com", "meta.com"],
    "instagram": ["instagram.com"],
    "whatsapp": ["whatsapp.com"],
    "chase": ["chase.com"],
    "wellsfargo": ["wellsfargo.com"],
    "bankofamerica": ["bankofamerica.com"],
    "binance": ["binance.com"],
    "coinbase": ["coinbase.com"],
    "metamask": ["metamask.io"],
    "steam": ["steampowered.com", "steamcommunity.com"],
    "dropbox": ["dropbox.com"],
    "yahoo": ["yahoo.com"],
    "outlook": ["outlook.com", "live.com", "office365.com"],
    "adobe": ["adobe.com"]
}

# Target paths that directly request sensitive input
SENSITIVE_PATHS = [
    "/login", "/signin", "/verify", "/verification", "/account", "/password",
    "/credential", "/payment", "/billing", "/checkout", "/cc-entry", "/card",
    "/otp", "/webscr", "/cmd/_login", "/secure/login", "/auth/login"
]

# Suspicious executable or script payload extensions
PAYLOAD_EXTENSIONS = {
    ".exe", ".scr", ".zip", ".iso", ".bat", ".cmd", ".vbs", ".apk", ".dmg", ".msi"
}

# Open redirect parameter names
REDIRECT_PARAMS = {
    "redirect", "redirect_url", "redirect_uri", "return", "returnurl",
    "return_url", "next", "url", "dest", "destination", "continue", "r", "goto", "target"
}


def _is_ip_address(hostname: str) -> bool:
    """Checks if the given hostname is an IPv4 or IPv6 address."""
    if not hostname:
        return False
    # Strip brackets from IPv6 hostnames like [::1]
    clean_host = hostname.strip("[]")
    try:
        ipaddress.ip_address(clean_host)
        return True
    except ValueError:
        return False


def _check_brand_impersonation(hostname: str) -> tuple[int, str | None]:
    """
    Checks if a hostname appears to imitate a known brand on an unauthorized third-party domain.
    Returns (score_delta, indicator_message).
    """
    clean_host = hostname.lower()

    for brand, legit_domains in KNOWN_BRANDS.items():
        if brand in clean_host:
            # Check if this hostname is actually a legitimate domain or subdomain of the brand
            is_legit = any(
                clean_host == domain or clean_host.endswith("." + domain)
                for domain in legit_domains
            )
            if not is_legit:
                # Check if brand is combined with lure words in the hostname
                lure_match = any(
                    word in clean_host
                    for category in KEYWORD_CATEGORIES.values()
                    for word in category
                    if word != brand
                )
                if lure_match or "-" in clean_host:
                    return 35, f"Deceptive hostname pattern imitating brand '{brand}' with security lure tokens"
                return 20, f"Hostname contains brand name '{brand}' on an unverified third-party domain"

    return 0, None


def analyze_url(url: str) -> dict:
    """
    Analyzes a given URL and returns a transparent multi-signal security assessment.

    Returns:
        dict: {
            "verdict": "safe" | "suspicious" | "phishing" | "invalid",
            "risk_score": int (0-100),
            "confidence": float (0.0-1.0),
            "url": str,
            "domain": str,
            "indicators": list[str],
            "engine": str
        }
    """
    if not url or not isinstance(url, str) or not url.strip():
        return {
            "verdict": "invalid",
            "risk_score": 0,
            "confidence": 1.0,
            "url": url or "",
            "domain": "",
            "indicators": ["Empty or invalid URL input provided."],
            "engine": ENGINE_NAME,
        }

    raw_url = url.strip()

    # Safely parse the URL
    try:
        parsed = urlparse(raw_url)
    except Exception:
        return {
            "verdict": "invalid",
            "risk_score": 0,
            "confidence": 1.0,
            "url": raw_url,
            "domain": "",
            "indicators": ["URL structure is malformed and could not be parsed."],
            "engine": ENGINE_NAME,
        }

    if parsed.scheme not in ["http", "https"] or not parsed.netloc:
        return {
            "verdict": "invalid",
            "risk_score": 0,
            "confidence": 1.0,
            "url": raw_url,
            "domain": "",
            "indicators": ["Invalid URL format: Must start with http:// or https:// and include a valid domain."],
            "engine": ENGINE_NAME,
        }

    hostname = (parsed.hostname or "").lower().rstrip(".")
    if not hostname:
        return {
            "verdict": "invalid",
            "risk_score": 0,
            "confidence": 1.0,
            "url": raw_url,
            "domain": "",
            "indicators": ["URL missing valid hostname/domain component."],
            "engine": ENGINE_NAME,
        }

    risk_score = 0
    indicators: list[str] = []
    signals_count = 0

    # -------------------------------------------------------------------------
    # Signal 1: Protocol Security (HTTP vs HTTPS)
    # -------------------------------------------------------------------------
    if parsed.scheme != "https":
        risk_score += 15
        signals_count += 1
        indicators.append("Connection does not use HTTPS (unencrypted transport)")

    # -------------------------------------------------------------------------
    # Signal 2: Raw IP Address Hostname
    # -------------------------------------------------------------------------
    if _is_ip_address(hostname):
        risk_score += 30
        signals_count += 2
        indicators.append("URL hostname uses a raw IP address instead of a registered domain name")

    # -------------------------------------------------------------------------
    # Signal 3: Userinfo / @ Deception
    # -------------------------------------------------------------------------
    if "@" in raw_url or (parsed.username or parsed.password):
        risk_score += 30
        signals_count += 2
        indicators.append("URL contains an '@' symbol or userinfo authentication prefix (potential deceptive URL structure)")

    # -------------------------------------------------------------------------
    # Signal 4: Suspicious / High-Abuse Top-Level Domain (TLD)
    # -------------------------------------------------------------------------
    tld = hostname.split(".")[-1] if "." in hostname else ""
    if tld in SUSPICIOUS_TLDS:
        risk_score += 15
        signals_count += 1
        indicators.append(f"Suspicious top-level domain detected: .{tld}")

    # -------------------------------------------------------------------------
    # Signal 5: Brand Impersonation & Deceptive Hostnames
    # -------------------------------------------------------------------------
    brand_score, brand_indicator = _check_brand_impersonation(hostname)
    if brand_score > 0 and brand_indicator:
        risk_score += brand_score
        signals_count += 2
        indicators.append(brand_indicator)

    # -------------------------------------------------------------------------
    # Signal 6: Keyword Lures & Multi-Category Density
    # -------------------------------------------------------------------------
    clean_full_path = (parsed.path + "?" + parsed.query).lower()
    full_url_lower = raw_url.lower()

    found_keywords = []
    categories_matched = set()

    for category_name, words in KEYWORD_CATEGORIES.items():
        cat_matches = [w for w in words if w in full_url_lower]
        if cat_matches:
            categories_matched.add(category_name)
            found_keywords.extend(cat_matches)

    unique_keywords = sorted(list(set(found_keywords)))

    if len(categories_matched) >= 3:
        risk_score += 25
        signals_count += 2
        indicators.append(f"High-density credential and verification lure keywords detected: {', '.join(unique_keywords[:5])}")
    elif len(categories_matched) == 2:
        risk_score += 15
        signals_count += 1
        indicators.append(f"Multiple phishing lure keywords detected: {', '.join(unique_keywords[:4])}")
    elif len(categories_matched) == 1:
        # Single keyword contributes a minor signal only
        risk_score += 5
        indicators.append(f"Security-sensitive keyword detected in URL: {', '.join(unique_keywords[:3])}")

    # -------------------------------------------------------------------------
    # Signal 7: Sensitive Payment & Credential Paths
    # -------------------------------------------------------------------------
    normalized_path = parsed.path.lower().rstrip("/")
    if any(normalized_path.endswith(p) or p in normalized_path for p in SENSITIVE_PATHS):
        risk_score += 10
        signals_count += 1
        indicators.append("Target path points directly to a credential or payment collection endpoint")

    # -------------------------------------------------------------------------
    # Signal 8: Excessive Subdomain Hierarchy Depth
    # -------------------------------------------------------------------------
    # Split hostname by dots, excluding TLD and second-level domain if present
    host_parts = [p for p in hostname.split(".") if p]
    if len(host_parts) >= 5:  # e.g., secure.login.verify.account.example.com
        risk_score += 15
        signals_count += 1
        indicators.append(f"Unusually deep subdomain hierarchy ({len(host_parts) - 2} subdomains) detected")
    elif len(host_parts) == 4 and not _is_ip_address(hostname):
        risk_score += 8
        signals_count += 1
        indicators.append("Multi-level subdomain structure detected")

    # -------------------------------------------------------------------------
    # Signal 9: Hostname Length & Hyphen Tokenization
    # -------------------------------------------------------------------------
    if len(hostname) > 40:
        risk_score += 10
        signals_count += 1
        indicators.append(f"Unusually long domain name ({len(hostname)} characters)")

    hyphen_count = hostname.count("-")
    if hyphen_count >= 3:
        risk_score += 10
        signals_count += 1
        indicators.append(f"Excessive hyphen-separated tokens in hostname ({hyphen_count} hyphens)")

    # -------------------------------------------------------------------------
    # Signal 10: Overall URL Length
    # -------------------------------------------------------------------------
    if len(raw_url) > 120:
        risk_score += 8
        signals_count += 1
        indicators.append(f"Unusually long URL structure ({len(raw_url)} characters)")

    # -------------------------------------------------------------------------
    # Signal 11: Obfuscation / Percent Encoding
    # -------------------------------------------------------------------------
    obfuscation_patterns = ["%2f", "%3a", "%40", "%2e", "%25", "%5c", "%23"]
    if any(pattern in raw_url.lower() for pattern in obfuscation_patterns):
        risk_score += 15
        signals_count += 1
        indicators.append("Suspicious character encoding / obfuscation tokens (%2F, %3A, %40, %2E) detected in URL")

    # -------------------------------------------------------------------------
    # Signal 12: Open Redirect Parameter Patterns
    # -------------------------------------------------------------------------
    if parsed.query:
        try:
            query_params = parse_qs(parsed.query, keep_blank_values=True)
            for param, values in query_params.items():
                if param.lower() in REDIRECT_PARAMS:
                    for val in values:
                        if val.startswith("http://") or val.startswith("https://") or val.startswith("//"):
                            risk_score += 15
                            signals_count += 1
                            indicators.append(f"Open-redirect parameter '{param}' pointing to external destination detected")
                            break
        except Exception:
            pass

    # -------------------------------------------------------------------------
    # Signal 13: Suspicious Executable / Script Extensions
    # -------------------------------------------------------------------------
    path_lower = parsed.path.lower()
    if any(path_lower.endswith(ext) for ext in PAYLOAD_EXTENSIONS):
        risk_score += 25
        signals_count += 2
        indicators.append("Direct link to executable or compressed archive payload")
    elif (path_lower.endswith(".php") or path_lower.endswith(".cgi")) and parsed.scheme != "https":
        risk_score += 10
        signals_count += 1
        indicators.append("Unencrypted server-side script endpoint with potential input handling")

    # -------------------------------------------------------------------------
    # Score Clamping & Verdict Assignment
    # -------------------------------------------------------------------------
    risk_score = max(0, min(100, risk_score))

    if risk_score >= 70:
        verdict = "phishing"
    elif risk_score >= 30:
        verdict = "suspicious"
    else:
        verdict = "safe"

    # -------------------------------------------------------------------------
    # Heuristic Confidence Estimation
    # -------------------------------------------------------------------------
    # Confidence represents how strongly the available independent signals support the verdict.
    if risk_score == 0:
        confidence = 0.85
    elif verdict == "safe":
        confidence = 0.75
    elif verdict == "suspicious":
        confidence = 0.80 if signals_count >= 2 else 0.70
    else:  # phishing
        confidence = 0.92 if (signals_count >= 3 or brand_score >= 30 or _is_ip_address(hostname)) else 0.85

    confidence = round(max(0.50, min(0.98, confidence)), 2)

    return {
        "verdict": verdict,
        "risk_score": risk_score,
        "confidence": confidence,
        "url": raw_url,
        "domain": hostname,
        "indicators": indicators,
        "engine": ENGINE_NAME,
    }
