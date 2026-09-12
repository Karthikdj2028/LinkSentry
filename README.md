# 🛡️ LinkSentry — AI-Assisted Phishing Detection & Threat Analysis Platform

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.0+-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white)](https://kotlinlang.org/)
[![Jetpack Compose](https://img.shields.io/badge/Jetpack%20Compose-Android-4285F4?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com/jetpack/compose)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

> Full-stack cybersecurity engineering project combining web, Android, backend, cloud persistence, threat analysis, and automated testing.

### 🌐 Live Demo

**Web Application:**  
https://linksentry-7e694.web.app/scanner?type=url

### 📦 GitHub Repository

https://github.com/Karthikdj2028/LinkSentry

---

## 📌 Overview

**LinkSentry** is a full-stack cybersecurity project designed to detect and analyze phishing and social-engineering threats across multiple input types.

The system supports analysis of:

- 🌐 Suspicious and potentially malicious URLs
- 📱 QR-based threats (quishing)
- 💬 SMS, email, and chat messages containing phishing indicators
- 🔎 Suspicious domains and lookalike URLs
- 📊 Historical scan activity and threat telemetry

The project combines a **React web application**, **native Android application**, **FastAPI backend**, **Firebase Authentication**, **Cloud Firestore**, automated testing, and a machine-learning-assisted URL analysis engine.

It was developed as a practical engineering project exploring:

- Defensive cybersecurity
- Full-stack application architecture
- Cross-platform application development
- Cloud authentication and persistence
- Threat analysis
- Automated testing
- Security-focused application design

> **Project Status:** Academic / Engineering Prototype  
> **Primary Focus:** Defensive Cybersecurity and Application Engineering

---

# ✨ Key Features

| Area | Capability | Description |
|---|---|---|
| 🌐 URL Analysis | ML + heuristic analysis | Analyzes URL structure, suspicious patterns, domain characteristics, and phishing-related indicators |
| 📱 QR Scanner | Quishing analysis | Extracts URLs from QR codes and sends them through the URL-analysis workflow |
| 💬 Message Analysis | Smishing detection | Identifies common social-engineering patterns, urgency indicators, suspicious links, and credential-harvesting language |
| 🔐 Authentication | Firebase Authentication | Provides user authentication and identity management |
| 🗄️ Scan History | Persistent records | Stores scan information for authenticated users |
| 🔄 Cross-Client Data | Shared persistence | Web and Android clients can access shared user-specific scan records |
| 📊 Dashboard | Threat telemetry | Presents aggregated scan and risk information |
| 🧪 Testing | Automated validation | Includes backend tests and additional application/security testing resources |

---

# 🌐 Live Demo

## Web Application

🔗 **https://linksentry-7e694.web.app/scanner?type=url**

The deployed web application provides the URL-scanning interface and demonstrates the project's threat-analysis workflow through the browser.

> ⚠️ **Demo safety:** Do not submit private URLs, credentials, authentication tokens, confidential messages, or other sensitive information to the public deployment.

---

# 🏗️ System Architecture

```text
                                  ┌───────────────────────────────┐
                                  │      FIREBASE AUTHENTICATION  │
                                  │       User Authentication     │
                                  └───────────────┬───────────────┘
                                                  │
                         ┌────────────────────────┴────────────────────────┐
                         │                                                 │
                         ▼                                                 ▼
             ┌─────────────────────────┐                       ┌─────────────────────────┐
             │     LinkSentry Web      │                       │   LinkSentry Android    │
             │       React + Vite      │                       │    Kotlin + Compose     │
             └───────────┬─────────────┘                       └───────────┬─────────────┘
                         │                                                 │
                         └────────────────┬────────────────────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │          CLOUD FIRESTORE        │
                         │                                 │
                         │  • User scan history            │
                         │  • Threat records               │
                         │  • Dashboard data               │
                         │  • Cross-client persistence     │
                         └────────────────┬────────────────┘
                                          │
                         ┌────────────────┴────────────────┐
                         │                                 │
                         ▼                                 ▼
             ┌─────────────────────────┐       ┌────────────────────────────┐
             │     FastAPI Backend     │       │    Threat Analysis Engine  │
             │                         │       │                            │
             │ POST /api/scan/url      │──────►│ ML-assisted URL analysis   │
             │ POST /api/scan/message  │       │ Domain analysis            │
             │ GET  /api/health        │       │ Heuristic checks           │
             └─────────────────────────┘       │ Pattern analysis            │
                                               └────────────────────────────┘
```

---

# 🧠 Threat Analysis

## 1. URL Analysis

The URL-analysis pipeline combines machine-learning-assisted classification with additional rule-based and structural checks.

Depending on the input, the analysis can consider:

- URL structure
- Suspicious keywords
- Domain characteristics
- High-entropy tokens
- Lookalike / typosquatting patterns
- Domain authority information
- Other phishing-related indicators

The current implementation uses a **LinearSVC-based classifier** together with additional decision logic and domain-analysis checks.

### Example Input

```text
https://secure-login-paypal.com/auth
```

### Example Response

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

> **Note:** Example values demonstrate the response structure and should not be interpreted as guaranteed classifications.

---

# 📱 QR / Quishing Analysis

LinkSentry can extract URLs from QR codes and pass the extracted payload through the URL-analysis workflow.

## Android

The Android implementation uses:

- **CameraX**
- **Google ML Kit**

## Web

The web application supports QR processing through browser camera/video functionality and upload-based handling where supported.

This provides a practical demonstration of detecting **quishing threats**, where malicious QR codes redirect users to phishing or fraudulent destinations.

---

# 💬 SMS, Email & Smishing Analysis

The message-analysis workflow evaluates text for common phishing and social-engineering indicators.

Examples include:

- Urgency and emotional pressure
- Account suspension claims
- Financial verification requests
- Credential-harvesting language
- Suspicious embedded links
- Delivery / courier scams
- Other social-engineering patterns

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

> **Note:** Example values demonstrate the response format.

---

# 📊 Security Dashboard

The dashboard presents aggregated information from stored scan records.

Depending on the current application implementation, this can include:

- Total scans
- Threat classifications
- Risk distribution
- Safe vs suspicious activity
- Recent scan activity
- Historical analysis

Dashboard information is backed by the project's Firestore persistence layer.

---

# 🗄️ Scan History

Authenticated scan records are stored using a user-specific Firestore structure:

```text
users/
  {uid}/
    scans/
      {scanId}
```

This allows scan history to remain associated with the authenticated user.

The web and Android clients use the same cloud-backed data model, allowing supported scan records to be accessed across clients.

---

# 🔐 Authentication & Data Security

LinkSentry uses **Firebase Authentication** for user identity management.

Firestore security rules restrict access to scan records based on the authenticated user's UID.

Example:

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

This rule prevents an authenticated user from accessing another user's scan documents through Firestore under the demonstrated data model.

> **Security note:** Firestore rules are only one layer of application security. A production system would additionally require appropriate backend authorization, input validation, secret management, rate limiting, monitoring, logging, abuse prevention, and secure deployment practices.

---

# 📡 REST API

The FastAPI backend provides endpoints used by the application.

## `POST /api/scan/url`

Analyzes a URL.

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

Analyzes a text message for phishing / smishing indicators.

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

Checks backend service availability.

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

The repository includes automated backend testing and additional testing resources.

## Backend Tests

Run:

```bash
python -m pytest backend/tests
```

The current backend test suite contains **56 tests**.

## Frontend Production Build

Run:

```bash
npm run build
```

## Additional Testing Resources

The repository also contains resources covering:

- End-to-end testing
- Android application testing
- Browser automation
- Security / vulnerability testing

See the corresponding directories for implementation details.

---

# 🚀 Quick Start

## Prerequisites

Install:

- **Python 3.11+**
- **Node.js 18+**
- **npm**
- **Java 21+**
- **Android Studio**
- **Android SDK**

---

## 1. Clone the Repository

```bash
git clone https://github.com/Karthikdj2028/LinkSentry.git
cd LinkSentry
```

---

# 2. Backend Setup

Create a Python virtual environment:

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

Start the FastAPI backend:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

If the repository startup script is available:

```powershell
.\start_backend.ps1
```

### Backend Health Check

```text
http://localhost:8000/api/health
```

### Swagger API Documentation

```text
http://localhost:8000/docs
```

### ReDoc

```text
http://localhost:8000/redoc
```

---

# 3. Web Application Setup

From the project root:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The development server is normally available at:

```text
http://localhost:5173/
```

Create a production build:

```bash
npm run build
```

---

# 4. Android Application Setup

Open the `android/` directory in **Android Studio**.

Alternatively, build the debug APK from the command line.

### Windows

```powershell
cd android
.\gradlew.bat assembleDebug
```

The debug APK is normally generated at:

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
├── backend/                    # FastAPI backend
│   ├── tests/                  # Backend test suite
│   └── ...
│
├── e2e/                        # End-to-end testing resources
├── src/                        # React web application
├── testing/                    # Additional testing resources
├── vulnerability-tests/        # Security testing resources
│
├── docs/
│   └── screenshots/            # Project screenshots
│
├── firestore.rules             # Firestore security rules
├── package.json                # Web dependencies and scripts
├── requirements.txt            # Python dependencies
├── README.md
└── ...
```

---

# 🛠️ Technology Stack

## Web

- React
- Vite
- JavaScript
- TypeScript
- HTML / CSS

## Backend

- Python
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

## Development & Testing

- Git
- GitHub
- Pytest
- Selenium
- Appium
- End-to-end testing tools

---

# 🧩 Engineering Concepts Demonstrated

LinkSentry was developed to explore several practical engineering concepts.

### Full-Stack Architecture

The project connects browser and Android clients with a backend threat-analysis service and cloud persistence layer.

### Cross-Client Data Persistence

Web and Android clients share authenticated user data through Firestore.

### Authentication and Authorization

Firebase Authentication provides identity while Firestore security rules enforce user-specific document access.

### Threat-Analysis Pipeline

Different analysis techniques are combined to produce a risk-oriented result instead of relying on a single indicator.

### Machine-Learning-Assisted Detection

The URL-analysis workflow includes a LinearSVC-based classifier alongside additional structural and heuristic checks.

### Automated Testing

Backend tests and additional E2E/security testing resources are included in the repository.

---

# 📸 Screenshots

> Place the screenshot files in `docs/screenshots/` using the filenames below.

## Web Scanner

![LinkSentry Web Scanner](docs/screenshots/web-scanner.png)

## URL Threat Analysis

![LinkSentry URL Analysis](docs/screenshots/url-analysis.png)

## Security Dashboard

![LinkSentry Dashboard](docs/screenshots/dashboard.png)

## QR Scanner

![LinkSentry QR Scanner](docs/screenshots/qr-scanner.png)

## Android Application

![LinkSentry Android Application](docs/screenshots/android-app.png)

---

# ⚠️ Limitations

LinkSentry is an **academic / engineering prototype** and should not be treated as a replacement for enterprise security platforms or professional threat-intelligence services.

Potential limitations include:

- Detection can produce false positives or false negatives.
- Machine-learning performance depends on the quality and coverage of training data.
- Threat-intelligence information can change over time.
- The public deployment may not provide enterprise-scale monitoring or operational controls.
- Threat classifications should not be considered an absolute guarantee that a URL or message is safe or malicious.

For security-sensitive decisions, LinkSentry should be treated as an **additional analysis tool**, not an authoritative security verdict.

---

# 🔒 Responsible Use

LinkSentry is intended for:

- Defensive cybersecurity research
- Educational purposes
- Security analysis
- Software engineering practice
- Application testing
- Demonstration of phishing-detection techniques

Do not use the project to facilitate:

- Phishing campaigns
- Credential theft
- Malware distribution
- Unauthorized access
- Account compromise
- Other malicious activity

Do not submit sensitive credentials, private communications, confidential URLs, authentication tokens, or other protected information to the public demo.

---

# 🎯 Project Goals

The main goals of LinkSentry are to explore the practical combination of:

- Cybersecurity
- Full-stack software development
- Mobile application development
- Cloud services
- Machine-learning-assisted classification
- Threat analysis
- Authentication and authorization
- Automated testing
- Security-focused application design

---

# 🔗 Project Links

### GitHub

https://github.com/Karthikdj2028/LinkSentry

### Live Web Application

https://linksentry-7e694.web.app/

### Developer

**Karthikeyan S**

Computer Science & Engineering

---

# 📄 License

This project is intended for **educational, research, and demonstration purposes**.

Copyright © Karthikeyan S.

All rights reserved.
