"""
LinkSentry Multi-Signal Message & SMS Threat Detection Engine
Engine Version: linksentry-message-heuristic-v1

This engine performs evidence-based multi-signal analysis of SMS and chat messages:
1. Natural language heuristic analysis (urgency, credential harvesting, OTP solicitation,
   unsolicited loan/financial offers, brand impersonation, contact solicitations).
2. Deep embedded URL extraction and evaluation via the authoritative LinkSentry V3.3 ML
   and rule-fusion detection engine.
3. Multi-signal decision fusion calculating distinct Message Risk and Embedded URL Risk,
   as well as a unified threat score and verdict.
"""

import re
from typing import Any

try:
    from backend.ml.inference.url_model import analyze_url_ml
    from backend.detector import analyze_url as analyze_url_heuristic
except ImportError:
    try:
        from ml.inference.url_model import analyze_url_ml
        from detector import analyze_url as analyze_url_heuristic
    except ImportError:
        analyze_url_ml = None
        analyze_url_heuristic = None

ENGINE_NAME = "linksentry-message-heuristic-v1"

# URL Shortener domains commonly used to obscure phishing destinations
SHORTENER_DOMAINS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
    "buff.ly", "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc", "rebrand.ly",
    "bflcomm.in", "cutt.us", "v.gd"
}

# Known targeted brand keywords for impersonation checks
TARGET_BRANDS = [
    "paypal", "microsoft", "google", "apple", "amazon", "netflix",
    "chase", "bank of america", "wells fargo", "citibank", "fedex",
    "ups", "dhl", "usps", "whatsapp", "facebook", "meta", "instagram",
    "state bank", "sbi", "hdfc", "icici", "paytm", "binance", "coinbase",
    "bajaj", "bajaj finserv", "bfl", "airtel", "jio"
]

# Urgency / Pressure keywords and phrases
URGENCY_PATTERNS = [
    r"\btoday\b", r"\bdue today\b", r"\bpast due\b", r"\bfinal notice\b",
    r"\burgent\w*\b", r"\bimmediat\w*\b", r"\bact now\b", r"\baction required\b",
    r"\bwithin 24 hours\b", r"\bexpires? today\b", r"\bfinal warning\b",
    r"\blast chance\b", r"\baccount will be closed\b", r"\brespond now\b",
    r"\btime sensitive\b", r"\bimmediate action\b", r"\blimited time\b",
    r"\b24 hours\b", r"\basap\b", r"\bwithout delay\b", r"\bpromptly\b",
    r"\bhurry\b", r"\blast day\b"
]

# Billing, Subscription & Payment-Renewal keywords
BILLING_SUBSCRIPTION_PATTERNS = [
    r"\bsubscriptions?\b", r"\brenew\w*\b", r"\bbilling\b", r"\bmemberships?\b",
    r"\bplan (?:has )?expired\b", r"\bcloud storage\b", r"\bautopay\b",
    r"\bauto-renew\w*\b", r"\bcould not renew\b", r"\bfailed to renew\b",
    r"\bpayment declined\b", r"\bpayment failed\b", r"\binvoices?\b",
    r"\bcharges?\b", r"\btransactions?\b", r"\baccount renewal\b"
]

# Action Request keywords (actions demanding user intervention)
ACTION_REQUEST_PATTERNS = [
    r"\bcheck\b", r"\breview\b", r"\bresolve\b", r"\bpay\b", r"\brenew\b",
    r"\bfix\b", r"\bclick\w*\b", r"\bverify\w*\b", r"\bconfirm\w*\b",
    r"\bupdat\w*\b", r"\bvisit\b", r"\bopen\b", r"\btap here\b",
    r"\blink below\b", r"\bfollowing link\b", r"\bclaim\w*\b", r"\brestore\w*\b",
    r"\breactivat\w*\b", r"\bmanage\b", r"\bchat\b", r"\bapply\b", r"\bavail\b"
]

# Account Security keywords
ACCOUNT_PATTERNS = [
    r"\baccount\w*\b", r"\bpasswords?\b", r"\busernames?\b", r"\bcredentials?\b",
    r"\blogins?\b", r"\bsignin\w*\b", r"\bsecurity alert\b", r"\bunauthorized access\b",
    r"\bunusual sign-in\b", r"\bunusual activity\b", r"\breactivat\w*\b", r"\brestore access\b"
]

# Account Lock / Suspension / Threat keywords
ACCOUNT_LOCK_PATTERNS = [
    r"\bsuspend\w*\b", r"\block\w*\b", r"\bunlock\w*\b", r"\bdeactivat\w*\b",
    r"\brestrict\w*\b", r"\bcompromis\w*\b", r"\btemporarily disabled\b", r"\bfrozen\b",
    r"\blose access\b", r"\binterrupted\b", r"\bkeep (?:your )?files safe\b"
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

# General Financial / Banking lures
FINANCIAL_PATTERNS = [
    r"\bbanks?\b", r"\bbanking\b", r"\bcredit cards?\b", r"\bdebit cards?\b",
    r"\bcards? details?\b", r"\bcard ending in\b", r"\bpayments? failed\b",
    r"\bunauthorized wire\b", r"\bwire transfers?\b", r"\btransactions?\b",
    r"\brefunds?\b", r"\binvoices?\b", r"\bbilling\b", r"\bwallets?\b",
    r"\bupi\b", r"\bcashbacks?\b", r"\brewards?\b", r"\bmoney transfers?\b",
    r"\bdirect deposits?\b", r"\btax refunds?\b", r"\boverdue payments?\b"
]

# Unsolicited Financial / Loan Offer Lures (Smishing / Fraud)
LOAN_OFFER_PATTERNS = [
    r"\bpersonal loans?\b", r"\binstant loans?\b", r"\bpre-?approved\b",
    r"\bloan offers?\b", r"\bapproval up to\b", r"\bdisburs\w*\b",
    r"\bzero collateral\b", r"\bcredit lines?\b", r"\blow interest\b",
    r"\binterest rates?\b", r"\bsanctioned\b", r"\bquick cash\b",
    r"\bfast cash\b", r"\bloan of (?:rs\.?|inr|\$|€|£)?\s*\d+",
    r"\bcredit limit\b", r"\bapply for loan\b", r"\bloan approved\b",
    r"\beligible for (?:rs\.?|inr|\$|€|£)?\s*\d+", r"\bcongratulations.*loan\b"
]

# Contact / Phone / Chat Solicitation Patterns
CONTACT_SOLICITATION_PATTERNS = [
    r"\bcall us (?:at|on)?\s*[:\-\s]?\s*\+?\d{6,14}\b",
    r"\bcall\s*[:\-\s]?\s*\+?\d{7,14}\b",
    r"\bcontact us (?:at|on)?\s*[:\-\s]?\s*\+?\d{6,14}\b",
    r"\bwhatsapp (?:us )?(?:at|on)?\s*[:\-\s]?\s*\+?\d{6,14}\b",
    r"\bchat (?:us )?(?:at|on)?\s*https?://\S+\b",
    r"\bhelpline\s*[:\-\s]?\s*\+?\d{6,14}\b",
    r"\btoll[- ]?free\s*[:\-\s]?\s*\+?\d{6,14}\b",
    r"\bmissed call to\b"
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
    url_pattern = r'https?://[^\s<>",;()]+'
    raw_matches = re.findall(url_pattern, text)
    cleaned = []
    for u in raw_matches:
        c = u.rstrip(".,;!?:)'\"")
        if c and c not in cleaned:
            cleaned.append(c)
    return cleaned


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
    account/payment/verification/financial lures.
    Returns (brand_name, is_suspicious_context).
    """
    for brand in TARGET_BRANDS:
        pattern = r"\b" + re.escape(brand) + r"\b"
        if re.search(pattern, lower_text, re.IGNORECASE):
            has_lure = any(
                len(_matches_any_pattern(group, lower_text)) > 0
                for group in [
                    ACCOUNT_PATTERNS,
                    ACCOUNT_LOCK_PATTERNS,
                    BILLING_SUBSCRIPTION_PATTERNS,
                    FINANCIAL_PATTERNS,
                    LOAN_OFFER_PATTERNS,
                    ACTION_REQUEST_PATTERNS,
                ]
            )
            return brand, has_lure
    return None, False


def evaluate_embedded_url(url: str) -> dict[str, Any]:
    """
    Evaluates an embedded URL using the authoritative LinkSentry V3.3 ML
    and rule-fusion threat engine with fallback to static heuristics.
    """
    domain = ""
    try:
        domain = url.split("/")[2].lower() if len(url.split("/")) > 2 else ""
    except Exception:
        domain = ""

    # Always also run heuristic detector to identify domain/path anomalies
    heuristic_risk = 0
    heuristic_indicators = []
    if analyze_url_heuristic is not None:
        try:
            h_res = analyze_url_heuristic(url)
            heuristic_risk = h_res.get("risk_score", 0)
            heuristic_indicators = h_res.get("indicators", [])
        except Exception:
            pass

    if analyze_url_ml is not None:
        try:
            ml_res = analyze_url_ml(url)
            pred = str(ml_res.get("prediction", "benign")).lower()
            conf = float(ml_res.get("confidence", 0.85))

            if pred in ["phishing", "malware"] or heuristic_risk >= 70:
                verdict = "phishing"
                risk_score = max(70, min(100, round(conf * 100)), heuristic_risk)
            elif pred == "defacement" or heuristic_risk >= 30:
                verdict = "suspicious"
                risk_score = max(50, min(100, round(conf * 100)), heuristic_risk)
            else:
                verdict = "safe" if heuristic_risk < 30 else "suspicious"
                risk_score = heuristic_risk if heuristic_risk >= 30 else 0

            indicators = list(ml_res.get("suspicious_signals", []))
            indicators.extend(heuristic_indicators)
            if ml_res.get("trusted_domain"):
                indicators.append("trusted_domain")
            if ml_res.get("typosquat_domain"):
                indicators.append(f"typosquat_{ml_res['typosquat_domain']}")
            if ml_res.get("impersonated_domain"):
                indicators.append(f"impersonation_{ml_res['impersonated_domain']}")

            return {
                "url": url,
                "domain": ml_res.get("hostname") or domain,
                "verdict": verdict,
                "risk_score": risk_score,
                "confidence": conf,
                "indicators": indicators,
                "engine": ml_res.get("model_type", "LinkSentry V3.3 ML Engine")
            }
        except Exception:
            pass

    # Fallback to heuristic detector
    if analyze_url_heuristic is not None:
        try:
            h_res = analyze_url_heuristic(url)
            return {
                "url": url,
                "domain": h_res.get("domain", domain),
                "verdict": h_res.get("verdict", "safe"),
                "risk_score": h_res.get("risk_score", 0),
                "confidence": h_res.get("confidence", 0.7),
                "indicators": h_res.get("indicators", []),
                "engine": "LinkSentry Static URL Heuristics"
            }
        except Exception:
            pass

    return {
        "url": url,
        "domain": domain,
        "verdict": "safe",
        "risk_score": 0,
        "confidence": 0.5,
        "indicators": [],
        "engine": "LinkSentry Default Evaluator"
    }


def analyze_message(message: str) -> dict[str, Any]:
    """
    Analyzes a user-provided message/SMS for social engineering, phishing, smishing,
    and unsolicited financial fraud indicators using multi-signal evidence fusion.

    Returns:
        dict: {
            "verdict": "safe" | "suspicious" | "phishing" | "invalid",
            "risk_score": int (0-100),
            "confidence": float (0.0-1.0),
            "message": str,
            "indicators": list[str],
            "message_risk": int (0-100),
            "embedded_urls": list[dict],
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
            "message_risk": 0,
            "embedded_urls": [],
            "engine": ENGINE_NAME,
        }

    raw_message = message.strip()
    lower_text = raw_message.lower()

    message_risk = 0
    indicators: list[str] = []
    signals_count = 0

    # Extract all pattern matches
    urgency_matches = _matches_any_pattern(URGENCY_PATTERNS, lower_text)
    billing_matches = _matches_any_pattern(BILLING_SUBSCRIPTION_PATTERNS, lower_text)
    action_matches = _matches_any_pattern(ACTION_REQUEST_PATTERNS, lower_text)
    account_matches = _matches_any_pattern(ACCOUNT_PATTERNS, lower_text)
    lock_matches = _matches_any_pattern(ACCOUNT_LOCK_PATTERNS, lower_text)
    otp_matches = _matches_any_pattern(OTP_PATTERNS, lower_text)
    fin_matches = _matches_any_pattern(FINANCIAL_PATTERNS, lower_text)
    loan_matches = _matches_any_pattern(LOAN_OFFER_PATTERNS, lower_text)
    contact_matches = _matches_any_pattern(CONTACT_SOLICITATION_PATTERNS, raw_message)
    prize_matches = _matches_any_pattern(PRIZE_PATTERNS, lower_text)
    consequence_matches = _matches_any_pattern(CONSEQUENCE_PATTERNS, lower_text)
    extracted_urls = _extract_urls(raw_message)

    has_urgency_term = len(urgency_matches) > 0
    has_billing_term = len(billing_matches) > 0
    has_action_term = len(action_matches) > 0
    has_account_term = len(account_matches) > 0
    has_lock_term = len(lock_matches) > 0
    has_fin_term = len(fin_matches) > 0
    has_loan_term = len(loan_matches) > 0
    has_contact_solicitation = len(contact_matches) > 0

    # -------------------------------------------------------------------------
    # Signal 1: Urgency / Pressure Language
    # -------------------------------------------------------------------------
    if len(urgency_matches) >= 2:
        message_risk += 15
        signals_count += 2
        indicators.append(f"Multiple urgency pressure triggers detected: '{', '.join(urgency_matches[:3])}'")
    elif len(urgency_matches) == 1 and urgency_matches[0].lower() not in ["now"]:
        message_risk += 10
        signals_count += 1
        indicators.append(f"Urgency or time-pressure language detected: '{urgency_matches[0]}'")

    # -------------------------------------------------------------------------
    # Signal 2: Credential & Account Suspension/Lock Lures
    # -------------------------------------------------------------------------
    if has_lock_term:
        message_risk += 20
        signals_count += 1
        indicators.append(f"Account restriction or file loss consequence claim detected ('{lock_matches[0]}')")

    if has_account_term and has_action_term:
        message_risk += 20
        signals_count += 2
        indicators.append(
            f"Account security lure combined with action request detected ({account_matches[0]} + {action_matches[0]})"
        )
    elif has_account_term and ("password" in lower_text or "credential" in lower_text):
        message_risk += 15
        signals_count += 1
        indicators.append("Direct credential or password prompt detected")

    # -------------------------------------------------------------------------
    # Signal 3: OTP / 2FA Security Code Requests (Social Engineering)
    # -------------------------------------------------------------------------
    if otp_matches:
        sharing_matches = _matches_any_pattern(OTP_SHARING_PATTERNS, lower_text)
        if sharing_matches:
            message_risk += 35
            signals_count += 3
            indicators.append(f"Critical social-engineering tactic: Request to {sharing_matches[0]} an OTP/security code")
        else:
            message_risk += 10
            signals_count += 1
            indicators.append("Security verification code (OTP/2FA) mentioned in message")

    # -------------------------------------------------------------------------
    # Signal 4: Financial & Billing / Subscription Renewal Lures
    # -------------------------------------------------------------------------
    if has_billing_term:
        if has_action_term:
            message_risk += 20
            signals_count += 1
            indicators.append(f"Action request associated with billing or subscription renewal detected ('{action_matches[0]}')")

        if has_urgency_term:
            message_risk += 15
            signals_count += 1
            indicators.append(f"Urgency pressure combined with subscription/billing action detected ('{urgency_matches[0]}')")

    if has_fin_term:
        if has_action_term or has_urgency_term or "unauthorized" in lower_text or "failed" in lower_text:
            message_risk += 25
            signals_count += 2
            indicators.append(f"Financial transaction or banking lure paired with action request ({fin_matches[0]})")
            if has_action_term and not has_billing_term:
                message_risk += 15
                indicators.append(f"Action or confirmation demanded on financial instrument ('{action_matches[0]}')")

    # -------------------------------------------------------------------------
    # Signal 5: Unsolicited Loan Offers & Smishing Lures
    # -------------------------------------------------------------------------
    if has_loan_term:
        signals_count += 2
        indicators.append(f"Unsolicited loan or fast-credit solicitation detected ('{loan_matches[0]}')")
        if extracted_urls or has_contact_solicitation or has_action_term:
            message_risk += 45
            indicators.append("Loan offer paired with direct contact link or call-to-action")
        else:
            message_risk += 25

    # -------------------------------------------------------------------------
    # Signal 6: Contact / Phone Solicitation Lures
    # -------------------------------------------------------------------------
    if has_contact_solicitation:
        signals_count += 1
        indicators.append("Direct phone or chat contact solicitation detected")
        if has_loan_term or has_fin_term or has_lock_term or has_billing_term:
            message_risk += 15

    # -------------------------------------------------------------------------
    # Signal 7: Prize / Lottery / Reward Scams
    # -------------------------------------------------------------------------
    if prize_matches:
        if has_action_term or has_account_term or "claim" in lower_text or "fee" in lower_text or "reward" in lower_text:
            message_risk += 35
            signals_count += 2
            indicators.append(f"Unsolicited prize, lottery, or reward lure with claim requirements detected ({prize_matches[0]})")
        else:
            message_risk += 15
            signals_count += 1
            indicators.append(f"Promotional reward or giveaway claim detected ({prize_matches[0]})")

    # -------------------------------------------------------------------------
    # Signal 8: Brand Impersonation Context
    # -------------------------------------------------------------------------
    matched_brand, brand_has_lure = _check_brand_impersonation(lower_text)
    if matched_brand:
        if brand_has_lure:
            message_risk += 25
            signals_count += 2
            indicators.append(f"Brand impersonation pattern: Target brand '{matched_brand.title()}' paired with security or payment lure")

    # -------------------------------------------------------------------------
    # Signal 9: Coercive Threats & Punitive Consequence Language
    # -------------------------------------------------------------------------
    if consequence_matches:
        message_risk += 20
        signals_count += 2
        indicators.append(f"Coercive threat or punitive consequence language detected: '{consequence_matches[0]}'")

    # -------------------------------------------------------------------------
    # Signal 10: Embedded URLs & Deep URL Threat Engine Evaluation
    # -------------------------------------------------------------------------
    embedded_url_results: list[dict[str, Any]] = []
    highest_url_score = 0
    has_shortener = False

    if extracted_urls:
        for u in extracted_urls:
            domain_part = u.split("/")[2].lower() if len(u.split("/")) > 2 else ""
            if any(shortener in domain_part for shortener in SHORTENER_DOMAINS):
                has_shortener = True

            url_eval = evaluate_embedded_url(u)
            embedded_url_results.append(url_eval)
            url_risk = url_eval.get("risk_score", 0)
            highest_url_score = max(highest_url_score, url_risk)

            if url_eval.get("verdict") == "phishing" or url_risk >= 70:
                indicators.append(f"Embedded link '{u}' flagged as high-risk phishing destination")
                signals_count += 3
            elif url_eval.get("verdict") == "suspicious" or url_risk >= 30:
                indicators.append(f"Embedded link '{u}' exhibits suspicious characteristics")
                signals_count += 1
            elif url_risk >= 15 or not u.lower().startswith("https://"):
                indicators.append(f"Embedded link '{u}' uses unencrypted transport with domain/path anomalies")
                signals_count += 1

        if has_shortener:
            message_risk += 15
            signals_count += 1
            indicators.append("Obfuscated or shortened hyperlink detected in message")

    # -------------------------------------------------------------------------
    # Multi-Signal Evidence-Based Decision Fusion
    # -------------------------------------------------------------------------
    overall_risk = message_risk

    if highest_url_score >= 70:
        overall_risk = max(overall_risk, highest_url_score, 75)
    elif highest_url_score >= 40:
        overall_risk = max(overall_risk, int(highest_url_score * 0.9) + int(message_risk * 0.4))
    elif has_loan_term and (extracted_urls or has_contact_solicitation):
        overall_risk = max(overall_risk, 75 if has_shortener else 65)

    # Cap overall risk
    overall_risk = max(0, min(100, overall_risk))
    message_risk = max(0, min(100, message_risk))

    # Compute verdict
    if overall_risk >= 70:
        verdict = "phishing"
    elif overall_risk >= 30:
        verdict = "suspicious"
    else:
        verdict = "safe"

    # Compute confidence
    if signals_count >= 4:
        confidence = min(0.98, 0.85 + (signals_count * 0.03))
    elif signals_count >= 2:
        confidence = 0.88
    elif signals_count == 1:
        confidence = 0.78
    else:
        confidence = 0.85 if verdict == "safe" else 0.70

    if not indicators:
        indicators.append("No significant social engineering or phishing threat signals detected")

    return {
        "verdict": verdict,
        "risk_score": overall_risk,
        "confidence": round(confidence, 2),
        "message": raw_message,
        "indicators": indicators,
        "message_risk": message_risk,
        "embedded_urls": embedded_url_results,
        "engine": ENGINE_NAME,
    }
