# LinkSentry Multi-Tier QA Testing Repository & Workbook Guide

This directory contains the official **LinkSentry Master Test Repository (1,015+ Test Cases)**, automated test suites, execution artifacts, evidence reports, and the professional Excel workbook [`LinkSentry_Test_Cases.xlsx`](./LinkSentry_Test_Cases.xlsx).

---

## 1. Directory Structure

```text
testing/
├── LinkSentry_Test_Cases.xlsx    # Enterprise Master Test Repository (17 Worksheets, 1,015 Cases)
├── selenium/                     # Selenium WebDriver Web E2E Test Suite
│   ├── config/                   # Web browser capabilities & target URL config
│   ├── data/                     # Threat fixtures & test oracle data
│   └── tests/                    # 360 automated web test cases
├── appium/                       # Appium 2.x Android Native Test Suite
│   ├── config/                   # UiAutomator2 device caps (Samsung SM_E055F / Emulator)
│   └── tests/                    # 335 automated Android test cases
├── load/                         # k6 Backend API & Performance Load Suite
│   ├── config/                   # Multi-stage load profiles & rate limits
│   └── scenarios/                # 320 automated API concurrency checks
├── reports/                      # HTML, XML & JSON execution reports
├── screenshots/                  # Failure and regression image evidence
└── README.md                     # This documentation guide
```

---

## 2. Master Excel Workbook (`LinkSentry_Test_Cases.xlsx`)

The workbook is organized into **17 dedicated worksheets** with freeze panes, auto-filters, conditional status formatting, and zero duplicate Test Case IDs:

| # | Worksheet Name | Scope & Purpose | Case Count |
|---|---|---|---|
| 1 | **README** | Overview, architecture summary, and execution instructions | Meta |
| 2 | **Test Case Summary** | High-level metrics, suite distributions, priority counts | KPI Matrix |
| 3 | **Selenium Web Tests** | Complete Web E2E suite across Chrome, Firefox, Edge | **360 Cases** |
| 4 | **Appium Android Tests** | Native Android Jetpack Compose & CameraX suite | **335 Cases** |
| 5 | **Load Performance Tests** | FastAPI backend concurrency, rate limit & soak checks | **320 Cases** |
| 6 | **Authentication** | Email/Password, Google OAuth 2.0, Reset, Session | 65 Cases |
| 7 | **Overview** | KPI metric cards, threat battery visualizer, navigation | 56 Cases |
| 8 | **Scanner** | URL Phishing, Optical QR Quishing, Message Smishing | 661 Cases |
| 9 | **Scan History** | Unified Firestore/Room logs, search, inspect, delete | 51 Cases |
| 10 | **Analytics** | SOC Threat exposure rate, attack vectors, domain radar | 16 Cases |
| 11 | **Security Center** | Dynamic defense shield score, active sensors, incidents | 16 Cases |
| 12 | **Profile** | Account identity, cloud sync toggle, session sign out | 33 Cases |
| 13 | **Security Audit Report** | Full-width A4 Print/PDF, metadata grid, CSV export | 16 Cases |
| 14 | **Firebase - Cloud Sync** | Multi-tenant Firestore isolation, DataStore persistence | 123 Cases |
| 15 | **UI & Theme** | Dark cyber theme, Light high-contrast mode, responsiveness | 59 Cases |
| 16 | **Regression Tests** | Critical path blocker & high-severity regression suite | 484 Cases |
| 17 | **Defect - Execution Log** | Traceability log for discovered issues and fix notes | Bug Tracker |

---

## 3. Test Suite Execution Instructions

### A. Running Selenium Web Tests (360 Cases)
```bash
# Navigate to Selenium suite directory
cd qa/selenium

# Install dependencies if not already installed
npm install

# Run full Selenium test suite (Headless Chrome)
npm test
# Or execute the suite runner directly:
node tests/selenium-suite-runner.js
```
- **Target URL**: `https://linksentry-7e694.web.app` or `http://localhost:5173`
- **Output Report**: `testing/reports/selenium-report.html`

---

### B. Running Appium Android Native Tests (335 Cases)
```bash
# Ensure Appium 2.x server is running
appium --port 4723

# Ensure Android physical device (e.g. Samsung SM_E055F) or emulator is connected via ADB
adb devices

# Run Appium UiAutomator2 test suite
cd qa/appium
npm test
# Or execute runner directly:
node tests/appium-suite-runner.js
```
- **Target Package**: `com.linksentry.app` (`MainActivity`)
- **Driver**: `uiautomator2`
- **Output Report**: `testing/reports/appium-report.html`

---

### C. Running k6 Backend API Load Tests (320 Cases)
```bash
# Ensure FastAPI backend is running
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# In a separate terminal, execute k6 load checks:
cd qa/k6
npm test
# Or run with native k6 binary:
k6 run scenarios/k6-suite-runner.js
```
- **Target API**: `http://127.0.0.1:8000`
- **Output Report**: `testing/reports/k6-load-report.html`

---

## 4. How to Update the Excel Execution Status

1. Open [`testing/LinkSentry_Test_Cases.xlsx`](./LinkSentry_Test_Cases.xlsx) in Excel, LibreOffice Calc, or Google Sheets.
2. Select the relevant test sheet (e.g. `Selenium Web Tests`, `Appium Android Tests`, or `Load Performance Tests`).
3. For executed test rows, update:
   - **`Execution Status`**: Choose `Passed`, `Failed`, or `Blocked` from the status column.
   - **`Actual Result`**: Document the observed behavior.
   - **`Execution Duration`**: Input execution time (e.g. `124ms`).
   - **`Defect ID`**: If failed, record the defect ID (e.g. `DEF-001`).
   - **`Screenshot / Evidence`**: Link the evidence file in `testing/screenshots/`.
4. Save the workbook and commit it directly to GitHub:
   ```bash
   git add testing/LinkSentry_Test_Cases.xlsx testing/reports/ testing/screenshots/
   git commit -m "qa: update test execution results in LinkSentry_Test_Cases.xlsx"
   git push origin main
   ```

---

## 5. Direct Download from GitHub

To download the latest execution-ready workbook directly from GitHub:
1. Navigate to the GitHub repository: `https://github.com/Karthikdj2028/LinkSentry`
2. Open the `testing/` folder.
3. Click on [`LinkSentry_Test_Cases.xlsx`](./LinkSentry_Test_Cases.xlsx) and click **Download Raw File**.
