import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { BASE_URL, payloads, headers, options as configOptions } from '../config.js';

// Export k6 test options
export const options = configOptions;

// Custom Metrics
export const successfulRequests = new Counter('successful_requests');
export const failedRequests = new Counter('failed_requests');
export const healthChecks = new Counter('health_checks');
export const urlScans = new Counter('url_scans');
export const messageScans = new Counter('message_scans');

export default function () {
  const rand = Math.random();

  if (rand < 0.30) {
    // 30% Traffic Mix: Health Endpoint Check
    healthChecks.add(1);
    const res = http.get(`${BASE_URL}/api/health`);
    const passed = check(res, {
      'health status is 200': (r) => r.status === 200,
      'health body is valid json': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'ok';
        } catch {
          return false;
        }
      },
    });

    if (passed) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
  } else if (rand < 0.65) {
    // 35% Traffic Mix: URL Threat Scanner Analysis
    urlScans.add(1);
    const payload = JSON.stringify(payloads.urlScan);
    const res = http.post(`${BASE_URL}/api/scan/url`, payload, { headers });
    const passed = check(res, {
      'url scan status is 200': (r) => r.status === 200,
      'url scan returns detection schema': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (
            typeof body.verdict === 'string' &&
            typeof body.risk_score === 'number' &&
            typeof body.engine === 'string'
          );
        } catch {
          return false;
        }
      },
    });

    if (passed) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
  } else {
    // 35% Traffic Mix: Message / Smishing Threat Scanner Analysis
    messageScans.add(1);
    const payload = JSON.stringify(payloads.messageScan);
    const res = http.post(`${BASE_URL}/api/scan/message`, payload, { headers });
    const passed = check(res, {
      'message scan status is 200': (r) => r.status === 200,
      'message scan returns detection schema': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (
            typeof body.verdict === 'string' &&
            typeof body.risk_score === 'number' &&
            typeof body.engine === 'string'
          );
        } catch {
          return false;
        }
      },
    });

    if (passed) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
  }

  // Rate-limit-safe pacing.
// The backend allows 60 requests/minute per client.
// With up to 10 VUs, each VU waits ~12-15 seconds,
// keeping aggregate traffic comfortably below the limit.
sleep(Math.random() * 3.0 + 12.0);
}

/**
 * Generates custom JSON test summary report and human-readable terminal output.
 */
export function handleSummary(data) {
  const getMetric = (name) => data.metrics?.[name]?.values ?? {};

  const reqValues = getMetric('http_reqs');
  const durationValues = getMetric('http_req_duration');
  const failedValues = getMetric('http_req_failed');
  const checkValues = getMetric('checks');

  const reqCount = Number(reqValues.count ?? 0);

  const p95Value = Number(durationValues['p(95)'] ?? 0);
  const p99Value = Number(durationValues['p(99)'] ?? 0);

  const failRate = Number(failedValues.rate ?? 0) * 100;
  const checkRate = Number(checkValues.rate ?? 1) * 100;

  const stdoutSummary = [
    '',
    '====================================================================',
    '                   LinkSentry k6 Load Test Summary                  ',
    '====================================================================',
    `Target Base URL:       ${BASE_URL}`,
    `Total HTTP Requests:   ${reqCount}`,
    `Checks Pass Rate:      ${checkRate.toFixed(2)}%`,
    `HTTP Failure Rate:     ${failRate.toFixed(2)}%`,
    `Latency p(95):         ${p95Value.toFixed(2)} ms`,
    `Latency p(99):         ${p99Value.toFixed(2)} ms`,
    '====================================================================',
    '',
  ].join('\n');

  return {
    'loadtest/reports/summary.json': JSON.stringify(data, null, 2),
    stdout: stdoutSummary,
  };
}
