"""
LinkSentry V3.2 URL ML Inference Engine

V3.1:
    Character TF-IDF
    + 23 structural URL features
    + LinearSVC
    + hard-negative training

V3.2:
    V3.1 ML model
    + Tranco trusted-domain layer
    + suspicious-domain safety checks

Important:
    Trusted domains are only used for exact registrable-domain matches.
    A trusted domain does NOT trust deceptive subdomains such as:

        google.com.evil.xyz
        github.com.security-check.xyz

The ML model remains responsible for unknown domains.
"""

from pathlib import Path
from urllib.parse import urlparse
import math
import re

import joblib
import numpy as np
from scipy.sparse import csr_matrix, hstack


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[1]

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "url_real_v3_1_classifier.joblib"
)

TRUSTED_DOMAIN_PATH = (
    BASE_DIR
    / "data"
    / "v3_2"
    / "trusted_domains.csv"
)


# ============================================================
# FEATURE DEFINITIONS
# ============================================================

FEATURE_NAMES = [
    "url_length",
    "hostname_length",
    "path_length",
    "query_length",
    "dot_count",
    "hyphen_count",
    "underscore_count",
    "slash_count",
    "digit_count",
    "special_char_count",
    "subdomain_count",
    "path_depth",
    "https",
    "has_ip",
    "has_at_symbol",
    "has_percent_encoding",
    "has_punycode",
    "suspicious_tld",
    "keyword_count",
    "has_shortener",
    "entropy",
    "hostname_entropy",
    "path_entropy",
]


SUSPICIOUS_TLDS = {
    "tk",
    "ml",
    "ga",
    "cf",
    "gq",
    "xyz",
    "top",
    "click",
    "download",
    "zip",
    "review",
    "country",
    "stream",
    "work",
    "party",
    "fit",
    "support",
}


SUSPICIOUS_KEYWORDS = {
    "login",
    "signin",
    "verify",
    "verification",
    "account",
    "secure",
    "security",
    "update",
    "confirm",
    "confirmation",
    "password",
    "credential",
    "bank",
    "banking",
    "wallet",
    "payment",
    "invoice",
    "billing",
    "bonus",
    "free",
    "claim",
    "reward",
    "gift",
    "unlock",
    "suspended",
    "urgent",
    "alert",
    "authenticate",
    "authorization",
    "recover",
    "otp",
    "kyc",
    "refund",
    "tax",
}


SHORTENERS = {
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "ow.ly",
    "is.gd",
    "buff.ly",
    "cutt.ly",
    "shorturl.at",
    "rebrand.ly",
    "rb.gy",
}


# ============================================================
# URL HELPERS
# ============================================================

def calculate_entropy(text: str) -> float:
    if not text:
        return 0.0

    counts = {}

    for char in text:
        counts[char] = counts.get(char, 0) + 1

    length = len(text)

    return -sum(
        (count / length) * math.log2(count / length)
        for count in counts.values()
    )


def normalize_domain(domain: str) -> str:
    """
    Normalize a hostname for exact trusted-domain comparison.
    """

    domain = str(domain).strip().lower()

    # Remove trailing dot.
    domain = domain.rstrip(".")

    # Remove leading www.
    if domain.startswith("www."):
        domain = domain[4:]

    return domain


def get_registrable_domain(hostname: str) -> str:
    """
    Lightweight registrable-domain extraction.

    Examples:

        www.google.com
            -> google.com

        login.accounts.google.com
            -> google.com

        google.com.evil.xyz
            -> evil.xyz

    This intentionally avoids trusting arbitrary subdomains.
    """

    hostname = normalize_domain(hostname)

    if not hostname:
        return ""

    parts = hostname.split(".")

    if len(parts) < 2:
        return hostname

    return ".".join(parts[-2:])

def detect_trusted_brand_impersonation(
    hostname: str,
    registrable_domain: str,
    trusted_domains: set,
):
    """
    Detect trusted-brand impersonation in the hostname.

    Legitimate:
        accounts.google.com
        login.microsoft.com
        github.com

    Suspicious:
        google.com.evil.xyz
        amazon.com.evil.xyz
        github.com.evil.xyz
        facebook.com.security.xyz

    The trusted domain must appear as complete hostname
    labels, and the actual registrable domain must be
    different.
    """

    hostname = normalize_domain(hostname)
    registrable_domain = normalize_domain(
        registrable_domain
    )

    if not hostname or not registrable_domain:
        return None

    labels = hostname.split(".")

    # Check every possible multi-label hostname component.
    #
    # Example:
    # google.com.evil.xyz
    #
    # candidates:
    # google.com
    # google.com.evil
    # com.evil
    # evil.xyz
    #
    # We only care about candidates that are trusted domains.

    for start in range(len(labels)):
        for end in range(
            start + 2,
            len(labels) + 1,
        ):
            candidate = ".".join(
                labels[start:end]
            )

            if candidate not in trusted_domains:
                continue

            # Legitimate subdomain:
            # accounts.google.com -> candidate = google.com, registrable = google.com
            # Therefore this is NOT impersonation.
            if registrable_domain == candidate:
                return None

            # Trusted brand appears inside a different registrable domain:
            # google.com.evil.xyz -> candidate = google.com, registrable = evil.xyz
            # Therefore this IS impersonation.
            return candidate

    # Check for brand deceptive domain compositions
    # e.g. google-security-alert.com, paypal-update-account.com
    brand_keywords = {
        "security", "alert", "login", "verify", "account", "support",
        "update", "auth", "portal", "service", "signin", "banking", "help"
    }
    
    protected_brands = {
        "google": "google.com",
        "microsoft": "microsoft.com",
        "apple": "apple.com",
        "paypal": "paypal.com",
        "amazon": "amazon.com",
        "netflix": "netflix.com",
        "chase": "chase.com",
        "wellsfargo": "wellsfargo.com",
        "bankofamerica": "bankofamerica.com",
        "meta": "meta.com",
        "facebook": "facebook.com",
        "instagram": "instagram.com",
        "whatsapp": "whatsapp.com",
        "binance": "binance.com",
        "coinbase": "coinbase.com",
        "github": "github.com",
    }

    first_label = labels[0] if labels else ""
    for brand, canonical_domain in protected_brands.items():
        if registrable_domain == canonical_domain:
            continue
        if brand in first_label:
            # If label has brand name and a hyphen or keyword
            has_brand_split = (
                first_label.startswith(f"{brand}-") or
                first_label.endswith(f"-{brand}") or
                f"-{brand}-" in first_label or
                any(kw in first_label for kw in brand_keywords)
            )
            if has_brand_split:
                return canonical_domain

    return None

# ============================================================
# STRUCTURAL FEATURES
# ============================================================

def extract_url_features(url: str) -> list:

    url = str(url).strip()

    try:
        parsed = urlparse(
            url if "://" in url else "//" + url
        )

        hostname = parsed.hostname or ""
        path = parsed.path or ""
        query = parsed.query or ""

    except Exception:
        hostname = ""
        path = ""
        query = ""

    lower = url.lower()
    hostname_lower = hostname.lower()

    if "." in hostname_lower:
        tld = hostname_lower.rsplit(".", 1)[-1]
    else:
        tld = ""

    keyword_count = sum(
        keyword in lower
        for keyword in SUSPICIOUS_KEYWORDS
    )

    has_shortener = int(
        hostname_lower in SHORTENERS
        or any(
            hostname_lower.endswith("." + domain)
            for domain in SHORTENERS
        )
    )

    return [
        len(url),
        len(hostname),
        len(path),
        len(query),

        url.count("."),
        url.count("-"),
        url.count("_"),
        url.count("/"),

        sum(c.isdigit() for c in url),

        sum(
            not c.isalnum()
            and c not in ".-_/?:=&%#"
            for c in url
        ),

        hostname.count("."),
        len([
            x for x in path.split("/")
            if x
        ]),

        int(lower.startswith("https://")),

        int(
            bool(
                re.search(
                    r"https?://(?:\d{1,3}\.){3}\d{1,3}",
                    lower,
                )
            )
        ),

        int("@" in url),
        int("%" in url),
        int("xn--" in hostname_lower),

        int(tld in SUSPICIOUS_TLDS),

        keyword_count,
        has_shortener,

        calculate_entropy(url),
        calculate_entropy(hostname),
        calculate_entropy(path),
    ]


# ============================================================
# TRUSTED DOMAIN DATABASE
# ============================================================

def load_trusted_domains():

    if not TRUSTED_DOMAIN_PATH.exists():
        raise FileNotFoundError(
            "V3.2 trusted-domain database not found:\n"
            f"{TRUSTED_DOMAIN_PATH}"
        )

    import pandas as pd

    df = pd.read_csv(
        TRUSTED_DOMAIN_PATH
    )

    if "domain" not in df.columns:
        raise ValueError(
            "Trusted-domain CSV must contain "
            "a 'domain' column."
        )

    domains = {
        normalize_domain(domain)
        for domain in df["domain"]
        if str(domain).strip()
    }

    print(
        f"Trusted domains loaded: {len(domains):,}"
    )

    return domains


# ============================================================
# V3.2 MODEL
# ============================================================

class URLMLModel:

    def __init__(self):

        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "LinkSentry V3.1 model not found:\n"
                f"{MODEL_PATH}"
            )

        print(
            f"Loading LinkSentry V3.2 model: "
            f"{MODEL_PATH}"
        )

        package = joblib.load(
            MODEL_PATH
        )

        self.classifier = package["classifier"]

        self.vectorizer = package[
            "vectorizer"
        ]

        self.feature_names = package.get(
            "feature_names",
            FEATURE_NAMES,
        )

        self.classes = list(
            package.get(
                "classes",
                self.classifier.classes_,
            )
        )

        self.model_version = "V3.3"

        self.model_type = (
            "LinkSentry V3.3 LinearSVC + "
            "hard-negative training + "
            "decision-fusion layer"
        )

        self.trusted_domains = (
            load_trusted_domains()
        )

        self.training_rows = package.get(
            "training_rows"
        )

        self.real_benchmark_accuracy = (
            package.get(
                "real_benchmark_accuracy"
            )
        )

        self.real_benchmark_false_positive_rate = (
            package.get(
                "real_benchmark_false_positive_rate"
            )
        )

        print(
            "V3.2 model loaded successfully."
        )

        print(
            f"Classes: {self.classes}"
        )

        print(
            f"TF-IDF features: "
            f"{len(self.vectorizer.vocabulary_)}"
        )

        print(
            f"Structural features: "
            f"{len(self.feature_names)}"
        )

        if self.training_rows is not None:
            print(
                f"Training rows: "
                f"{self.training_rows}"
            )

        if self.real_benchmark_accuracy is not None:
            print(
                "Real benchmark accuracy: "
                f"{self.real_benchmark_accuracy:.2%}"
            )

        if self.real_benchmark_false_positive_rate is not None:
            print(
                "Real benchmark false-positive rate: "
                f"{self.real_benchmark_false_positive_rate:.2%}"
            )

    # --------------------------------------------------------
    # FEATURES
    # --------------------------------------------------------

    def _build_features(
        self,
        url: str,
    ):

        structural = np.asarray(
            [
                extract_url_features(url)
            ],
            dtype=np.float32,
        )

        tfidf = self.vectorizer.transform(
            [url]
        )

        structural_sparse = csr_matrix(
            structural
        )

        return hstack(
            [
                tfidf,
                structural_sparse,
            ],
            format="csr",
        )

    # --------------------------------------------------------
    # TRUSTED DOMAIN CHECK
    # --------------------------------------------------------

    def _trusted_domain_info(
        self,
        url: str,
    ):

        try:
            parsed = urlparse(
                url if "://" in url else "//" + url
            )

            hostname = (
                parsed.hostname or ""
            ).lower()

        except Exception:
            hostname = ""

        hostname = normalize_domain(
            hostname
        )

        registrable = get_registrable_domain(
            hostname
        )

        trusted = (
            registrable
            in self.trusted_domains
        )

        return {
            "hostname": hostname,
            "registrable_domain": registrable,
            "trusted": trusted,
        }

    # --------------------------------------------------------
    # SUSPICIOUS SIGNALS
    # --------------------------------------------------------

    def _suspicious_signals(
        self,
        url: str,
    ):

        features = extract_url_features(
            url
        )

        feature_map = dict(
            zip(
                FEATURE_NAMES,
                features,
            )
        )

        signals = []

        if feature_map[
            "has_ip"
        ]:
            signals.append(
                "ip_address"
            )

        if feature_map[
            "has_at_symbol"
        ]:
            signals.append(
                "at_symbol"
            )

        if feature_map[
            "has_percent_encoding"
        ]:
            signals.append(
                "percent_encoding"
            )

        if feature_map[
            "has_punycode"
        ]:
            signals.append(
                "punycode"
            )

        if feature_map[
            "suspicious_tld"
        ]:
            signals.append(
                "suspicious_tld"
            )

        if feature_map[
            "has_shortener"
        ]:
            signals.append(
                "url_shortener"
            )

        if feature_map[
            "keyword_count"
        ] >= 3:
            signals.append(
                "multiple_suspicious_keywords"
            )

        return signals

    # --------------------------------------------------------
    # PREDICTION
    # --------------------------------------------------------

    def predict(
        self,
        url: str,
    ) -> dict:

        url = str(url).strip()

        if not url:
            raise ValueError(
                "URL cannot be empty."
            )

        features = self._build_features(
            url
        )

        prediction = self.classifier.predict(
            features
        )[0]

        decision_scores = (
            self.classifier.decision_function(
                features
            )
        )

        if decision_scores.ndim == 1:
            decision_scores = (
                decision_scores.reshape(
                    1,
                    -1,
                )
            )

        scores = decision_scores[0]

        score_map = {
            class_name: float(score)
            for class_name, score in zip(
                self.classes,
                scores,
            )
        }

        # ----------------------------------------------------
        # Confidence-like score
        # ----------------------------------------------------

        max_score = float(
            np.max(scores)
        )

        exp_scores = np.exp(
            np.clip(
                scores - max_score,
                -50,
                50,
            )
        )

        probabilities = (
            exp_scores
            / np.sum(exp_scores)
        )

        confidence_map = {
            class_name: float(probability)
            for class_name, probability in zip(
                self.classes,
                probabilities,
            )
        }

        confidence = confidence_map.get(
            prediction,
            0.0,
        )

        # ----------------------------------------------------
        # Trusted domain layer
        # ----------------------------------------------------

        domain_info = (
            self._trusted_domain_info(
                url
            )
        )

        suspicious_signals = (
            self._suspicious_signals(
                url
            )
        )

        # ----------------------------------------------------
        # Trusted-brand impersonation detection
        # ----------------------------------------------------

        impersonated_domain = (
            detect_trusted_brand_impersonation(
                domain_info["hostname"],
                domain_info["registrable_domain"],
                self.trusted_domains,
            )
        )

        if impersonated_domain:
            suspicious_signals.append(
                "trusted_brand_impersonation"
            )

        # ----------------------------------------------------
        # Final prediction
        # ----------------------------------------------------

        ml_prediction = str(
            prediction
        )

        final_prediction = ml_prediction

        trust_override = False

        # A trusted brand appearing inside a different
        # registrable domain is a phishing indicator.
        #
        # Example:
        # google.com.evil.xyz
        # paypal.com.security-check.xyz

        if impersonated_domain:
            final_prediction = "phishing"

        # ----------------------------------------------------
        # Strong suspicion detection
        # ----------------------------------------------------

        strong_suspicion = (
            "ip_address"
            in suspicious_signals

            or "at_symbol"
            in suspicious_signals

            or "punycode"
            in suspicious_signals

            or "url_shortener"
            in suspicious_signals

            or "multiple_suspicious_keywords"
            in suspicious_signals

            or "trusted_brand_impersonation"
            in suspicious_signals
        )

        # ----------------------------------------------------
        # Trusted-domain benign override
        # ----------------------------------------------------

        if (
            domain_info["trusted"]
            and not strong_suspicion
        ):

            final_prediction = (
                "benign"
            )

            trust_override = True

        # ----------------------------------------------------
        # Final confidence
        # ----------------------------------------------------

        if impersonated_domain:

            final_confidence = max(
                confidence,
                0.98,
            )

        elif trust_override:

            final_confidence = max(
                confidence,
                0.90,
            )

        else:

            final_confidence = confidence

        # ----------------------------------------------------
        # Result
        # ----------------------------------------------------

        return {
            "prediction": str(
                final_prediction
            ),

            "ml_prediction": (
                ml_prediction
            ),

            "confidence": round(
                final_confidence,
                4,
            ),

            "ml_confidence": round(
                confidence,
                4,
            ),

            "trusted_domain": (
                domain_info["trusted"]
            ),

            "hostname": (
                domain_info["hostname"]
            ),

            "registrable_domain": (
                domain_info[
                    "registrable_domain"
                ]
            ),

            "trust_override": (
                trust_override
            ),

            "impersonated_domain": (
                impersonated_domain
            ),

            "suspicious_signals": (
                suspicious_signals
            ),

            "decision_scores": {
                key: round(
                    value,
                    6,
                )
                for key, value in score_map.items()
            },

            "model_version": (
                self.model_version
            ),

            "model_type": (
                self.model_type
            ),

            "training_rows": (
                self.training_rows
            ),

            "real_benchmark_accuracy": (
                self.real_benchmark_accuracy
            ),

            "real_benchmark_false_positive_rate": (
                self.real_benchmark_false_positive_rate
            ),
        }


# ============================================================
# SINGLETON API
# ============================================================

_model = None


def get_url_ml_model():

    global _model

    if _model is None:
        _model = URLMLModel()

    return _model


def analyze_url_ml(
    url: str,
) -> dict:

    return get_url_ml_model().predict(
        url
    )