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


TWO_PART_TLD_SUFFIXES = {
    "co.uk", "co.in", "com.au", "co.jp", "com.br", "co.za", "co.nz", "com.mx",
    "co.id", "com.tr", "com.pk", "com.eg", "com.sa", "com.ar", "com.co", "com.ph",
    "com.ng", "com.vn", "com.hk", "co.th", "com.my", "com.tw", "org.uk", "gov.in",
    "edu.au", "gov.uk", "ac.uk", "net.au", "org.in", "net.in", "ac.in", "gov.au"
}


def get_registrable_domain(hostname: str) -> str:
    """
    Lightweight registrable-domain extraction supporting standard and multi-part ccTLDs.

    Examples:
        www.google.com -> google.com
        login.accounts.google.com -> google.com
        www.google.co.in -> google.co.in
        www.amazon.co.uk -> amazon.co.uk
        google.com.evil.xyz -> evil.xyz
    """
    hostname = normalize_domain(hostname)
    if not hostname:
        return ""

    parts = hostname.split(".")
    if len(parts) < 2:
        return hostname

    # Check for known 2-part ccTLDs (e.g. .co.in, .co.uk)
    if len(parts) >= 3:
        two_part_tld = f"{parts[-2]}.{parts[-1]}"
        if two_part_tld in TWO_PART_TLD_SUFFIXES or (
            parts[-2] in {"co", "com", "org", "gov", "edu", "net", "ac"} and len(parts[-1]) == 2
        ):
            return ".".join(parts[-3:])

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
        google.co.in

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
    registrable_domain = normalize_domain(registrable_domain)

    if not hostname or not registrable_domain:
        return None

    labels = hostname.split(".")

    for start in range(len(labels)):
        for end in range(
            start + 2,
            len(labels) + 1,
        ):
            candidate = ".".join(labels[start:end])

            if candidate not in trusted_domains:
                continue

            # Legitimate domain or legitimate subdomain:
            # accounts.google.com -> candidate = google.com, registrable = google.com
            # google.co.in -> candidate = google.co.in, registrable = google.co.in
            if (
                registrable_domain == candidate
                or hostname == candidate
                or hostname.endswith("." + candidate)
            ):
                return None

            # Trusted brand appears inside a different registrable domain:
            # google.com.evil.xyz -> candidate = google.com, registrable = evil.xyz
            return candidate

    # Check for brand deceptive domain compositions
    # e.g. google-security-alert.com, paypal-update-account.com
    brand_keywords = {
        "security", "alert", "login", "verify", "account", "support",
        "update", "auth", "portal", "service", "signin", "banking", "help"
    }

    first_label = labels[0] if labels else ""
    for brand, canonical_domain in PROTECTED_BRANDS.items():
        if registrable_domain == canonical_domain:
            continue
        known_family = LEGITIMATE_BRAND_DOMAINS.get(brand, set())
        if registrable_domain in known_family or any(registrable_domain.endswith("." + kd) for kd in known_family):
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


def _levenshtein_distance(s1: str, s2: str) -> int:
    """Calculates Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


PROTECTED_BRANDS = {
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

LEGITIMATE_BRAND_DOMAINS: dict[str, set[str]] = {
    "google": {
        "google.com", "google.co.in", "google.co.uk", "google.ca", "google.de",
        "google.fr", "google.it", "google.es", "google.nl", "google.com.au",
        "google.com.br", "google.co.jp", "google.ru", "google.com.mx",
        "google.co.id", "google.com.tr", "google.pl", "google.com.pk",
        "google.com.eg", "google.com.sa", "google.co.za", "google.com.ar",
        "google.com.co", "google.com.ph", "google.com.ng", "google.com.vn",
        "google.ch", "google.se", "google.be", "google.at", "google.cz",
        "google.pt", "google.gr", "google.ro", "google.hu", "google.dk",
        "google.fi", "google.no", "google.ie", "google.co.nz", "google.sg",
        "google.com.hk", "google.co.th", "google.com.my", "google.com.tw",
        "googlevideo.com", "googleusercontent.com", "gstatic.com", "googleapis.com",
        "youtube.com", "youtu.be", "gmail.com", "android.com"
    },
    "amazon": {
        "amazon.com", "amazon.in", "amazon.co.uk", "amazon.de", "amazon.fr",
        "amazon.it", "amazon.es", "amazon.ca", "amazon.com.au", "amazon.com.br",
        "amazon.co.jp", "amazon.com.mx", "amazon.nl", "amazon.pl", "amazon.se",
        "amazon.com.tr", "amazon.ae", "amazon.sa", "amazon.sg", "amazon.eg",
        "amazonaws.com", "media-amazon.com", "ssl-images-amazon.com", "primevideo.com"
    },
    "microsoft": {
        "microsoft.com", "microsoftonline.com", "live.com", "office.com",
        "office365.com", "outlook.com", "azure.com", "bing.com", "msn.com",
        "windows.com", "xbox.com", "skype.com", "visualstudio.com",
        "microsoft.co.uk", "microsoft.de", "microsoft.fr", "microsoft.in"
    },
    "apple": {
        "apple.com", "icloud.com", "apple.co.uk", "apple.de", "apple.fr",
        "apple.it", "apple.es", "apple.ca", "apple.com.au", "apple.co.jp",
        "apple.in", "mzstatic.com", "apple-dns.net"
    },
    "paypal": {
        "paypal.com", "paypal.me", "paypal-community.com", "paypal.co.uk",
        "paypal.de", "paypal.fr", "paypal.it", "paypal.es", "paypal.ca",
        "paypal.com.au", "paypal.in"
    },
    "meta": {
        "meta.com", "about.meta.com", "metacareers.com"
    },
    "facebook": {
        "facebook.com", "fb.com", "fbcdn.net", "messenger.com"
    },
    "instagram": {
        "instagram.com", "cdninstagram.com"
    },
    "whatsapp": {
        "whatsapp.com", "whatsapp.net"
    },
    "netflix": {
        "netflix.com", "nflxext.com", "nflximg.net", "nflxvideo.net"
    },
    "github": {
        "github.com", "github.io", "githubusercontent.com", "githubassets.com"
    },
    "linkedin": {
        "linkedin.com", "licdn.com"
    },
    "chase": {
        "chase.com"
    },
    "wellsfargo": {
        "wellsfargo.com"
    },
    "bankofamerica": {
        "bankofamerica.com", "bofa.com"
    },
    "binance": {
        "binance.com", "binance.us", "binance.me", "binance.org"
    },
    "coinbase": {
        "coinbase.com", "coinbase.net"
    }
}


def detect_typosquatting_domain(
    registrable_domain: str,
    trusted_domains: set | None = None
) -> tuple[str | None, str | None]:
    """
    Evidence-based detection of typosquatting, character omissions, or homoglyphs
    resembling known protected brands.
    Returns (canonical_brand_domain, brand_name) or (None, None).
    """
    if not registrable_domain or "." not in registrable_domain:
        return None, None

    clean_domain = normalize_domain(registrable_domain)

    # 1. If clean_domain is already in the trusted domain database, it's not a typosquat
    if trusted_domains is not None and clean_domain in trusted_domains:
        return None, None

    domain_base = clean_domain.split(".")[0].lower()

    HOMOGLYPH_MAP = {
        '0': 'o', '1': 'l', 'i': 'l', '5': 's', '8': 'b',
        'vv': 'w', 'rn': 'm', 'cl': 'd'
    }

    homo_base = domain_base
    for k, v in HOMOGLYPH_MAP.items():
        homo_base = homo_base.replace(k, v)

    for brand, canonical_domain in PROTECTED_BRANDS.items():
        # Check canonical domain
        if clean_domain == canonical_domain or clean_domain.endswith("." + canonical_domain):
            continue

        # Check known legitimate brand domain family
        known_family = LEGITIMATE_BRAND_DOMAINS.get(brand, set())
        if clean_domain in known_family or any(clean_domain.endswith("." + kd) for kd in known_family):
            continue

        # If domain_base is EXACTLY the brand name (e.g. amazon on amazon.in or google on google.co.in)
        # This is a regional/ccTLD brand use, NOT a spelling mistake / typosquat.
        if domain_base == brand:
            continue

        # 1. Homoglyph substitution match (e.g. micros0ft, app1e, paypa1, g00gle)
        if homo_base == brand and domain_base != brand:
            return canonical_domain, brand

        # 2. Levenshtein edit distance check (typo / missing letter e.g. ggle vs google, gooogle vs google, goolge vs google)
        dist = _levenshtein_distance(domain_base, brand)
        if 1 <= dist <= 2:
            if len(brand) >= 5 and abs(len(domain_base) - len(brand)) <= 2:
                if domain_base[0] == brand[0] and domain_base[-1] == brand[-1]:
                    return canonical_domain, brand
            elif len(brand) < 5 and dist == 1:
                return canonical_domain, brand

    return None, None

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

        self.model_version = "V3.4"

        self.model_type = (
            "LinkSentry V3.4 LinearSVC + "
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

        is_brand_legit = any(
            registrable in family
            or hostname in family
            or any(hostname.endswith("." + d) for d in family)
            for family in LEGITIMATE_BRAND_DOMAINS.values()
        )

        trusted = (
            registrable in self.trusted_domains
            or hostname in self.trusted_domains
            or is_brand_legit
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
        # Typosquatting / brand similarity detection
        # ----------------------------------------------------

        typosquat_domain, potential_brand = (
            detect_typosquatting_domain(
                domain_info["registrable_domain"],
                self.trusted_domains,
            )
        )

        if typosquat_domain:
            suspicious_signals.append(
                "typosquatting_brand"
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

            "typosquat_domain": (
                typosquat_domain
            ),

            "potential_brand": (
                potential_brand
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
