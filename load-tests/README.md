# LinkSentry Load and Performance Testing Suite

Comprehensive performance testing framework covering **315 uniquely identified load test scenarios** (`LOAD-001` through `LOAD-315`) plus the **mandatory 300 Virtual Users for 1 Minute sustained baseline**.

## Prerequisites
- Node.js 18+
- Running LinkSentry FastAPI backend on `http://127.0.0.1:8000`

## Quick Start Commands
```bash
# Run the complete load test suite
npm run test:load

# Run the mandatory 300-VU for 1-minute baseline test directly
npm run test:load:baseline-300

# Generate Load Excel Report (test-reports/load/Load_Test_Report.xlsx)
npm run test:load:report

# Generate Load Test Inventory
npm run test:load:inventory
```

## Structure
- `scenarios/`: 315 Test scenarios across 7 categories
- `baseline-300-users.js`: Standalone runner for the 300-VU 1-minute sustained execution
- `generate-load-excel-report.js`: Multi-sheet styled Excel report generator with detailed SLA & endpoint breakdown
