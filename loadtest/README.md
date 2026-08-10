# LinkSentry Backend Load Testing Framework (k6)

This directory contains the production-safe, non-destructive backend load testing suite for LinkSentry using [k6](https://k6.io/).

---

## 1. Purpose

The purpose of this load testing suite is to validate the performance, concurrency limits, and stability of the LinkSentry FastAPI backend under real-world multi-client conditions without generating destructive traffic or corrupting per-user Firestore records.

---

## 2. Installation

Install k6 on your system:

### Windows (Winget or Chocolatey)
```powershell
winget install k6 --source winget
# or
choco install k6
```

### macOS (Homebrew)
```bash
brew install k6
```

### Linux (Debian/Ubuntu)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

---

## 3. Local Execution

Run the load test against the default target (`https://linksentry-api.onrender.com`):

```bash
k6 run loadtest/scenarios/api-load.test.js
```

### Overriding the Target API URL

#### PowerShell (Windows):
```powershell
$env:LOAD_TEST_BASE_URL="https://linksentry-api.onrender.com"
k6 run loadtest/scenarios/api-load.test.js
```

#### Bash / macOS / Linux:
```bash
LOAD_TEST_BASE_URL="https://linksentry-api.onrender.com" k6 run loadtest/scenarios/api-load.test.js
```

---

## 4. Environment Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `LOAD_TEST_BASE_URL` | `https://linksentry-api.onrender.com` | Target LinkSentry FastAPI base URL. |

---

## 5. Load Profile

The test executes a staged ramping profile totaling ~70 seconds:

```
VUs (Virtual Users)
 10 |                 +-----------------------+
    |                /                         \
  5 |    +----------+                           \
    |   /                                        \
  0 +--+----------+--------------------------+----+
      0s   10s    30s                        60s  70s
```

- **0s → 10s**: Ramp-up from 0 to 5 Virtual Users (VUs).
- **10s → 30s**: Ramp-up from 5 to 10 VUs.
- **30s → 60s**: Steady-state load sustained at 10 VUs.
- **60s → 70s**: Graceful ramp-down from 10 to 0 VUs.

---

## 6. Endpoints Tested & Traffic Mix

The test distributes traffic realistically with random pacing jitter:

| Endpoint | Method | Traffic Mix | Payload | Validation Criteria |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | ~30% | None | HTTP 200, `status == "ok"` |
| `/api/scan/url` | `POST` | ~35% | `{"url": "https://example.com"}` | HTTP 200, detection schema (`verdict`, `risk_score`, `engine`) |
| `/api/scan/message` | `POST` | ~35% | `{"message": "Your account security settings were successfully updated."}` | HTTP 200, detection schema (`verdict`, `risk_score`, `engine`) |

---

## 7. Performance Thresholds

The load test enforces conservative production-grade thresholds:

- **`http_req_failed`**: `rate < 0.05` (< 5% failed requests).
- **`http_req_duration`**:
  - `p(95) < 2000ms` (95% of requests completed under 2.0 seconds).
  - `p(99) < 4000ms` (99% of requests completed under 4.0 seconds).
- **`checks`**: `rate > 0.95` (> 95% of assertions passed).

---

## 8. GitHub Actions Execution

The load test runs automatically via GitHub Actions:
- **Workflow**: `.github/workflows/load-test.yml`
- **Triggers**:
  - `push` to `main`
  - Manual trigger via `workflow_dispatch`
- **Artifacts**: Uploads `loadtest/reports/summary.json` as `linksentry-load-test-report`.

---

## 9. How to Interpret Failures

When a test run fails, examine the summary metrics:

1. **Threshold Violation on `http_req_failed`**:
   - Indicates HTTP 5xx server errors, rate limiting (HTTP 429), or backend timeouts.
   - Check Render backend logs for unhandled exceptions or memory limits.
2. **Threshold Violation on `http_req_duration (p95 / p99)`**:
   - Indicates backend latency degradation under concurrency.
   - Check upstream network latency or cold-start spin-up times.
3. **Checks Failure (`checks rate < 95%`)**:
   - Indicates schema changes or unexpected response payloads.
