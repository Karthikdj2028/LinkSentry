from ml.inference.url_model import analyze_url_ml


TEST_CASES = [
    # SAFE
    ("https://www.google.com", "safe"),
    ("https://www.microsoft.com", "safe"),
    ("https://www.apple.com", "safe"),
    ("https://www.amazon.com", "safe"),
    ("https://github.com", "safe"),
    ("https://www.linkedin.com", "safe"),
    ("https://www.wikipedia.org", "safe"),
    ("https://www.python.org", "safe"),
    ("https://www.mozilla.org", "safe"),
    ("https://www.cloudflare.com", "safe"),

    # PHISHING
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


correct = 0

print("=" * 75)
print("LINKSENTRY V2 URL MODEL BENCHMARK")
print("=" * 75)

for url, expected in TEST_CASES:
    result = analyze_url_ml(url)

    prediction = result["prediction"]
    confidence = result["confidence"]

    passed = prediction == expected

    if passed:
        correct += 1

    status = "PASS" if passed else "FAIL"

    print()
    print(status)
    print("URL:       ", url)
    print("Expected:  ", expected)
    print("Predicted: ", prediction)
    print("Confidence:", confidence)
    print("Scores:    ", result["decision_scores"])

print()
print("=" * 75)

accuracy = correct / len(TEST_CASES)

print(
    f"Benchmark accuracy: "
    f"{correct}/{len(TEST_CASES)} "
    f"({accuracy * 100:.2f}%)"
)

print("=" * 75)