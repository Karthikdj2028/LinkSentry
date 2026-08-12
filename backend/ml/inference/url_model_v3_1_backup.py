"""
LinkSentry V3.1 URL ML Inference Engine

Matches train_url_v3.1.py:

Character TF-IDF
+
23 structural URL features
+
LinearSVC
+
hard-negative training
"""

from pathlib import Path
from urllib.parse import urlparse
import math
import re

import joblib
import numpy as np
from scipy.sparse import csr_matrix, hstack


# ============================================================
# MODEL PATH
# ============================================================

MODEL_PATH = (
    Path(__file__).resolve().parents[1]
    / "models"
    / "url_real_v3_1_classifier.joblib"
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
# ENTROPY
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


# ============================================================
# STRUCTURAL URL FEATURES
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

        sum(
            c.isdigit()
            for c in url
        ),

        sum(
            not c.isalnum()
            and c not in ".-_/?:=&%#"
            for c in url
        ),

        hostname.count("."),

        len([
            x
            for x in path.split("/")
            if x
        ]),

        int(
            lower.startswith("https://")
        ),

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

        int(
            tld in SUSPICIOUS_TLDS
        ),

        keyword_count,
        has_shortener,

        calculate_entropy(url),
        calculate_entropy(hostname),
        calculate_entropy(path),
    ]


# ============================================================
# MODEL
# ============================================================

class URLMLModel:

    def __init__(self):

        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"LinkSentry V3.1 model not found: "
                f"{MODEL_PATH}"
            )

        print(
            f"Loading LinkSentry V3.1 model: "
            f"{MODEL_PATH}"
        )

        package = joblib.load(
            MODEL_PATH
        )

        self.classifier = package[
            "classifier"
        ]

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

        self.model_version = package.get(
            "model_version",
            "V3.1",
        )

        self.model_type = package.get(
            "model_type",
            "Character TF-IDF + structural URL features + LinearSVC",
        )

        self.training_rows = package.get(
            "training_rows"
        )

        self.test_rows = package.get(
            "test_rows"
        )

        self.real_benchmark_accuracy = package.get(
            "real_benchmark_accuracy"
        )

        self.real_benchmark_false_positive_rate = package.get(
            "real_benchmark_false_positive_rate"
        )

        print(
            "V3.1 model loaded successfully."
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
                f"Real benchmark accuracy: "
                f"{self.real_benchmark_accuracy:.4%}"
            )

        if self.real_benchmark_false_positive_rate is not None:
            print(
                f"Real benchmark false-positive rate: "
                f"{self.real_benchmark_false_positive_rate:.4%}"
            )


    # ========================================================
    # FEATURE PIPELINE
    # ========================================================

    def _build_features(
        self,
        url: str,
    ):

        structural = np.asarray(
            [
                extract_url_features(
                    url
                )
            ],
            dtype=np.float32,
        )

        tfidf = self.vectorizer.transform(
            [url]
        )

        structural_sparse = csr_matrix(
            structural
        )

        combined = hstack(
            [
                tfidf,
                structural_sparse,
            ],
            format="csr",
        )

        return combined


    # ========================================================
    # PREDICTION
    # ========================================================

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

        # ----------------------------------------------------
        # V3.1 uses the standard LinearSVC prediction.
        #
        # IMPORTANT:
        # No V2 phishing threshold is applied.
        # ----------------------------------------------------

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
        # Confidence-like normalized score
        #
        # This is NOT a calibrated probability.
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
            class_name: float(
                probability
            )
            for class_name, probability
            in zip(
                self.classes,
                probabilities,
            )
        }

        confidence = confidence_map.get(
            prediction,
            0.0,
        )


        # ----------------------------------------------------
        # Phishing decision score
        # ----------------------------------------------------

        phishing_score = None

        if "phishing" in self.classes:

            phishing_index = (
                self.classes.index(
                    "phishing"
                )
            )

            phishing_score = float(
                scores[
                    phishing_index
                ]
            )


        # ----------------------------------------------------
        # Return
        # ----------------------------------------------------

        return {
            "prediction": str(
                prediction
            ),

            "confidence": round(
                confidence,
                4,
            ),

            "phishing_score": (
                round(
                    phishing_score,
                    6,
                )
                if phishing_score is not None
                else None
            ),

            "decision_scores": {
                key: round(
                    value,
                    6,
                )
                for key, value
                in score_map.items()
            },

            "model_version":
                self.model_version,

            "model_type":
                self.model_type,

            "training_rows":
                self.training_rows,

            "real_benchmark_accuracy":
                self.real_benchmark_accuracy,

            "real_benchmark_false_positive_rate":
                self.real_benchmark_false_positive_rate,
        }


# ============================================================
# SINGLETON
# ============================================================

_model = None


def get_url_ml_model() -> URLMLModel:

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