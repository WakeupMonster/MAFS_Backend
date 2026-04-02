import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 1000 },
    { duration: '1m', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // Pure infra should be fast
  },
};

export default function () {
  const url = `${__ENV.BASE_URL.replace('/api/v1', '')}/infra-test`;
  const res = http.get(url);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body is ok': (r) => r.json().ok === true,
  });

  sleep(1);
}
