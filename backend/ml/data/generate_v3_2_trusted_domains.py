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

# ============================================================
# SHARED HOSTING & MULTI-TENANT INFRASTRUCTURE EXCLUSIONS
# ============================================================
# Namespaces where arbitrary third-party users can host untrusted
# files, static pages, or deploy apps. These must NEVER be marked
# as globally trusted domains in the LinkSentry trusted database.
SHARED_HOSTING_EXCLUSIONS = {
    "r2.dev",
    "workers.dev",
    "pages.dev",
    "github.io",
    "vercel.app",
    "netlify.app",
    "web.app",
    "firebaseapp.com",
    "duckdns.org",
    "ngrok.io",
    "ngrok-free.app",
    "ngrok-free.dev",
    "glitch.me",
    "fly.dev",
    "herokuapp.com",
    "onrender.com",
    "railway.app",
    "azurewebsites.net",
}


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


def is_excluded_domain(domain: str) -> bool:
    clean = normalize_domain(domain)
    if clean in SHARED_HOSTING_EXCLUSIONS:
        return True
    for suffix in SHARED_HOSTING_EXCLUSIONS:
        if clean.endswith("." + suffix):
            return True
    return False


print("=" * 70)
print("LinkSentry V3.2 Trusted Domain Generator")
print("=" * 70)

if os.path.exists(TRANCO_PATH):
    print("\nLoading Tranco raw data from:\n", TRANCO_PATH)
    df = pd.read_csv(
        TRANCO_PATH,
        header=None,
        names=["rank", "domain"],
    )
elif os.path.exists(OUTPUT_PATH):
    print("\nLoading baseline trusted data from:\n", OUTPUT_PATH)
    df = pd.read_csv(OUTPUT_PATH)
else:
    raise FileNotFoundError(f"Neither {TRANCO_PATH} nor {OUTPUT_PATH} found.")

df["domain"] = df["domain"].map(normalize_domain)

df = df[
    (df["domain"] != "")
    & df["domain"].notna()
]

df = df.drop_duplicates(
    subset=["domain"]
)

# Apply infrastructure exclusions
excluded_mask = df["domain"].map(is_excluded_domain)
num_excluded = int(excluded_mask.sum())
print(f"\nExcluded shared-hosting infrastructure domains: {num_excluded:,}")

filtered_df = df[~excluded_mask].copy()

if "rank" in filtered_df.columns:
    filtered_df = filtered_df.sort_values("rank")

trusted = filtered_df.head(TOP_N).copy()

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

print(f"\nTotal clean candidate rows: {len(filtered_df):,}")
print(f"Trusted domains saved: {len(trusted):,}")
print("\nFirst 20 retained domains:")
print(
    trusted.head(20).to_string(
        index=False
    )
)

print("\nSaved to:")
print(OUTPUT_PATH)