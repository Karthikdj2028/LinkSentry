import sys
from pathlib import Path

# Allow running this file directly from backend/ml/inference
sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[2])
)

from ml.inference.url_model import analyze_url_ml


TEST_CASES = [

    # =========================================================
    # LEGITIMATE / BENIGN
    # =========================================================

    ("https://www.google.com", "benign"),
    ("https://www.microsoft.com", "benign"),
    ("https://www.apple.com", "benign"),
    ("https://www.amazon.com", "benign"),
    ("https://github.com", "benign"),
    ("https://www.linkedin.com", "benign"),
    ("https://www.wikipedia.org", "benign"),
    ("https://www.python.org", "benign"),
    ("https://www.mozilla.org", "benign"),
    ("https://www.cloudflare.com", "benign"),

    # =========================================================
    # PHISHING
    # =========================================================

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
        "http://paypal.com.security-check.xyz/login",
        "phishing",
    ),

    (
        "http://login-verify-account.xyz/update",
        "phishing",
    ),

    (
        "http://xn--paypa1-5ve.example/login",
        "phishing",
    ),
]


def main():

    passed = 0
    failed = 0

    print()
    print("=" * 70)
    print("LINKSENTRY V3 URL MODEL BENCHMARK")
    print("=" * 70)
    print()

    for url, expected in TEST_CASES:

        try:
            result = analyze_url_ml(url)

            prediction = result["prediction"]
            confidence = result["confidence"]

            if prediction == expected:
                status = "PASS"
                passed += 1
            else:
                status = "FAIL"
                failed += 1

            print(status)
            print(f"URL:        {url}")
            print(f"Expected:   {expected}")
            print(f"Predicted:  {prediction}")
            print(f"Confidence: {confidence}")
            print(
                f"Phishing:   "
                f"{result['phishing_score']}"
            )
            print(
                f"Scores:     "
                f"{result['decision_scores']}"
            )
            print("-" * 70)

        except Exception as exc:

            failed += 1

            print("ERROR")
            print(f"URL: {url}")
            print(f"Error: {exc}")
            print("-" * 70)

    total = passed + failed

    print()
    print("=" * 70)
    print("V3 BENCHMARK SUMMARY")
    print("=" * 70)

    print(f"Total:  {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")

    if total:
        accuracy = passed / total
        print(
            f"Accuracy: {accuracy:.2%}"
        )

    print("=" * 70)


if __name__ == "__main__":
    main()