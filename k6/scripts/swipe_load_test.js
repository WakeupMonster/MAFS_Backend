/**
 * ═══════════════════════════════════════════════════════════════
 * MAFS Swipe Module — Production Load Test (k6)
 * ═══════════════════════════════════════════════════════════════
 *
 * PURPOSE:
 *   Find the exact breaking point of MAFS on free-tier infra.
 *   Gradual ramp-up from 10 → 2000 users.
 *
 * RUN:
 *   k6 run k6/scripts/swipe_load_test.js
 *   k6 run -e API_URL=http://<ec2-ip>:3001/api/v1 k6/scripts/swipe_load_test.js
 *
 * REQUIRES:
 *   k6/data/load_test_tokens.json  (from generate-load-test-tokens.js)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';

// ═══════════════════════════════════════
// CUSTOM METRICS
// ═══════════════════════════════════════
const serverErrors    = new Rate('server_error_rate');     // 5xx errors only
const timeouts        = new Rate('timeout_rate');          // Request timeouts
const txnErrors       = new Counter('mongo_txn_errors');   // MongoDB transaction failures
const rateLimits      = new Counter('rate_limit_429');     // Rate limit hits (not errors)
const feedLatency     = new Trend('feed_response_ms');     // Feed GET latency
const swipeLatency    = new Trend('swipe_response_ms');    // Swipe POST latency
const matchesLatency  = new Trend('matches_response_ms');  // Matches GET latency
const undoLatency     = new Trend('undo_response_ms');     // Undo POST latency

// ═══════════════════════════════════════
// LOAD TEST DATA
// ═══════════════════════════════════════
const tokens = new SharedArray('tokens', function () {
    return JSON.parse(open('../data/load_test_tokens.json'));
});

const BASE_URL = __ENV.API_URL || 'http://localhost:3001/api/v1';

// ═══════════════════════════════════════
// GRADUAL RAMP-UP STAGES
// ═══════════════════════════════════════
export const options = {
    stages: [
        { duration: '30s',  target: 10   },  // Stage 1: Ramp to 10
        { duration: '2m',   target: 10   },  // Hold 10
        { duration: '30s',  target: 25   },  // Stage 2: Ramp to 25
        { duration: '2m',   target: 25   },  // Hold 25
        { duration: '30s',  target: 50   },  // Stage 3: Ramp to 50
        { duration: '2m',   target: 50   },  // Hold 50
        { duration: '30s',  target: 100  },  // Stage 4: Ramp to 100
        { duration: '2m',   target: 100  },  // Hold 100
        { duration: '30s',  target: 200  },  // Stage 5: Ramp to 200
        { duration: '2m',   target: 200  },  // Hold 200
        { duration: '30s',  target: 300  },  // Stage 6: Ramp to 300
        { duration: '2m',   target: 300  },  // Hold 300
        { duration: '30s',  target: 500  },  // Stage 7: Ramp to 500
        { duration: '2m',   target: 500  },  // Hold 500
        { duration: '30s',  target: 750  },  // Stage 8: Ramp to 750
        { duration: '2m',   target: 750  },  // Hold 750
        { duration: '30s',  target: 1000 },  // Stage 9: Ramp to 1000
        { duration: '2m',   target: 1000 },  // Hold 1000
        { duration: '30s',  target: 1500 },  // Stage 10: Ramp to 1500
        { duration: '2m',   target: 1500 },  // Hold 1500
        { duration: '30s',  target: 2000 },  // Stage 11: Ramp to 2000
        { duration: '2m',   target: 2000 },  // Hold 2000
        { duration: '1m',   target: 0    },  // Ramp down
    ],
    thresholds: {
        'http_req_duration':    ['p(95)<2000'],
        'server_error_rate':    ['rate<0.05'],
    },
    noConnectionReuse: false,
    userAgent: 'MAFS-LoadTest/1.0',
};

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function getMyToken() {
    const index = (__VU - 1) % tokens.length;
    return tokens[index];
}

function getHeaders() {
    return {
        headers: {
            'Authorization': `Bearer ${getMyToken()}`,
            'Content-Type': 'application/json',
        },
        timeout: '15s',
    };
}

function handleResponse(res, latencyMetric) {
    if (res.error && (res.error.includes('timeout') || res.error.includes('dial') || res.error.includes('reset'))) {
        timeouts.add(1);
        serverErrors.add(1);
        return { ok: false, data: null };
    }
    if (res.status === 429) {
        rateLimits.add(1);
        serverErrors.add(0);
        return { ok: false, data: null };
    }
    if (res.status === 400 || res.status === 409 || res.status === 403) {
        serverErrors.add(0);
        return { ok: false, data: null };
    }
    if (res.status >= 500) {
        serverErrors.add(1);
        if (res.body && (res.body.includes('TransientTransactionError') || res.body.includes('WriteConflict'))) {
            txnErrors.add(1);
        }
        return { ok: false, data: null };
    }
    if (res.status === 200 || res.status === 201) {
        serverErrors.add(0);
        if (latencyMetric) latencyMetric.add(res.timings.duration);
        let data = null;
        try { data = JSON.parse(res.body); } catch (e) { /* ignore */ }
        return { ok: true, data };
    }
    serverErrors.add(1);
    return { ok: false, data: null };
}

// ═══════════════════════════════════════
// MAIN USER FLOW
// ═══════════════════════════════════════
export default function () {
    const params = getHeaders();

    // 1. Fetch Feed
    const feedRes = http.get(`${BASE_URL}/swipe/feed?page=1&limit=20`, params);
    const feedResult = handleResponse(feedRes, feedLatency);
    check(feedRes, { 'Feed: status 200': (r) => r.status === 200 });

    let feedProfileIds = [];
    if (feedResult.ok && feedResult.data && feedResult.data.data) {
        feedProfileIds = feedResult.data.data.map(p => p.userId).filter(Boolean);
    }

    sleep(Math.random() + 1);

    // 2. Swipe on profiles
    if (feedProfileIds.length > 0) {
        const swipeCount = Math.min(Math.floor(Math.random() * 3) + 1, feedProfileIds.length);
        for (let i = 0; i < swipeCount; i++) {
            const targetId = feedProfileIds[i];
            const rand = Math.random();
            let action = 'like';
            if (rand > 0.9) action = 'superlike';
            else if (rand > 0.6) action = 'pass';

            const swipeRes = http.post(`${BASE_URL}/swipe/action`, JSON.stringify({ targetId, action }), params);
            handleResponse(swipeRes, swipeLatency);
            check(swipeRes, { 'Swipe action': (r) => r.status < 500 });
            sleep(Math.random() + 1);
        }
    }

    // 3. Check matches (15% chance)
    if (Math.random() < 0.15) {
        const matchRes = http.get(`${BASE_URL}/swipe/matches`, params);
        handleResponse(matchRes, matchesLatency);
        sleep(Math.random() + 1);
    }

    sleep(Math.random() + 1);
}
