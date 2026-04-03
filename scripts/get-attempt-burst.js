import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:8080';
const token = __ENV.TOKEN || '';
const attemptId = __ENV.ATTEMPT_ID || '';

export const options = {
  scenarios: {
    get_attempt_burst: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 300,
      maxVUs: 1500,
      stages: [
        { target: 300, duration: '10s' },
        { target: 700, duration: '20s' },
        { target: 1000, duration: '20s' },
        { target: 0, duration: '10s' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
  },
};

export default function () {
  if (!token || !attemptId) {
    throw new Error('TOKEN and ATTEMPT_ID are required');
  }

  const res = http.get(`${baseUrl}/api/v1/attempts/${attemptId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
