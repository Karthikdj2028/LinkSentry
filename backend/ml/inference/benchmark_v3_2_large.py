"""
LinkSentry V3.2 Large Automated URL Benchmark

Tests:
1. Trusted domains
2. Trusted subdomains
3. Trusted-domain paths
4. Brand impersonation
5. Typosquatting
6. Suspicious TLDs
7. Punycode
8. Obfuscated URLs
9. Legitimate suspicious-looking URLs
10. Phishing URLs
11. IP-based URLs
12. URL shorteners
13. Ports / queries / complex URLs
"""

import sys
import time
from pathlib import Path
from collections import defaultdict

# ============================================================
# Make "ml" importable when running this file directly
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from ml.inference.url_model import analyze_url_ml


# ============================================================
# TEST DATA
# ============================================================

TEST_CASES = [

    # ========================================================
    # 1. TRUSTED DOMAINS
    # ========================================================

    ("trusted_domain", "https://google.com", "benign"),
    ("trusted_domain", "https://www.google.com", "benign"),
    ("trusted_domain", "https://amazon.com", "benign"),
    ("trusted_domain", "https://www.amazon.com", "benign"),
    ("trusted_domain", "https://github.com", "benign"),
    ("trusted_domain", "https://microsoft.com", "benign"),
    ("trusted_domain", "https://apple.com", "benign"),
    ("trusted_domain", "https://facebook.com", "benign"),
    ("trusted_domain", "https://linkedin.com", "benign"),
    ("trusted_domain", "https://wikipedia.org", "benign"),
    ("trusted_domain", "https://python.org", "benign"),
    ("trusted_domain", "https://mozilla.org", "benign"),
    ("trusted_domain", "https://cloudflare.com", "benign"),
    ("trusted_domain", "https://youtube.com", "benign"),
    ("trusted_domain", "https://instagram.com", "benign"),
    ("trusted_domain", "https://paypal.com", "benign"),
    ("trusted_domain", "https://office.com", "benign"),
    ("trusted_domain", "https://googleapis.com", "benign"),
    ("trusted_domain", "https://akamai.net", "benign"),
    ("trusted_domain", "https://airbnb.com", "benign"),

    # ========================================================
    # 2. TRUSTED SUBDOMAINS
    # ========================================================

    ("trusted_subdomain", "https://accounts.google.com", "benign"),
    ("trusted_subdomain", "https://mail.google.com", "benign"),
    ("trusted_subdomain", "https://drive.google.com", "benign"),
    ("trusted_subdomain", "https://docs.google.com", "benign"),
    ("trusted_subdomain", "https://maps.google.com", "benign"),
    ("trusted_subdomain", "https://support.microsoft.com", "benign"),
    ("trusted_subdomain", "https://login.microsoftonline.com", "benign"),
    ("trusted_subdomain", "https://developer.apple.com", "benign"),
    ("trusted_subdomain", "https://developer.mozilla.org", "benign"),
    ("trusted_subdomain", "https://api.github.com", "benign"),
    ("trusted_subdomain", "https://gist.github.com", "benign"),
    ("trusted_subdomain", "https://www.cloudflare.com", "benign"),
    ("trusted_subdomain", "https://status.cloud.google.com", "benign"),

    # ========================================================
    # 3. TRUSTED DOMAINS WITH SUSPICIOUS-LOOKING PATHS
    # ========================================================

    ("trusted_path", "https://www.google.com/login", "benign"),
    ("trusted_path", "https://www.google.com/account", "benign"),
    ("trusted_path", "https://www.google.com/security", "benign"),
    ("trusted_path", "https://accounts.google.com/login", "benign"),
    ("trusted_path", "https://github.com/login", "benign"),
    ("trusted_path", "https://github.com/account", "benign"),
    ("trusted_path", "https://www.amazon.com/account", "benign"),
    ("trusted_path", "https://www.amazon.com/gp/login", "benign"),
    ("trusted_path", "https://www.microsoft.com/security", "benign"),
    ("trusted_path", "https://support.microsoft.com/account", "benign"),
    ("trusted_path", "https://www.apple.com/security", "benign"),
    ("trusted_path", "https://www.linkedin.com/login", "benign"),
    ("trusted_path", "https://www.paypal.com/signin", "benign"),
    ("trusted_path", "https://www.cloudflare.com/login", "benign"),
    ("trusted_path", "https://www.wikipedia.org/wiki/Login", "benign"),

    # ========================================================
    # 4. BRAND IMPERSONATION
    # ========================================================

    ("brand_impersonation", "https://google.com.evil.xyz/login", "phishing"),
    ("brand_impersonation", "https://google.com.security-check.xyz/login", "phishing"),
    ("brand_impersonation", "https://google.com.verify-account.xyz/login", "phishing"),
    ("brand_impersonation", "https://amazon.com.evil.xyz/account", "phishing"),
    ("brand_impersonation", "https://amazon.com.security-check.xyz/login", "phishing"),
    ("brand_impersonation", "https://github.com.evil.xyz/login", "phishing"),
    ("brand_impersonation", "https://github.com.security-check.xyz/login", "phishing"),
    ("brand_impersonation", "https://microsoft.com.evil.xyz/login", "phishing"),
    ("brand_impersonation", "https://microsoft.com.security-check.xyz/login", "phishing"),
    ("brand_impersonation", "https://apple.com.evil.xyz/login", "phishing"),
    ("brand_impersonation", "https://apple.com.verify-account.xyz/login", "phishing"),
    ("brand_impersonation", "https://facebook.com.security.xyz/login", "phishing"),
    ("brand_impersonation", "https://linkedin.com.verify.xyz/login", "phishing"),
    ("brand_impersonation", "https://paypal.com.security-check.xyz/login", "phishing"),
    ("brand_impersonation", "https://paypal.com.verify-account.xyz/login", "phishing"),
    ("brand_impersonation", "https://office.com.security-check.xyz/login", "phishing"),
    ("brand_impersonation", "https://youtube.com.verify-account.xyz/login", "phishing"),
    ("brand_impersonation", "https://instagram.com.security-check.xyz/login", "phishing"),
    ("brand_impersonation", "https://cloudflare.com.verify-account.xyz/login", "phishing"),
    ("brand_impersonation", "https://python.org.security-check.xyz/login", "phishing"),

    # ========================================================
    # 5. TYPOSQUATTING
    # ========================================================

    ("typosquatting", "https://g00gle.com/login", "phishing"),
    ("typosquatting", "https://go0gle.com/login", "phishing"),
    ("typosquatting", "https://goog1e.com/login", "phishing"),
    ("typosquatting", "https://googlee.com/login", "phishing"),
    ("typosquatting", "https://goggle.com/login", "phishing"),
    ("typosquatting", "https://amaz0n.com/login", "phishing"),
    ("typosquatting", "https://amazonn.com/login", "phishing"),
    ("typosquatting", "https://micros0ft.com/login", "phishing"),
    ("typosquatting", "https://microsft.com/login", "phishing"),
    ("typosquatting", "https://app1e.com/login", "phishing"),
    ("typosquatting", "https://applle.com/login", "phishing"),
    ("typosquatting", "https://facebok.com/login", "phishing"),
    ("typosquatting", "https://faceboook.com/login", "phishing"),
    ("typosquatting", "https://paypa1.com/login", "phishing"),
    ("typosquatting", "https://paypai.com/login", "phishing"),

    # ========================================================
    # 6. SUSPICIOUS TLD PHISHING
    # ========================================================

    ("suspicious_tld", "https://google-login.xyz/login", "phishing"),
    ("suspicious_tld", "https://google-account.top/verify", "phishing"),
    ("suspicious_tld", "https://amazon-security.click/login", "phishing"),
    ("suspicious_tld", "https://microsoft-alert.xyz/login", "phishing"),
    ("suspicious_tld", "https://appleid-confirm.click/verify", "phishing"),
    ("suspicious_tld", "https://paypal-security.tk/login", "phishing"),
    ("suspicious_tld", "https://bank-account.xyz/login", "phishing"),
    ("suspicious_tld", "https://secure-wallet.tk/auth", "phishing"),
    ("suspicious_tld", "https://account-verification.top/login", "phishing"),
    ("suspicious_tld", "https://security-alert.xyz/verify", "phishing"),
    ("suspicious_tld", "https://login-confirm.click/account", "phishing"),
    ("suspicious_tld", "https://payment-update.xyz/login", "phishing"),

    # ========================================================
    # 7. PUNYCODE / IDN
    # ========================================================

    ("punycode", "https://xn--paypa1-5ve.example/login", "phishing"),
    ("punycode", "https://xn--goog1e-qmc.example/login", "phishing"),
    ("punycode", "https://xn--microsft-9za.example/login", "phishing"),
    ("punycode", "https://xn--apple-8va.example/login", "phishing"),
    ("punycode", "https://xn--secure-login.example/login", "phishing"),

    # ========================================================
    # 8. OBSCURED / STRUCTURAL PHISHING
    # ========================================================

    (
        "obfuscation",
        "https://paypal-login-verify-account.xyz/secure/login",
        "phishing",
    ),
    (
        "obfuscation",
        "https://login-verify-account.xyz/update",
        "phishing",
    ),
    (
        "obfuscation",
        "https://bank-account-suspended.xyz/login",
        "phishing",
    ),
    (
        "obfuscation",
        "https://secure-wallet-verify.tk/auth",
        "phishing",
    ),
    (
        "obfuscation",
        "https://google-account-verification.top/secure",
        "phishing",
    ),
    (
        "obfuscation",
        "https://appleid-confirm-login.click/verify",
        "phishing",
    ),
    (
        "obfuscation",
        "https://microsoft-security-alert.xyz/login",
        "phishing",
    ),
    (
        "obfuscation",
        "https://amazon-payment-confirm.xyz/login",
        "phishing",
    ),

    # ========================================================
    # 9. LEGITIMATE SUSPICIOUS-LOOKING URLS
    # ========================================================

    ("legitimate_suspicious", "https://www.google.com/search?q=security", "benign"),
    ("legitimate_suspicious", "https://www.google.com/account/security", "benign"),
    ("legitimate_suspicious", "https://support.microsoft.com/security", "benign"),
    ("legitimate_suspicious", "https://www.amazon.com/account/login", "benign"),
    ("legitimate_suspicious", "https://github.com/login", "benign"),
    ("legitimate_suspicious", "https://github.com/settings/security", "benign"),
    ("legitimate_suspicious", "https://www.paypal.com/signin", "benign"),
    ("legitimate_suspicious", "https://www.apple.com/shop/account", "benign"),
    ("legitimate_suspicious", "https://www.linkedin.com/login", "benign"),
    ("legitimate_suspicious", "https://www.cloudflare.com/security", "benign"),

    # ========================================================
    # 10. IP ADDRESS PHISHING
    # ========================================================

    ("ip_phishing", "http://192.168.1.100/login", "phishing"),
    ("ip_phishing", "http://45.33.32.156/login", "phishing"),
    ("ip_phishing", "http://103.21.244.0/secure/login", "phishing"),
    ("ip_phishing", "http://185.199.108.153/account/verify", "phishing"),
    ("ip_phishing", "http://8.8.8.8/login", "phishing"),

    # ========================================================
    # 11. URL SHORTENERS
    # ========================================================

    ("shortener", "https://bit.ly/3abcXYZ", "phishing"),
    ("shortener", "https://tinyurl.com/security-login", "phishing"),
    ("shortener", "https://t.co/security-login", "phishing"),
    ("shortener", "https://cutt.ly/account-verify", "phishing"),
    ("shortener", "https://rb.gy/login-security", "phishing"),

    # ========================================================
    # 12. QUERY / PORT / COMPLEX PHISHING
    # ========================================================

    (
        "complex",
        "https://paypal-login.xyz:443/secure/login?verify=account",
        "phishing",
    ),
    (
        "complex",
        "https://account-security.xyz/login?redirect=paypal.com",
        "phishing",
    ),
    (
        "complex",
        "https://login.xyz/?user=google&verify=account",
        "phishing",
    ),
    (
        "complex",
        "https://secure-login.xyz/auth?session=verify&account=paypal",
        "phishing",
    ),
    (
        "complex",
        "https://bank-security.xyz/account?confirm=true",
        "phishing",
    ),
]


# ============================================================
# RUN BENCHMARK
# ============================================================

def main():

    print("=" * 78)
    print("LINKSENTRY V3.2 LARGE AUTOMATED BENCHMARK")
    print("=" * 78)
    print()

    total = len(TEST_CASES)

    passed = 0
    failed = 0

    results = []
    category_stats = defaultdict(lambda: {
        "total": 0,
        "passed": 0,
        "failed": 0,
    })

    false_positives = []
    false_negatives = []

    start_time = time.perf_counter()

    print(f"Total test URLs: {total}")
    print()
    print("Starting benchmark...")
    print()

    for index, (category, url, expected) in enumerate(TEST_CASES, 1):

        try:
            result = analyze_url_ml(url)

            prediction = result.get("prediction")
            confidence = result.get("confidence", 0.0)

            is_pass = prediction == expected

        except Exception as exc:

            prediction = "ERROR"
            confidence = 0.0
            is_pass = False

            result = {
                "error": str(exc),
            }

        category_stats[category]["total"] += 1

        if is_pass:
            passed += 1
            category_stats[category]["passed"] += 1
            status = "PASS"
        else:
            failed += 1
            category_stats[category]["failed"] += 1
            status = "FAIL"

            if expected == "benign" and prediction != "benign":
                false_positives.append(
                    (category, url, prediction, confidence)
                )

            if expected == "phishing" and prediction != "phishing":
                false_negatives.append(
                    (category, url, prediction, confidence)
                )

        results.append({
            "category": category,
            "url": url,
            "expected": expected,
            "predicted": prediction,
            "confidence": confidence,
            "passed": is_pass,
        })

        # ----------------------------------------------------
        # Progress display
        # ----------------------------------------------------

        elapsed = time.perf_counter() - start_time

        rate = index / elapsed if elapsed > 0 else 0

        remaining = total - index

        eta = remaining / rate if rate > 0 else 0

        percent = index / total * 100

        print(
            f"[{index:3d}/{total}] "
            f"{percent:6.2f}% | "
            f"{status:4s} | "
            f"{category:22s} | "
            f"ETA {eta:6.1f}s | "
            f"{url}"
        )

    # ========================================================
    # SUMMARY
    # ========================================================

    elapsed = time.perf_counter() - start_time

    accuracy = passed / total if total else 0

    print()
    print("=" * 78)
    print("V3.2 BENCHMARK SUMMARY")
    print("=" * 78)

    print(f"Total tests:       {total}")
    print(f"Passed:            {passed}")
    print(f"Failed:            {failed}")
    print(f"Accuracy:          {accuracy * 100:.2f}%")
    print(f"Runtime:           {elapsed:.2f} seconds")

    # ========================================================
    # CATEGORY RESULTS
    # ========================================================

    print()
    print("-" * 78)
    print("CATEGORY RESULTS")
    print("-" * 78)

    for category in sorted(category_stats):

        stats = category_stats[category]

        category_accuracy = (
            stats["passed"] / stats["total"] * 100
            if stats["total"]
            else 0
        )

        print(
            f"{category:25s} "
            f"{stats['passed']:3d}/{stats['total']:3d} "
            f"({category_accuracy:6.2f}%)"
        )

    # ========================================================
    # FALSE POSITIVES
    # ========================================================

    print()
    print("-" * 78)
    print(f"FALSE POSITIVES: {len(false_positives)}")
    print("-" * 78)

    if false_positives:

        for category, url, prediction, confidence in false_positives:

            print(
                f"{category:22s} | "
                f"Predicted={prediction:10s} | "
                f"Confidence={confidence:.4f} | "
                f"{url}"
            )

    else:
        print("None")

    # ========================================================
    # FALSE NEGATIVES
    # ========================================================

    print()
    print("-" * 78)
    print(f"FALSE NEGATIVES: {len(false_negatives)}")
    print("-" * 78)

    if false_negatives:

        for category, url, prediction, confidence in false_negatives:

            print(
                f"{category:22s} | "
                f"Predicted={prediction:10s} | "
                f"Confidence={confidence:.4f} | "
                f"{url}"
            )

    else:
        print("None")

    # ========================================================
    # FINAL VERDICT
    # ========================================================

    print()
    print("=" * 78)

    if accuracy == 1.0:
        print("RESULT: 100% BENCHMARK PASS")
    elif accuracy >= 0.95:
        print("RESULT: STRONG PASS")
    elif accuracy >= 0.90:
        print("RESULT: NEEDS IMPROVEMENT")
    else:
        print("RESULT: FAIL")

    print("=" * 78)


if __name__ == "__main__":
    main()