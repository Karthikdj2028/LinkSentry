import os
import re
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = BASE_DIR

TRANCO_PATH = os.path.join(
    DATA_DIR,
    "tranco_top1m.csv",
)

OUTPUT_PATH = os.path.join(
    DATA_DIR,
    "v3_2",
    "trusted_domains.csv",
)

TOP_N = 100_000


def normalize_domain(value):
    value = str(value).strip().lower()

    # Remove protocol if present
    value = re.sub(r"^https?://", "", value)

    # Remove path/query
    value = value.split("/", 1)[0]
    value = value.split("?", 1)[0]
    value = value.split("#", 1)[0]

    # Remove port
    value = value.split(":", 1)[0]

    # Remove leading www.
    value = value.removeprefix("www.")

    return value.strip(".")


print("=" * 70)
print("LinkSentry V3.2 Trusted Domain Generator")
print("=" * 70)

print("\nLoading Tranco data...")

df = pd.read_csv(
    TRANCO_PATH,
    header=None,
    names=["rank", "domain"],
)

df["domain"] = df["domain"].map(normalize_domain)

df = df[
    (df["domain"] != "")
    & df["domain"].notna()
]

df = df.drop_duplicates(
    subset=["domain"]
)

df = df.sort_values("rank")

trusted = df.head(TOP_N).copy()

trusted["source"] = "tranco"
trusted["trusted"] = True

os.makedirs(
    os.path.dirname(OUTPUT_PATH),
    exist_ok=True,
)

trusted[
    [
        "rank",
        "domain",
        "source",
        "trusted",
    ]
].to_csv(
    OUTPUT_PATH,
    index=False,
)

print(f"\nTranco rows: {len(df):,}")
print(f"Trusted domains: {len(trusted):,}")

print("\nFirst 20:")
print(
    trusted.head(20).to_string(
        index=False
    )
)

print("\nSaved:")
print(OUTPUT_PATH)