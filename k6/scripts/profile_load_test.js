import http from 'k6/http';
import { check, sleep } from 'k6';

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

const BASE_URL = __ENV.API_URL || 'http://localhost:3001/api/v1';

// IDs for testing (Random user IDs from your DB for profile viewing)
const TARGET_USER_IDS = [
  '661907d7f7227d8f95c1065c',
  '661907d7f7227d8f95c1065d',
  '661907d7f7227d8f95c1065e',
  '661907d7f7227d8f95c1065f',
  '661907d7f7227d8f95c10660'
];

export default function () {
  // 1. Setup Auth (Using a hardcoded test token or generating one)
  // For the sake of this test, we assume we have a valid token
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`,
    },
  };

  // --- ACTION 1: View Random Profiles (90% of traffic) ---
  const targetId = TARGET_USER_IDS[Math.floor(Math.random() * TARGET_USER_IDS.length)];
  const viewRes = http.get(`${BASE_URL}/profile/${targetId}`, params);
  check(viewRes, {
    'view profile status is 200': (r) => r.status === 200,
    'view profile has data': (r) => r.json().data !== undefined,
  });

  sleep(1);

  // --- ACTION 2: Update Own Profile (5% of traffic) ---
  if (Math.random() < 0.05) {
    const updatePayload = JSON.stringify({
      profile: {
        about: `Test bio updated at ${new Date().toISOString()}`,
      },
    });
    const updateRes = http.patch(`${BASE_URL}/profile/update`, updatePayload, params);
    check(updateRes, {
      'update profile status is 200': (r) => r.status === 200,
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
    });
  }

  sleep(1);
}
