"""
LinkSentry V3.3 URL ML Inference Engine

V3.1:
    Character TF-IDF
    + 23 structural URL features
    + LinearSVC
    + hard-negative training

V3.2:
    V3.1 ML model
    + Tranco trusted-domain layer
    + trusted-brand impersonation detection

V3.3:
    V3.2
    + typo-squatting detection
    + IP phishing protection
    + suspicious-TLD phishing protection
    + URL-shortener protection
    + suspicious keyword/path fusion
    + improved brand impersonation protection
    + trusted-subdomain protection
    + leetspeak / digit typosquat detection
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
# PROTECTED BRANDS
# ============================================================

PROTECTED_BRANDS = {
    "google.com": "google",
    "amazon.com": "amazon",
    "microsoft.com": "microsoft",
    "apple.com": "apple",
    "facebook.com": "facebook",
    "github.com": "github",
    "linkedin.com": "linkedin",
    "paypal.com": "paypal",
    "instagram.com": "instagram",
    "youtube.com": "youtube",
    "twitter.com": "twitter",
}


# ============================================================
# URL HELPERS
# ============================================================

def calculate_entropy(text: str) -> float:
    """Calculate Shannon entropy."""

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
    Normalize hostname/domain for comparison.

    Removes:
        - whitespace
        - trailing dot
        - leading www.
    """

    domain = str(domain).strip().lower()
    domain = domain.rstrip(".")

    if domain.startswith("www."):
        domain = domain[4:]

    return domain


def get_registrable_domain(hostname: str) -> str:
    """
    Lightweight registrable-domain extraction.

    Examples:

        www.google.com
            -> google.com

        accounts.google.com
            -> google.com

        status.cloud.google.com
            -> google.com

        google.com.evil.xyz
            -> evil.xyz
    """

    hostname = normalize_domain(hostname)

    if not hostname:
        return ""

    parts = hostname.split(".")

    if len(parts) < 2:
        return hostname

    return ".".join(parts[-2:])


def levenshtein_distance(a: str, b: str) -> int:
    """Calculate Levenshtein edit distance."""

    if a == b:
        return 0

    if not a:
        return len(b)

    if not b:
        return len(a)

    previous = list(range(len(b) + 1))

    for i, char_a in enumerate(a, start=1):
        current = [i]

        for j, char_b in enumerate(b, start=1):
            insertion = current[j - 1] + 1
            deletion = previous[j] + 1

            substitution = previous[j - 1] + (
                0 if char_a == char_b else 1
            )

            current.append(
                min(
                    insertion,
                    deletion,
                    substitution,
                )
            )

        previous = current

    return previous[-1]


def normalized_similarity(a: str, b: str) -> float:
    """Return normalized string similarity."""

    if not a or not b:
        return 0.0

    distance = levenshtein_distance(a, b)

    maximum = max(
        len(a),
        len(b),
    )

    if maximum == 0:
        return 1.0

    return 1.0 - (
        distance / maximum
    )


# ============================================================
# LEETSPEAK / TYPOSQUAT NORMALIZATION
# ============================================================

LEET_REPLACEMENTS = {
    "0": "o",
    "1": "l",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "8": "b",
}


def normalize_typosquat_name(name: str) -> str:
    """
    Normalize common digit substitutions used in typosquatting.

    Examples:

        g00gle -> google
        goog1e -> google
        amaz0n -> amazon
        paypa1 -> paypal
        micros0ft -> microsoft
    """

    name = str(name).lower()

    double_replacements = {
        "00": "oo",
        "11": "ll",
        "33": "ee",
        "44": "aa",
        "55": "ss",
        "77": "tt",
        "88": "bb",
    }

    for old, new in double_replacements.items():
        name = name.replace(old, new)

    name = name.translate(
        str.maketrans(LEET_REPLACEMENTS)
    )

    return name


# ============================================================
# TYPOSQUATTING DETECTION
# ============================================================

def looks_like_typosquat(
    hostname: str,
    registrable_domain: str,
    trusted_domains: set,
):
    """
    Detect likely typosquatting.

    A legitimate trusted domain is NEVER considered
    a typosquat.
    """

    hostname = normalize_domain(hostname)

    registrable_domain = normalize_domain(
        registrable_domain
    )

    if not registrable_domain:
        return None

    if registrable_domain in trusted_domains:
        return None

    candidate = registrable_domain

    if "." in candidate:
        candidate_name = candidate.rsplit(
            ".",
            1,
        )[0]
    else:
        candidate_name = candidate

    candidate_name = candidate_name.lower()

    if not candidate_name:
        return None

    best_brand = None
    best_similarity = 0.0

    # --------------------------------------------------------
    # 1. Explicit protected brands
    # --------------------------------------------------------

    for domain, brand in PROTECTED_BRANDS.items():

        trusted_name = domain.rsplit(
            ".",
            1,
        )[0]

        normalized_candidate = (
            normalize_typosquat_name(
                candidate_name
            )
        )

        normalized_trusted = (
            normalize_typosquat_name(
                trusted_name
            )
        )

        # Direct leetspeak match
        if (
            normalized_candidate
            == normalized_trusted
            and candidate_name
            != trusted_name
        ):
            return domain

        # Standard edit distance
        similarity = normalized_similarity(
            candidate_name,
            trusted_name,
        )

        distance = levenshtein_distance(
            candidate_name,
            trusted_name,
        )

        if (
            distance <= 2
            and similarity >= 0.72
            and candidate_name != trusted_name
        ):
            if similarity > best_similarity:
                best_similarity = similarity
                best_brand = domain

    # --------------------------------------------------------
    # 2. Additional trusted-domain comparison
    # --------------------------------------------------------

    if best_brand is None:

        if 4 <= len(candidate_name) <= 20:

            normalized_candidate = (
                normalize_typosquat_name(
                    candidate_name
                )
            )

            for trusted_domain in trusted_domains:

                if "." not in trusted_domain:
                    continue

                trusted_name = trusted_domain.rsplit(
                    ".",
                    1,
                )[0]

                if not (
                    4
                    <= len(trusted_name)
                    <= 20
                ):
                    continue

                normalized_trusted = (
                    normalize_typosquat_name(
                        trusted_name
                    )
                )

                if (
                    normalized_candidate
                    == normalized_trusted
                    and candidate_name
                    != trusted_name
                ):
                    return trusted_domain

                if abs(
                    len(candidate_name)
                    - len(trusted_name)
                ) > 2:
                    continue

                distance = levenshtein_distance(
                    candidate_name,
                    trusted_name,
                )

                similarity = normalized_similarity(
                    candidate_name,
                    trusted_name,
                )

                if (
                    distance <= 1
                    and similarity >= 0.80
                    and candidate_name != trusted_name
                ):
                    if similarity > best_similarity:
                        best_similarity = similarity
                        best_brand = trusted_domain

    return best_brand


# ============================================================
# TRUSTED BRAND IMPERSONATION
# ============================================================

def detect_trusted_brand_impersonation(
    hostname: str,
    registrable_domain: str,
    trusted_domains: set,
):
    """
    Detect trusted-brand impersonation.

    Legitimate:

        accounts.google.com
        login.microsoft.com
        status.cloud.google.com

    Suspicious:

        google.com.evil.xyz
        amazon.com.evil.xyz
        github.com.evil.xyz
        facebook.com.security.xyz
    """

    hostname = normalize_domain(hostname)

    registrable_domain = normalize_domain(
        registrable_domain
    )

    if not hostname or not registrable_domain:
        return None

    # CRITICAL SAFETY RULE:
    # A real trusted registrable domain is legitimate.

    if registrable_domain in trusted_domains:
        return None

    labels = hostname.split(".")

    # --------------------------------------------------------
    # Search hostname for trusted domain strings
    # --------------------------------------------------------

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

            return candidate

    # --------------------------------------------------------
    # Explicit protected-brand detection
    # --------------------------------------------------------

    for domain, brand in PROTECTED_BRANDS.items():

        brand_lower = brand.lower()

        if brand_lower in labels:
            return domain

    return None


# ============================================================
# BRAND DECEPTION IN REGISTRABLE DOMAIN
# ============================================================

def detect_brand_domain_deception(
    registrable_domain: str,
    trusted_domains: set,
):
    """
    Detect protected brands being used directly inside
    a non-trusted registrable domain.

    Examples:

        google-security-alert.com
        google-account-security.com
        google-login-verify.com
        amazon-account-security.com
        microsoft-security-alert.com
        apple-security-verification.com
        paypal-security-alert.com

    Legitimate:

        google.com
        accounts.google.com
        developers.google.com
        status.cloud.google.com
    """

    registrable_domain = normalize_domain(
        registrable_domain
    )

    if not registrable_domain:
        return None

    # Never flag an actual trusted domain.
    if registrable_domain in trusted_domains:
        return None

    # Remove TLD.
    domain_name = registrable_domain.rsplit(
        ".",
        1,
    )[0]

    if not domain_name:
        return None

    # Split domain into tokens.
    tokens = [
        token
        for token in re.split(
            r"[-_.]+",
            domain_name,
        )
        if token
    ]

    for domain, brand in PROTECTED_BRANDS.items():

        brand_lower = brand.lower()

        # Example:
        # google-security-alert
        # amazon-account-security

        if brand_lower in tokens:
            return domain

        # Example:
        # googlelogin
        # amazonverify

        if (
            domain_name.startswith(brand_lower)
            and len(domain_name)
            > len(brand_lower)
        ):
            return domain

    return None


# ============================================================
# STRUCTURAL FEATURES
# ============================================================

def extract_url_features(url: str) -> list:
    """
    Reproduce the V3.1 structural feature pipeline.
    """

    url = str(url).strip()

    try:
        parsed = urlparse(
            url
            if "://" in url
            else "//" + url
        )

        hostname = (
            parsed.hostname
            or ""
        )

        path = (
            parsed.path
            or ""
        )

        query = (
            parsed.query
            or ""
        )

    except Exception:
        hostname = ""
        path = ""
        query = ""

    lower = url.lower()
    hostname_lower = hostname.lower()

    if "." in hostname_lower:
        tld = hostname_lower.rsplit(
            ".",
            1,
        )[-1]
    else:
        tld = ""

    keyword_count = sum(
        keyword in lower
        for keyword in SUSPICIOUS_KEYWORDS
    )

    has_shortener = int(
        hostname_lower in SHORTENERS
        or any(
            hostname_lower.endswith(
                "." + domain
            )
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
            lower.startswith(
                "https://"
            )
        ),

        int(
            bool(
                re.search(
                    r"https?://(?:\d{1,3}\.){3}\d{1,3}",
                    lower,
                )
            )
        ),

        int(
            "@" in url
        ),

        int(
            "%" in url
        ),

        int(
            "xn--"
            in hostname_lower
        ),

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
        "Trusted domains loaded: "
        f"{len(domains):,}"
    )

    return domains


# ============================================================
# MODEL
# ============================================================

class URLMLModel:

    def __init__(self):

        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "LinkSentry V3.1 model not found:\n"
                f"{MODEL_PATH}"
            )

        print(
            "Loading LinkSentry V3.3 model: "
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

        self.model_version = "V3.3"

        self.model_type = (
            "V3.1 LinearSVC + "
            "hard-negative training + "
            "trusted-domain + "
            "typosquatting + "
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
            "V3.3 model loaded successfully."
        )

        print(
            f"Classes: {self.classes}"
        )

        print(
            "TF-IDF features: "
            f"{len(self.vectorizer.vocabulary_)}"
        )

        print(
            "Structural features: "
            f"{len(self.feature_names)}"
        )

        if self.training_rows is not None:
            print(
                "Training rows: "
                f"{self.training_rows}"
            )

        if (
            self.real_benchmark_accuracy
            is not None
        ):
            print(
                "Real benchmark accuracy: "
                f"{self.real_benchmark_accuracy:.2%}"
            )

        if (
            self.real_benchmark_false_positive_rate
            is not None
        ):
            print(
                "Real benchmark false-positive rate: "
                f"{self.real_benchmark_false_positive_rate:.2%}"
            )

    # ========================================================
    # FEATURES
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

        tfidf = (
            self.vectorizer.transform(
                [url]
            )
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

    # ========================================================
    # DOMAIN INFO
    # ========================================================

    def _trusted_domain_info(
        self,
        url: str,
    ):

        try:
            parsed = urlparse(
                url
                if "://" in url
                else "//" + url
            )

            hostname = (
                parsed.hostname
                or ""
            ).lower()

        except Exception:
            hostname = ""

        hostname = normalize_domain(
            hostname
        )

        registrable = (
            get_registrable_domain(
                hostname
            )
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

    # ========================================================
    # SUSPICIOUS SIGNALS
    # ========================================================

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

        if feature_map["has_ip"]:
            signals.append(
                "ip_address"
            )

        if feature_map["has_at_symbol"]:
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

        # ====================================================
        # ML PREDICTION
        # ====================================================

        features = self._build_features(
            url
        )

        prediction = (
            self.classifier.predict(
                features
            )[0]
        )

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

        # ====================================================
        # ML CONFIDENCE
        # ====================================================

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

        ml_prediction = str(
            prediction
        )

        ml_confidence = (
            confidence_map.get(
                ml_prediction,
                0.0,
            )
        )

        # ====================================================
        # DOMAIN INFORMATION
        # ====================================================

        domain_info = (
            self._trusted_domain_info(
                url
            )
        )

        hostname = domain_info[
            "hostname"
        ]

        registrable_domain = (
            domain_info[
                "registrable_domain"
            ]
        )

        trusted_domain = (
            domain_info[
                "trusted"
            ]
        )

        suspicious_signals = (
            self._suspicious_signals(
                url
            )
        )

        # ====================================================
        # TRUSTED-BRAND IMPERSONATION
        # ====================================================

        impersonated_domain = None

        # Never run impersonation detection
        # against an actually trusted domain.

        if not trusted_domain:

            impersonated_domain = (
                detect_trusted_brand_impersonation(
                    hostname,
                    registrable_domain,
                    self.trusted_domains,
                )
            )

        if impersonated_domain:

            if (
                "trusted_brand_impersonation"
                not in suspicious_signals
            ):
                suspicious_signals.append(
                    "trusted_brand_impersonation"
                )

        # ====================================================
        # TYPOSQUATTING
        # ====================================================

        typosquat_domain = None

        if not trusted_domain:

            typosquat_domain = (
                looks_like_typosquat(
                    hostname,
                    registrable_domain,
                    self.trusted_domains,
                )
            )

        if typosquat_domain:

            if (
                "typosquatting"
                not in suspicious_signals
            ):
                suspicious_signals.append(
                    "typosquatting"
                )

        # ====================================================
        # BRAND DOMAIN DECEPTION
        # ====================================================

        brand_domain_deception = None

        if not trusted_domain:

            brand_domain_deception = (
                detect_brand_domain_deception(
                    registrable_domain,
                    self.trusted_domains,
                )
            )

        if brand_domain_deception:

            if (
                "brand_domain_deception"
                not in suspicious_signals
            ):
                suspicious_signals.append(
                    "brand_domain_deception"
                )

        # ====================================================
        # URL FEATURE MAP
        # ====================================================

        url_lower = url.lower()

        feature_values = (
            extract_url_features(
                url
            )
        )

        feature_map = dict(
            zip(
                FEATURE_NAMES,
                feature_values,
            )
        )

        keyword_count = feature_map[
            "keyword_count"
        ]

        suspicious_tld = bool(
            feature_map[
                "suspicious_tld"
            ]
        )

        has_ip = bool(
            feature_map[
                "has_ip"
            ]
        )

        has_shortener = bool(
            feature_map[
                "has_shortener"
            ]
        )

        has_punycode = bool(
            feature_map[
                "has_punycode"
            ]
        )

        # ====================================================
        # PHISHING KEYWORDS
        # ====================================================

        phishing_keywords = {
            "login",
            "signin",
            "verify",
            "verification",
            "account",
            "secure",
            "security",
            "password",
            "credential",
            "bank",
            "banking",
            "wallet",
            "payment",
            "billing",
            "authenticate",
            "authorization",
            "otp",
            "kyc",
            "recover",
            "suspended",
            "alert",
        }

        has_phishing_keyword = any(
            keyword in url_lower
            for keyword in phishing_keywords
        )

        # ====================================================
        # DECISION FUSION
        # ====================================================

        final_prediction = ml_prediction

        trust_override = False
        rule_override = False

        # ====================================================
        # RULE 1
        # TRUSTED BRAND IMPERSONATION
        # ====================================================

        if impersonated_domain:

            final_prediction = "phishing"
            rule_override = True

        # ====================================================
        # RULE 2
        # TYPOSQUATTING
        # ====================================================

        elif typosquat_domain:

            final_prediction = "phishing"
            rule_override = True

        # ====================================================
        # RULE 3
        # IP + PHISHING KEYWORD
        # ====================================================

        elif (
            has_ip
            and has_phishing_keyword
        ):

            final_prediction = "phishing"
            rule_override = True

            if "ip_address" not in suspicious_signals:
                suspicious_signals.append(
                    "ip_address"
                )

            if (
                "ip_with_phishing_keyword"
                not in suspicious_signals
            ):
                suspicious_signals.append(
                    "ip_with_phishing_keyword"
                )

        # ====================================================
        # RULE 4
        # SUSPICIOUS TLD + PHISHING KEYWORD
        # ====================================================

        elif (
            suspicious_tld
            and has_phishing_keyword
        ):

            final_prediction = "phishing"
            rule_override = True

            if (
                "suspicious_tld_phishing_pattern"
                not in suspicious_signals
            ):
                suspicious_signals.append(
                    "suspicious_tld_phishing_pattern"
                )

        # ====================================================
        # RULE 5
        # SUSPICIOUS TLD + MULTIPLE KEYWORDS
        # ====================================================

        elif (
            suspicious_tld
            and keyword_count >= 2
        ):

            final_prediction = "phishing"
            rule_override = True

        # ====================================================
        # RULE 6
        # URL SHORTENER + PHISHING KEYWORD
        # ====================================================

        elif (
            has_shortener
            and has_phishing_keyword
        ):

            final_prediction = "phishing"
            rule_override = True

            if (
                "shortener_with_phishing_keyword"
                not in suspicious_signals
            ):
                suspicious_signals.append(
                    "shortener_with_phishing_keyword"
                )

        # ====================================================
        # RULE 7
        # PUNYCODE + PHISHING KEYWORD
        # ====================================================

        elif (
            has_punycode
            and has_phishing_keyword
        ):

            final_prediction = "phishing"
            rule_override = True

            if (
                "punycode_phishing_pattern"
                not in suspicious_signals
            ):
                suspicious_signals.append(
                    "punycode_phishing_pattern"
                )

        # ====================================================
        # RULE 8
        # PROTECTED BRAND + PHISHING LANGUAGE
        #
        # This is the important fix.
        #
        # Examples:
        #
        # google-security-alert.com
        # google-account-security.com
        # google-login-verify.com
        # microsoft-security-alert.com
        #
        # These are NOT legitimate Google/Microsoft
        # subdomains because their registrable domain is
        # not google.com/microsoft.com.
        # ====================================================

        elif (
            brand_domain_deception
            and has_phishing_keyword
        ):

            final_prediction = "phishing"
            rule_override = True

            if (
                "brand_domain_deception"
                not in suspicious_signals
            ):
                suspicious_signals.append(
                    "brand_domain_deception"
                )

        # ====================================================
        # RULE 9
        # TRUSTED DOMAIN BENIGN OVERRIDE
        # ====================================================

        elif trusted_domain:

            final_prediction = "benign"
            trust_override = True

        # ====================================================
        # STRONG DECEPTION CHECK
        #
        # IMPORTANT:
        # Keep this at the same indentation level as the
        # decision-fusion rules above.
        # ====================================================

        strong_deception = (
            bool(impersonated_domain)
            or bool(typosquat_domain)
            or (
                bool(brand_domain_deception)
                and has_phishing_keyword
            )
            or (
                has_ip
                and has_phishing_keyword
            )
            or (
                suspicious_tld
                and has_phishing_keyword
            )
            or (
                has_shortener
                and has_phishing_keyword
            )
            or (
                has_punycode
                and has_phishing_keyword
            )
        )

        # ====================================================
        # STRONG DECEPTION FINAL OVERRIDE
        # ====================================================

        if strong_deception:

            final_prediction = "phishing"

            trust_override = False
            rule_override = True

        # ====================================================
        # TRUSTED-DOMAIN SAFETY
        #
        # If the registrable domain is trusted and there is
        # no strong deception signal, force benign.
        #
        # Examples:
        #
        # status.cloud.google.com
        # developers.google.com
        # accounts.google.com
        # support.google.com
        #
        # These remain benign.
        # ====================================================

        elif trusted_domain:

            final_prediction = "benign"

            trust_override = True
            rule_override = False

        # ====================================================
        # FINAL CONFIDENCE
        # ====================================================

        if strong_deception:

            final_confidence = max(
                ml_confidence,
                0.98,
            )

        elif trust_override:

            final_confidence = max(
                ml_confidence,
                0.90,
            )

        else:

            final_confidence = (
                ml_confidence
            )

        # ====================================================
        # RESULT
        # ====================================================

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
                ml_confidence,
                4,
            ),

            "trusted_domain": (
                trusted_domain
            ),

            "hostname": (
                hostname
            ),

            "registrable_domain": (
                registrable_domain
            ),

            "trust_override": (
                trust_override
            ),

            "rule_override": (
                rule_override
            ),

            "impersonated_domain": (
                impersonated_domain
            ),

            "typosquat_domain": (
                typosquat_domain
            ),

            "brand_domain_deception": (
                brand_domain_deception
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