import os
import random
import pandas as pd

RANDOM_STATE = 42

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

TRANCO_DATASET = os.path.join(
    BASE_DIR,
    "tranco_top1m.csv"
)

OUTPUT = os.path.join(
    BASE_DIR,
    "v3_1_top_domain_hard_negatives.csv"
)

SELECT_DOMAINS = 15000
TARGET_ROWS = 50000

random.seed(RANDOM_STATE)

print("=" * 70)
print("LinkSentry V3.1 Top-Domain Hard-Negative Generator")
print("=" * 70)

print("\nLoading Tranco domains...")

df = pd.read_csv(
    TRANCO_DATASET,
    header=None,
    names=["rank", "domain"],
)

df["domain"] = (
    df["domain"]
    .astype(str)
    .str.strip()
    .str.lower()
)

df = df.dropna(subset=["domain"])
df = df[df["domain"] != ""]
df = df.drop_duplicates(subset=["domain"])

# Only use highly ranked domains.
domains = df.head(SELECT_DOMAINS)["domain"].tolist()

print("Selected domains:", len(domains))


# ------------------------------------------------------------
# Legitimate URL patterns
# ------------------------------------------------------------

PATH_PATTERNS = [
    "/",
    "/login",
    "/signin",
    "/account",
    "/accounts",
    "/user/profile",
    "/profile",
    "/support",
    "/help",
    "/security",
    "/password",
    "/verify",
    "/verification",
    "/search?q=test",
    "/search?q=security",
    "/products/item123",
    "/download/file.pdf",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
]

urls = []

for domain in domains:
    # Generate several legitimate-looking URLs.
    patterns = random.sample(
        PATH_PATTERNS,
        min(4, len(PATH_PATTERNS))
    )

    for pattern in patterns:
        urls.append(
            f"https://{domain}{pattern}"
        )

# Shuffle so patterns are not grouped by domain.
random.shuffle(urls)

# Remove duplicates.
urls = list(dict.fromkeys(urls))

# Limit to target.
urls = urls[:TARGET_ROWS]

result = pd.DataFrame({
    "url": urls,
    "type": "benign_top_domain",
})

result.to_csv(
    OUTPUT,
    index=False
)

print("\nGenerated URLs:", len(result))
print(
    "Unique domains:",
    result["url"]
    .str.extract(r"https?://([^/]+)")[0]
    .nunique()
)

print("\nPattern distribution:")

for pattern in PATH_PATTERNS:
    count = result["url"].str.contains(
        pattern,
        regex=False
    ).sum()

    if count:
        print(
            f"{pattern:25} {count:>7}"
        )

print("\nSaved:")
print(OUTPUT)