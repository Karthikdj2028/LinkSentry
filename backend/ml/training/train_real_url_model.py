import os
import math
import re
import joblib
import numpy as np
import pandas as pd

from urllib.parse import urlparse

from scipy.sparse import csr_matrix, hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix


# ============================================================
# CONFIG
# ============================================================

BASE_DIR = os.path.dirname(__file__)

DATA_PATH = os.path.abspath(
    os.path.join(BASE_DIR, "..", "data", "url_dataset_real_clean.csv")
)

MODEL_DIR = os.path.abspath(
    os.path.join(BASE_DIR, "..", "models")
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "url_real_hybrid_classifier.joblib"
)

RANDOM_STATE = 42

# Controlled dataset size for practical local training
SAMPLES_PER_CLASS = {
    "benign": 50_000,
    "phishing": 50_000,
    "defacement": 30_000,
    "malware": 30_000,
}

TEST_SIZE = 0.15

TFIDF_MAX_FEATURES = 30_000


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
    "authenticate", "authorization", "recover"
}

SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl",
    "ow.ly", "is.gd", "buff.ly", "cutt.ly",
    "shorturl.at", "rebrand.ly", "rb.gy"
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

def entropy(text):
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

    tld = ""

    if "." in hostname_lower:
        tld = hostname_lower.rsplit(".", 1)[-1]

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

        entropy(url),
        entropy(hostname),
        entropy(path),
    ]


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 70)
print("LinkSentry Optimized Real-World URL ML Training")
print("=" * 70)

print("\nLoading cleaned dataset...")

df = pd.read_csv(DATA_PATH)

df = df.dropna(subset=["url", "type"])

df["url"] = df["url"].astype(str).str.strip()
df["type"] = df["type"].astype(str).str.strip().str.lower()

df = df[df["url"] != ""]
df = df.drop_duplicates(subset=["url"])

print(f"Clean dataset available: {len(df):,}")

print("\nAvailable classes:")
print(df["type"].value_counts())


# ============================================================
# BALANCED SAMPLING
# ============================================================

parts = []

print("\nSampling training dataset:")

for label, amount in SAMPLES_PER_CLASS.items():

    class_df = df[df["type"] == label]

    if len(class_df) < amount:
        amount = len(class_df)

    sampled = class_df.sample(
        n=amount,
        random_state=RANDOM_STATE
    )

    parts.append(sampled)

    print(f"{label:12} {amount:,}")


work_df = pd.concat(
    parts,
    ignore_index=True
)

work_df = work_df.sample(
    frac=1,
    random_state=RANDOM_STATE
).reset_index(drop=True)

print(
    f"\nTraining dataset: {len(work_df):,} URLs"
)

print("\nBalanced distribution:")
print(work_df["type"].value_counts())


# ============================================================
# TRAIN / TEST SPLIT
# ============================================================

train_df, test_df = train_test_split(
    work_df,
    test_size=TEST_SIZE,
    random_state=RANDOM_STATE,
    stratify=work_df["type"]
)

print("\nDataset split:")
print(f"Training: {len(train_df):,}")
print(f"Test:     {len(test_df):,}")


# ============================================================
# STRUCTURAL FEATURES
# ============================================================

print("\nExtracting structural URL features...")

X_train_struct = np.asarray(
    [
        extract_url_features(url)
        for url in train_df["url"]
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
    f"Structural features: {X_train_struct.shape[1]}"
)


# ============================================================
# CHARACTER TF-IDF
# ============================================================

print("\nBuilding character TF-IDF...")

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

X_test_tfidf = vectorizer.transform(
    test_df["url"]
)

print(
    f"TF-IDF vocabulary: "
    f"{len(vectorizer.vocabulary_):,}"
)


# ============================================================
# HYBRID FEATURE MATRIX
# ============================================================

print("\nCombining features...")

X_train = hstack(
    [
        X_train_tfidf,
        csr_matrix(X_train_struct)
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
y_test = test_df["type"].values


# ============================================================
# MODEL TRAINING
# ============================================================

print("\nTraining classifier...")

classifier = LogisticRegression(
    max_iter=300,
    class_weight="balanced",
    solver="saga",
    random_state=RANDOM_STATE,
)

classifier.fit(
    X_train,
    y_train
)


# ============================================================
# EVALUATION
# ============================================================

print("\n" + "=" * 70)
print("FINAL TEST")
print("=" * 70)

predictions = classifier.predict(X_test)

accuracy = accuracy_score(
    y_test,
    predictions
)

print(
    f"\nAccuracy: {accuracy:.4f}"
)

print("\nClassification Report:")

print(
    classification_report(
        y_test,
        predictions,
        digits=4,
        zero_division=0
    )
)

labels = [
    "benign",
    "phishing",
    "defacement",
    "malware",
]

print("\nConfusion Matrix:")

print(
    confusion_matrix(
        y_test,
        predictions,
        labels=labels
    )
)


# ============================================================
# PHISHING PERFORMANCE
# ============================================================

report = classification_report(
    y_test,
    predictions,
    output_dict=True,
    zero_division=0
)

phishing = report["phishing"]

print("\n" + "=" * 70)
print("PHISHING PERFORMANCE")
print("=" * 70)

print(
    f"Precision: {phishing['precision']:.4f}"
)

print(
    f"Recall:    {phishing['recall']:.4f}"
)

print(
    f"F1 Score:  {phishing['f1-score']:.4f}"
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
    "classes": list(classifier.classes_),
    "model_type": (
        "Character TF-IDF + structural URL features"
    ),
    "dataset": "url_dataset_real_clean.csv",
    "training_rows": len(train_df),
    "test_rows": len(test_df),
    "random_state": RANDOM_STATE,
}

joblib.dump(
    model_package,
    MODEL_PATH,
    compress=3
)

print("\n" + "=" * 70)
print("MODEL SAVED")
print("=" * 70)

print(MODEL_PATH)
print("\nTraining completed successfully.")