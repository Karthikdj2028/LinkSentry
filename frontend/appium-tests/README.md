# LinkSentry Appium Mobile E2E Testing Suite

Comprehensive automated mobile E2E test suite covering **315 uniquely identified mobile test cases** (`MOB-001` to `MOB-315`) for the LinkSentry Android Jetpack Compose application.

## Prerequisites
- Node.js 18+
- Java 21 JDK
- Android SDK (API 34 / 35) & ADB
- Appium 2.x / 3.x with UiAutomator2 driver (`appium driver install uiautomator2`)
- Running Android Emulator or connected physical device

## Quick Start Commands
```bash
# Run all 315 mobile tests
npm run test:mobile

# Generate Mobile Excel Report (test-reports/mobile/Mobile_Test_Report.xlsx)
npm run test:mobile:report

# Generate Mobile Test Inventory
npm run test:mobile:inventory
```

## Structure
- `config/`: Appium configuration and Android capabilities
- `drivers/`: UiAutomator2 remote WebDriver builder
- `page-objects/`: Screen Object Models for Jetpack Compose UI
- `tests/`: 315 Test case definitions across 13 modules
- `generate-excel-report.js`: Multi-sheet styled Excel report generator
