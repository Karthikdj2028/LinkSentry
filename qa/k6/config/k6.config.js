/**
 * LinkSentry k6 Performance & Load Test Configuration
 */
export const K6_CONFIG = {
  baseUrl: process.env.K6_BASE_URL || 'http://127.0.0.1:8000',
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% error rate
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    checks: ['rate>0.99'] // > 99% checks passing
  },
  stages: {
    baseline: [{ duration: '10s', target: 5 }],
    load: [{ duration: '20s', target: 20 }, { duration: '30s', target: 20 }, { duration: '10s', target: 0 }],
    stress: [{ duration: '15s', target: 50 }, { duration: '15s', target: 0 }],
    spike: [{ duration: '5s', target: 100 }, { duration: '10s', target: 0 }]
  }
};
