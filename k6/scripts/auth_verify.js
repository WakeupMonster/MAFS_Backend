import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { ENDPOINTS } from '../lib/constants.js';

// Load the 100 test phone numbers
const testData = new SharedArray('test_phones', () => {
    return JSON.parse(open('../data/test_phones.json'));
});

// Since /auth/verify modifies the document and signs a JWT,
// it's computationally heavier than /auth/phone.
// We ramp up to 100 VUs.
export const options = {
    scenarios: {
        verify_flow: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 50 },  // Ramp up
                { duration: '1m', target: 100 },  // Sustained load
                { duration: '30s', target: 0 },   // Cool down
            ],
            tags: { scenario: 'verify' },
        },
    },
    thresholds: {
        // Since JWT signing and token pushing happen, latency might be slightly higher 
        'http_req_duration{endpoint:phone}': ['p(95)<800'],
        'http_req_duration{endpoint:verify}': ['p(95)<1500'],
        'http_req_failed': ['rate<0.01'], 
    },
};

export default function () {
    // Unique user per VU mapping to avoid massive lock contention 
    // on a single user document.
    const phoneData = testData[__VU % testData.length];
    
    const paramsCommon = {
        headers: {
            'Content-Type': 'application/json',
            'X-Test-VU': __VU, 
        }
    };

    // ----------------------------------------------------------------
    // STEP 1: Request OTP (/auth/phone)
    // ----------------------------------------------------------------
    const phonePayload = JSON.stringify({
        phone: phoneData.phone,
    });

    const resPhone = http.post(
        ENDPOINTS.AUTH_PHONE, 
        phonePayload, 
        Object.assign({}, paramsCommon, { tags: { endpoint: 'phone' } })
    );

    check(resPhone, {
        'Phone API status is 200': (r) => r.status === 200,
        'Phone OTP generated': (r) => r.json().success === true,
    });

    // Simulated think time (user reading SMS)
    sleep(Math.random() * 0.5 + 0.5); // 0.5 to 1 second

    // ----------------------------------------------------------------
    // STEP 2: Verify OTP (/auth/verify)
    // ----------------------------------------------------------------
    // We hardcoded '123456' in otp.service.js specifically for this test
    const verifyPayload = JSON.stringify({
        phone: phoneData.phone,
        otp: "123456" 
    });

    const resVerify = http.post(
        ENDPOINTS.AUTH_VERIFY, 
        verifyPayload, 
        Object.assign({}, paramsCommon, { tags: { endpoint: 'verify' } })
    );

    check(resVerify, {
        'Verify API status is 200': (r) => r.status === 200,
        'Verify success is true': (r) => r.json().success === true,
        'Verify returned accessToken': (r) => { 
            const data = r.json().data;
            return data && data.accessToken !== undefined; 
        },
    });

    // Relax sequence loop to emulate realistic traffic
    sleep(1);
}
