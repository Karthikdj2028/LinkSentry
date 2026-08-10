import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, payloads, headers } from '../config.js';

export const options = {
  vus: 10,
  duration: '20s',
};

export default function () {
  const tests = [
    {
      name: 'health',
      method: 'GET',
      url: `${BASE_URL}/api/health`,
    },
    {
      name: 'url',
      method: 'POST',
      url: `${BASE_URL}/api/scan/url`,
      body: JSON.stringify(payloads.urlScan),
    },
    {
      name: 'message',
      method: 'POST',
      url: `${BASE_URL}/api/scan/message`,
      body: JSON.stringify(payloads.messageScan),
    },
  ];

  for (const test of tests) {
    let response;

    if (test.method === 'GET') {
      response = http.get(test.url);
    } else {
      response = http.post(test.url, test.body, { headers });
    }

    if (response.status !== 200) {
      console.log(
        `[FAIL] ${test.name} -> HTTP ${response.status} | ${response.body}`
      );
    }
  }

  sleep(0.5);
}