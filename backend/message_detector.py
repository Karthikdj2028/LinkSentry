"""
LinkSentry Message & SMS Threat Detection Engine
Engine Version: linksentry-message-heuristic-v1

This is a transparent, explainable heuristic-based message/SMS threat assessment engine.
It analyzes social-engineering tactics, urgency patterns, credential and OTP harvesting,
financial lures, brand impersonation, and embedded static URL threats without executing
external connections, sending messages, or placing phone calls.
"""

import re
from typing import Any

try:
    from backend.detector import analyze_url
except ImportError:
    from detector import analyze_url

ENGINE_NAME = "linksentry-message-heuristic-v1"

# URL Shortener domains commonly used to obscure phishing destinations
SHORTENER_DOMAINS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
    "buff.ly", "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc", "rebrand.ly"
}

# Known targeted brand keywords for impersonation checks
TARGET_BRANDS = [
    "paypal", "microsoft", "google", "apple", "amazon", "netflix",
    "chase", "bank of america", "wells fargo", "citibank", "fedex",
    "ups", "dhl", "usps", "whatsapp", "facebook", "meta", "instagram",
    "state bank", "hdfc", "icici", "paytm", "binance", "coinbase"
]

# Urgency / Pressure keywords and phrases
URGENCY_PATTERNS = [
    r"\burgent\w*\b", r"\bimmediat\w*\b", r"\bact now\b", r"\baction required\b",
    r"\bwithin 24 hours\b", r"\bexpires? today\b", r"\bfinal warning\b",
    r"\blast chance\b", r"\baccount will be closed\b", r"\brespond now\b",
    r"\btime sensitive\b", r"\bimmediate action\b", r"\blimited time\b",
    r"\b24 hours\b", r"\basap\b", r"\bwithout delay\b", r"\bpromptly\b"
]

# Account Security & Lock keywords
ACCOUNT_PATTERNS = [
    r"\baccount\w*\b", r"\bpasswords?\b", r"\busernames?\b", r"\bcredentials?\b",
    r"\blogins?\b", r"\bsignin\w*\b", r"\bsecurity alert\b", r"\bunauthorized access\b",
    r"\bunusual sign-in\b", r"\bunusual activity\b", r"\breactivat\w*\b", r"\brestore access\b"
]

ACCOUNT_LOCK_PATTERNS = [
    r"\bsuspend\w*\b", r"\block\w*\b", r"\bunlock\w*\b", r"\bdeactivat\w*\b",
    r"\brestrict\w*\b", r"\bcompromis\w*\b", r"\btemporarily disabled\b", r"\bfrozen\b"
]

# Verification action tokens
VERIFY_PATTERNS = [
    r"\bverify\w*\b", r"\bverificat\w*\b", r"\bconfirm\w*\b", r"\bupdat\w*\b",
    r"\bvalidat\w*\b", r"\bclick\w*\b", r"\btap here\b", r"\bvisit\b", r"\breset\w*\b",
    r"\bauthenticat\w*\b", r"\blink below\b", r"\bfollowing link\b", r"\bclaim\w*\b"
]

# OTP / MFA sensitive tokens
OTP_PATTERNS = [
    r"\botp\b", r"\bone-time password\b", r"\bverification code\b",
    r"\bsecurity code\b", r"\bauthentication code\b", r"\b2fa\b",
    r"\bmfa\b", r"\bpasscode\b", r"\bsecret code\b"
]

# OTP sharing demand actions
OTP_SHARING_PATTERNS = [
    r"\bshare\w*\b", r"\bsend\w*\b", r"\breply\w*\b", r"\bprovide\w*\b",
    r"\bforward\w*\b", r"\benter\w*\b", r"\bgive\w*\b", r"\btell us\b",
    r"\bconfirm your code\b", r"\bsubmit code\b"
]

# Financial / Payment / Banking lures
FINANCIAL_PATTERNS = [
    r"\bbanks?\b", r"\bbanking\b", r"\bcredit cards?\b", r"\bdebit cards?\b",
    r"\bcards? details?\b", r"\bcard ending in\b", r"\bpayments? failed\b",
    r"\bunauthorized wire\b", r"\bwire transfers?\b", r"\btransactions?\b",
    r"\brefunds?\b", r"\binvoices?\b", r"\bbilling\b", r"\bwallets?\b",
    r"\bupi\b", r"\bcashbacks?\b", r"\brewards?\b", r"\bmoney transfers?\b",
    r"\bdirect deposits?\b", r"\btax refunds?\b", r"\boverdue payments?\b", r"\bcards?\b"
]

# Prize / Lottery / Giveaway lures
PRIZE_PATTERNS = [
    r"\byou won\b", r"\bwinners?\b", r"\blotter\w*\b", r"\bprizes?\b",
    r"\bjackpots?\b", r"\bgift cards?\b", r"\bfree gifts?\b", r"\bcash prizes?\b",
    r"\bclaim now\b", r"\bcongratulat\w*\b", r"\bselected to receive\b",
    r"\bexclusive rewards?\b"
]

# Coercive consequence / Threat language
CONSEQUENCE_PATTERNS = [
    r"\blegal actions?\b", r"\bpenalt\w*\b", r"\bfines?\b", r"\bservice terminated\b",
    r"\bsim blocked\b", r"\bpolice actions?\b", r"\barrest\b", r"\bcourts?\b",
    r"\bpermanently deleted\b", r"\bpermanent suspension\b", r"\blaw enforcement\b",
    r"\bprosecution\b"
]


def _extract_urls(text: str) -> list[str]:
    """Safely extracts all HTTP/HTTPS URLs from the message text."""
    url_pattern = r'https?://[^\s<>"]+'
    return re.findall(url_pattern, text)


def _matches_any_pattern(patterns: list[str], text: str) -> list[str]:
    """Matches regex patterns against text and returns matching snippets."""
    matches = []
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            matches.append(m.group(0))
    return matches


def _check_brand_impersonation(lower_text: str) -> tuple[str | None, bool]:
    """
    Checks if a target brand name is mentioned in conjunction with
    account/payment/verification lures.
    Returns (brand_name, is_suspicious_context).
    """
    for brand in TARGET_BRANDS:
        pattern = r"\b" + re.escape(brand) + r"\b"
        if re.search(pattern, lower_text, re.IGNORECASE):
            has_lure = any(
                len(_matches_any_pattern(group, lower_text)) > 0
                for group in [ACCOUNT_PATTERNS, ACCOUNT_LOCK_PATTERNS, FINANCIAL_PATTERNS, VERIFY_PATTERNS]
            )
            return brand, has_lure
    return None, False


def analyze_message(message: str) -> dict[str, Any]:
    """
    Analyzes a user-provided message/SMS for social engineering, phishing,
    and fraud indicators using explainable heuristics.

    Returns:
        dict: {
            "verdict": "safe" | "suspicious" | "phishing" | "invalid",
            "risk_score": int (0-100),
            "confidence": float (0.0-1.0),
            "message": str,
            "indicators": list[str],
            "engine": str
        }
    """
    # 1. Input Validation
    if not message or not isinstance(message, str) or not message.strip():
        return {
            "verdict": "invalid",
            "risk_score": 0,
            "confidence": 1.0,
            "message": message or "",
            "indicators": ["Empty or invalid message text provided."],
            "engine": ENGINE_NAME,
        }

    raw_message = message.strip()
    lower_text = raw_message.lower()

    risk_score = 0
    indicators: list[str] = []
    signals_count = 0

    # -------------------------------------------------------------------------
    # Signal 1: Urgency / Pressure Language
    # -------------------------------------------------------------------------
    urgency_matches = _matches_any_pattern(URGENCY_PATTERNS, lower_text)
    if len(urgency_matches) >= 2:
        risk_score += 15
        signals_count += 2
        indicators.append(f"Multiple urgency pressure triggers detected: '{', '.join(urgency_matches[:3])}'")
    elif len(urgency_matches) == 1:
        risk_score += 10
        signals_count += 1
        indicators.append(f"Urgency or time-pressure language detected: '{urgency_matches[0]}'")

    # -------------------------------------------------------------------------
    # Signal 2: Credential & Account Suspension/Lock Lures
    # -------------------------------------------------------------------------
    account_matches = _matches_any_pattern(ACCOUNT_PATTERNS, lower_text)
    lock_matches = _matches_any_pattern(ACCOUNT_LOCK_PATTERNS, lower_text)
    verify_matches = _matches_any_pattern(VERIFY_PATTERNS, lower_text)

    has_account_term = len(account_matches) > 0
    has_lock_term = len(lock_matches) > 0
    has_verify_term = len(verify_matches) > 0

    if has_lock_term:
        risk_score += 20
        signals_count += 1
        indicators.append(f"Account restriction/suspension claim detected ('{lock_matches[0]}')")

    if has_account_term and has_verify_term:
        risk_score += 20
        signals_count += 2
        indicators.append(
            f"Account security lure combined with verification request detected ({account_matches[0]} + {verify_matches[0]})"
        )
    elif has_account_term and ("password" in lower_text or "credential" in lower_text):
        risk_score += 15
        signals_count += 1
        indicators.append("Direct credential or password prompt detected")

    # -------------------------------------------------------------------------
    # Signal 3: OTP / 2FA Security Code Requests (Social Engineering)
    # -------------------------------------------------------------------------
    otp_matches = _matches_any_pattern(OTP_PATTERNS, lower_text)
    if otp_matches:
        sharing_matches = _matches_any_pattern(OTP_SHARING_PATTERNS, lower_text)
        if sharing_matches:
            risk_score += 35
            signals_count += 3
            indicators.append(f"Critical social-engineering tactic: Request to {sharing_matches[0]} an OTP/security code")
        else:
            risk_score += 10
            signals_count += 1
            indicators.append("Security verification code (OTP/2FA) mentioned in message")

    # -------------------------------------------------------------------------
    # Signal 4: Financial / Banking / Payment Lures
    # -------------------------------------------------------------------------
    fin_matches = _matches_any_pattern(FINANCIAL_PATTERNS, lower_text)
    if fin_matches:
        if has_verify_term or len(urgency_matches) > 0 or "unauthorized" in lower_text or "failed" in lower_text:
            risk_score += 25
            signals_count += 2
            indicators.append(f"Financial transaction or banking lure paired with action request ({fin_matches[0]})")
            if has_verify_term:
                risk_score += 15
                indicators.append(f"Action or confirmation demanded on financial instrument ('{verify_matches[0]}')")
        else:
            risk_score += 5
            signals_count += 1
            indicators.append(f"Financial or transaction terminology detected ({fin_matches[0]})")

    # -------------------------------------------------------------------------
    # Signal 5: Prize / Lottery / Reward Scams
    # -------------------------------------------------------------------------
    prize_matches = _matches_any_pattern(PRIZE_PATTERNS, lower_text)
    if prize_matches:
        if has_verify_term or has_account_term or "claim" in lower_text or "fee" in lower_text or "reward" in lower_text:
            risk_score += 35
            signals_count += 2
            indicators.append(f"Unsolicited prize, lottery, or reward lure with claim requirements detected ({prize_matches[0]})")
        else:
            risk_score += 15
            signals_count += 1
            indicators.append(f"Promotional reward or giveaway claim detected ({prize_matches[0]})")

    # -------------------------------------------------------------------------
    # Signal 6: Brand Impersonation Context
    # -------------------------------------------------------------------------
    matched_brand, brand_has_lure = _check_brand_impersonation(lower_text)
    if matched_brand:
        if brand_has_lure:
            risk_score += 25
            signals_count += 2
            indicators.append(f"Brand impersonation pattern: Target brand '{matched_brand.title()}' paired with security or payment lure")
        else:
            # Benign or informational brand mention
            risk_score += 0

    # -------------------------------------------------------------------------
    # Signal 7: Coercive Threats & Punitive Consequence Language
    # -------------------------------------------------------------------------
    consequence_matches = _matches_any_pattern(CONSEQUENCE_PATTERNS, lower_text)
    if consequence_matches:
        risk_score += 20
        signals_count += 2
        indicators.append(f"Coercive threat or punitive consequence language detected: '{consequence_matches[0]}'")

    # -------------------------------------------------------------------------
    # Signal 8: Embedded URLs & Static URL Threat Evaluation
    # -------------------------------------------------------------------------
    extracted_urls = _extract_urls(raw_message)
    if extracted_urls:
        has_shortener = False
        highest_url_score = 0

        for embedded_url in extracted_urls:
            # Check for URL Shorteners
            domain_part = embedded_url.split("/")[2].lower() if len(embedded_url.split("/")) > 2 else ""
            if any(shortener in domain_part for shortener in SHORTENER_DOMAINS):
                has_shortener = True

            # Static URL Analysis using LinkSentry's URL heuristic engine
            try:
                url_scan = analyze_url(embedded_url)
                url_risk = url_scan.get("risk_score", 0)
                highest_url_score = max(highest_url_score, url_risk)

                if url_scan.get("verdict") == "phishing":
                    risk_score += 35
                    signals_count += 2
                    indicators.append(f"Embedded link '{embedded_url}' flagged as high-risk phishing destination")
                elif url_scan.get("verdict") == "suspicious":
                    risk_score += 20
                    signals_count += 1
                    indicators.append(f"Embedded link '{embedded_url}' exhibits suspicious characteristics")
                else:
                    # Clean/Safe URL
                    pass
            except Exception:
                pass

        if has_shortener:
            risk_score += 15
            signals_count += 1
            indicators.append("URL shortening service detected (destination domain is obscured)")

        # URL + Urgency / Account verification synergy
        if (has_account_term or has_lock_term or len(urgency_matches) > 0) and highest_url_score > 0:
            risk_score += 10

    # -------------------------------------------------------------------------
    # Signal 9: Excessive Capitalization & Urgency Punctuation
    # -------------------------------------------------------------------------
    alpha_chars = [c for c in raw_message if c.isalpha()]
    if len(alpha_chars) >= 15:
        upper_ratio = sum(1 for c in alpha_chars if c.isupper()) / len(alpha_chars)
        if upper_ratio >= 0.50:
            risk_score += 8
            indicators.append("Excessive uppercase lettering detected (attention-grabbing coercion pattern)")

    if "!!!" in raw_message or "!?" in raw_message:
        risk_score += 5
        indicators.append("Excessive punctuation detected")

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
    if risk_score == 0:
        confidence = 0.85
    elif verdict == "safe":
        confidence = 0.78
    elif verdict == "suspicious":
        confidence = 0.82 if signals_count >= 2 else 0.70
    else:  # phishing
        confidence = 0.94 if signals_count >= 3 else 0.88

    confidence = round(max(0.50, min(0.98, confidence)), 2)

    return {
        "verdict": verdict,
        "risk_score": risk_score,
        "confidence": confidence,
        "message": raw_message,
        "indicators": indicators,
        "engine": ENGINE_NAME,
    }
