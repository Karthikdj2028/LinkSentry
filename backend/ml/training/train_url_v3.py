import os
import math
import random
import re

import joblib
import numpy as np
import pandas as pd

from urllib.parse import urlparse

from scipy.sparse import csr_matrix, hstack

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.svm import LinearSVC
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)


# ============================================================
# CONFIG
# ============================================================

RANDOM_STATE = 42

BASE_DIR = os.path.dirname(__file__)

DATA_DIR = os.path.abspath(
    os.path.join(BASE_DIR, "..", "data")
)

MODEL_DIR = os.path.abspath(
    os.path.join(BASE_DIR, "..", "models")
)

REAL_DATASET = os.path.join(
    DATA_DIR,
    "url_dataset_real_clean.csv"
)

HARD_NEGATIVE_DATASET = os.path.join(
    DATA_DIR,
    "v3_benign_hard_negatives.csv"
)

TRANCO_DATASET = os.path.join(
    DATA_DIR,
    "tranco_top1m.csv"
)

OUTPUT_MODEL = os.path.join(
    MODEL_DIR,
    "url_real_v3_classifier.joblib"
)

REAL_BENCHMARK_OUTPUT = os.path.join(
    DATA_DIR,
    "v3_unseen_benign_benchmark.csv"
)


# Target training sizes
TARGETS = {
    "benign_hard": 100_000,
    "benign_original": 75_000,
    "phishing": 75_000,
    "malware": 23_645,
    "defacement": 30_000,
}

REAL_BENCHMARK_DOMAINS = 10_000

TFIDF_MAX_FEATURES = 20_000


# ============================================================
# FEATURE DEFINITIONS
# ============================================================

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


# ============================================================
# HELPERS
# ============================================================

def calculate_entropy(text):
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


def extract_url_features(url):
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


def normalize_domain(domain):
    domain = str(domain).strip().lower()

    domain = domain.replace(
        "https://",
        ""
    ).replace(
        "http://",
        ""
    )

    domain = domain.split("/")[0]

    return domain


def extract_domain(url):
    try:
        parsed = urlparse(
            url if "://" in str(url)
            else "//" + str(url)
        )

        return normalize_domain(
            parsed.hostname or ""
        )

    except Exception:
        return ""


def sample_class(df, label, count):
    subset = df[
        df["type"] == label
    ]

    if len(subset) < count:
        raise ValueError(
            f"Not enough {label} samples. "
            f"Requested {count:,}, "
            f"available {len(subset):,}"
        )

    return subset.sample(
        n=count,
        random_state=RANDOM_STATE
    )


# ============================================================
# HEADER
# ============================================================

print("=" * 75)
print("LinkSentry URL ML V3")
print("Hard Negatives + Domain-Level Evaluation")
print("=" * 75)


# ============================================================
# LOAD ORIGINAL DATA
# ============================================================

print("\nLoading original real-world dataset...")

real_df = pd.read_csv(
    REAL_DATASET,
    usecols=["url", "type"]
)

real_df = real_df.dropna(
    subset=["url", "type"]
)

real_df["url"] = (
    real_df["url"]
    .astype(str)
    .str.strip()
)

real_df["type"] = (
    real_df["type"]
    .astype(str)
    .str.strip()
    .str.lower()
)

real_df = real_df[
    real_df["url"] != ""
]

real_df = real_df.drop_duplicates(
    subset=["url"]
)

print(
    f"Original clean rows: "
    f"{len(real_df):,}"
)

print("\nOriginal classes:")
print(
    real_df["type"].value_counts()
)


# ============================================================
# LOAD HARD NEGATIVES
# ============================================================

print("\nLoading V3 hard-negative dataset...")

hard_df = pd.read_csv(
    HARD_NEGATIVE_DATASET,
    usecols=["url", "type"]
)

hard_df = hard_df.dropna(
    subset=["url"]
)

hard_df["url"] = (
    hard_df["url"]
    .astype(str)
    .str.strip()
)

hard_df["type"] = "benign"

hard_df = hard_df[
    hard_df["url"] != ""
]

hard_df = hard_df.drop_duplicates(
    subset=["url"]
)

hard_df["domain"] = hard_df[
    "url"
].map(extract_domain)

hard_domains = set(
    hard_df["domain"]
)

print(
    f"Hard-negative rows: "
    f"{len(hard_df):,}"
)

print(
    f"Hard-negative domains: "
    f"{len(hard_domains):,}"
)


# ============================================================
# PREVENT DOMAIN LEAKAGE
# ============================================================

print("\nRemoving original benign domains that overlap")
print("with hard-negative training domains...")

real_df["domain"] = real_df[
    "url"
].map(extract_domain)

benign_original = real_df[
    real_df["type"] == "benign"
].copy()

before = len(benign_original)

benign_original = benign_original[
    ~benign_original["domain"].isin(
        hard_domains
    )
]

after = len(benign_original)

print(
    f"Original benign before: {before:,}"
)

print(
    f"Original benign after:  {after:,}"
)

print(
    f"Removed overlapping rows: "
    f"{before - after:,}"
)


# ============================================================
# SAMPLE TRAINING CLASSES
# ============================================================

print("\nSampling V3 training data...")

hard_train = sample_class(
    hard_df.assign(type="benign_hard"),
    "benign_hard",
    TARGETS["benign_hard"],
)

original_benign_train = benign_original.sample(
    n=TARGETS["benign_original"],
    random_state=RANDOM_STATE
).copy()

phishing_train = sample_class(
    real_df,
    "phishing",
    TARGETS["phishing"],
)

malware_train = sample_class(
    real_df,
    "malware",
    TARGETS["malware"],
)

defacement_train = sample_class(
    real_df,
    "defacement",
    TARGETS["defacement"],
)


# Remove helper columns
for frame in [
    hard_train,
    original_benign_train,
    phishing_train,
    malware_train,
    defacement_train,
]:
    if "domain" in frame.columns:
        frame.drop(
            columns=["domain"],
            inplace=True
        )


# Normalize labels
hard_train["type"] = "benign"
original_benign_train["type"] = "benign"


training_df = pd.concat(
    [
        hard_train,
        original_benign_train,
        phishing_train,
        malware_train,
        defacement_train,
    ],
    ignore_index=True
)

training_df = training_df.sample(
    frac=1,
    random_state=RANDOM_STATE
).reset_index(drop=True)


print(
    f"\nTotal V3 training candidates: "
    f"{len(training_df):,}"
)

print("\nClass distribution:")
print(
    training_df["type"].value_counts()
)


# ============================================================
# CREATE UNSEEN REAL-WORLD BENIGN BENCHMARK
# ============================================================

print("\nPreparing unseen-domain real-world benchmark...")

tranco = pd.read_csv(
    TRANCO_DATASET,
    header=None,
    names=["rank", "domain"],
    usecols=[0, 1],
)

tranco["domain"] = (
    tranco["domain"]
    .astype(str)
    .map(normalize_domain)
)

tranco = tranco.dropna(
    subset=["domain"]
)

tranco = tranco.drop_duplicates(
    subset=["domain"]
)


# Domains already used in hard-negative training
used_domains = set(
    hard_domains
)

# Domains present in original benign training
used_domains.update(
    set(
        original_benign_train["url"]
        .map(extract_domain)
    )
)

# Also exclude domains from phishing/malware/defacement
# so benchmark domains are independent.
for frame in [
    phishing_train,
    malware_train,
    defacement_train,
]:
    used_domains.update(
        set(
            frame["url"]
            .map(extract_domain)
        )
    )


candidate_domains = tranco[
    ~tranco["domain"].isin(
        used_domains
    )
].copy()


if len(candidate_domains) < REAL_BENCHMARK_DOMAINS:
    raise RuntimeError(
        "Not enough unseen Tranco domains "
        "for the real-world benchmark."
    )


benchmark_domains = candidate_domains.sample(
    n=REAL_BENCHMARK_DOMAINS,
    random_state=RANDOM_STATE
)["domain"].tolist()


# Generate one realistic URL per unseen domain.
benchmark_urls = []

benchmark_paths = [
    "/",
    "/login",
    "/account",
    "/support",
    "/search?q=test",
    "/products/item123",
    "/download/file.pdf",
    "/user/profile",
]


for domain in benchmark_domains:

    path = random.Random(
        RANDOM_STATE + hash(domain)
    ).choice(
        benchmark_paths
    )

    prefix = (
        "www."
        if random.Random(
            RANDOM_STATE + len(domain)
        ).random() > 0.5
        else ""
    )

    benchmark_urls.append(
        f"https://{prefix}{domain}{path}"
    )


benchmark_df = pd.DataFrame(
    {
        "url": benchmark_urls,
        "type": "benign",
        "domain": benchmark_domains,
    }
)

benchmark_df.to_csv(
    REAL_BENCHMARK_OUTPUT,
    index=False
)

print(
    f"Unseen benchmark domains: "
    f"{len(benchmark_df):,}"
)

print(
    f"Saved benchmark:\n"
    f"{REAL_BENCHMARK_OUTPUT}"
)


# ============================================================
# TRAIN / VALIDATION / TEST
# ============================================================

train_val_df, test_df = train_test_split(
    training_df,
    test_size=0.15,
    random_state=RANDOM_STATE,
    stratify=training_df["type"],
)

train_df, validation_df = train_test_split(
    train_val_df,
    test_size=0.15,
    random_state=RANDOM_STATE,
    stratify=train_val_df["type"],
)

print("\nDataset split:")

print(
    f"Training:   {len(train_df):,}"
)

print(
    f"Validation: {len(validation_df):,}"
)

print(
    f"Test:       {len(test_df):,}"
)


# ============================================================
# STRUCTURAL FEATURES
# ============================================================

print("\nExtracting structural URL features...")

X_train_struct = np.asarray(
    [
        extract_url_features(url)
        for url in train_df["url"]
    ],
    dtype=np.float32,
)

X_val_struct = np.asarray(
    [
        extract_url_features(url)
        for url in validation_df["url"]
    ],
    dtype=np.float32,
)

X_test_struct = np.asarray(
    [
        extract_url_features(url)
        for url in test_df["url"]
    ],
    dtype=np.float32,
)

print(
    f"Structural features: "
    f"{X_train_struct.shape[1]}"
)


# ============================================================
# CHARACTER TF-IDF
# ============================================================

print("\nBuilding character-level TF-IDF...")

vectorizer = TfidfVectorizer(
    analyzer="char",
    ngram_range=(3, 5),
    min_df=3,
    max_features=TFIDF_MAX_FEATURES,
    sublinear_tf=True,
    lowercase=True,
)

X_train_tfidf = vectorizer.fit_transform(
    train_df["url"]
)

X_val_tfidf = vectorizer.transform(
    validation_df["url"]
)

X_test_tfidf = vectorizer.transform(
    test_df["url"]
)

print(
    f"TF-IDF vocabulary: "
    f"{len(vectorizer.vocabulary_):,}"
)


# ============================================================
# COMBINE FEATURES
# ============================================================

print("\nCombining TF-IDF + structural features...")

X_train = hstack(
    [
        X_train_tfidf,
        csr_matrix(X_train_struct),
    ],
    format="csr",
)

X_val = hstack(
    [
        X_val_tfidf,
        csr_matrix(X_val_struct),
    ],
    format="csr",
)

X_test = hstack(
    [
        X_test_tfidf,
        csr_matrix(X_test_struct),
    ],
    format="csr",
)


y_train = train_df["type"].values
y_val = validation_df["type"].values
y_test = test_df["type"].values


# ============================================================
# TRAIN
# ============================================================

print("\nTraining V3 LinearSVC...")

classifier = LinearSVC(
    C=1.0,
    class_weight="balanced",
    max_iter=5000,
    random_state=RANDOM_STATE,
)

classifier.fit(
    X_train,
    y_train
)

print("Training completed.")


# ============================================================
# STANDARD VALIDATION
# ============================================================

print("\n" + "=" * 75)
print("V3 VALIDATION")
print("=" * 75)

val_predictions = classifier.predict(
    X_val
)

print(
    f"\nAccuracy: "
    f"{accuracy_score(y_val, val_predictions):.4f}"
)

print(
    classification_report(
        y_val,
        val_predictions,
        digits=4,
        zero_division=0,
    )
)


# ============================================================
# STANDARD TEST
# ============================================================

print("\n" + "=" * 75)
print("V3 HELD-OUT TEST")
print("=" * 75)

test_predictions = classifier.predict(
    X_test
)

print(
    f"\nAccuracy: "
    f"{accuracy_score(y_test, test_predictions):.4f}"
)

print(
    classification_report(
        y_test,
        test_predictions,
        digits=4,
        zero_division=0,
    )
)

classes = list(
    classifier.classes_
)

print("\nConfusion Matrix")
print("Class order:")
print(classes)

print()

print(
    confusion_matrix(
        y_test,
        test_predictions,
        labels=classes,
    )
)


# ============================================================
# REAL-WORLD UNSEEN BENIGN TEST
# ============================================================

print("\n" + "=" * 75)
print("REAL-WORLD UNSEEN BENIGN BENCHMARK")
print("=" * 75)

X_real_struct = np.asarray(
    [
        extract_url_features(url)
        for url in benchmark_df["url"]
    ],
    dtype=np.float32,
)

X_real_tfidf = vectorizer.transform(
    benchmark_df["url"]
)

X_real = hstack(
    [
        X_real_tfidf,
        csr_matrix(X_real_struct),
    ],
    format="csr",
)

real_predictions = classifier.predict(
    X_real
)

real_scores = classifier.decision_function(
    X_real
)

benchmark_df["prediction"] = (
    real_predictions
)

benchmark_df["phishing_score"] = [
    float(
        scores[
            classes.index("phishing")
        ]
    )
    for scores in real_scores
]

real_accuracy = accuracy_score(
    benchmark_df["type"],
    benchmark_df["prediction"],
)

false_positive_count = int(
    (
        benchmark_df["prediction"]
        != "benign"
    ).sum()
)

false_positive_rate = (
    false_positive_count
    / len(benchmark_df)
)

print(
    f"\nReal-world benign accuracy: "
    f"{real_accuracy:.4f}"
)

print(
    f"False positives: "
    f"{false_positive_count:,} / "
    f"{len(benchmark_df):,}"
)

print(
    f"False-positive rate: "
    f"{false_positive_rate:.4%}"
)

print("\nPrediction distribution:")
print(
    benchmark_df["prediction"].value_counts()
)


# ============================================================
# SHOW FALSE POSITIVES
# ============================================================

false_positives = benchmark_df[
    benchmark_df["prediction"] != "benign"
].copy()

if len(false_positives) > 0:

    print("\nFirst 25 false positives:")

    print(
        false_positives[
            [
                "url",
                "prediction",
                "phishing_score",
            ]
        ]
        .head(25)
        .to_string(index=False)
    )

else:

    print(
        "\nNo false positives found "
        "in the unseen benchmark."
    )


# ============================================================
# SAVE MODEL
# ============================================================

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

model_package = {
    "classifier": classifier,
    "vectorizer": vectorizer,

    "feature_names": FEATURE_NAMES,

    "classes": classes,

    "model_version": "V3",

    "model_type": (
        "Character TF-IDF + structural URL "
        "features + LinearSVC + hard-negative training"
    ),

    "dataset": (
        "url_dataset_real_clean.csv + "
        "v3_benign_hard_negatives.csv"
    ),

    "training_rows": len(train_df),
    "validation_rows": len(validation_df),
    "test_rows": len(test_df),

    "tfidf_features": (
        len(vectorizer.vocabulary_)
    ),

    "real_benchmark_rows": len(
        benchmark_df
    ),

    "real_benchmark_accuracy": float(
        real_accuracy
    ),

    "real_benchmark_false_positive_rate": float(
        false_positive_rate
    ),

    "random_state": RANDOM_STATE,
}


joblib.dump(
    model_package,
    OUTPUT_MODEL,
    compress=3,
)


print("\n" + "=" * 75)
print("V3 MODEL SAVED")
print("=" * 75)

print(
    OUTPUT_MODEL
)

print("\nV3 training completed successfully.")