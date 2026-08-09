# LinkSentry URL Threat Detection Engine

> **Engine Identifier**: `linksentry-heuristic-v1`  
> **Type**: Transparent, Multi-Signal Static Heuristic Analyzer  
> **Notice**: *This is an explainable heuristic detector, not a machine-learning model.*

---

## 1. Overview & Purpose

The **LinkSentry URL Threat Detection Engine** evaluates submitted web links to identify phishing lures, brand deception, deceptive URI patterns, and suspicious infrastructure traits. 

It provides immediate, explainable threat signals without executing remote network requests, resolving DNS, downloading web content, or following HTTP redirects.

---

## 2. Detection Signals & Weights

The engine computes an aggregated risk score between `0` and `100` based on independent structural and lexical signals:

| Signal Category | Weight | Evaluation Criteria | Example Indicator Output |
| :--- | :---: | :--- | :--- |
| **Transport Security** | `+15` | Scheme is unencrypted `http://` instead of `https://` | `Connection does not use HTTPS (unencrypted transport)` |
| **Raw IP Hostname** | `+30` | Hostname is an IPv4 or IPv6 address | `URL hostname uses a raw IP address instead of a registered domain name` |
| **Userinfo / `@` Deception** | `+30` | `@` symbol or userinfo authentication prefix present | `URL contains an '@' symbol or userinfo authentication prefix` |
| **Suspicious TLD** | `+15` | High-abuse disposable TLD (`.xyz`, `.top`, `.click`, `.buzz`, `.gq`, `.tk`, etc.) | `Suspicious top-level domain detected: .xyz` |
| **Brand Impersonation** | `+35` | Target brand token on unauthorized third-party host with lure words | `Deceptive hostname pattern imitating brand 'paypal' with security lure tokens` |
| **Brand on 3rd-Party Host** | `+20` | Brand token on unauthorized host without explicit lure words | `Hostname contains brand name 'microsoft' on an unverified third-party domain` |
| **Lure Keywords (High)** | `+25` | 3+ distinct lure categories (e.g. auth + financial + verification) | `High-density credential and verification lure keywords detected: ...` |
| **Lure Keywords (Medium)** | `+15` | 2 distinct lure categories (e.g. login + verify) | `Multiple phishing lure keywords detected: ...` |
| **Lure Keywords (Low)** | `+5` | 1 keyword category present (e.g. login) | `Security-sensitive keyword detected in URL: ...` |
| **Sensitive Path Endpoint** | `+10` | Direct path target like `/login`, `/verify`, `/checkout`, `/otp` | `Target path points directly to a credential or payment collection endpoint` |
| **Deep Subdomain Hierarchy**| `+15` | Unusually deep subdomain nesting (≥ 5 dot segments) | `Unusually deep subdomain hierarchy (3 subdomains) detected` |
| **Excessive Hyphens** | `+10` | Hostname contains 3+ hyphens | `Excessive hyphen-separated tokens in hostname (3 hyphens)` |
| **Hostname Length** | `+10` | Hostname exceeds 40 characters | `Unusually long domain name (45 characters)` |
| **URL Length** | `+8` | Entire URL exceeds 120 characters | `Unusually long URL structure (142 characters)` |
| **Obfuscated Encoding** | `+15` | Encoded separators or hex tokens (`%2F`, `%3A`, `%40`, `%2E`, etc.) | `Suspicious character encoding / obfuscation tokens (%2F, %3A, %40, %2E) detected in URL` |
| **Open Redirect Parameter** | `+15` | Query parameter (`redirect=`, `next=`, `url=`) targeting external URL | `Open-redirect parameter 'redirect_url' pointing to external destination detected` |
| **Executable Extension** | `+25` | Direct link to executable or archive (`.exe`, `.scr`, `.zip`, `.iso`, etc.) | `Direct link to executable or compressed archive payload` |

---

## 3. Verdict Thresholds

The calculated risk score is clamped to `0 <= risk_score <= 100` and categorized as follows:

| Risk Score Range | Verdict | Actionable Meaning |
| :---: | :---: | :--- |
| **0 – 29** | `safe` | No significant anomalous or deceptive threat patterns observed. |
| **30 – 69** | `suspicious` | Moderate anomalies or unencrypted sensitive paths requiring caution. |
| **70 – 100** | `phishing` | High-risk indicators, brand spoofing, or deceptive credential harvesting patterns. |

---

## 4. Heuristic Confidence Methodology

Confidence is a bounded float between `0.50` and `0.98` representing signal strength and agreement:

- **Clean / Baseline (`risk_score == 0`)**: `0.85` (high agreement on standard benign domains like `https://example.com`).
- **Safe (`1 <= risk_score <= 29`)**: `0.75` (e.g. `https://github.com/login` which has legitimate `/login` path).
- **Suspicious (`30 <= risk_score <= 69`)**: `0.80` with multiple independent signals, `0.70` otherwise.
- **Phishing (`risk_score >= 70`)**: `0.92` when supported by strong signals (brand spoofing, raw IP, `@` deception, or 3+ independent indicators).

---

## 5. False-Positive Control & Safety

To prevent marking legitimate domains as phishing simply because they contain words like `login` or `account`:
- A single lure keyword contributes only `+5` points, remaining comfortably within the `safe` zone (0–29).
- Legitimate domains belonging to known brands (e.g., `https://accounts.google.com/`, `https://www.microsoft.com/`, `https://github.com/login`) are recognized and excluded from brand-impersonation penalties.
- High scores require multiple corroborating factors (e.g. unencrypted HTTP + suspicious TLD + brand impersonation + multi-lure path).

---

## 6. Security Boundary

- **Zero Remote Execution**: The engine operates purely on static text parsing using Python's standard library (`urllib.parse`, `ipaddress`, `re`).
- **Untrusted Input**: All input is treated as untrusted data; malformed URLs return a safe `invalid` verdict rather than raising unhandled exceptions.
