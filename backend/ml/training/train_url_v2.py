import os
import math
import re
import joblib
import numpy as np
import pandas as pd

from urllib.parse import urlparse

from scipy.sparse import csr_matrix, hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_curve,
    f1_score,
)


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(__file__)

DATA_PATH = os.path.abspath(
    os.path.join(
        BASE_DIR,
        "..",
        "data",
        "url_dataset_real_clean.csv"
    )
)

MODEL_DIR = os.path.abspath(
    os.path.join(
        BASE_DIR,
        "..",
        "models"
    )
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "url_real_v2_classifier.joblib"
)

RANDOM_STATE = 42

# Keep training practical while retaining a large real dataset.
SAMPLES_PER_CLASS = {
    "benign": 40_000,
    "phishing": 40_000,
    "defacement": 25_000,
    "malware": 20_000,
}

TEST_SIZE = 0.15
VALIDATION_SIZE = 0.15

TFIDF_MAX_FEATURES = 20_000


# ============================================================
# FEATURE DEFINITIONS
# ============================================================

SUSPICIOUS_TLDS = {
    "tk", "ml", "ga", "cf", "gq",
    "xyz", "top", "click", "download",
    "zip", "review", "country", "stream",
    "work", "party", "fit", "support"
}

SUSPICIOUS_KEYWORDS = {
    "login", "signin", "verify", "verification",
    "account", "secure", "security", "update",
    "confirm", "confirmation", "password",
    "credential", "bank", "banking", "wallet",
    "payment", "invoice", "billing", "bonus",
    "free", "claim", "reward", "gift",
    "unlock", "suspended", "urgent", "alert",
    "authenticate", "authorization", "recover",
    "otp", "kyc", "refund", "tax"
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
    "rb.gy"
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
# URL FEATURE EXTRACTION
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
        len([x for x in path.split("/") if x]),

        int(lower.startswith("https://")),

        int(
            bool(
                re.search(
                    r"https?://(?:\d{1,3}\.){3}\d{1,3}",
                    lower
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
# LOAD AND CLEAN DATA
# ============================================================

print("=" * 70)
print("LinkSentry URL ML V2")
print("=" * 70)

print("\nLoading real-world dataset...")

df = pd.read_csv(DATA_PATH)

df = df.dropna(
    subset=["url", "type"]
)

df["url"] = (
    df["url"]
    .astype(str)
    .str.strip()
)

df["type"] = (
    df["type"]
    .astype(str)
    .str.strip()
    .str.lower()
)

df = df[df["url"] != ""]
df = df.drop_duplicates(
    subset=["url"]
)

print(
    f"Clean dataset: {len(df):,}"
)

print("\nAvailable classes:")
print(
    df["type"].value_counts()
)


# ============================================================
# STRATIFIED SAMPLING
# ============================================================

print("\nSampling dataset...")

sampled_parts = []

for label, requested in SAMPLES_PER_CLASS.items():

    class_df = df[
        df["type"] == label
    ]

    actual = min(
        requested,
        len(class_df)
    )

    sampled = class_df.sample(
        n=actual,
        random_state=RANDOM_STATE
    )

    sampled_parts.append(
        sampled
    )

    print(
        f"{label:12} {actual:,}"
    )

work_df = pd.concat(
    sampled_parts,
    ignore_index=True
)

work_df = work_df.sample(
    frac=1,
    random_state=RANDOM_STATE
).reset_index(drop=True)

print(
    f"\nTotal V2 dataset: {len(work_df):,}"
)


# ============================================================
# TRAIN / VALIDATION / TEST SPLIT
# ============================================================

train_val_df, test_df = train_test_split(
    work_df,
    test_size=TEST_SIZE,
    random_state=RANDOM_STATE,
    stratify=work_df["type"]
)

train_df, validation_df = train_test_split(
    train_val_df,
    test_size=VALIDATION_SIZE,
    random_state=RANDOM_STATE,
    stratify=train_val_df["type"]
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

print("\nExtracting structural features...")

X_train_struct = np.asarray(
    [
        extract_url_features(url)
        for url in train_df["url"]
    ],
    dtype=np.float32
)

X_val_struct = np.asarray(
    [
        extract_url_features(url)
        for url in validation_df["url"]
    ],
    dtype=np.float32
)

X_test_struct = np.asarray(
    [
        extract_url_features(url)
        for url in test_df["url"]
    ],
    dtype=np.float32
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
# HYBRID FEATURES
# ============================================================

print("\nCombining TF-IDF + structural features...")

X_train = hstack(
    [
        X_train_tfidf,
        csr_matrix(X_train_struct)
    ],
    format="csr"
)

X_val = hstack(
    [
        X_val_tfidf,
        csr_matrix(X_val_struct)
    ],
    format="csr"
)

X_test = hstack(
    [
        X_test_tfidf,
        csr_matrix(X_test_struct)
    ],
    format="csr"
)

y_train = train_df["type"].values
y_val = validation_df["type"].values
y_test = test_df["type"].values


# ============================================================
# TRAIN LINEAR SVM
# ============================================================

print("\nTraining LinearSVC classifier...")

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
# VALIDATION SCORES
# ============================================================

print("\n" + "=" * 70)
print("VALIDATION")
print("=" * 70)

val_predictions = classifier.predict(
    X_val
)

val_accuracy = accuracy_score(
    y_val,
    val_predictions
)

print(
    f"\nDefault accuracy: "
    f"{val_accuracy:.4f}"
)

print(
    classification_report(
        y_val,
        val_predictions,
        digits=4,
        zero_division=0
    )
)


# ============================================================
# PHISHING THRESHOLD OPTIMIZATION
# ============================================================

print("\nOptimizing phishing detection threshold...")

classes = list(
    classifier.classes_
)

phishing_index = classes.index(
    "phishing"
)

val_scores = classifier.decision_function(
    X_val
)

phishing_scores = (
    val_scores[:, phishing_index]
)

best_threshold = 0.0
best_f1 = 0.0
best_precision = 0.0
best_recall = 0.0

# Search a range of decision thresholds.
thresholds = np.linspace(
    phishing_scores.min(),
    phishing_scores.max(),
    200
)

for threshold in thresholds:

    predictions = classifier.predict(
        X_val
    )

    predictions = np.asarray(
        predictions,
        dtype=object
    )

    force_phishing = (
        phishing_scores >= threshold
    )

    predictions[
        force_phishing
    ] = "phishing"

    phishing_true = (
        y_val == "phishing"
    )

    phishing_pred = (
        predictions == "phishing"
    )

    tp = np.sum(
        phishing_true & phishing_pred
    )

    fp = np.sum(
        ~phishing_true & phishing_pred
    )

    fn = np.sum(
        phishing_true & ~phishing_pred
    )

    precision = (
        tp / (tp + fp)
        if tp + fp > 0
        else 0
    )

    recall = (
        tp / (tp + fn)
        if tp + fn > 0
        else 0
    )

    f1 = (
        2 * precision * recall /
        (precision + recall)
        if precision + recall > 0
        else 0
    )

    # Prefer recall >= 0.90.
    # Within that region, maximize F1.
    if recall >= 0.90:

        if f1 > best_f1:
            best_threshold = threshold
            best_f1 = f1
            best_precision = precision
            best_recall = recall

# If no threshold reaches 90% recall,
# select the threshold with highest F1.
if best_f1 == 0:

    for threshold in thresholds:

        predictions = classifier.predict(
            X_val
        )

        predictions = np.asarray(
            predictions,
            dtype=object
        )

        predictions[
            phishing_scores >= threshold
        ] = "phishing"

        true_phishing = (
            y_val == "phishing"
        )

        predicted_phishing = (
            predictions == "phishing"
        )

        tp = np.sum(
            true_phishing &
            predicted_phishing
        )

        fp = np.sum(
            ~true_phishing &
            predicted_phishing
        )

        fn = np.sum(
            true_phishing &
            ~predicted_phishing
        )

        precision = (
            tp / (tp + fp)
            if tp + fp > 0
            else 0
        )

        recall = (
            tp / (tp + fn)
            if tp + fn > 0
            else 0
        )

        f1 = (
            2 * precision * recall /
            (precision + recall)
            if precision + recall > 0
            else 0
        )

        if f1 > best_f1:
            best_threshold = threshold
            best_f1 = f1
            best_precision = precision
            best_recall = recall


print(
    f"\nSelected phishing threshold: "
    f"{best_threshold:.6f}"
)

print(
    f"Validation phishing precision: "
    f"{best_precision:.4f}"
)

print(
    f"Validation phishing recall: "
    f"{best_recall:.4f}"
)

print(
    f"Validation phishing F1: "
    f"{best_f1:.4f}"
)


# ============================================================
# FINAL TEST WITH TUNED THRESHOLD
# ============================================================

print("\n" + "=" * 70)
print("FINAL TEST")
print("=" * 70)

test_scores = classifier.decision_function(
    X_test
)

test_predictions = classifier.predict(
    X_test
)

test_predictions = np.asarray(
    test_predictions,
    dtype=object
)

test_phishing_scores = (
    test_scores[:, phishing_index]
)

test_predictions[
    test_phishing_scores >= best_threshold
] = "phishing"

test_accuracy = accuracy_score(
    y_test,
    test_predictions
)

print(
    f"\nTuned accuracy: "
    f"{test_accuracy:.4f}"
)

print("\nClassification Report:")

print(
    classification_report(
        y_test,
        test_predictions,
        digits=4,
        zero_division=0
    )
)


# ============================================================
# CORRECT CONFUSION MATRIX ORDER
# ============================================================

print("\nConfusion Matrix:")

evaluation_labels = list(
    classifier.classes_
)

print(
    "Class order:"
)

print(
    evaluation_labels
)

print()

print(
    confusion_matrix(
        y_test,
        test_predictions,
        labels=evaluation_labels
    )
)


# ============================================================
# FINAL PHISHING METRICS
# ============================================================

final_report = classification_report(
    y_test,
    test_predictions,
    output_dict=True,
    zero_division=0
)

phishing_metrics = final_report[
    "phishing"
]

print("\n" + "=" * 70)
print("FINAL PHISHING PERFORMANCE")
print("=" * 70)

print(
    f"Precision: "
    f"{phishing_metrics['precision']:.4f}"
)

print(
    f"Recall:    "
    f"{phishing_metrics['recall']:.4f}"
)

print(
    f"F1 Score:  "
    f"{phishing_metrics['f1-score']:.4f}"
)


# ============================================================
# SAVE V2
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

    "phishing_threshold": float(
        best_threshold
    ),

    "model_version": "V2",

    "model_type": (
        "Character TF-IDF + structural URL "
        "features + LinearSVC + phishing threshold"
    ),

    "dataset": (
        "url_dataset_real_clean.csv"
    ),

    "training_rows": len(train_df),
    "validation_rows": len(validation_df),
    "test_rows": len(test_df),

    "tfidf_features": (
        len(vectorizer.vocabulary_)
    ),

    "random_state": RANDOM_STATE,
}

joblib.dump(
    model_package,
    MODEL_PATH,
    compress=3
)

print("\n" + "=" * 70)
print("V2 MODEL SAVED")
print("=" * 70)

print(MODEL_PATH)

print("\nV2 training completed successfully.")