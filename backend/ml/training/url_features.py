import math
import re
from urllib.parse import urlparse


SUSPICIOUS_TLDS = {
    "xyz", "top", "click", "shop", "online",
    "site", "live", "icu", "buzz", "support"
}

SUSPICIOUS_KEYWORDS = {
    "login", "signin", "verify", "verification",
    "account", "secure", "security", "update",
    "confirm", "confirmation", "payment", "wallet",
    "password", "credential", "otp", "reset",
    "suspend", "unlock", "recover"
}

SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl",
    "ow.ly", "is.gd", "buff.ly", "cutt.ly"
}


def entropy(value):
    if not value:
        return 0.0

    counts = {}

    for char in value:
        counts[char] = counts.get(char, 0) + 1

    length = len(value)

    return -sum(
        (count / length) * math.log2(count / length)
        for count in counts.values()
    )


def is_ip_address(hostname):
    if not hostname:
        return 0

    return int(
        bool(re.fullmatch(
            r"(?:\d{1,3}\.){3}\d{1,3}",
            hostname
        ))
    )


def extract_url_features(url):
    url = str(url).strip().lower()

    try:
        parsed = urlparse(url)
    except Exception:
        parsed = None

    hostname = parsed.hostname or "" if parsed else ""
    path = parsed.path or "" if parsed else ""
    query = parsed.query or "" if parsed else ""

    host_parts = hostname.split(".") if hostname else []

    tld = host_parts[-1] if len(host_parts) >= 2 else ""

    special_chars = sum(
        1 for char in url
        if char in "@?=&_%:#"
    )

    digit_count = sum(char.isdigit() for char in url)

    keyword_count = sum(
        1 for keyword in SUSPICIOUS_KEYWORDS
        if keyword in url
    )

    return {
        "url_length": len(url),
        "hostname_length": len(hostname),
        "path_length": len(path),
        "query_length": len(query),

        "dot_count": url.count("."),
        "hyphen_count": url.count("-"),
        "underscore_count": url.count("_"),
        "slash_count": url.count("/"),
        "digit_count": digit_count,
        "special_char_count": special_chars,

        "subdomain_count": max(len(host_parts) - 2, 0),

        "path_depth": len([
            part for part in path.split("/")
            if part
        ]),

        "https": int(parsed.scheme == "https") if parsed else 0,
        "has_ip": is_ip_address(hostname),

        "has_at_symbol": int("@" in url),
        "has_percent_encoding": int("%" in url),
        "has_punycode": int("xn--" in hostname),

        "suspicious_tld": int(tld in SUSPICIOUS_TLDS),

        "keyword_count": keyword_count,

        "has_shortener": int(
            hostname in SHORTENERS
        ),

        "entropy": entropy(url),

        "hostname_entropy": entropy(hostname),
        "path_entropy": entropy(path),
    }