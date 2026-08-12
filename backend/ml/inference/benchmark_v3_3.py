import os
import sys
import time

# Make D:\LinkSentry available for imports
PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.inference.url_model import analyze_url_ml


TESTS = [
    # ============================================================
    # TRUSTED / BENIGN
    # ============================================================
    ("https://www.google.com", "benign"),
    ("https://accounts.google.com/login", "benign"),
    ("https://status.cloud.google.com", "benign"),
    ("https://www.amazon.com", "benign"),
    ("https://www.microsoft.com", "benign"),
    ("https://www.apple.com", "benign"),
    ("https://github.com", "benign"),
    ("https://www.facebook.com", "benign"),
    ("https://www.linkedin.com", "benign"),
    ("https://www.wikipedia.org", "benign"),
    ("https://www.python.org", "benign"),
    ("https://www.mozilla.org", "benign"),
    ("https://www.cloudflare.com", "benign"),
    ("https://stackoverflow.com", "benign"),
    ("https://pypi.org", "benign"),

    # ============================================================
    # TYPOSQUATTING
    # ============================================================
    ("https://g00gle.com/login", "phishing"),
    ("https://goog1e.com/login", "phishing"),
    ("https://go0gle.com/login", "phishing"),
    ("https://googlee.com/login", "phishing"),
    ("https://gogle.com/login", "phishing"),

    ("https://amaz0n.com/login", "phishing"),
    ("https://amazone.com/login", "phishing"),
    ("https://amzon.com/login", "phishing"),

    ("https://micros0ft.com/login", "phishing"),
    ("https://microsof1.com/login", "phishing"),

    ("https://faceb00k.com/login", "phishing"),
    ("https://facebok.com/login", "phishing"),

    # ============================================================
    # TRUSTED BRAND AS SUBDOMAIN OF ATTACKER DOMAIN
    # ============================================================
    ("https://google.com.evil.xyz/login", "phishing"),
    ("https://accounts.google.com.evil.xyz/login", "phishing"),
    ("https://amazon.com.evil.xyz/login", "phishing"),
    ("https://github.com.evil.xyz/login", "phishing"),
    ("https://microsoft.com.security-check.xyz/login", "phishing"),
    ("https://apple.com.verify-account.xyz/login", "phishing"),
    ("https://facebook.com.security.xyz/login", "phishing"),
    ("https://linkedin.com.verify.xyz/login", "phishing"),
    ("https://paypal.com.security-check.xyz/login", "phishing"),

    # ============================================================
    # CLASSIC PHISHING
    # ============================================================
    (
        "http://paypal-login-verify-account.xyz/secure/login",
        "phishing",
    ),
    (
        "http://microsoft-security-alert.xyz/login",
        "phishing",
    ),
    (
        "http://google-account-verification.top/secure",
        "phishing",
    ),
    (
        "http://appleid-confirm-login.click/verify",
        "phishing",
    ),
    (
        "http://bank-account-suspended.xyz/login",
        "phishing",
    ),
    (
        "http://secure-wallet-verify.tk/auth",
        "phishing",
    ),
    (
        "http://amazon-payment-confirm.xyz/login",
        "phishing",
    ),
    (
        "http://login-verify-account.xyz/update",
        "phishing",
    ),

    # ============================================================
    # PHISHING USING NORMAL-LOOKING TLD
    # ============================================================
    (
        "https://paypal-login-verify-account.com/login",
        "phishing",
    ),
    (
        "https://google-security-alert.com/login",
        "phishing",
    ),
    (
        "https://amazon-account-security.com/login",
        "phishing",
    ),
    (
        "https://microsoft-account-verify.com/login",
        "phishing",
    ),

    # ============================================================
    # SUSPICIOUS / RANDOM DOMAINS
    # ============================================================
    (
        "https://secure-login-account.xyz/verify",
        "phishing",
    ),
    (
        "https://account-verification.xyz/login",
        "phishing",
    ),
    (
        "https://wallet-confirmation.xyz/auth",
        "phishing",
    ),
]


def main():
    print("=" * 78)
    print("LINKSENTRY V3.3 URL BENCHMARK")
    print("Trusted Domains + Typosquatting + Brand Impersonation")
    print("=" * 78)

    print()
    print(f"Total test URLs: {len(TESTS)}")
    print()

    passed = 0
    failed = 0

    benign_total = 0
    benign_correct = 0

    phishing_total = 0
    phishing_correct = 0

    start_time = time.perf_counter()

    for index, (url, expected) in enumerate(TESTS, start=1):
        try:
            result = analyze_url_ml(url)

            predicted = result.get("prediction")
            confidence = result.get("confidence", 0)

            is_pass = predicted == expected

            if is_pass:
                passed += 1
                status = "PASS"
            else:
                failed += 1
                status = "FAIL"

            if expected == "benign":
                benign_total += 1
                if is_pass:
                    benign_correct += 1

            elif expected == "phishing":
                phishing_total += 1
                if is_pass:
                    phishing_correct += 1

            print(
                f"[{index:02d}/{len(TESTS)}] "
                f"{status:<4} | "
                f"Expected: {expected:<8} | "
                f"Predicted: {str(predicted):<10} | "
                f"Confidence: {confidence:.4f}"
            )

            if not is_pass:
                print(f"       URL: {url}")
                print(
                    f"       ML: {result.get('ml_prediction')} | "
                    f"Trusted: {result.get('trusted_domain')} | "
                    f"Rule: {result.get('rule_override')}"
                )
                print(
                    f"       Impersonated: "
                    f"{result.get('impersonated_domain')}"
                )
                print(
                    f"       Typosquat: "
                    f"{result.get('typosquat_domain')}"
                )
                print(
                    f"       Signals: "
                    f"{result.get('suspicious_signals')}"
                )

            print("-" * 78)

        except Exception as exc:
            failed += 1
            print(f"[{index:02d}/{len(TESTS)}] ERROR")
            print(f"       URL: {url}")
            print(f"       Error: {exc}")
            print("-" * 78)

    elapsed = time.perf_counter() - start_time

    total = len(TESTS)

    accuracy = (passed / total * 100) if total else 0
    benign_accuracy = (
        benign_correct / benign_total * 100
        if benign_total
        else 0
    )
    phishing_accuracy = (
        phishing_correct / phishing_total * 100
        if phishing_total
        else 0
    )

    false_positive_rate = (
        (benign_total - benign_correct)
        / benign_total
        * 100
        if benign_total
        else 0
    )

    print()
    print("=" * 78)
    print("V3.3 BENCHMARK SUMMARY")
    print("=" * 78)

    print(f"Total tests:              {total}")
    print(f"Passed:                   {passed}")
    print(f"Failed:                   {failed}")
    print(f"Overall accuracy:         {accuracy:.2f}%")
    print()
    print(f"Benign tests:             {benign_total}")
    print(f"Benign correct:           {benign_correct}")
    print(f"Benign accuracy:          {benign_accuracy:.2f}%")
    print(f"False-positive rate:      {false_positive_rate:.2f}%")
    print()
    print(f"Phishing tests:           {phishing_total}")
    print(f"Phishing correct:         {phishing_correct}")
    print(f"Phishing detection rate:  {phishing_accuracy:.2f}%")
    print()
    print(f"Benchmark runtime:        {elapsed:.3f} seconds")
    print("=" * 78)


if __name__ == "__main__":
    main()