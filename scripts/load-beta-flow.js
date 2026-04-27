import http from 'k6/http';
import { check, fail, sleep } from 'k6';

const baseUrl = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
const password = __ENV.LOAD_PASSWORD || '';
const examId = __ENV.LOAD_EXAM_ID || '30000000-0000-0000-0000-000000010101';
const userPrefix = __ENV.LOAD_USER_PREFIX || 'load_student_';
const userCount = positiveNumberEnv('LOAD_USER_COUNT', 100);
const userOffset = positiveNumberEnv('LOAD_USER_OFFSET', 1);
const ipMode = __ENV.LOAD_IP_MODE || 'same';
const fixedIP = __ENV.LOAD_FIXED_IP || '198.18.0.1';
const startSpreadSeconds = numberEnv('LOAD_START_SPREAD_SECONDS', 0);
const autosaveRounds = numberEnv('LOAD_AUTOSAVE_ROUNDS', 3);
const autosaveSleepSeconds = numberEnv('LOAD_AUTOSAVE_SLEEP_SECONDS', 1);
const resultPolls = numberEnv('LOAD_RESULT_POLLS', 12);
const resultPollSleepSeconds = numberEnv('LOAD_RESULT_POLL_SECONDS', 1);
const maxDuration = __ENV.LOAD_MAX_DURATION || '10m';

export const options = {
  scenarios: {
    beta_full_flow: {
      executor: 'per-vu-iterations',
      vus: userCount,
      iterations: 1,
      maxDuration,
    },
  },
  thresholds: {
    checks: ['rate>0.95'],
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
  },
};

export default function () {
  if (!password) {
    fail('LOAD_PASSWORD is required');
  }

  if (startSpreadSeconds > 0) {
    sleep(Math.random() * startSpreadSeconds);
  }

  const userNumber = userOffset + __VU - 1;
  const identifier = `${userPrefix}${pad4(userNumber)}`;
  const ip = buildClientIP(userNumber);
  const baseHeaders = {
    Accept: 'application/json',
    'X-Forwarded-For': ip,
    'X-Real-IP': ip,
  };

  const login = postJson('/api/v1/auth/login', {
    identifier,
    password,
  }, baseHeaders);

  check(login, {
    'login status is 200': (r) => r.status === 200,
  });
  if (login.status !== 200) {
    failForResponse('login failed', login);
  }

  const cookie = loginCookie(login);
  if (!cookie) {
    fail('login response did not include access_token cookie');
  }

  const authHeaders = {
    ...baseHeaders,
    Cookie: cookie,
  };

  const startAttempt = http.post(`${baseUrl}/api/v1/exams/${examId}/attempts`, null, {
    headers: authHeaders,
  });
  const startPayload = expectEnvelope(startAttempt, [201], 'start attempt');
  const attemptId = startPayload?.data?.attempt_id;
  if (!attemptId) {
    fail('start attempt response is missing data.attempt_id');
  }

  const getAttempt = http.get(`${baseUrl}/api/v1/attempts/${attemptId}`, {
    headers: authHeaders,
  });
  const attemptPayload = expectEnvelope(getAttempt, [200], 'get attempt');
  const answer = buildAnswer(attemptPayload);

  for (let i = 0; i < autosaveRounds; i += 1) {
    const saveAnswer = putJson(`/api/v1/attempts/${attemptId}/answers`, {
      answers: [answer],
    }, authHeaders);
    expectStatus(saveAnswer, [200], 'save answer');

    if (i + 1 < autosaveRounds && autosaveSleepSeconds > 0) {
      sleep(autosaveSleepSeconds);
    }
  }

  const submitAttempt = http.post(`${baseUrl}/api/v1/attempts/${attemptId}/submit`, null, {
    headers: authHeaders,
  });
  expectStatus(submitAttempt, [200], 'submit attempt');

  pollProcessing(`/api/v1/attempts/${attemptId}/result`, authHeaders, 'result');
  pollProcessing(`/api/v1/attempts/${attemptId}/review`, authHeaders, 'review');
}

function buildAnswer(attemptPayload) {
  const questions = Array.isArray(attemptPayload?.data?.questions) ? attemptPayload.data.questions : [];
  const question = questions.find((item) => !item.parent_id && Array.isArray(item.options) && item.options.length > 0)
    || questions.find((item) => Array.isArray(item.options) && item.options.length > 0);

  if (!question) {
    fail('attempt has no answerable question with options');
  }

  return {
    question_id: question.question_id,
    selected_ans: question.options[0].id,
  };
}

function pollProcessing(path, headers, label) {
  let lastPayload = null;
  for (let i = 0; i < resultPolls; i += 1) {
    const response = http.get(`${baseUrl}${path}`, { headers });
    const payload = expectEnvelope(response, [200, 202], label);
    lastPayload = payload;
    if (payload.status === 'success') {
      return payload;
    }
    sleep(resultPollSleepSeconds);
  }

  fail(`${label} still processing after ${resultPolls} poll(s): ${JSON.stringify(lastPayload)}`);
}

function postJson(path, body, headers) {
  return http.post(`${baseUrl}${path}`, JSON.stringify(body), {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

function putJson(path, body, headers) {
  return http.put(`${baseUrl}${path}`, JSON.stringify(body), {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

function expectEnvelope(response, statuses, label) {
  expectStatus(response, statuses, label);
  const payload = parseJson(response, label);
  if (!payload || (payload.status !== 'success' && payload.status !== 'processing')) {
    fail(`${label} returned unexpected envelope: ${response.body}`);
  }
  return payload;
}

function expectStatus(response, statuses, label) {
  const ok = check(response, {
    [`${label} status is ${statuses.join(' or ')}`]: (r) => statuses.includes(r.status),
  });
  if (!ok) {
    failForResponse(`${label} failed`, response);
  }
}

function failForResponse(label, response) {
  fail(`${label}: HTTP ${response.status} ${truncate(response.body || '', 500)}`);
}

function parseJson(response, label) {
  try {
    return response.json();
  } catch (error) {
    fail(`${label} response is not JSON: ${error.message}`);
  }
}

function loginCookie(response) {
  const accessToken = response.cookies?.access_token?.[0]?.value;
  if (accessToken) {
    return `access_token=${accessToken}`;
  }

  const setCookie = response.headers['Set-Cookie'] || response.headers['set-cookie'];
  if (!setCookie) {
    return '';
  }
  return String(setCookie).split(';')[0];
}

function buildClientIP(userNumber) {
  if (ipMode === 'unique') {
    const zeroBased = userNumber - 1;
    const third = Math.floor(zeroBased / 250);
    const fourth = (zeroBased % 250) + 1;
    return `198.18.${third}.${fourth}`;
  }

  if (ipMode !== 'same') {
    fail(`Unsupported LOAD_IP_MODE: ${ipMode}`);
  }

  return fixedIP;
}

function pad4(value) {
  return String(value).padStart(4, '0');
}

function numberEnv(name, fallback) {
  const raw = __ENV[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    fail(`${name} must be a non-negative number`);
  }
  return value;
}

function positiveNumberEnv(name, fallback) {
  const value = numberEnv(name, fallback);
  if (value < 1) {
    fail(`${name} must be at least 1`);
  }
  return value;
}

function truncate(value, maxLength) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}
