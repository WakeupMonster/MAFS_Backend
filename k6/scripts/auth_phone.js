import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { ENDPOINTS } from '../lib/constants.js';

// Load test data
const testData = new SharedArray('test_phones', () => {
    return JSON.parse(open('../data/test_phones.json'));
});

export const options = {
    scenarios: {
        // SCENARIO 1: Realistic Baseline (Unique users)
        normal_login: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 50 }, // Ramp up
                { duration: '1m', target: 100 }, // Sustained load
                { duration: '30s', target: 0 },   // Cool down
            ],
            tags: { scenario: 'normal' },
        },
        // SCENARIO 2: Abuse/Repeat Hit (Rate-limiting check)
        abuse_retry: {
            executor: 'constant-vus',
            vus: 5,
            duration: '1m',
            startTime: '30s', // Start after some normal traffic
            tags: { scenario: 'abuse' },
        },
    },
    thresholds: {
        'http_req_duration{scenario:normal}': ['p(95)<400'], // Normal requests should be fast
        'http_req_failed{scenario:normal}': ['rate<0.01'],   // Normal should not fail
    },
};

export default function () {
    const scenario = __ITER % 2 === 0 ? 'normal' : 'abuse'; // Distribute VUs slightly if needed, though executor handles it
    
    // Pick phones based on VU/Scenario
    let phoneData;
    if (scenario === 'normal') {
        // Unique phone for each VU to avoid lock contention
        phoneData = testData[__VU % testData.length];
    } else {
        // Abuse a small subset (first 5)
        phoneData = testData[__VU % 5];
    }

    const payload = JSON.stringify({
        phone: phoneData.phone,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'X-Test-VU': __VU, // Tagging for easier backend log filtering
        },
        tags: { scenario: scenario },
    };

    const res = http.post(ENDPOINTS.AUTH_PHONE, payload, params);

    if (scenario === 'normal') {
        check(res, {
            'is status 200': (r) => r.status === 200,
            'success is true': (r) => r.json().success === true,
        });
    } else {
        // We expect some 429s here once the rate limit kicks in
        check(res, {
            'is status 200 or 429': (r) => [200, 429].includes(r.status),
        });
        if (res.status === 429) {
            console.warn(`[ABUSE_TEST] Rate limited hit for ${phoneData.phone}`);
        }
    }

    // Realistic think time
    sleep(1);
}
