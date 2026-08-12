"""
LinkSentry V3.2 URL Model Benchmark

Tests:
1. Trusted domains
2. Trusted subdomains
3. Trusted-brand impersonation
4. Obvious phishing
5. Obvious malware-like URLs
6. Benign URLs with suspicious-looking paths
"""
import sys
from pathlib import Path

# Add LinkSentry backend root to Python import path
BACKEND_DIR = Path(__file__).resolve().parents[2]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
from ml.inference.url_model import analyze_url_ml


# ============================================================
# TEST CASES
# ============================================================

TESTS = [

    # --------------------------------------------------------
    # TRUSTED ROOT DOMAINS
    # --------------------------------------------------------

    ("https://www.google.com", "benign", "trusted"),
    ("https://www.amazon.com", "benign", "trusted"),
    ("https://github.com", "benign", "trusted"),
    ("https://www.microsoft.com", "benign", "trusted"),
    ("https://www.apple.com", "benign", "trusted"),
    ("https://www.facebook.com", "benign", "trusted"),
    ("https://www.linkedin.com", "benign", "trusted"),
    ("https://www.wikipedia.org", "benign", "trusted"),
    ("https://www.python.org", "benign", "trusted"),
    ("https://www.mozilla.org", "benign", "trusted"),
    ("https://www.cloudflare.com", "benign", "trusted"),
    ("https://www.paypal.com", "benign", "trusted"),

    # --------------------------------------------------------
    # TRUSTED SUBDOMAINS
    # --------------------------------------------------------

    ("https://accounts.google.com/login", "benign", "trusted_subdomain"),
    ("https://mail.google.com", "benign", "trusted_subdomain"),
    ("https://docs.google.com", "benign", "trusted_subdomain"),
    ("https://drive.google.com", "benign", "trusted_subdomain"),
    ("https://login.microsoftonline.com", "benign", "trusted_subdomain"),
    ("https://support.microsoft.com", "benign", "trusted_subdomain"),
    ("https://developer.mozilla.org", "benign", "trusted_subdomain"),
    ("https://api.github.com", "benign", "trusted_subdomain"),
    ("https://www.paypal.com/account", "benign", "trusted_subdomain"),

    # --------------------------------------------------------
    # BRAND IMPERSONATION
    # --------------------------------------------------------

    ("https://google.com.evil.xyz/login", "phishing", "impersonation"),
    ("https://amazon.com.evil.xyz/account", "phishing", "impersonation"),
    ("https://github.com.evil.xyz/login", "phishing", "impersonation"),
    ("https://microsoft.com.security-check.xyz/login", "phishing", "impersonation"),
    ("https://apple.com.verify-account.xyz/login", "phishing", "impersonation"),
    ("https://facebook.com.security.xyz/login", "phishing", "impersonation"),
    ("https://linkedin.com.verify.xyz/login", "phishing", "impersonation"),
    ("https://paypal.com.security-check.xyz/login", "phishing", "impersonation"),

    ("https://secure.google.com.evil.xyz/login", "phishing", "impersonation"),
    ("https://accounts.google.com.evil.xyz/verify", "phishing", "impersonation"),
    ("https://login.microsoft.com.evil.xyz/account", "phishing", "impersonation"),
    ("https://support.apple.com.evil.xyz/login", "phishing", "impersonation"),

    # --------------------------------------------------------
    # OBVIOUS PHISHING
    # --------------------------------------------------------

    (
        "http://paypal-login-verify-account.xyz/secure/login",
        "phishing",
        "phishing",
    ),
    (
        "http://microsoft-security-alert.xyz/login",
        "phishing",
        "phishing",
    ),
    (
        "http://google-account-verification.top/secure",
        "phishing",
        "phishing",
    ),
    (
        "http://appleid-confirm-login.click/verify",
        "phishing",
        "phishing",
    ),
    (
        "http://bank-account-suspended.xyz/login",
        "phishing",
        "phishing",
    ),
    (
        "http://secure-wallet-verify.tk/auth",
        "phishing",
        "phishing",
    ),
    (
        "http://amazon-payment-confirm.xyz/login",
        "phishing",
        "phishing",
    ),
    (
        "http://login-verify-account.xyz/update",
        "phishing",
        "phishing",
    ),

    # --------------------------------------------------------
    # BENIGN URLS WITH SUSPICIOUS-LOOKING PATHS
    # --------------------------------------------------------

    ("https://www.google.com/account", "benign", "trusted_path"),
    ("https://www.google.com/security", "benign", "trusted_path"),
    ("https://www.google.com/login", "benign", "trusted_path"),
    ("https://www.amazon.com/account", "benign", "trusted_path"),
    ("https://www.amazon.com/login", "benign", "trusted_path"),
    ("https://github.com/login", "benign", "trusted_path"),
    ("https://github.com/account", "benign", "trusted_path"),
    ("https://www.microsoft.com/security", "benign", "trusted_path"),
    ("https://www.apple.com/account", "benign", "trusted_path"),
    ("https://www.paypal.com/account", "benign", "trusted_path"),

    # --------------------------------------------------------
    # PUNYCODE / HOMOGRAPH-LIKE CASE
    # --------------------------------------------------------

    (
        "http://xn--paypa1-5ve.example/login",
        "phishing",
        "punycode",
    ),

    # --------------------------------------------------------
    # COMPLEX PHISHING
    # --------------------------------------------------------

    (
        "https://paypal-login-verify-account.xyz/secure/login?session=123456",
        "phishing",
        "complex_phishing",
    ),
    (
        "https://account-verification-security.xyz/login?user=paypal",
        "phishing",
        "complex_phishing",
    ),
    (
        "https://banking-secure-login.top/verify/account",
        "phishing",
        "complex_phishing",
    ),
]


# ============================================================
# RUN BENCHMARK
# ============================================================

print("=" * 75)
print("LINKSENTRY V3.2 URL MODEL BENCHMARK")
print("=" * 75)

total = 0
passed = 0
failed = 0

category_stats = {}


for url, expected, category in TESTS:

    total += 1

    try:
        result = analyze_url_ml(url)

        predicted = result["prediction"]
        confidence = result.get("confidence", 0.0)

        trusted = result.get("trusted_domain", False)
        impersonated = result.get("impersonated_domain")

        if predicted == expected:
            status = "PASS"
            passed += 1
        else:
            status = "FAIL"
            failed += 1

        # Category statistics

        if category not in category_stats:
            category_stats[category] = {
                "total": 0,
                "passed": 0,
            }

        category_stats[category]["total"] += 1

        if predicted == expected:
            category_stats[category]["passed"] += 1

        print(status)
        print(f"URL:          {url}")
        print(f"Category:     {category}")
        print(f"Expected:     {expected}")
        print(f"Predicted:    {predicted}")
        print(f"Confidence:   {confidence:.4f}")
        print(f"Trusted:      {trusted}")
        print(f"Impersonated:  {impersonated}")
        print(f"Signals:      {result.get('suspicious_signals', [])}")
        print(f"ML prediction:{result.get('ml_prediction')}")
        print("-" * 75)

    except Exception as e:

        failed += 1

        if category not in category_stats:
            category_stats[category] = {
                "total": 0,
                "passed": 0,
            }

        category_stats[category]["total"] += 1

        print("ERROR")
        print(f"URL:          {url}")
        print(f"Category:     {category}")
        print(f"Error:        {e}")
        print("-" * 75)


# ============================================================
# SUMMARY
# ============================================================

accuracy = passed / total if total else 0.0

print()
print("=" * 75)
print("V3.2 BENCHMARK SUMMARY")
print("=" * 75)

print(f"Total:     {total}")
print(f"Passed:    {passed}")
print(f"Failed:    {failed}")
print(f"Accuracy:  {accuracy * 100:.2f}%")

print()
print("CATEGORY RESULTS")
print("-" * 75)

for category, stats in category_stats.items():

    category_accuracy = (
        stats["passed"] / stats["total"]
        if stats["total"]
        else 0
    )

    print(
        f"{category:22}"
        f"{stats['passed']:3}/{stats['total']:3}"
        f"   {category_accuracy * 100:6.2f}%"
    )

print("=" * 75)


# ============================================================
# EXPECTED MINIMUMS
# ============================================================

print()
print("QUALITY CHECK")
print("-" * 75)

trusted_ok = True
impersonation_ok = True

for category, stats in category_stats.items():

    category_accuracy = (
        stats["passed"] / stats["total"]
        if stats["total"]
        else 0
    )

    if category in {
        "trusted",
        "trusted_subdomain",
        "trusted_path",
    }:

        if category_accuracy < 0.90:
            trusted_ok = False

    if category == "impersonation":

        if category_accuracy < 0.90:
            impersonation_ok = False


print(
    "Trusted-domain handling: "
    + ("PASS" if trusted_ok else "FAIL")
)

print(
    "Brand-impersonation handling: "
    + ("PASS" if impersonation_ok else "FAIL")
)

print()

if accuracy >= 0.90 and trusted_ok and impersonation_ok:

    print("V3.2 BENCHMARK: PASS")

else:

    print("V3.2 BENCHMARK: NEEDS IMPROVEMENT")

print("=" * 75)