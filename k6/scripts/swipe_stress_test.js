import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';

// --- CUSTOM METRICS ---
const errorRate = new Rate('app_error_rate');
const timeoutRate = new Rate('timeout_rate');
const transactionErrors = new Rate('mongo_transaction_errors');
const rateLimitHits = new Counter('rate_limit_429_hits');
const feedLatency = new Trend('latency_feed_get');
const swipeLatency = new Trend('latency_swipe_post');
const matchLatency = new Trend('latency_matches_get');

// --- DATA PREPARATION ---
// Ensure you have these JSON files in your k6/data folder
const tokens = new SharedArray('users', function () {
    try {
        return JSON.parse(open('../data/feed_tokens.json'));
    } catch (e) {
        return ['DUMMY_TOKEN']; // Fallback for script validation
    }
});

const targetProfiles = new SharedArray('targets', function () {
    try {
        return JSON.parse(open('../data/target_profiles.json'));
    } catch (e) {
        return ['664f1a2b3c4d5e6f7a8b9c0d']; // Fallback
    }
});

const BASE_URL = __ENV.API_URL || 'http://localhost:3001/api/v1';

// --- SCENARIO CONFIGURATION ---
// Run with: k6 run -e SCENARIO=mixed_flow k6/scripts/swipe_stress_test.js
const testScenario = __ENV.SCENARIO || 'mixed_flow';

export const options = {
    scenarios: {},
    thresholds: {
        'http_req_duration': ['p(95)<2000'], // Requirement: p95 < 2s
        'app_error_rate': ['rate<0.05'],     // Requirement: Error < 5%
    }
};

// 1. Feed Discovery Storm (2000 VUs fetching feed)
if (testScenario === 'feed_storm') {
    options.scenarios.feed_storm = {
        executor: 'constant-vus',
        vus: 2000,
        duration: '5m',
        exec: 'feedTask',
    };
}

// 2. Rapid Swipe Burst (2000 VUs swiping)
if (testScenario === 'swipe_burst') {
    options.scenarios.swipe_burst = {
        executor: 'constant-vus',
        vus: 2000,
        duration: '1m', // 60 seconds burst as requested
        exec: 'swipeTask',
    };
}

// 3. Match Explosion (1000 pairs mutually liking each other)
if (testScenario === 'match_explosion') {
    options.scenarios.match_explosion = {
        executor: 'constant-vus',
        vus: 2000,
        duration: '1m', 
        exec: 'matchExplosionTask',
    };
}

// 4. Mixed Realistic Flow (Sustained load with mixed distribution)
if (testScenario === 'mixed_flow') {
    options.scenarios.mixed_flow = {
        executor: 'constant-vus',
        vus: 2000,
        duration: '5m',
        exec: 'mixedTask',
    };
}

// 5. Ramp-Up Stress Test (Find the breaking point)
if (testScenario === 'ramp_up') {
    options.scenarios.ramp_up = {
        executor: 'ramping-vus',
        startVUs: 10,
        stages: [
            { duration: '3m', target: 2000 }, // Ramp up to 2000
            { duration: '2m', target: 2000 }, // Hold
            { duration: '1m', target: 0 },    // Ramp down
        ],
        exec: 'mixedTask',
    };
}

// --- HELPER FUNCTIONS ---
function getParams() {
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        timeout: '10s', // Catch timeouts explicitly
    };
}

function processResponse(res, metric) {
    if (res.error && res.error.includes('timeout')) {
        timeoutRate.add(1);
        errorRate.add(1);
        return false;
    }

    if (res.status === 429) {
        rateLimitHits.add(1);
        return false; // Not a server error, but a rate limit
    }

    if (res.status >= 500) {
        errorRate.add(1);
        // Look for MongoDB specific transaction errors in body
        if (res.body && (res.body.includes('TransientTransactionError') || res.body.includes('WriteConflict'))) {
            transactionErrors.add(1);
        }
        return false;
    }

    if (res.status !== 200) {
        errorRate.add(1);
        return false;
    }

    if (metric) metric.add(res.timings.duration);
    return true;
}

// --- TASKS ---

export function feedTask() {
    const params = getParams();
    const page = Math.floor(Math.random() * 5) + 1; // Random page 1-5
    const limit = 20;
    
    // Simulate random filters
    const maxDistance = Math.floor(Math.random() * 100) + 10;
    
    const res = http.get(`${BASE_URL}/swipe/feed?page=${page}&limit=${limit}&distance=${maxDistance}`, params);
    
    const success = processResponse(res, feedLatency);
    check(res, { 'Feed GET 200 OK': (r) => r.status === 200 });

    sleep(Math.random() * 2 + 1); // User scrolls for 1-3 seconds
}

export function swipeTask() {
    const params = getParams();
    const targetId = targetProfiles[Math.floor(Math.random() * targetProfiles.length)];
    
    // Distribution: 60% likes, 30% passes, 10% superlikes
    const rand = Math.random();
    let action = 'like';
    if (rand > 0.9) action = 'superlike';
    else if (rand > 0.6) action = 'pass';

    const payload = JSON.stringify({ targetId, action });
    
    const res = http.post(`${BASE_URL}/swipe/action`, payload, params);
    
    processResponse(res, swipeLatency);
    check(res, { 'Swipe POST 200 OK': (r) => r.status === 200 });

    sleep(1); // 1 swipe per second as requested
}

export function matchExplosionTask() {
    const params = getParams();
    // To maximize matches without strict token-to-ID mapping, 
    // we make VUs rapidly like a concentrated pool of targets.
    // This will trigger massive mutual match events.
    const concentratedTargets = targetProfiles.slice(0, 100); 
    const targetId = concentratedTargets[Math.floor(Math.random() * concentratedTargets.length)];
    
    const payload = JSON.stringify({ targetId, action: 'like' });
    
    const res = http.post(`${BASE_URL}/swipe/action`, payload, params);
    
    processResponse(res, swipeLatency);
    check(res, { 'Match Swipe POST 200 OK': (r) => r.status === 200 });

    sleep(0.5); // Faster swiping to force mutual overlaps
}

export function matchesTask() {
    const params = getParams();
    const res = http.get(`${BASE_URL}/swipe/matches`, params);
    
    processResponse(res, matchLatency);
    check(res, { 'Matches GET 200 OK': (r) => r.status === 200 });
    
    sleep(Math.random() * 3 + 2);
}

export function undoTask() {
    const params = getParams();
    // In reality, undo doesn't require targetId in v3 (it undoes last swipe), but sending per your spec
    const res = http.post(`${BASE_URL}/swipe/undo`, JSON.stringify({}), params);
    
    processResponse(res);
    check(res, { 'Undo POST 200 OK': (r) => r.status === 200 || r.status === 400 }); // 400 is fine if no swipe to undo
    
    sleep(2);
}

// 4. Mixed Realistic Flow Task
export function mixedTask() {
    const rand = Math.random();
    
    if (rand < 0.40) {
        feedTask();
    } else if (rand < 0.75) { // +0.35
        swipeTask();
    } else if (rand < 0.85) { // +0.10
        matchesTask();
    } else if (rand < 0.95) { // +0.10
        undoTask();
    } else { // +0.05
        // Simulate checking settings/discovery profile
        const params = getParams();
        const res = http.get(`${BASE_URL}/profile/config`, params);
        processResponse(res);
        sleep(2);
    }
}
