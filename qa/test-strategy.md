# LinkSentry — QA Automation Test Strategy Document

**Document Version:** 1.0.0  
**Target Platform:** LinkSentry Web + LinkSentry Native Android + FastAPI Backend  
**Overall Target:** >= 900 Passing Test Cases / Checks (Selenium >= 300, Appium >= 300, k6 >= 300)  

---

## 1. Test Architecture Overview

The LinkSentry QA Automation Framework consists of three dedicated, specialized testing workflows coordinated via GitHub Actions CI/CD:

```
                      +----------------------------------+
                      |   GitHub Actions CI/CD Pipeline  |
                      +----------------------------------+
                                       |
         +-----------------------------+-----------------------------+
         |                             |                             |
         v                             v                             v
+------------------+         +-------------------+         +------------------+
| WORKFLOW 1:      |         | WORKFLOW 2:       |         | WORKFLOW 3:      |
| Selenium Web     |         | Appium Android    |         | k6 API Load      |
| (Node/Mocha/Chai)|         | (UiAutomator2)    |         | (k6 JS Engine)   |
| Target: >=300    |         | Target: >=300     |         | Target: >=300    |
+------------------+         +-------------------+         +------------------+
```

---

## 2. Workflow 1 — Selenium Web Automation Strategy

- **Target URL:** `https://linksentry-7e694.web.app`
- **Framework:** Selenium WebDriver + Node.js (ESM) + Mocha + Chai
- **Pattern:** Page Object Model (POM)
- **Directory Structure:**
  ```
  qa/selenium/
  ├── config/        # Environment & browser capability configs
  ├── drivers/       # Chrome / ChromeDriver manager
  ├── pages/         # Page Object Models (LoginPage, OverviewPage, ScannerPage, etc.)
  ├── tests/         # Test suites grouped by feature domain
  ├── data/          # Test data fixtures (URLs, messages, QR images)
  ├── utilities/     # Screenshot, reporting, and helper utilities
  ├── screenshots/   # Failure screenshot artifacts
  ├── logs/          # Selenium console execution logs
  └── reports/       # HTML & JSON test reports
  ```

### Selenium Test Category & Count Allocation (Target: 310 Tests)

| Category | Suite File | Description | Target Count |
|---|---|---|---|
| **1. Authentication** | `auth.test.js` | Login validation, bad credentials, password reset, logout, session persistence, token refresh | **35** |
| **2. URL Scanner** | `url_scanner.test.js` | Safe, phishing, suspicious URLs, IP addresses, ports, query params, Unicode, long URLs, Cloud Sync ON/OFF | **85** |
| **3. QR Scanner** | `qr_scanner.test.js` | Image file upload, QR decoding (URL, plain text, tel, SMS, Wi-Fi, vCard), malformed image handling, Cloud Sync ON/OFF | **65** |
| **4. Message Scanner** | `message_scanner.test.js` | Smishing messages, OTP scams, banking fraud, urgency cues, embedded links, Unicode obfuscation, Cloud Sync ON/OFF | **65** |
| **5. History Management** | `history.test.js` | Feed loading, real-time sync, search filtering, type filtering, scan item deletion, local vs remote state | **25** |
| **6. Overview Dashboard** | `overview.test.js` | KPI stat card calculations, threat radar rendering, quick action navigation links, refresh consistency | **20** |
| **7. Analytics View** | `analytics.test.js` | Aggregated threat charts, vector distribution split, risk tier breakdowns | **15** |
| **8. Security Center** | `security_center.test.js` | Shield score calculation, heuristic control toggles, threat telemetry feed | **15** |
| **9. Profile & Settings** | `profile.test.js` | User details, UID clipboard copy, password reset email trigger, theme switching, Cloud Sync preference | **20** |
| **10. Cross-Page Navigation** | `navigation.test.js` | Route switching, back/forward popstate handling, window resize, deep linking | **15** |
| **TOTAL SELENIUM TESTS** | | | **360** |

---

## 3. Workflow 2 — Appium Native Android Automation Strategy

- **Target Package:** `com.linksentry.app`
- **Target Activity:** `com.linksentry.app.MainActivity`
- **Target APK:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Framework:** Appium 2.x + UiAutomator2 Driver + Node.js + Mocha + Chai
- **Directory Structure:**
  ```
  qa/appium/
  ├── config/        # Appium server & capability configurations
  ├── drivers/       # UiAutomator2 driver session manager
  ├── pages/         # Android Screen Page Objects (AuthScreen, DashboardScreen, ScannerScreen, etc.)
  ├── tests/         # Native Android test suites
  ├── data/          # Mobile test fixtures & barcode images
  ├── utilities/     # Logcat capture, screenshot, ADB helpers
  ├── screenshots/   # Mobile failure screenshots
  ├── logs/          # Appium execution & ADB logs
  └── reports/       # Android test execution reports
  ```

### Appium Test Category & Count Allocation (Target: 310 Tests)

| Category | Suite File | Description | Target Count |
|---|---|---|---|
| **1. Authentication** | `auth_android.test.js` | App login, validation, bad credentials, password visibility toggle, session persistence, sign out | **30** |
| **2. Navigation & Layout** | `navigation_android.test.js` | Bottom navigation bar, screen transition state, orientation change, back button behavior | **35** |
| **3. URL Scanner** | `url_scanner_android.test.js` | Input URL, safe/suspicious/phishing verdicts, risk score, confidence, indicators, Cloud Sync ON/OFF | **75** |
| **4. QR Scanner & CameraX** | `qr_scanner_android.test.js` | Gallery QR selection, optical barcode classification, flashlight toggle, scan again, camera permission | **70** |
| **5. Message Scanner** | `message_scanner_android.test.js` | SMS text input, smishing classification, threat indicators, detected link extraction | **65** |
| **6. History & Deletion** | `history_android.test.js` | History list display, search filtering, item deletion, local history sync | **25** |
| **7. Profile & Settings** | `profile_android.test.js` | Preference toggles (Cloud Sync, Clipboard Detection, Real-time Protection, Theme), user info | **20** |
| **8. Intent & Share Handler** | `intent_android.test.js` | `ACTION_SEND` link share, `ACTION_PROCESS_TEXT` text selection routing to scanner | **15** |
| **TOTAL APPIUM TESTS** | | | **335** |

---

## 4. Workflow 3 — k6 Backend Load & Performance Testing Strategy

- **Target Backend API:** `https://linksentry-api.onrender.com` (or local `http://127.0.0.1:8000` for high-volume isolation)
- **Engine:** k6 (Go-based JS performance engine)
- **Directory Structure:**
  ```
  qa/k6/
  ├── scenarios/     # Load test scripts (baseline, load, stress, spike, soak)
  ├── data/          # Parameterized URL & message payload datasets
  ├── config/        # Performance threshold definitions
  ├── results/       # Raw JSON & CSV performance metrics
  └── reports/       # HTML & summary execution reports
  ```

### k6 Test Category & Check Allocation (Target: 320 Checks)

| Category | Scenario File | Execution Scenarios / Checks | Target Count |
|---|---|---|---|
| **1. API Health & Probes** | `health_checks.js` | Endpoint status, latency under load, header validation, CORS preflight checks | **30** |
| **2. URL Scanner Endpoints** | `url_scan_load.js` | Safe, phishing, suspicious, malformed, IP, long URLs, query parameters, boundary inputs | **110** |
| **3. Message Scanner Endpoints**| `message_scan_load.js` | Legitimate text, smishing, OTP scams, banking fraud, Unicode messages, max length boundary | **110** |
| **4. Rate Limiting & Error Handling**| `rate_limit_checks.js` | IP rate limit enforcement (429 Too Many Requests), invalid JSON (422), 500 safety | **40** |
| **5. Performance Profile Runs** | `performance_profiles.js` | Baseline, Load (20 VUs), Stress (50 VUs), Spike (100 VUs), Soak (10 mins) | **40** |
| **TOTAL K6 CHECKS** | | | **330** |

---

## 5. Unified QA Reporting Architecture

After test execution completes, the QA pipeline will assemble results into two unified artifacts:
1. **Excel Report:** `qa/reports/LinkSentry_QA_Report.xlsx` (Contains 9 detailed worksheets: Executive Summary, Selenium Results, Appium Results, k6 Results, Failed Tests, Test Data, Execution Logs, Environment, Module Coverage)
2. **HTML Dashboard:** `qa/reports/index.html` (Interactive visual dashboard with overall pass percentage and framework breakdown)

---

## 6. Target Summary Matrix

| Framework | Target Requirement | Strategy Allocation | Planned Executions | Status |
|---|---|---|---|---|
| **Selenium (Web)** | >= 300 | 360 | Real Browser Execution against Web App | READY |
| **Appium (Android)** | >= 300 | 335 | Native Android App Execution on Device/Emulator | READY |
| **k6 (API Load)** | >= 300 | 330 | Parameterized Backend Load Checks | READY |
| **TOTAL** | **>= 900** | **1,025** | **Full End-to-End Suite** | **READY** |
