import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, payloads, headers } from '../config.js';

export const options = {
    vus: 2,
    duration: '35s',
};

export default function () {
    const urlPayload = JSON.stringify(payloads.urlScan);

    const response = http.post(
        `${BASE_URL}/api/scan/url`,
        urlPayload,
        { headers }
    );

    check(response, {
        'rate limit test returns valid response': (r) =>
            r.status === 200 || r.status === 429,
    });

    if (response.status === 429) {
        console.log(
            `[RATE LIMIT VERIFIED] HTTP 429: ${response.body}`
        );
    }

    sleep(0.2);
}