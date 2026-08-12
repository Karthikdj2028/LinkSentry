# 🛡️ LinkSentry — AI-Powered Phishing Defense Platform

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.0+-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white)](https://kotlinlang.org/)
[![Jetpack Compose](https://img.shields.io/badge/Jetpack%20Compose-Android-4285F4?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com/jetpack/compose)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

**LinkSentry** is an enterprise-grade, multi-vector cybersecurity platform engineered to detect, classify, and neutralize deceptive digital attacks before they breach critical infrastructure. 

Built with a unified cross-platform architecture, LinkSentry protects users across both modern **Web browsers** and **Native Android devices**, maintaining a **single user identity** and **real-time synchronized threat telemetry**.

---

## 🌐 System Architecture

```
                                  ┌───────────────────────────────┐
                                  │      FIREBASE AUTHENTICATION  │
                                  │  (Single Source of Identity)  │
                                  └───────────────┬───────────────┘
                                                  │
                         ┌────────────────────────┴────────────────────────┐
                         │                                                 │
                         ▼                                                 ▼
             ┌─────────────────────────┐                       ┌─────────────────────────┐
             │     LinkSentry Web      │                       │   LinkSentry Android    │
             │   (React 19 + Vite)     │                       │ (Kotlin + Compose)      │
             └───────────┬─────────────┘                       └───────────┬─────────────┘
                         │                                                 │
                         │   users/{uid}/scans/{scanId}                    │   users/{uid}/scans/{scanId}
                         ▼                                                 ▼
        ┌─────────────────────────────────────────────────────────────────────────────────┐
        │                             CLOUD FIRESTORE CLUSTER                             │
        │  • Shared real-time audit trails & scan history                                 │
        │  • Synchronized SOC dashboard telemetry across devices                          │
        │  • Strict per-user security isolation (request.auth.uid == userId)              │
        └────────────────────────────────────────┬────────────────────────────────────────┘
                                                 │
                                                 │
                         ┌───────────────────────┴───────────────────────┐
                         ▼                                               ▼
             ┌─────────────────────────┐                       ┌─────────────────────────┐
             │   FastAPI Threat API    │                       │  LinkSentry V3.3 Engine │
             │  POST /api/scan/url     │ ────────────────────► │  LinearSVC + Tranco DB  │
             │  POST /api/scan/message │                       │  Typosquat + Heuristics │
             └─────────────────────────┘                       └─────────────────────────┘
```

---

## ✨ Multi-Vector Threat Capabilities

| Vector | Feature | Description |
| :--- | :--- | :--- |
| 🌐 **URL Threat Detonator** | **V3.3 ML + Decision Fusion** | Evaluates link structures using machine learning (LinearSVC trained with hard-negative datasets), Tranco Top-1M authority validation, high-entropy token analysis, and typosquatting/lookalike domain detection. |
| 📱 **QR Quishing Scanner** | **Optical Detonation** | Extracts and analyzes QR payloads from live camera feeds (CameraX + ML Kit on Android, HTML5 Video / Upload fallback on Web) to defend against rogue physical stickers and obscured redirects. |
| 💬 **SMS & Email Smishing** | **NLP Heuristic Engine** | Classifies social engineering lures, urgency triggers (account suspensions, courier impounds, financial freezes), credential harvesting forms, and concealed malicious links. |
| 📊 **SOC Dashboard** | **Real-Time Telemetry** | Aggregates live fleet threat ratios, safe asset percentages, and average risk metrics directly from synchronized Cloud Firestore streams. |
| 🗄️ **Audit History** | **Cross-Client Persistence** | Instantaneous two-way sync: scans detonated on Web instantly reflect on Android and vice versa, with filter chips and search. |

---

## 🚀 Quick Start Guide

### Prerequisites
* **Python 3.11+**
* **Node.js 18+** & **npm**
* **Java 21+** (for Android builds)
* **Android SDK** (API 35 / build-tools 34.0.0+)

---

### 1. Threat Backend (FastAPI + V3.3 ML)

```powershell
# Navigate to backend directory and activate virtual environment
cd D:\LinkSentry
.\start_backend.ps1
```
*Or manually:*
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
* Backend Health Check: `http://localhost:8000/api/health`
* Interactive API Documentation (Swagger): `http://localhost:8000/docs`

---

### 2. Web Application (React 19 + Vite)

```bash
# In the project root
npm install
npm run dev
```
* Dev Server URL: `http://localhost:5173/` or `http://localhost:4174/`
* Production Build: `npm run build`

---

### 3. Android Application (Kotlin + Jetpack Compose)

```powershell
# Navigate to android directory
cd android

# Build debug APK
.\gradlew.bat assembleDebug

# Output APK path:
# android/app/build/outputs/apk/debug/app-debug.apk
```
* Or open the `android/` directory directly in **Android Studio**.

---

## 📡 REST API Reference

### 1. `POST /api/scan/url`
Detonates and classifies a URL target.

**Request:**
```json
{
  "url": "https://secure-login-paypal.com/auth"
}
```

**Response:**
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

### 2. `POST /api/scan/message`
Evaluates text messages, emails, and chat messages for smishing tactics.

**Request:**
```json
{
  "message": "URGENT: Your bank account has been locked due to suspicious activity. Visit https://bank-verify.net to unlock immediately."
}
```

**Response:**
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

### 3. `GET /api/health`
Probes API service availability.

**Response:**
```json
{
  "status": "ok",
  "service": "LinkSentry API",
  "version": "0.5.0"
}
```

---

## 🧪 Testing & Validation

```bash
# Run complete Python threat engine test suite (56 tests)
python -m pytest backend/tests

# Run Web frontend production build verification
npm run build
```

---

## 🔒 Security & Firestore Rules

LinkSentry enforces strict per-user document isolation at the database layer in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/scans/{scanId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 📄 License
© LinkSentry CyberDefense Technologies. All rights reserved.
