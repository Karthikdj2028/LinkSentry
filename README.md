# 🛡️ LinkSentry — AI-Powered Phishing Defense Platform

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.0+-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white)](https://kotlinlang.org/)
[![Jetpack Compose](https://img.shields.io/badge/Jetpack%20Compose-Android-4285F4?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com/jetpack/compose)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

> **A unified full-stack cybersecurity platform for detecting, analyzing, and tracking phishing and social-engineering threats across Web and Android.**

**Live Web Application:**  
https://linksentry-7e694.web.app/

**GitHub Repository:**  
https://github.com/Karthikdj2028/LinkSentry

---

## 🛡️ Overview

**LinkSentry** is an AI-powered, full-stack phishing defense platform engineered to identify and analyze a broad range of modern social-engineering and malicious-link threats.

The platform brings together a **React web application**, **native Android client**, **FastAPI threat-analysis backend**, **Firebase Authentication**, **Cloud Firestore persistence**, automated testing, and a multi-layer threat-analysis engine.

LinkSentry is designed around a unified security workflow in which users can submit a threat through multiple attack surfaces and receive structured risk analysis, indicators, classification results, and persistent scan history.

### Core threat surfaces

- 🌐 **Malicious URL Detection**
- 📱 **QR / Quishing Detection**
- 💬 **SMS & Email / Smishing Analysis**
- 🔎 **Lookalike & Typosquatting Detection**
- 📊 **Threat Telemetry & Security Dashboard**
- 🗄️ **Persistent Cross-Client Scan History**
- 🔐 **Authenticated User Security Records**

---

# 🚀 Platform Highlights

### 🌐 Multi-Client Security Architecture

LinkSentry delivers the same security workflow across:

- **Web — React 19 + Vite**
- **Android — Kotlin + Jetpack Compose**

Both clients integrate with a shared Firebase-backed identity and persistence layer.

### 🧠 Multi-Layer Threat Analysis

The URL pipeline combines machine-learning-assisted classification with deterministic security heuristics and domain-analysis techniques.

### 🔐 Identity-Aware Cloud Persistence

Firebase Authentication and Cloud Firestore provide authenticated user identity and persistent scan histories.

### 📊 Security Operations Dashboard

Threat activity can be aggregated into dashboard-oriented telemetry for rapid inspection of scan activity, classifications, and risk levels.

### 🧪 Automated Validation

The repository includes automated backend tests together with end-to-end, Android, browser, and security testing resources.

---

# 🌐 Live Application

## LinkSentry Web Scanner

🔗 **https://linksentry-7e694.web.app/scanner?type=url**

The deployed web application provides the browser-based threat-analysis experience.

The application includes the URL scanning workflow and the associated security analysis interface.

---

# 🏗️ System Architecture

```text
                                  ┌───────────────────────────────┐
                                  │      FIREBASE AUTHENTICATION  │
                                  │  Unified User Identity Layer  │
                                  └───────────────┬───────────────┘
                                                  │
                         ┌────────────────────────┴────────────────────────┐
                         │                                                 │
                         ▼                                                 ▼
             ┌─────────────────────────┐                       ┌─────────────────────────┐
             │     LinkSentry Web      │                       │   LinkSentry Android    │
             │    React 19 + Vite      │                       │   Kotlin + Compose      │
             └───────────┬─────────────┘                       └───────────┬─────────────┘
                         │                                                 │
                         │           Shared User Data                      │
                         └────────────────┬────────────────────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │          CLOUD FIRESTORE        │
                         │                                 │
                         │  • Scan History                 │
                         │  • Threat Records               │
                         │  • Dashboard Telemetry          │
                         │  • User-Specific Persistence     │
                         └────────────────┬────────────────┘
                                          │
                         ┌────────────────┴────────────────┐
                         │                                 │
                         ▼                                 ▼
             ┌─────────────────────────┐       ┌────────────────────────────┐
             │     FastAPI Backend     │       │   LinkSentry V3.3 Engine  │
             │                         │──────►│                            │
             │ POST /api/scan/url      │       │ LinearSVC                  │
             │ POST /api/scan/message  │       │ Tranco Domain Signals      │
             │ GET  /api/health        │       │ Typosquatting Detection    │
             └─────────────────────────┘       │ Heuristic Analysis         │
                                               └────────────────────────────┘
```

---

# ✨ Multi-Vector Threat Capabilities

| Vector | Feature | Description |
| :--- | :--- | :--- |
| 🌐 **URL Threat Detection** | **V3.3 ML + Decision Fusion** | Combines machine-learning classification, URL structural analysis, domain signals, entropy analysis, and phishing heuristics |
| 📱 **QR / Quishing Scanner** | **Optical Threat Analysis** | Extracts URLs from QR codes using camera and image-processing workflows before sending them through threat analysis |
| 💬 **SMS & Email Analysis** | **Smishing / Social Engineering Detection** | Detects urgency, account-suspension lures, financial pressure, credential-harvesting language, and embedded suspicious links |
| 🔎 **Domain Intelligence** | **Lookalike / Typosquatting Detection** | Identifies suspicious domains and brand-impersonation patterns |
| 📊 **SOC Dashboard** | **Real-Time Threat Telemetry** | Aggregates scan statistics, threat ratios, risk metrics, and security activity |
| 🗄️ **Audit History** | **Cross-Client Persistence** | Stores scan records in Firestore and makes authenticated history available across supported clients |

---

# 🧠 Threat Analysis Engine

## URL Threat Analysis

The URL-analysis engine evaluates multiple classes of indicators to determine the risk profile of a submitted URL.

### Analysis layers

- URL structure analysis
- Suspicious keyword detection
- Domain characteristics
- High-entropy token analysis
- Lookalike and typosquatting detection
- Brand impersonation indicators
- Domain authority signals
- Machine-learning classification
- Combined decision logic

The current URL-analysis implementation incorporates a **LinearSVC-based classifier** together with additional rule-based and structural analysis.

### Example

```text
Input:
https://secure-login-paypal.com/auth
```

Example response:

```json
{
  "verdict": "phishing",
  "risk_score": 92,
  "confidence": 0.95,
  "url": "https://secure-login-paypal.com/auth",
  "domain": "secure-login-paypal.com",
  "indicators": [
    "Brand impersonation detected: paypal",
    "Suspicious keywords in path: /auth",
    "High entropy token structure"
  ],
  "engine": "LinkSentry V3.3 URL ML Engine",
  "model_version": "V3.3"
}
```

---

# 📱 QR / Quishing Detection

LinkSentry extends URL analysis to QR-based attack vectors.

A QR code can contain a shortened, obfuscated, or malicious redirect that is difficult for a user to inspect manually. LinkSentry extracts the QR payload and feeds the resulting URL through the threat-analysis pipeline.

## Android QR Pipeline

- **CameraX**
- **Google ML Kit**
- QR payload extraction
- URL threat-analysis workflow

## Web QR Pipeline

The web client supports browser-based QR acquisition through camera/video functionality and upload-based handling.

---

# 💬 SMS, Email & Smishing Analysis

The message-analysis workflow evaluates textual content for social-engineering patterns commonly associated with phishing campaigns.

### Detection categories

- 🚨 Urgency and emotional pressure
- 🔐 Account verification / suspension lures
- 💳 Financial verification requests
- 📦 Delivery and courier lures
- 🔗 Embedded suspicious URLs
- 🪪 Credential-harvesting language
- 🧠 Social-engineering indicators

### Example Input

```json
{
  "message": "URGENT: Your bank account has been locked due to suspicious activity. Visit https://bank-verify.net to unlock immediately."
}
```

### Example Response

```json
{
  "verdict": "phishing",
  "risk_score": 88,
  "confidence": 0.90,
  "message": "URGENT: Your bank account...",
  "indicators": [
    "High urgency emotional pressure: URGENT / locked",
    "Suspicious banking verification lure",
    "Embedded unverified link: https://bank-verify.net"
  ],
  "engine": "LinkSentry Smishing Heuristic Engine"
}
```

---

# 📊 Security Operations Dashboard

LinkSentry provides a security-oriented dashboard for analyzing stored threat activity.

The dashboard can surface:

- Total scan activity
- Threat classifications
- Risk distribution
- Safe vs suspicious activity
- Recent scanning activity
- Historical scan records
- Aggregate security metrics

The dashboard is backed by Firestore data associated with authenticated users.

---

# 🗄️ Persistent Scan History

LinkSentry stores user scan records using a user-specific Firestore structure:

```text
users/
  {uid}/
    scans/
      {scanId}
```

This model provides:

- User-specific scan ownership
- Persistent scan history
- Structured audit records
- Cross-client history access
- Search and filtering support

---

# 🔐 Authentication & Security

LinkSentry uses **Firebase Authentication** to establish authenticated user identity.

Firestore security rules enforce per-user access to scan records.

### Firestore Security Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId}/scans/{scanId} {
      allow read, write, delete:
        if request.auth != null
        && request.auth.uid == userId;
    }
  }
}
```

This creates user-level isolation for the scan collection through authenticated UID matching.

---

# 📡 REST API

The FastAPI backend exposes dedicated endpoints for threat analysis and service health.

---

## `POST /api/scan/url`

Analyzes a submitted URL.

### Request

```json
{
  "url": "https://example.com"
}
```

### Response

```json
{
  "verdict": "safe",
  "risk_score": 10,
  "confidence": 0.92,
  "url": "https://example.com",
  "domain": "example.com",
  "indicators": []
}
```

---

## `POST /api/scan/message`

Analyzes a text message for phishing and smishing indicators.

### Request

```json
{
  "message": "Your account requires verification."
}
```

### Response

```json
{
  "verdict": "suspicious",
  "risk_score": 55,
  "confidence": 0.78,
  "indicators": [
    "Account verification language"
  ]
}
```

---

## `GET /api/health`

Checks backend availability.

### Response

```json
{
  "status": "ok",
  "service": "LinkSentry API",
  "version": "0.5.0"
}
```

---

# 🧪 Testing & Validation

LinkSentry includes automated tests and dedicated testing resources.

## Backend Test Suite

Run:

```bash
python -m pytest backend/tests
```

The current backend suite contains **56 tests**.

## Web Production Build

Run:

```bash
npm run build
```

## Testing Resources

The repository includes additional resources for:

- End-to-end testing
- Android application testing
- Browser automation
- Vulnerability/security testing
- Application validation

---

# 🚀 Quick Start

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **npm**
- **Java 21+**
- **Android Studio**
- **Android SDK**
- Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/Karthikdj2028/LinkSentry.git
cd LinkSentry
```

---

# 2. Backend Setup

Create a virtual environment:

```bash
python -m venv .venv
```

### Windows PowerShell

```powershell
.\.venv\Scripts\Activate.ps1
```

### macOS / Linux

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

Start FastAPI:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Optional startup script

```powershell
.\start_backend.ps1
```

### Backend health

```text
http://localhost:8000/api/health
```

### Swagger

```text
http://localhost:8000/docs
```

### ReDoc

```text
http://localhost:8000/redoc
```

---

# 3. Web Application

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Default development URL:

```text
http://localhost:5173/
```

Build for production:

```bash
npm run build
```

---

# 4. Android Application

Open the `android/` directory in Android Studio.

Or build the debug APK:

```powershell
cd android
.\gradlew.bat assembleDebug
```

Debug APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

---

# 📁 Repository Structure

```text
LinkSentry/
│
├── android/                    # Native Android application
│
├── backend/                    # FastAPI backend and threat analysis
│   ├── tests/                  # Backend test suite
│   └── ...
│
├── src/                        # React web application
│
├── e2e/                        # End-to-end testing resources
├── testing/                    # Application testing resources
├── vulnerability-tests/        # Security / vulnerability testing
│
├── firestore.rules             # Firestore access control
├── package.json                # Web dependencies and scripts
├── requirements.txt            # Python dependencies
├── start_backend.ps1           # Backend startup script
└── README.md
```

---

# 🛠️ Technology Stack

## Web

- React 19
- Vite 6
- JavaScript
- TypeScript
- HTML / CSS

## Backend

- Python 3.11+
- FastAPI
- Uvicorn
- Machine-learning components
- Rule-based threat analysis

## Android

- Kotlin
- Jetpack Compose
- CameraX
- Google ML Kit

## Cloud

- Firebase Authentication
- Cloud Firestore
- Firebase Hosting

## Security & Analysis

- LinearSVC
- URL structural analysis
- Domain analysis
- Typosquatting detection
- Heuristic threat detection
- Social-engineering analysis

## Testing

- Pytest
- Selenium
- Appium
- End-to-end testing
- Security / vulnerability testing

---

# 🧩 Engineering Highlights

## Unified Identity

A single authenticated user identity is used across supported LinkSentry clients.

## Cross-Client Persistence

Threat records stored in Firestore can be consumed by the Web and Android clients under the same authenticated user model.

## Layered Detection

Rather than relying on a single indicator, the URL pipeline combines machine-learning classification with structural, heuristic, and domain-oriented signals.

## Security-Oriented Storage

Firestore rules enforce user-level isolation on stored scan records.

## Extensible API Architecture

FastAPI provides dedicated endpoints for URL analysis, message analysis, and service health, creating a clean boundary between the clients and threat-analysis engine.

## Automated Testing

The project contains a dedicated backend test suite along with application, end-to-end, browser, Android, and security testing resources.

---

# 🎯 Platform Capabilities

LinkSentry brings multiple defensive capabilities into a single security platform:

```text
                    ┌───────────────────────────────┐
                    │          LinkSentry           │
                    │     Unified Threat Defense    │
                    └───────────────┬───────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
      URL Analysis            QR Analysis           Message Analysis
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    │
                                    ▼
                         Threat Classification
                                    │
                                    ▼
                           Risk & Indicators
                                    │
                                    ▼
                       Firestore Threat Records
                                    │
                                    ▼
                        Dashboard / Scan History
```

---

# 🔗 Project Links

### 🌐 Live Application

https://linksentry-7e694.web.app/

### 💻 GitHub Repository

https://github.com/Karthikdj2028/LinkSentry

### 📚 API Documentation

When running locally:

```text
http://localhost:8000/docs
```

---

# 👨‍💻 Project

**LinkSentry**  
AI-Assisted Phishing Detection & Threat Analysis Platform

**Developer:** Karthikeyan S

**Focus Areas:**

- Cybersecurity
- Full-stack development
- Mobile application engineering
- AI-assisted development
- Threat analysis
- Cloud architecture
- Automated testing
