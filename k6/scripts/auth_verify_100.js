import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Note: Relative path adjusted for new script location
const testData = new SharedArray('test_phones', () => {
    return JSON.parse(open('../data/test_phones.json'));
});

export const options = {
    scenarios: {
        verify_flow: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 50 },   // Ramp up to 50 VUs
                { duration: '1m', target: 100 },  // Sustained load at 100 VUs
                { duration: '30s', target: 0 },    // Ramp down
            ],
            tags: { scenario: 'verify_100' },
        },
    },
    thresholds: {
        // Stricter thresholds for control test (Target < 500ms for 100 users)
        'http_req_duration{endpoint:phone}': ['p(95)<500'], 
        'http_req_duration{endpoint:verify}': ['p(95)<1000'], 
        'http_req_failed': ['rate<0.01'], 
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api/v1';

export default function () {
    const phoneData = testData[__VU % testData.length];
    
    const paramsCommon = {
        headers: {
            'Content-Type': 'application/json',
            'X-Test-VU': __VU, 
        }
    };

    // STEP 1: Request OTP (/auth/phone)
    const resPhone = http.post(
        `${BASE_URL}/auth/phone`, 
        JSON.stringify({ phone: phoneData.phone }), 
        Object.assign({}, paramsCommon, { tags: { endpoint: 'phone' } })
    );

    check(resPhone, {
        'Phone API status is 200': (r) => r.status === 200,
        'Phone OTP generated': (r) => r.json().success === true,
    });

    sleep(1); 

    // STEP 2: Verify OTP (/auth/verify)
    const resVerify = http.post(
        `${BASE_URL}/auth/verify`, 
        JSON.stringify({ phone: phoneData.phone, otp: "123456" }), 
        Object.assign({}, paramsCommon, { tags: { endpoint: 'verify' } })
    );

    check(resVerify, {
        'Verify API status is 200': (r) => r.status === 200,
        'Verify success is true': (r) => r.json().success === true,
    });

    sleep(1);
}
