from pathlib import Path

import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from url_features import extract_url_features


ROOT = Path(__file__).resolve().parents[2]

DATA_PATH = ROOT / "ml" / "data" / "url_dataset.csv"
MODEL_PATH = ROOT / "ml" / "models" / "url_hybrid_classifier.joblib"


def main():
    df = pd.read_csv(DATA_PATH)

    required = {"url", "label"}

    if not required.issubset(df.columns):
        raise ValueError("Dataset must contain url and label columns.")

    df = df.dropna(subset=["url", "label"])

    df["label"] = (
        df["label"]
        .astype(str)
        .str.lower()
        .str.strip()
    )

    print(f"Total samples: {len(df)}")

    print("\nClass distribution:")
    print(df["label"].value_counts())

    X = df["url"].astype(str)
    y = df["label"]

    # ---------------------------------------------------------
    # Feature extraction
    # ---------------------------------------------------------

    feature_df = pd.DataFrame(
        [extract_url_features(url) for url in X]
    )

    print("\nExtracted URL features:")
    print(feature_df.columns.tolist())

    # ---------------------------------------------------------
    # 70 / 15 / 15 split
    # ---------------------------------------------------------

    (
        X_train,
        X_temp,
        y_train,
        y_temp,
        features_train,
        features_temp,
    ) = train_test_split(
        X,
        y,
        feature_df,
        test_size=0.30,
        random_state=42,
        stratify=y,
    )

    (
        X_val,
        X_test,
        y_val,
        y_test,
        features_val,
        features_test,
    ) = train_test_split(
        X_temp,
        y_temp,
        features_temp,
        test_size=0.50,
        random_state=42,
        stratify=y_temp,
    )

    print(f"\nTraining samples:   {len(X_train)}")
    print(f"Validation samples: {len(X_val)}")
    print(f"Test samples:       {len(X_test)}")

    # ---------------------------------------------------------
    # Hybrid feature representation
    # ---------------------------------------------------------

    feature_columns = feature_df.columns.tolist()

    preprocess = ColumnTransformer(
        transformers=[
            (
                "tfidf",
                TfidfVectorizer(
                    analyzer="char",
                    ngram_range=(2, 5),
                    min_df=1,
                    sublinear_tf=True,
                ),
                "url",
            ),
            (
                "numeric",
                StandardScaler(),
                feature_columns,
            ),
        ]
    )

    # Combine raw URL + engineered features
    train_data = features_train.copy()
    train_data.insert(0, "url", X_train.values)

    val_data = features_val.copy()
    val_data.insert(0, "url", X_val.values)

    test_data = features_test.copy()
    test_data.insert(0, "url", X_test.values)

    model = Pipeline([
        ("features", preprocess),
        (
            "classifier",
            LogisticRegression(
                max_iter=3000,
                class_weight="balanced",
                random_state=42,
            ),
        ),
    ])

    print("\nTraining hybrid URL classifier...")

    model.fit(train_data, y_train)

    # ---------------------------------------------------------
    # Validation
    # ---------------------------------------------------------

    val_predictions = model.predict(val_data)

    print("\n========== VALIDATION ==========")
    print(
        f"Accuracy: "
        f"{accuracy_score(y_val, val_predictions):.4f}"
    )

    print(
        classification_report(
            y_val,
            val_predictions,
            zero_division=0,
        )
    )

    # ---------------------------------------------------------
    # Final test
    # ---------------------------------------------------------

    test_predictions = model.predict(test_data)

    print("\n========== FINAL TEST ==========")

    print(
        f"Accuracy: "
        f"{accuracy_score(y_test, test_predictions):.4f}"
    )

    print("\nClassification Report:")

    print(
        classification_report(
            y_test,
            test_predictions,
            zero_division=0,
        )
    )

    print("Confusion Matrix:")

    print(
        confusion_matrix(
            y_test,
            test_predictions
        )
    )

    # ---------------------------------------------------------
    # Save
    # ---------------------------------------------------------

    MODEL_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    joblib.dump(model, MODEL_PATH)

    print("\nHybrid model saved:")

    print(MODEL_PATH)


if __name__ == "__main__":
    main()