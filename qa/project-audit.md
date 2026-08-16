# LinkSentry — Comprehensive Repository Audit Document

**Audit Date:** August 16, 2026  
**Application Name:** LinkSentry  
**Scope:** Web Application, Android Native Application, FastAPI Backend API, Testing Infrastructure  

---

## 1. Web Application Architecture Audit

### 1.1 Overview & Tech Stack
- **Framework:** React 19 + Vite 8 Single Page Application (SPA)
- **Styling:** Custom Cyberpunk / Dark Mode Glassmorphism CSS Architecture (`App.css`, `index.css`)
- **Authentication:** Firebase Auth (Email/Password, Google OAuth, Session Persistence)
- **Database:** Cloud Firestore (`users/{uid}/scans/{scanId}`) + Local History (`localStorage` fallback)
- **Production Host:** `https://linksentry-7e694.web.app`

### 1.2 Web Routing & Component Structure
Routing is managed dynamically via `window.history.pushState` and `window.location.search` in [src/App.jsx](file:///d:/LinkSentry/src/App.jsx):

| Path / Parameter | React Page Component | Sub-Views / Tabs | Primary Responsibility |
|---|---|---|---|
| `/` or `/overview` | [OverviewPage.jsx](file:///d:/LinkSentry/src/pages/OverviewPage.jsx) | KPI Cards, Threat Radar, Quick Action Hub | System threat metrics & vector navigation |
| `/scanner?type=url` | [ScannerPage.jsx](file:///d:/LinkSentry/src/pages/ScannerPage.jsx) | [UrlScanner.jsx](file:///d:/LinkSentry/src/pages/scanners/UrlScanner.jsx) | URL threat analysis input & result visualization |
| `/scanner?type=qr` | [ScannerPage.jsx](file:///d:/LinkSentry/src/pages/ScannerPage.jsx) | [QrScanner.jsx](file:///d:/LinkSentry/src/pages/scanners/QrScanner.jsx) | Optical barcode / QR code file upload & decode |
| `/scanner?type=message` | [ScannerPage.jsx](file:///d:/LinkSentry/src/pages/ScannerPage.jsx) | [MessageScanner.jsx](file:///d:/LinkSentry/src/pages/scanners/MessageScanner.jsx) | Smishing & SMS threat message parsing |
| `/history` | [HistoryPage.jsx](file:///d:/LinkSentry/src/pages/HistoryPage.jsx) | Local & Remote Scan Feed | Real-time scan log table, filters, deletion |
| `/analytics` | [AnalyticsPage.jsx](file:///d:/LinkSentry/src/pages/AnalyticsPage.jsx) | Threat Radar, Vector Split | Aggregated threat charts & telemetry |
| `/security-center` | [SecurityCenterPage.jsx](file:///d:/LinkSentry/src/pages/SecurityCenterPage.jsx) | Shield Score, Heuristic Controls | Active threat shield configuration |
| `/profile` | [ProfilePage.jsx](file:///d:/LinkSentry/src/pages/ProfilePage.jsx) | Account Info, Cloud Sync Toggle | User profile, password reset, preference controls |
| Auth Portal | [AuthPage.jsx](file:///d:/LinkSentry/src/pages/auth/AuthPage.jsx) | `LoginPage.jsx` / `RegisterPage.jsx` | User authentication & registration portal |

### 1.3 Key Web DOM Selectors for Selenium Automation
- **Authentication:**
  - Login Email: `input[type="email"]`, `#login-email`
  - Login Password: `input[type="password"]`, `#login-password`
  - Submit Button: `button[type="submit"]`
  - Auth Switch Link: `.auth-switch-btn`, `button.switch-mode-btn`
  - Error Message: `.auth-error-message`, `.error-banner`
- **Navigation:**
  - Navbar Tabs: `nav .nav-item[data-tab="..."]`, `a[href="/scanner"]`, `a[href="/history"]`
  - Scanner Sub-tabs: `.scanner-tab-btn[data-subtab="url"]`, `[data-subtab="qr"]`, `[data-subtab="message"]`
- **Scanners:**
  - URL Input Field: `input.url-input-field`, `input[placeholder*="http"]`
  - URL Scan Submit: `button.scan-btn-primary`
  - Message Textarea: `textarea.message-textarea`, `textarea[placeholder*="message"]`
  - QR Upload Input: `input[type="file"].qr-file-input`
  - Verdict Badge: `.verdict-badge`, `.verdict-safe`, `.verdict-phishing`, `.verdict-suspicious`
  - Risk Score Meter: `.risk-score-value`, `.risk-meter-container`
  - Indicators List: `.indicator-item`, `.indicator-tag`
- **History & Settings:**
  - Search Filter: `input.history-search-input`
  - Filter Buttons: `.filter-btn[data-filter="all"]`, `[data-filter="phishing"]`
  - Cloud Sync Toggle: `input#cloud-sync-toggle`, `.cloud-sync-switch`
  - Theme Toggle: `button.theme-toggle-btn`

---

## 2. Android Application Architecture Audit

### 2.1 Overview & Tech Stack
- **Framework:** Native Kotlin + Jetpack Compose + Material3
- **Package Name:** `com.linksentry.app`
- **Launcher Activity:** `com.linksentry.app.MainActivity`
- **Target SDK:** Android 34 (Android 14) / Min SDK 24
- **Debug APK Location:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Target Device / Emulator:** Samsung SM_E055F (`R9ZY105SN5M`) / Android Virtual Device

### 2.2 Navigation & Compose Screen Structure

| Compose Route | Kotlin File | UI Responsibilities | Key Components |
|---|---|---|---|
| `splash` | [SplashScreen.kt](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/screens/splash/SplashScreen.kt) | Initialization & Auth Token Check | Cyber radar animation |
| `auth` | [AuthScreen.kt](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/screens/auth/AuthScreen.kt) | Sign In & Account Registration | Email/Password fields, submit button |
| `dashboard` | [DashboardScreen.kt](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/screens/dashboard/DashboardScreen.kt) | Security Overview & Metrics | Vector cards, recent scan feed |
| `scanner` | [ScannerScreen.kt](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/screens/scanner/ScannerScreen.kt) | Multi-Vector Threat Analysis | Vector selector, CameraX preview, input fields |
| `history` | [HistoryScreen.kt](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/screens/history/HistoryScreen.kt) | Scan History Feed & Search | Search bar, filter chips, scan items, delete action |
| `profile` | [ProfileScreen.kt](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/screens/profile/ProfileScreen.kt) | Settings, Preferences, Sign Out | Cloud sync toggle, theme selector, sign out button |

### 2.3 Android Intent Integration
- `Intent.ACTION_SEND` (`text/plain`): Shared text/links from external apps route directly to `ScannerScreen` with payload auto-populated.
- `Intent.ACTION_PROCESS_TEXT` (`text/plain`): Text Selection Context Menu triggers `ScannerScreen` directly from system text selections.

### 2.4 Android Selectors & Accessibility Identifiers
- **Bottom Navigation:** `Dashboard`, `Scanner`, `History`, `Profile` (by content description / text)
- **Scanner Vector Tabs:** `URL`, `QR Code`, `Message`
- **Scanner Inputs:** `Target URL`, `Message Text`, `Analyze URL`, `Analyze Message`
- **QR Controls:** `Camera`, `Flashlight`, `Gallery`, `Scan Again`
- **History Actions:** `Search`, `Clear`, `Delete` (content description: `"Delete"`)
- **Profile / Preferences:** `Sign Out`, `Cloud Sync`, `Theme`, `Clipboard Detection`

---

## 3. Backend API Architecture Audit

### 3.1 Overview & Technology Stack
- **Framework:** FastAPI (Python 3.11+) + Pydantic v2 + Uvicorn
- **Threat Engine:** LinkSentry V3.3 ML Threat Classifier + Heuristic Rule Fusion Engine
- **Production Base URL:** `https://linksentry-api.onrender.com`
- **Local Base URL:** `http://127.0.0.1:8000`

### 3.2 Endpoint Inventory

#### 1. Health Monitoring Endpoint
- **Path:** `GET /api/health`
- **Description:** System health check for load balancers and probes.
- **Response Format:**
  ```json
  {
    "status": "ok",
    "service": "LinkSentry API",
    "version": "0.5.0"
  }
  ```

#### 2. URL Threat Analysis Endpoint
- **Path:** `POST /api/scan/url`
- **Rate Limit:** 30 requests / minute per client IP
- **Request Body (`URLScanRequest`):**
  ```json
  {
    "url": "https://example.com"
  }
  ```
- **Response Format:**
  ```json
  {
    "verdict": "safe",
    "risk_score": 0,
    "confidence": 0.95,
    "url": "https://example.com",
    "domain": "example.com",
    "indicators": ["No significant threat indicators detected"],
    "engine": "LinkSentry V3.3 URL ML Engine",
    "modelVersion": "V3.3"
  }
  ```

#### 3. Message Threat Analysis Endpoint
- **Path:** `POST /api/scan/message`
- **Rate Limit:** 30 requests / minute per client IP
- **Request Body (`MessageScanRequest`):**
  ```json
  {
    "message": "URGENT: Your account has been compromised. Verify at https://secure-login.info"
  }
  ```
- **Response Format:**
  ```json
  {
    "verdict": "phishing",
    "risk_score": 92,
    "confidence": 0.98,
    "url": "https://secure-login.info",
    "domain": "secure-login.info",
    "indicators": ["Urgent language pattern detected", "Untrusted domain"],
    "engine": "linksentry-message-heuristic-v1",
    "modelVersion": "v1.0"
  }
  ```

---

## 4. Test Data & Security Boundaries

- **Dedicated QA Test Account:**
  - Email: `analyst.qa.test@linksentry.io`
  - Firebase UID: `oz7yHWnrMrR6U6QFbrHYTNpq9Eg2`
- **Cloud Firestore Storage Path:** `users/{uid}/scans/{scanId}`
- **Security Rules:** Unchanged ([firestore.rules](file:///d:/LinkSentry/firestore.rules)) — User-isolated scan subcollection write/read rules enforced.
