# LinkSentry Message & SMS Threat Detection Engine

> **Engine Identifier**: `linksentry-message-heuristic-v1`  
> **Type**: Transparent, Multi-Signal Heuristic Social-Engineering Analyzer  
> **Notice**: *This is an explainable heuristic detector, not a machine-learning model.*

---

## 1. Overview & Purpose

The **LinkSentry Message & SMS Threat Detection Engine** inspects user-provided text messages, emails, WhatsApp alerts, and SMS notifications to identify smishing, social engineering, credential harvesting, unauthorized banking panic lures, and deceptive embedded links.

It evaluates message semantics and static structure without making external network calls, sending outbound messages, or dialing phone numbers.

---

## 2. Detection Signals & Weights

The engine aggregates multi-category heuristic signals into a bounded risk score between `0` and `100`:

| Signal Category | Weight | Detection Criteria | Example Indicators |
| :--- | :---: | :--- | :--- |
| **Urgency / Time Pressure** | `+10` to `+15` | Artificial deadlines (`urgent`, `immediately`, `within 24 hours`, `expires today`, `final warning`) | `Urgency or time-pressure language detected: 'immediately'` |
| **Account Restriction / Lock** | `+20` | Claims of account disruption (`suspended`, `locked`, `deactivated`, `restricted`, `compromised`) | `Account restriction/suspension claim detected ('locked')` |
| **Account + Verification Combo**| `+20` | Account context paired with verification actions (`verify`, `confirm`, `click here`, `reset`) | `Account security lure combined with verification request detected (account + verify)` |
| **Direct Password / Credential**| `+15` | Explicit prompts for passwords or login credentials | `Direct credential or password prompt detected` |
| **OTP / 2FA Code Harvesting** | `+35` | Demands to share, forward, or reply with OTP/verification codes | `Critical social-engineering tactic: Request to share an OTP/security code` |
| **OTP Mentioned (Informational)**| `+10` | OTP mentioned without explicit sharing demand | `Security verification code (OTP/2FA) mentioned in message` |
| **Financial / Banking Lures** | `+25` | Banking, cards, wire transfers, or failed payment claims paired with urgent action demands | `Financial transaction or banking lure paired with action request (card details)` |
| **Financial Instrument Demands** | `+15` | Demands to confirm or verify card details, banking credentials | `Action or confirmation demanded on financial instrument ('confirm')` |
| **Prize / Lottery Scams** | `+35` | Unsolicited winnings (`you won`, `prize`, `lottery`) paired with verification/fee claims | `Unsolicited prize, lottery, or reward lure with claim requirements detected (reward)` |
| **Promotional Giveaway** | `+15` | Giveaway or reward mentioned without immediate fee demand | `Promotional reward or giveaway claim detected (cash prize)` |
| **Brand Impersonation** | `+25` | Known brands (`PayPal`, `Chase`, `Microsoft`, `FedEx`, `Apple`) paired with account or payment lures | `Brand impersonation pattern: Target brand 'Paypal' paired with security or payment lure` |
| **Threat & Legal Consequences** | `+20` | Coercive intimidation (`legal action`, `penalty`, `sim blocked`, `police action`, `arrest`, `court`) | `Coercive threat or punitive consequence language detected: 'legal action'` |
| **Embedded Phishing URL** | `+35` | Embedded HTTP/HTTPS link flagged as phishing by static `analyze_url()` engine | `Embedded link 'http://...' flagged as high-risk phishing destination` |
| **Embedded Suspicious URL** | `+20` | Embedded HTTP/HTTPS link flagged as suspicious by static `analyze_url()` engine | `Embedded link 'http://...' exhibits suspicious characteristics` |
| **URL Shortener Cloak** | `+15` | Shortened link (`bit.ly`, `tinyurl.com`, `t.co`, `is.gd`) obscuring destination | `URL shortening service detected (destination domain is obscured)` |
| **URL + Urgency Synergy** | `+10` | Embedded link combined with panic pressure or account lock lure | *(Compound risk modifier)* |
| **Excessive Uppercase** | `+8` | Uppercase character ratio ≥ 50% across the message body | `Excessive uppercase lettering detected (attention-grabbing coercion pattern)` |
| **Excessive Punctuation** | `+5` | Multiple consecutive exclamation or question marks (`!!!`, `!?`) | `Excessive punctuation detected` |

---

## 3. Combination Logic & Synergies

Attackers rarely rely on a single isolated keyword. The engine employs **multi-signal synergy logic**:
1. **Urgency + Account Lock + Verification**: `15 + 20 + 20 = 55` (Elevates immediately to `suspicious`).
2. **Brand + Account Lock + Embedded Phishing URL**: `25 + 20 + 35 + 10 = 90` (High-confidence `phishing`).
3. **OTP Sharing Request + Bank Panic**: `35 + 25 = 60` (Elevated high-risk smishing tactic).
4. **Prize Winner + Account Verification**: `35 + 20 = 55` (Advance-fee fraud pattern).

---

## 4. Verdict Thresholds

| Risk Score Range | Verdict | Actionable Meaning |
| :---: | :---: | :--- |
| **0 – 29** | `safe` | Routine conversational or benign informational text. |
| **30 – 69** | `suspicious` | Elevated social engineering patterns or unverified payment/subscription prompts requiring caution. |
| **70 – 100** | `phishing` | Critical credential harvesting, brand impersonation, OTP extortion, or embedded phishing links. |

---

## 5. Confidence Methodology

Confidence is a heuristic score bounded between `0.50` and `0.98`:
- `0.85` for routine benign messages with zero suspicious triggers.
- `0.78` for safe messages containing single benign keywords (e.g. *"Your account settings were updated"*).
- `0.82` for suspicious multi-signal messages (`risk_score >= 30`).
- `0.94` for multi-signal high-risk phishing and brand spoofing combinations.

---

## 6. Static Embedded URL Analysis

When a message contains HTTP/HTTPS links:
1. URLs are extracted via regex `r'https?://[^\s<>"]+'`.
2. Each extracted link is passed directly into `analyze_url()` in Python.
3. No remote HTTP connection is made.
4. The URL heuristic score and indicators feed into the overall message threat evaluation.

---

## 7. False-Positive Controls & Safety

- Isolated words (like `account`, `bank`, `payment`, `meeting`) do not trigger phishing verdicts on their own.
- Legitimate informational notifications (e.g., *"Meeting is scheduled for tomorrow at 10 AM"*, *"Your account settings were updated successfully"*) stay in the `safe` zone (0–29).
- High-risk scoring requires **compound corroboration** (e.g., brand claim + lock claim + urgent verification demand).

---

## 8. Security Boundaries & Limitations

- **Zero Remote Execution**: Never opens links, sends SMS replies, or contacts phone numbers.
- **Untrusted Input**: All input is sanitized and validated.
- **Rule-Based Heuristic**: Operates on lexical patterns; does not maintain a real-time reputation database of phone numbers.
