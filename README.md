# 🛡️ LinkSentry — AI-Assisted Phishing Detection & Threat Analysis Platform

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.0+-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white)](https://kotlinlang.org/)
[![Jetpack Compose](https://img.shields.io/badge/Jetpack%20Compose-Android-4285F4?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com/jetpack/compose)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

LinkSentry is a **full-stack cybersecurity project** for detecting and analyzing:

- Phishing and suspicious URLs
- QR-based threats (quishing)
- Smishing and social-engineering messages
- Suspicious domains and lookalike URLs

The project combines a **React web application**, **native Android application**, **FastAPI backend**, **Firebase Authentication and Firestore**, automated testing, and a machine-learning-assisted URL analysis engine.

> **Project status:** Academic / engineering prototype  
> **Deployment:** Web application available for demonstration  
> **Focus:** Cybersecurity engineering, threat analysis, cross-platform applications, and automated testing

---

## 🌐 Live Demo

### Web Application

**LinkSentry Scanner:**  
https://linksentry-7e694.web.app/scanner?type=url

The live demo provides the web-based threat analysis interface.

> The public demo is intended for demonstration and testing. Do not submit sensitive, private, or confidential URLs/messages.

---

## ✨ Key Features

| Area | Capability | Description |
|---|---|---|
| 🌐 URL Analysis | ML + heuristic analysis | Examines URL characteristics, suspicious patterns, domain information, and other indicators |
| 📱 QR Scanner | QR threat analysis | Extracts URLs from QR codes and passes them through the threat-analysis workflow |
| 💬 Message Analysis | Smishing detection | Analyzes messages for urgency, credential-harvesting indicators, suspicious links, and social-engineering patterns |
| 📊 Security Dashboard | Threat telemetry | Displays aggregated security information from stored scan records |
| 🗄️ Scan History | Persistent history | Stores and retrieves scan results for authenticated users |
| 🔐 Authentication | Firebase Authentication | Provides user authentication and identity management |
| 🔄 Data Synchronization | Cross-client persistence | Web and Android clients use shared Firestore data for scan history |
| 🧪 Automated Testing | Backend + application testing | Includes backend tests and automated validation workflows |

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
             │   React 19 + Vite       │                       │   Kotlin + Compose      │
             └───────────┬─────────────┘                       └───────────┬─────────────┘
                         │                                                 │
                         │                                                 │
                         └────────────────┬────────────────────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │          CLOUD FIRESTORE        │
                         │                                 │
                         │  • Scan history                 │
                         │  • User-specific records        │
                         │  • Dashboard data               │
                         │  • Cross-client persistence     │
                         └────────────────┬────────────────┘
                                          │
                                          │
                         ┌────────────────┴────────────────┐
                         │                                 │
                         ▼                                 ▼
             ┌─────────────────────────┐       ┌────────────────────────────┐
             │     FastAPI Backend     │       │   Threat Analysis Engine  │
             │                         │       │                            │
             │ POST /api/scan/url      │──────►│ ML + heuristic analysis    │
             │ POST /api/scan/message  │       │ Domain analysis            │
             │ GET  /api/health        │       │ Typosquatting checks       │
             └─────────────────────────┘       │ Suspicious pattern checks │
                                               └────────────────────────────┘
