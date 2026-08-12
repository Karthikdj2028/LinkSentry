"""
LinkSentry V3.3 URL Model Extended Benchmark

Tests:
1. Trusted legitimate domains
2. Legitimate subdomains
3. Typosquatting
4. Brand impersonation
5. Suspicious TLDs
6. IP-based URLs
7. Suspicious keywords
8. Shorteners
9. Normal legitimate URLs

Run from:
D:\LinkSentry\backend

Command:
python .\ml\inference\test_url_model_v3_3.py
"""

from ml.inference.url_model import analyze_url_ml


# ============================================================
# TEST CASES
# ============================================================

TEST_CASES = [

    # --------------------------------------------------------
    # LEGITIMATE TRUSTED DOMAINS
    # --------------------------------------------------------

    ("BENIGN", "https://www.google.com"),
    ("BENIGN", "https://www.amazon.com"),
    ("BENIGN", "https://github.com"),
    ("BENIGN", "https://www.microsoft.com"),
    ("BENIGN", "https://www.apple.com"),
    ("BENIGN", "https://www.linkedin.com"),
    ("BENIGN", "https://www.wikipedia.org"),
    ("BENIGN", "https://www.python.org"),
    ("BENIGN", "https://www.mozilla.org"),
    ("BENIGN", "https://www.cloudflare.com"),

    # --------------------------------------------------------
    # LEGITIMATE SUBDOMAINS
    # --------------------------------------------------------

    ("BENIGN", "https://accounts.google.com/login"),
    ("BENIGN", "https://mail.google.com"),
    ("BENIGN", "https://drive.google.com"),
    ("BENIGN", "https://status.cloud.google.com"),
    ("BENIGN", "https://docs.google.com"),
    ("BENIGN", "https://login.microsoftonline.com"),
    ("BENIGN", "https://support.microsoft.com"),
    ("BENIGN", "https://developer.mozilla.org"),
    ("BENIGN", "https://docs.github.com"),
    ("BENIGN", "https://api.github.com"),

    # --------------------------------------------------------
    # TYPOSQUATTING
    # --------------------------------------------------------

    ("PHISHING", "https://gogle.com/login"),
    ("PHISHING", "https://gooogle.com/login"),
    ("PHISHING", "https://googlee.com/login"),
    ("PHISHING", "https://g00gle.com/login"),
    ("PHISHING", "https://goog1e.com/login"),

    ("PHISHING", "https://micros0ft.com/login"),
    ("PHISHING", "https://microsft.com/login"),
    ("PHISHING", "https://microsoftt.com/login"),

    ("PHISHING", "https://amaz0n.com/login"),
    ("PHISHING", "https://ammazon.com/login"),
    ("PHISHING", "https://amazonn.com/login"),

    ("PHISHING", "https://paypa1.com/login"),
    ("PHISHING", "https://paypaI.com/login"),
    ("PHISHING", "https://paypall.com/login"),

    ("PHISHING", "https://facebok.com/login"),
    ("PHISHING", "https://faceboook.com/login"),

    # --------------------------------------------------------
    # BRAND IMPERSONATION
    # --------------------------------------------------------

    ("PHISHING", "https://google.com.evil.xyz/login"),
    ("PHISHING", "https://amazon.com.evil.xyz/account"),
    ("PHISHING", "https://github.com.evil.xyz/login"),
    ("PHISHING", "https://microsoft.com.security-check.xyz/login"),
    ("PHISHING", "https://apple.com.verify-account.xyz/login"),
    ("PHISHING", "https://facebook.com.security.xyz/login"),
    ("PHISHING", "https://linkedin.com.verify.xyz/login"),

    ("PHISHING", "https://login-google.xyz"),
    ("PHISHING", "https://google-security.xyz/login"),
    ("PHISHING", "https://google-account-verification.top/secure"),
    ("PHISHING", "https://amazon-payment-confirm.xyz/login"),
    ("PHISHING", "https://paypal-login-verify-account.xyz/secure/login"),

    # --------------------------------------------------------
    # SUSPICIOUS TLD + PHISHING KEYWORDS
    # --------------------------------------------------------

    ("PHISHING", "https://secure-login.xyz/login"),
    ("PHISHING", "https://account-verification.top/verify"),
    ("PHISHING", "https://bank-security.click/login"),
    ("PHISHING", "https://wallet-confirm.tk/auth"),
    ("PHISHING", "https://payment-update.xyz/account"),
    ("PHISHING", "https://password-reset.click/login"),
    ("PHISHING", "https://urgent-security-alert.top/verify"),

    # --------------------------------------------------------
    # IP-BASED URLS
    # --------------------------------------------------------

    ("PHISHING", "http://192.168.1.10/login"),
    ("PHISHING", "http://45.33.22.11/verify"),
    ("PHISHING", "http://103.21.244.10/account"),
    ("PHISHING", "http://185.199.108.153/login"),

    # --------------------------------------------------------
    # SUSPICIOUS LONG / OBFUSCATED URLs
    # --------------------------------------------------------

    (
        "PHISHING",
        "https://www.google.com.evil.xyz/login?"
        "session=verify&account=secure&password=update",
    ),

    (
        "PHISHING",
        "https://paypal-login-verify-account.xyz/"
        "secure/account/verification/password/update",
    ),

    (
        "PHISHING",
        "https://secure-payment-account-verification.xyz/"
        "login?user=example&password=verify",
    ),

    # --------------------------------------------------------
    # NORMAL BENIGN URLS
    # --------------------------------------------------------

    ("BENIGN", "https://www.google.com/search?q=python"),
    ("BENIGN", "https://github.com/login"),
    ("BENIGN", "https://github.com/products"),
    ("BENIGN", "https://www.amazon.com/products"),
    ("BENIGN", "https://www.microsoft.com/en-us/support"),
    ("BENIGN", "https://www.apple.com/support"),
    ("BENIGN", "https://www.cloudflare.com/learning/"),
    ("BENIGN", "https://www.python.org/downloads/"),
    ("BENIGN", "https://www.mozilla.org/en-US/firefox/"),
]


# ============================================================
# RUN BENCHMARK
# ============================================================

def main():

    print("=" * 78)
    print("LINKSENTRY V3.3 EXTENDED URL BENCHMARK")
    print("=" * 78)

    total = len(TEST_CASES)
    passed = 0
    failed = 0

    failures = []

    for index, (expected, url) in enumerate(TEST_CASES, start=1):

        try:
            result = analyze_url_ml(url)

            prediction = str(
                result.get("prediction", "")
            ).upper()

            expected_upper = expected.upper()

            success = prediction == expected_upper

            if success:
                passed += 1
                status = "PASS"
            else:
                failed += 1
                status = "FAIL"

                failures.append(
                    {
                        "url": url,
                        "expected": expected_upper,
                        "predicted": prediction,
                        "confidence": result.get("confidence"),
                        "ml_prediction": result.get("ml_prediction"),
                        "trusted_domain": result.get("trusted_domain"),
                        "trust_override": result.get("trust_override"),
                        "rule_override": result.get("rule_override"),
                        "impersonated_domain": result.get(
                            "impersonated_domain"
                        ),
                        "typosquat_domain": result.get(
                            "typosquat_domain"
                        ),
                        "signals": result.get(
                            "suspicious_signals"
                        ),
                    }
                )

            print("-" * 78)
            print(
                f"[{index:03}/{total:03}] {status}"
            )
            print(
                f"Expected : {expected_upper}"
            )
            print(
                f"Predicted: {prediction}"
            )
            print(
                f"Confidence: {result.get('confidence')}"
            )
            print(
                f"ML       : {result.get('ml_prediction')}"
            )
            print(
                f"Trusted  : {result.get('trusted_domain')}"
            )
            print(
                f"Trust OV : {result.get('trust_override')}"
            )
            print(
                f"Rule OV  : {result.get('rule_override')}"
            )
            print(
                f"Impersonated: "
                f"{result.get('impersonated_domain')}"
            )
            print(
                f"Typosquat : "
                f"{result.get('typosquat_domain')}"
            )
            print(
                f"Signals   : "
                f"{result.get('suspicious_signals')}"
            )
            print(f"URL       : {url}")

        except Exception as exc:

            failed += 1

            failures.append(
                {
                    "url": url,
                    "expected": expected,
                    "predicted": "ERROR",
                    "confidence": None,
                    "ml_prediction": None,
                    "trusted_domain": None,
                    "trust_override": None,
                    "rule_override": None,
                    "impersonated_domain": None,
                    "typosquat_domain": None,
                    "signals": [str(exc)],
                }
            )

            print("-" * 78)
            print(
                f"[{index:03}/{total:03}] ERROR"
            )
            print(f"URL: {url}")
            print(f"Error: {exc}")

    # ========================================================
    # SUMMARY
    # ========================================================

    accuracy = (
        passed / total * 100
        if total
        else 0
    )

    print()
    print("=" * 78)
    print("V3.3 EXTENDED BENCHMARK SUMMARY")
    print("=" * 78)

    print(f"Total : {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Accuracy: {accuracy:.2f}%")

    # ========================================================
    # FAILURES
    # ========================================================

    if failures:

        print()
        print("=" * 78)
        print("FAILED TEST CASES")
        print("=" * 78)

        for item in failures:

            print()
            print(f"URL:        {item['url']}")
            print(f"Expected:   {item['expected']}")
            print(f"Predicted:  {item['predicted']}")
            print(
                f"ML:         "
                f"{item.get('ml_prediction')}"
            )
            print(
                f"Confidence: "
                f"{item.get('confidence')}"
            )
            print(
                f"Trusted:    "
                f"{item.get('trusted_domain')}"
            )
            print(
                f"Trust OV:   "
                f"{item.get('trust_override')}"
            )
            print(
                f"Rule OV:    "
                f"{item.get('rule_override')}"
            )
            print(
                f"Impersonated: "
                f"{item.get('impersonated_domain')}"
            )
            print(
                f"Typosquat:  "
                f"{item.get('typosquat_domain')}"
            )
            print(
                f"Signals:    "
                f"{item.get('signals')}"
            )

    print()
    print("=" * 78)

    if failed == 0:
        print("ALL TESTS PASSED")
    else:
        print(
            f"{failed} TEST(S) NEED ATTENTION"
        )

    print("=" * 78)


if __name__ == "__main__":
    main()