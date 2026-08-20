# LinkSentry Selenium Web E2E Testing Suite

Comprehensive automated E2E test suite covering **310 uniquely identified web test cases** (`WEB-001` to `WEB-310`).

## Prerequisites
- Node.js 18+
- Google Chrome browser
- LinkSentry FastAPI backend running on `http://127.0.0.1:8000`
- LinkSentry Web Frontend running on `http://localhost:5173`

## Quick Start Commands
```bash
# Run all 310 web tests headless
npm run test:web

# Run tests in headed browser mode
npm run test:web:headed

# Generate Excel Report (test-reports/web/Web_Test_Report.xlsx)
npm run test:web:report

# Generate Test Inventory
npm run test:web:inventory
```

## Structure
- `config/`: Selenium configuration and timeouts
- `drivers/`: Chrome WebDriver builder
- `page-objects/`: Page Object Models for Scanner, Navigation, History, Profile, QR Scanner
- `tests/`: 310 Test case definitions across 12 modules
- `generate-excel-report.js`: Multi-sheet styled Excel report generator
