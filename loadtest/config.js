/**
 * LinkSentry k6 Load Testing Configuration
 * Defines base URLs, staging profiles, thresholds, and non-destructive payloads.
 */

export const BASE_URL = (typeof __ENV !== 'undefined' && __ENV.LOAD_TEST_BASE_URL)
  ? __ENV.LOAD_TEST_BASE_URL
  : (typeof process !== 'undefined' && process.env && process.env.LOAD_TEST_BASE_URL)
    ? process.env.LOAD_TEST_BASE_URL
    : 'https://linksentry-api.onrender.com';

export const payloads = {
  urlScan: {
    url: 'https://example.com',
  },
  messageScan: {
    message: 'Your account security settings were successfully updated.',
  },
};

export const headers = {
  'Content-Type': 'application/json',
};

export const options = {
  stages: [
    { duration: '10s', target: 5 },  // Ramp-up: 0 -> 5 VUs over 10s
    { duration: '20s', target: 10 }, // Ramp-up: 5 -> 10 VUs over 20s
    { duration: '30s', target: 10 }, // Steady state: 10 VUs for 30s
    { duration: '10s', target: 0 },  // Ramp-down: 10 -> 0 VUs over 10s
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],                   // Error rate must remain below 5%
    http_req_duration: ['p(95)<2000', 'p(99)<4000'], // Latency: p95 < 2s, p99 < 4s
    checks: ['rate>0.95'],                            // Assertion checks pass rate > 95%
  },
};

export default {
  BASE_URL,
  payloads,
  headers,
  options,
};
