# LinkSentry — Comprehensive System Audit & Verification Report

**Audit Date**: August 2026  
**Status**: IN-PROGRESS VERIFICATION & HARDENING  
**Scope**: Full Stack (FastAPI Threat Engine V3.3, React 19 Web Client, Kotlin Jetpack Compose Android Client, Firebase Auth, Cloud Firestore, Security Rules)

---

## 1. Current Architecture Overview

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

## 2. Verified Components

| Component | Path / Location | Verification Details | Status |
| :--- | :--- | :--- | :--- |
| **Firestore Security Rules** | `firestore.rules` | Enforces `request.auth != null && request.auth.uid == userId` and `request.resource.data.userId == request.auth.uid` on all `users/{userId}/scans/{scanId}` paths. Default deny-all on other collections. | **VERIFIED SECURE** |
| **Firebase Auth (Web)** | `src/firebase/auth.js`, `src/context/AuthContext.jsx` | Clean Firebase client authentication with persistent session state, error code mapping (`getAuthErrorMessage`), and lifecycle management. | **VERIFIED** |
| **Firebase Auth (Android)** | `android/.../data/repository/AuthRepository.kt` | Uses `FirebaseAuth.getInstance()`. Resolves to the identical Firebase UID as Web for matching credentials. Emits Kotlin Flow `authStateFlow`. | **VERIFIED** |
| **Centralized Web API Config** | `src/config/api.js` | Exports sanitized `API_BASE_URL` with endpoints `/api/health`, `/api/scan/url`, `/api/scan/message`. | **VERIFIED** |
| **V3.3 ML Threat Engine** | `backend/ml/inference/url_model.py` | LinearSVC + Tranco Top-1M authority whitelist + hard-negative training + typosquatting detection + decision fusion. | **VERIFIED (56/56 Tests Passed)** |
| **Smishing Heuristic Engine** | `backend/message_detector.py` | Urgency signals, banking lures, courier impound detection, and embedded link extraction. | **VERIFIED** |
| **CORS & Origin Hardening** | `backend/main.py` | Authoritative regex origin validation matching localhost, LAN subnets (`192.168.x.x`, `10.x.x.x`), and sanitized domain lists with markdown stripping. | **VERIFIED** |
| **Android Scan Model** | `android/.../data/model/ScanRecord.kt` | Exact field parity with Firestore document schema (`userId`, `type`, `input`, `url`, `domain`, `verdict`, `riskScore`, `confidence`, `indicators`, `engine`, `modelVersion`, `source`, `createdAt`). | **VERIFIED** |
| **Android Fast API Retrofit** | `android/.../data/api/LinkSentryApiService.kt` | Interacts directly with `/api/health`, `/api/scan/url`, `/api/scan/message`. | **VERIFIED** |

---

## 3. Unverified / Partially Configured Components

| Component | Current State | Verification / Action Required |
| :--- | :--- | :--- |
| **Real-Time Cross-Client Synchronization** | Web `HistoryPage.jsx` and `DashboardPage.jsx` used one-time `getUserScans` promise calls rather than live `onSnapshot` subscriptions. | Implement `subscribeToUserScans()` with `onSnapshot` in `src/firebase/firestore.js` and connect to Web pages so Web updates immediately when Android scans. |
| **Document Schema Field Persistence in `saveScan`** | In `src/firebase/firestore.js`, `saveScan` explicitly reconstructed the payload without including `source` and `modelVersion` if passed directly. | Update `saveScan` to preserve `source` and `modelVersion`. |
| **Android Default Base URL** | `ApiClient.kt` defaulted to a temporary ngrok URL. | Provide smart fallback (`http://10.0.2.2:8000/` for emulator / configurable in Profile). |
| **Automated End-to-End Cross-Platform Verification Suite** | Manual testing required. | Create an automated Python / Node test script that registers User A, scans on Web simulation, verifies Firestore document, verifies retrieval in Android format, tests account isolation with User B, and tests real-time listeners. |
| **Appium Mobile Automated Tests** | Appium test configuration not yet created in workspace. | Set up Appium test suite in `e2e-mobile/` for Android APK automated flows. |

---

## 4. Bugs Found & Mitigations

1. **Bug 1: Web History and Dashboard did not subscribe to live Firestore updates**
   * *Root Cause*: `HistoryPage.jsx` and `DashboardPage.jsx` executed one-time `getUserScans()` queries inside `useEffect`.
   * *Impact*: When a scan was triggered on Android, the open Web client did not reflect the new scan until a page refresh.
   * *Mitigation*: Add `subscribeToUserScans(userId, callback, onError, maxCount)` in `firestore.js` using `onSnapshot` and invoke it in `HistoryPage` and `DashboardPage`.

2. **Bug 2: `saveScan()` payload missing `source` and `modelVersion` fields**
   * *Root Cause*: `saveScan()` reconstructed its payload omitting `source` and `modelVersion`.
   * *Impact*: Scans saved via `saveScan()` lacked platform source attribution (`web` vs `android`).
   * *Mitigation*: Ensure `source` and `modelVersion` are retained in `saveScan()`.

3. **Bug 3: Android default base URL tied to temporary ngrok tunnel**
   * *Root Cause*: Hardcoded string in `ApiClient.kt`.
   * *Impact*: If ngrok tunnel expired, Android client defaulted to unreachable host.
   * *Mitigation*: Default to local emulator loopback `http://10.0.2.2:8000/` with instant dynamic runtime configuration in Profile screen.

---

## 5. Changes Required

1. **`src/firebase/firestore.js`**:
   - Add `subscribeToUserScans(userId, callback, onError, maxCount)` using `onSnapshot`.
   - Update `saveScan` to include `source` and `modelVersion`.
2. **`src/pages/HistoryPage.jsx` & `src/pages/DashboardPage.jsx`**:
   - Replace one-off fetch with `subscribeToUserScans` to achieve instantaneous real-time sync across Web and Android.
3. **`android/.../data/api/ApiClient.kt`**:
   - Improve default URL resolution.
4. **Cross-Platform Verification Script (`tests/test_cross_platform_sync.py`)**:
   - Programmatically test Web $\rightarrow$ Android sync, Android $\rightarrow$ Web sync, real-time snapshot events, and User A / User B account isolation against live Firebase Auth and Firestore.
5. **Appium Mobile Automation Suite (`e2e-mobile/`)**:
   - Implement the 14 mandatory Appium test flows against the Android debug APK.

---

## 6. Required Test Matrix

| Test ID | Test Name | Target Layer | Expected Result |
| :--- | :--- | :--- | :--- |
| **TEST-01** | Single Identity Resolution | Firebase Auth | User A email/pass on Web & Android returns identical Firebase UID. |
| **TEST-02** | Web $\rightarrow$ Android Scan Sync | Firestore (`users/{uid}/scans`) | Scan created on Web immediately appears in Android scan history. |
| **TEST-03** | Android $\rightarrow$ Web Scan Sync | Firestore (`users/{uid}/scans`) | Scan created on Android immediately appears in Web scan history & SOC dashboard. |
| **TEST-04** | Real-Time Live Push Sync | Firestore `onSnapshot` | Creating a scan on one client updates the other client without page reload. |
| **TEST-05** | Account Isolation Security | `firestore.rules` | User B cannot view, query, modify, or delete any of User A's scans. |
| **TEST-06** | Identical ML Engine Verdict | FastAPI `/api/scan/url` | Both Web and Android receive identical V3.3 verdict, score, confidence, and indicators for any given URL. |
| **TEST-07** | QR Camera & Fallback | CameraX / ML Kit | QR code containing URL sends payload to FastAPI and saves to shared Firestore. |
| **TEST-08** | Appium Mobile Automation | Android UI / Compose | Automated execution of the 14 defined mobile journeys. |
