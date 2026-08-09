# LinkSentry Message & SMS Threat Detection Engine

> **Engine Identifier**: `linksentry-message-heuristic-v1`  
> **Type**: Transparent, Multi-Signal Heuristic Social-Engineering & Smishing Analyzer  
> **Notice**: *This is an explainable heuristic detector, not a machine-learning model.*

---

## 1. Overview & Purpose

The **LinkSentry Message & SMS Threat Detection Engine** inspects user-provided text messages, emails, WhatsApp alerts, and SMS notifications to identify smishing, social engineering, credential harvesting, unauthorized banking panic lures, subscription/billing renewal scams, and deceptive embedded links.

It evaluates message semantics and static structure without making external network calls, sending outbound messages, or dialing phone numbers.

---

## 2. Detection Signals & Weights

The engine aggregates multi-category heuristic signals into a bounded risk score between `0` and `100`:

| Signal Category | Weight | Detection Criteria | Example Indicators |
| :--- | :---: | :--- | :--- |
| **Urgency / Time Pressure** | `+10` to `+15` | Artificial deadlines (`urgent`, `immediately`, `today`, `due today`, `within 24 hours`, `expires today`, `final notice`) | `Urgency or time-pressure language detected: 'immediately'` |
| **Account Restriction / Lock** | `+20` | Claims of account disruption or file loss (`suspended`, `locked`, `deactivated`, `restricted`, `keep your files safe`) | `Account restriction or file loss consequence claim detected ('locked')` |
| **Account + Action Combo** | `+20` | Account context paired with action requests (`verify`, `confirm`, `click here`, `reset`, `manage`) | `Account security lure combined with action request detected` |
| **Direct Password / Credential** | `+15` | Explicit prompts for passwords or login credentials | `Direct credential or password prompt detected` |
| **OTP / 2FA Code Harvesting** | `+35` | Demands to share, forward, or reply with OTP/verification codes | `Critical social-engineering tactic: Request to share an OTP/security code` |
| **OTP Mentioned (Informational)** | `+10` | OTP mentioned without explicit sharing demand | `Security verification code (OTP/2FA) mentioned in message` |
| **Billing / Subscription Renewal** | `+20` | Subscription renewal, failed renewal, or billing claims paired with action requests (`check billing`, `renew now`) | `Action request associated with billing or subscription renewal detected` |
| **Billing + Urgency Synergy** | `+15` | Billing/subscription claims paired with tight urgency (`today`, `due today`, `24 hours`) | `Urgency pressure combined with subscription/billing action detected` |
| **Financial / Banking Lures** | `+25` | Banking, cards, wire transfers, or failed payment claims paired with action demands | `Financial transaction or banking lure paired with action request ('card details')` |
| **Financial Instrument Demands** | `+15` | Demands to confirm or verify card details, banking credentials | `Action or confirmation demanded on financial instrument ('confirm')` |
| **Prize / Lottery Scams** | `+35` | Unsolicited winnings (`you won`, `prize`, `lottery`) paired with verification/fee claims | `Unsolicited prize, lottery, or reward lure with claim requirements detected` |
| **Promotional Giveaway** | `+15` | Giveaway or reward mentioned without immediate fee demand | `Promotional reward or giveaway claim detected` |
| **Brand Impersonation** | `+25` | Known brands (`PayPal`, `Chase`, `Microsoft`, `FedEx`, `Apple`) paired with account or payment lures | `Brand impersonation pattern: Target brand 'PayPal' paired with security lure` |
| **Threat & Legal Consequences** | `+20` | Coercive intimidation (`legal action`, `penalty`, `sim blocked`, `police action`, `arrest`, `court`) | `Coercive threat or punitive consequence language detected: 'legal action'` |
| **Embedded Phishing URL** | `+35` | Embedded HTTP/HTTPS link flagged as phishing (`risk >= 70`) by static `analyze_url()` engine | `Embedded link 'http://...' flagged as high-risk phishing destination` |
| **Embedded Suspicious URL** | `+20` | Embedded HTTP/HTTPS link flagged as suspicious (`risk >= 30`) by static `analyze_url()` engine | `Embedded link 'http://...' exhibits suspicious characteristics` |
| **Embedded Transport Anomalies** | `+15` | Unencrypted HTTP link with domain or path risk signals (`risk >= 15`) | `Embedded link 'http://...' uses unencrypted transport with domain/path anomalies` |
| **Financial / Billing + URL Synergy** | `+20` | Elevated-risk embedded URL combined with billing, financial, or account context | `Financial / billing context combined with elevated-risk embedded URL` |
| **URL Shortener Cloak** | `+15` | Shortened link (`bit.ly`, `tinyurl.com`, `t.co`, `is.gd`) obscuring destination | `URL shortening service detected (destination domain is obscured)` |
| **URL + Urgency / Lock Synergy** | `+10` | Embedded link combined with panic pressure or account lock lure | *(Compound risk modifier)* |
| **Excessive Uppercase** | `+8` | Uppercase character ratio ≥ 50% across the message body | `Excessive uppercase lettering detected (attention-grabbing coercion pattern)` |
| **Excessive Punctuation** | `+5` | Multiple consecutive exclamation or question marks (`!!!`, `!?`) | `Excessive punctuation detected` |

---

## 3. Combination Logic & Synergies

Attackers combine multiple subtle triggers. The engine evaluates **contextual synergies**:
1. **Cloud Storage Subscription Scam**:
   `Billing Lure (+20) + Action Request (+20) + Urgency 'today' (+15) + Account/Files Lock (+20) + HTTP Anomaly (+15) + URL Synergy (+20) = 100` ➔ High-Risk `phishing`.
2. **Brand + Account Lock + Phishing Link**:
   `Brand Spoof (+25) + Lock (+20) + Phishing URL (+35) + Synergy (+20) = 100` ➔ High-Risk `phishing`.
3. **OTP Sharing Request + Bank Panic**:
   `OTP Extortion (+35) + Financial Panic (+25) = 60` ➔ Elevated `suspicious`.
4. **Prize Winner + Verification Action**:
   `Prize Lure (+35) + Verification Action (+20) = 55` ➔ Elevated `suspicious`.

---

## 4. Verdict Thresholds

| Risk Score Range | Verdict | Actionable Meaning |
| :---: | :---: | :--- |
| **0 – 29** | `safe` | Routine conversational or benign informational text. |
| **30 – 69** | `suspicious` | Elevated social engineering patterns or unverified payment/subscription prompts requiring caution. |
| **70 – 100** | `phishing` | Critical credential harvesting, brand impersonation, OTP extortion, or dangerous embedded links. |

---

## 5. Confidence Methodology

Confidence is a heuristic metric bounded between `0.50` and `0.98`:
- `0.85` for routine benign messages with zero suspicious triggers.
- `0.78` for safe messages containing single benign operational keywords (e.g. *"Your account settings were updated"*).
- `0.82` for suspicious multi-signal messages (`risk_score >= 30`).
- `0.94` for multi-signal high-risk phishing and brand spoofing combinations.

---

## 6. Static Embedded URL Analysis

When a message contains HTTP/HTTPS links:
1. URLs are extracted via regex `r'https?://[^\s<>"]+'`.
2. Each extracted link is passed directly into `analyze_url()` in Python.
3. No remote HTTP connection is made.
4. The URL heuristic score feeds into the overall message threat evaluation without double-counting.

---

## 7. False-Positive Controls & Safety

- Isolated words (like `account`, `bank`, `payment`, `meeting`, `subscription`) do not trigger phishing verdicts on their own.
- Legitimate informational notifications (e.g., *"Meeting is scheduled for tomorrow at 10 AM"*, *"Your cloud storage subscription renews automatically on September 1"*, *"Read our billing documentation: https://example.com/billing"*) stay in the `safe` zone (0–29).
- High-risk scoring requires **compound corroboration** (e.g., billing failure claim + urgent action demand + unencrypted/suspicious destination URL).

---

## 8. Security Boundaries & Limitations

- **Zero Remote Execution**: Never opens links, sends SMS replies, or contacts phone numbers.
- **Untrusted Input**: All input is sanitized and validated.
- **Rule-Based Heuristic**: Operates on lexical patterns; does not maintain a real-time reputation database of phone numbers.
