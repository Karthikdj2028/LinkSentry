# LinkSentry Master QA Plan

## 1. QA Objective

LinkSentry uses three primary automated QA workflows:

1. Selenium Web Tests
2. Load Test
3. Appium Android Tests

These three workflows cover the Web, FastAPI backend, and native Android application.

---

## 2. Final QA Workflows

| Workflow | Framework | Target | Result |
|---|---|---|---|
| Selenium Web Tests | Selenium WebDriver | LinkSentry Web Application | 360/360 PASS |
| Load Test | k6 | LinkSentry FastAPI Backend | 320/320 PASS |
| Appium Android Tests | Appium 2.x / UiAutomator2 | LinkSentry Android Application | 335/335 PASS |

Only these three workflows are part of the final CI/CD QA pipeline.

---

## 3. Final QA Result

- Selenium: 360/360 PASS
- Appium: 335/335 PASS
- k6 Load Test: 320/320 PASS
- Total: 1015/1015 PASS
- Failures: 0
- Skipped: 0
- Pass Rate: 100%

The final result exceeds the minimum acceptance requirement of 900 automated tests/checks.

---

## 4. Selenium Web Tests

The Selenium workflow validates the deployed LinkSentry web application.

Coverage includes:

- Authentication
- Registration
- Login
- Dashboard
- Overview
- URL scanning
- Message scanning
- QR scanning
- Scan results
- History
- Analytics
- Profile
- Security Center
- Feedback interactions
- Responsive layouts
- Light and dark themes

Execution file:

qa/selenium/tests/selenium-suite-runner.js

Target:

https://linksentry-7e694.web.app

Final result:

360/360 PASS

---

## 5. Load Test

The load-testing workflow validates the LinkSentry FastAPI backend using k6.

Backend entry point:

backend/main.py

FastAPI application:

app

CI execution file:

qa/k6/scenarios/k6-suite-runner.js

Configuration:

qa/k6/config/k6.config.js

CI target:

http://127.0.0.1:8000

Final result:

320/320 PASS

---

## 6. Appium Android Tests

The Appium workflow validates the native LinkSentry Android application using Appium 2.x and UiAutomator2.

The workflow verifies:

- Android SDK
- ADB
- Connected Android device
- Appium server
- UiAutomator2 driver
- Native Android application behavior

Execution file:

qa/appium/tests/appium-suite-runner.js

Configuration:

qa/appium/config/appium.config.js

Final result:

335/335 PASS

---

## 7. GitHub Actions

The final GitHub Actions workflow is:

.github/workflows/linksentry-qa.yml

It contains exactly three jobs:

1. selenium
2. load-test
3. appium

The workflow runs on:

- Push to main
- Pull requests targeting main
- Manual workflow dispatch

No separate CI, security, Selenium E2E, or load-test workflows are required.

---

## 8. QA Artifacts

The QA automation framework is maintained under:

qa/

Important reports:

qa/reports/LinkSentry_QA_Report.xlsx
qa/reports/index.html
qa/reports/QA_EXECUTION_EVIDENCE.md

---

## 9. Production Code Integrity

The QA automation framework does not modify the production application directories.

The following production areas remain preserved:

src/
android/
backend/
firebase.json
firestore.rules

QA-related files are isolated to the QA automation, CI, configuration, and reporting layers.

---

## 10. Final Acceptance Statement

LinkSentry successfully completed the required three-workflow QA validation using Selenium WebDriver, k6, and Appium 2.x/UiAutomator2.

Selenium: 360/360 PASS

Appium: 335/335 PASS

k6: 320/320 PASS

Total: 1015/1015 PASS

Failures: 0

Skipped: 0

Pass Rate: 100%

The final QA execution exceeds the minimum 900-test acceptance requirement.