import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

export const options = {
  stages: [
    { duration: '30s', target: 5 },  // Ramp up
    { duration: '1m', target: 10 },  // Sustained load (10 VUs max)
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<4000'], // Image uploads take longer, p(95)<4s threshold
    http_req_failed: ['rate<0.05'],    // Error rate should be less than 5%
  },
};

const BASE_URL = __ENV.API_URL || 'https://api.matchatfirstswipe.com.au/api/v1';

// Load 2000 Real Auth Tokens
const authTokens = new SharedArray('auth_tokens', function () {
  return JSON.parse(open('../data/load_test_tokens.json'));
});

// Load the 1x1 pixel dummy image
const dummyImg = open('../data/dummy.jpg', 'b');

export default function () {
  const tokenIndex = (__VU - 1) % authTokens.length;
  const token = authTokens[tokenIndex];

  // Headers for JSON endpoints
  const jsonParams = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  // Headers for Multipart uploads (let k6 set the Content-Type boundary automatically)
  const multipartParams = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const rand = Math.random();

  // --- JOURNEY 1: Photos Management (60% of traffic) ---
  if (rand < 0.6) {
    // 1. Upload Photo
    const uploadPayload = {
      photos: http.file(dummyImg, 'dummy.jpg', 'image/jpeg'),
    };
    const uploadRes = http.post(`${BASE_URL}/profile/photos`, uploadPayload, multipartParams);
    
    let uploadedPublicId = null;
    let photoCount = 0;
    
    check(uploadRes, {
      'photo upload is 200': (r) => r.status === 200,
      'photo upload has success=true': (r) => {
        try {
          const body = r.json();
          if (body.success && body.data && body.data.user && body.data.user.photos) {
            photoCount = body.data.user.photos.length;
            // Get the last uploaded photo (highest order)
            const sorted = body.data.user.photos.sort((a, b) => b.order - a.order);
            if (sorted.length > 0) {
              uploadedPublicId = sorted[0].publicId;
            }
            return true;
          }
          return false;
        } catch (e) {
          return false;
        }
      }
    });

    sleep(1);

    // 2. Reorder (Only if we have a valid publicId and at least 2 photos)
    if (uploadedPublicId && photoCount >= 2) {
      const reorderPayload = JSON.stringify({
        photoId: uploadedPublicId,
        toPosition: 1, // Move to primary position
      });
      const reorderRes = http.patch(`${BASE_URL}/profile/photos/reorder`, reorderPayload, jsonParams);
      check(reorderRes, {
        'photo reorder is 200': (r) => r.status === 200,
        'photo reorder success': (r) => {
          try {
            return r.json().success === true;
          } catch (e) {
            return false;
          }
        }
      });
      sleep(1);
    }

    // 3. Delete the uploaded photo
    if (uploadedPublicId) {
      const deletePayload = JSON.stringify({
        publicId: uploadedPublicId,
      });
      const deleteRes2 = http.request('DELETE', `${BASE_URL}/profile/photos`, deletePayload, jsonParams);
      check(deleteRes2, {
        'photo delete is 200': (r) => r.status === 200,
        'photo delete success': (r) => {
          try {
            return r.json().success === true;
          } catch (e) {
            return false;
          }
        }
      });
    }
  }
  // --- JOURNEY 2: KYC & Verification (40% of traffic) ---
  else {
    // 1. Get Verification Status
    const statusRes = http.get(`${BASE_URL}/profile/verification-status`, jsonParams);
    check(statusRes, {
      'get verification status is 200': (r) => r.status === 200,
    });
    sleep(1);

    // 2. Upload Selfie
    const selfiePayload = {
      selfie: http.file(dummyImg, 'dummy.jpg', 'image/jpeg'),
    };
    const selfieRes = http.post(`${BASE_URL}/profile/selfie`, selfiePayload, multipartParams);
    check(selfieRes, {
      'selfie upload is 200': (r) => r.status === 200,
      'selfie upload success': (r) => {
        try {
          return r.json().success === true;
        } catch (e) {
          return false;
        }
      }
    });
    sleep(1);

    // 3. Upload ID Document
    const idPayload = {
      front: http.file(dummyImg, 'dummy.jpg', 'image/jpeg'),
    };
    const idRes = http.post(`${BASE_URL}/profile/id-document`, idPayload, multipartParams);
    check(idRes, {
      'id upload is 200': (r) => r.status === 200,
      'id upload success': (r) => {
        try {
          return r.json().success === true;
        } catch (e) {
          return false;
        }
      }
    });
  }

  sleep(1);
}
