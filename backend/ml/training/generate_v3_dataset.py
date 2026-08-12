import os
import random
import pandas as pd

RANDOM_STATE = 42
random.seed(RANDOM_STATE)

BASE_DIR = os.path.dirname(__file__)

TRANCO_PATH = os.path.abspath(
    os.path.join(
        BASE_DIR,
        "..",
        "data",
        "tranco_top1m.csv"
    )
)

OUTPUT_PATH = os.path.abspath(
    os.path.join(
        BASE_DIR,
        "..",
        "data",
        "v3_benign_hard_negatives.csv"
    )
)

TARGET_DOMAINS = 100_000

VARIANTS_PER_DOMAIN = 2


def clean_domain(domain):
    domain = str(domain).strip().lower()

    if not domain:
        return None

    domain = domain.replace(
        "https://",
        ""
    ).replace(
        "http://",
        ""
    )

    domain = domain.split("/")[0]

    if "." not in domain:
        return None

    return domain


def generate_variants(domain):
    return [
        f"https://{domain}/",
        f"https://{domain}/login",
        f"https://{domain}/account",
        f"https://{domain}/support",
        f"https://{domain}/help",
        f"https://{domain}/search?q=test",
        f"https://{domain}/search?q=security",
        f"https://{domain}/products/item123",
        f"https://{domain}/download/file.pdf",
        f"https://{domain}/user/profile",
        f"https://www.{domain}/",
        f"https://www.{domain}/login",
        f"https://www.{domain}/account",
        f"https://www.{domain}/support/contact",
        f"https://www.{domain}/search?q=example",
    ]


print("=" * 70)
print("LinkSentry V3 Hard-Negative Dataset Generator")
print("=" * 70)

print("\nLoading Tranco/domain ranking data...")

df = pd.read_csv(
    TRANCO_PATH,
    header=None,
    names=["rank", "domain"]
)

print(
    f"Rows loaded: {len(df):,}"
)

df["domain"] = df["domain"].map(
    clean_domain
)

df = df.dropna(
    subset=["domain"]
)

df = df.drop_duplicates(
    subset=["domain"]
)

print(
    f"Unique domains: {len(df):,}"
)


# ------------------------------------------------------------
# Deterministic sampling
# ------------------------------------------------------------

sample_size = min(
    TARGET_DOMAINS,
    len(df)
)

domains = (
    df.sample(
        n=sample_size,
        random_state=RANDOM_STATE
    )["domain"]
    .tolist()
)

print(
    f"\nSelected domains: {len(domains):,}"
)


# ------------------------------------------------------------
# Generate realistic benign URLs
# ------------------------------------------------------------

records = []

for index, domain in enumerate(domains):

    variants = generate_variants(
        domain
    )

    selected = random.sample(
        variants,
        k=min(
            VARIANTS_PER_DOMAIN,
            len(variants)
        )
    )

    for url in selected:
        records.append(
            {
                "url": url,
                "type": "benign_hard"
            }
        )

    if (index + 1) % 10_000 == 0:
        print(
            f"Processed: {index + 1:,}"
        )


result = pd.DataFrame(
    records
)

result = result.drop_duplicates(
    subset=["url"]
)

result = result.sample(
    frac=1,
    random_state=RANDOM_STATE
).reset_index(drop=True)


# ------------------------------------------------------------
# Save
# ------------------------------------------------------------

os.makedirs(
    os.path.dirname(OUTPUT_PATH),
    exist_ok=True
)

result.to_csv(
    OUTPUT_PATH,
    index=False
)

print("\n" + "=" * 70)

print(
    f"Generated hard-negative URLs: "
    f"{len(result):,}"
)

print(
    "\nClass distribution:"
)

print(
    result["type"].value_counts()
)

print(
    f"\nSaved:\n{OUTPUT_PATH}"
)

print("=" * 70)