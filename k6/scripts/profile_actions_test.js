import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up
    { duration: '3m', target: 200 }, // Sustained load
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.05'],    // Error rate should be less than 5%
  },
};

const BASE_URL = __ENV.API_URL || 'https://api.matchatfirstswipe.com.au/api/v1';

// 1. Load 2000 Real Auth Tokens
const authTokens = new SharedArray('auth_tokens', function () {
  return JSON.parse(open('../data/load_test_tokens.json'));
});

// 2. Load 25 Real Valid Target IDs from DB
const targetIds = new SharedArray('target_ids', function () {
  return JSON.parse(open('../data/profile_ids.json'));
});

export default function () {
  // Distribute 2000 tokens among the VUs based on their VU ID
  const tokenIndex = (__VU - 1) % authTokens.length;
  const token = authTokens[tokenIndex];
  const targetId = targetIds[Math.floor(Math.random() * targetIds.length)];

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-bypass-rate-limit': 'true',
      'x-bypass-cloudinary': 'true',
    },
  };

  const rand = Math.random();

  // --- ACTION 1: Get Profile Status (20% of traffic) ---
  if (rand < 0.2) {
    const statusRes = http.get(`${BASE_URL}/profile/status`, params);
    check(statusRes, {
      'status is 200': (r) => r.status === 200,
      'status has data': (r) => {
        try {
          return r.json().data !== undefined;
        } catch (e) {
          return false;
        }
      },
    });
  }
  // --- ACTION 2: Update Discovery Preference (30% of traffic) ---
  else if (rand < 0.5) {
    const discPayload = JSON.stringify({
      discoveryFilters: {
        relationshipGoal: "long_term",
        interests: ["music", "cooking"],
        advanced: {
          zodiac: ["leo"],
          education: ["bachelors"]
        }
      }
    });
    const discRes = http.patch(`${BASE_URL}/profile/discovery-preference`, discPayload, params);
    check(discRes, {
      'discovery update is 200': (r) => r.status === 200,
      'discovery update success': (r) => {
        try {
          return r.json().success === true;
        } catch (e) {
          return false;
        }
      },
    });
  }
  // --- ACTION 3: Update Visibility (20% of traffic) ---
  else if (rand < 0.7) {
    const visPayload = JSON.stringify({ visibility: "everyone" });
    const visRes = http.patch(`${BASE_URL}/profile/visibility`, visPayload, params);
    check(visRes, {
      'visibility update is 200': (r) => r.status === 200,
      'visibility success': (r) => {
        try {
          return r.json().success === true;
        } catch (e) {
          return false;
        }
      },
    });
  }
  // --- ACTION 4: Block, List, Unblock (20% of traffic) ---
  else if (rand < 0.9) {
    // 1. Block Target
    const blockRes = http.post(`${BASE_URL}/profile/block/${targetId}`, null, params);
    check(blockRes, {
      'block user is 200': (r) => r.status === 200,
    });

    // 2. List Blocked
    const listRes = http.get(`${BASE_URL}/profile/blocked/all`, params);
    check(listRes, {
      'list blocked is 200': (r) => r.status === 200,
      'list blocked success': (r) => {
        try {
          return r.json().success === true;
        } catch (e) {
          return false;
        }
      },
    });

    // 3. Unblock Target
    const unblockRes = http.request('DELETE', `${BASE_URL}/profile/unblock/${targetId}`, null, params);
    check(unblockRes, {
      'unblock user is 200': (r) => r.status === 200,
    });
  }
  // --- ACTION 5: Report User (10% of traffic) ---
  else {
    const reportPayload = JSON.stringify({
      reason: "Harassment",
      description: "Reported during k6 load testing.",
      context: { matchId: null, lastMessages: [] }
    });
    const reportRes = http.post(`${BASE_URL}/profile/report/${targetId}`, reportPayload, params);
    check(reportRes, {
      'report user is 201': (r) => r.status === 201,
      'report success': (r) => {
        try {
          return r.json().success === true;
        } catch (e) {
          return false;
        }
      },
    });
  }

  sleep(1);
}
