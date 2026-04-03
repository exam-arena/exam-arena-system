import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:8080';
const token = __ENV.TOKEN || '';
const attemptId = __ENV.ATTEMPT_ID || '';

export const options = {
  scenarios: {
    submit_attempt_burst: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 1000,
      stages: [
        { target: 200, duration: '10s' },
        { target: 500, duration: '20s' },
        { target: 800, duration: '20s' },
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

  const res = http.post(
    `${baseUrl}/api/v1/attempts/${attemptId}/submit`,
    null,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
