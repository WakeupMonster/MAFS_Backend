import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load tokens
const tokens = new SharedArray('users', function () {
    return JSON.parse(open('../data/feed_tokens.json'));
});

// Allow passing VUs dynamically via command line (-e VUS=100)
const TARGET_VUS = __ENV.VUS ? parseInt(__ENV.VUS) : 100;

export const options = {
    stages: [
        { duration: '30s', target: TARGET_VUS },  // Ramp-up
        { duration: '2m', target: TARGET_VUS },   // Hold target (Sustained load)
        { duration: '30s', target: 0 }            // Ramp-down
    ],
    thresholds: {
        http_req_duration: ['p(95)<' + (TARGET_VUS <= 100 ? 250 : TARGET_VUS <= 200 ? 500 : 1000)], // Dynamic threshold based on VU count
    },
};

export default function () {
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const baseUrl = __ENV.API_URL || 'http://localhost:3001/api/v1';

    const params = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    // We simulate hitting the first page of the feed
    let res = http.get(`${baseUrl}/swipe/feed?page=1&limit=20`, params);

    check(res, {
        'status is 200': (r) => r.status === 200,
        'no server errors (500)': (r) => r.status !== 500,
        'is success true': (r) => {
             if (r.status !== 200) return false;
             return JSON.parse(r.body).success === true;
        }
    });

    // Realistic user gap: a user doesn't refresh the feed instantly. They look at profiles for 2-5 seconds.
    sleep(Math.random() * 3 + 2); 
}
