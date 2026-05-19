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

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  // --- ACTION 1: View Random Profiles (90% of traffic) ---
  const targetId = targetIds[Math.floor(Math.random() * targetIds.length)];
  const viewRes = http.get(`${BASE_URL}/profile/${targetId}`, params);
  
  check(viewRes, {
    'view profile status is 200': (r) => r.status === 200,
    'view profile has success=true': (r) => {
      try {
        return r.json().success === true;
      } catch (e) {
        return false;
      }
    },
    'view profile has data object': (r) => {
      try {
        return r.json().data !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  sleep(1);

  // --- ACTION 2: Update Own Profile (5% of traffic) ---
  if (Math.random() < 0.05) {
    const updatePayload = JSON.stringify({
      profile: {
        about: `Bio updated for load test at ${new Date().toISOString()}`,
      },
    });
    const updateRes = http.patch(`${BASE_URL}/profile/update`, updatePayload, params);
    
    check(updateRes, {
      'update profile status is 200': (r) => r.status === 200,
      'update profile has success message': (r) => {
        try {
          return r.json().success === true;
        } catch (e) {
          return false;
        }
      }
    });
  }

  // --- ACTION 3: Update Location (5% of traffic) ---
  if (Math.random() < 0.05) {
    const locationPayload = JSON.stringify({
      latitude: -33.8688 + (Math.random() * 0.1),
      longitude: 151.2093 + (Math.random() * 0.1),
      city: "Sydney",
      state: "NSW",
      country: "Australia"
    });
    const locRes = http.post(`${BASE_URL}/profile/location`, locationPayload, params);
    
    check(locRes, {
      'location update status is 200': (r) => r.status === 200,
      'location update success=true': (r) => {
        try {
          return r.json().success === true;
        } catch(e) {
          return false;
        }
      }
    });
  }

  sleep(1);
}
