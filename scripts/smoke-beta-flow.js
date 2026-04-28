const baseUrl = env("SMOKE_API_URL", "http://localhost:8080").replace(/\/+$/, "");
const identifier = env("SMOKE_IDENTIFIER", "mock_student_0101");
const password = requiredEnv("SMOKE_PASSWORD");
const examId = env("SMOKE_EXAM_ID", "30000000-0000-0000-0000-000000010101");
const resultPolls = Number(env("SMOKE_RESULT_POLLS", "12"));
const resultPollDelayMs = Number(env("SMOKE_RESULT_POLL_DELAY_MS", "1000"));

let cookieHeader = "";

main().catch((error) => {
  console.error(`[FAIL] ${error.message}`);
  process.exit(1);
});

async function main() {
  await step("healthz", async () => {
    const response = await request("GET", "/healthz", { auth: false });
    assertStatus(response, [200]);
  });

  await step("readyz", async () => {
    const response = await request("GET", "/readyz", { auth: false });
    assertStatus(response, [200]);
  });

  await step("login", async () => {
    const response = await request("POST", "/api/v1/auth/login", {
      auth: false,
      body: { identifier, password },
    });
    assertStatus(response, [200]);

    const setCookie = response.headers.get("set-cookie");
    if (!setCookie) {
      throw new Error("login did not return set-cookie");
    }
    cookieHeader = setCookie.split(";")[0];
  });

  await step("auth/me", async () => {
    const response = await request("GET", "/api/v1/auth/me");
    assertStatus(response, [200]);
  });

  await step("list rooms", async () => {
    const response = await request("GET", "/api/v1/rooms", { auth: false });
    assertStatus(response, [200]);
  });

  await step("list exams", async () => {
    const response = await request("GET", "/api/v1/exams", { auth: false });
    assertStatus(response, [200]);
  });

  const attemptId = await step("start attempt", async () => {
    const response = await request("POST", `/api/v1/exams/${examId}/attempts`);
    const payload = await expectEnvelope(response, [201]);
    const id = payload?.data?.attempt_id;
    if (!id) {
      throw new Error("start attempt response is missing data.attempt_id");
    }
    return id;
  });

  const question = await step("get attempt", async () => {
    const response = await request("GET", `/api/v1/attempts/${attemptId}`);
    const payload = await expectEnvelope(response, [200]);
    const questions = Array.isArray(payload?.data?.questions) ? payload.data.questions : [];
    const answerable = questions.find((item) => !item.parent_id && Array.isArray(item.options) && item.options.length > 0)
      || questions.find((item) => Array.isArray(item.options) && item.options.length > 0);
    if (!answerable) {
      throw new Error("attempt has no answerable question with options");
    }
    return answerable;
  });

  await step("save answer", async () => {
    const selected = question.options[0].id;
    const response = await request("PUT", `/api/v1/attempts/${attemptId}/answers`, {
      body: {
        answers: [
          {
            question_id: question.question_id,
            selected_ans: selected,
          },
        ],
      },
    });
    assertStatus(response, [200]);
  });

  await step("submit attempt", async () => {
    const response = await request("POST", `/api/v1/attempts/${attemptId}/submit`);
    assertStatus(response, [200]);
  });

  await step("result", async () => {
    await pollProcessing(`/api/v1/attempts/${attemptId}/result`);
  });

  await step("review", async () => {
    await pollProcessing(`/api/v1/attempts/${attemptId}/review`);
  });

  console.log("[PASS] smoke beta flow");
}

async function step(name, fn) {
  process.stdout.write(`[RUN] ${name} ... `);
  const result = await fn();
  console.log("pass");
  return result;
}

async function pollProcessing(path) {
  let lastPayload = null;
  for (let i = 0; i < resultPolls; i += 1) {
    const response = await request("GET", path);
    const payload = await expectEnvelope(response, [200, 202]);
    lastPayload = payload;
    if (payload.status === "success") {
      return payload;
    }
    await sleep(resultPollDelayMs);
  }

  throw new Error(`still processing after ${resultPolls} polls: ${JSON.stringify(lastPayload)}`);
}

async function request(method, path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.auth !== false) {
    if (!cookieHeader) {
      throw new Error(`auth cookie is not available for ${method} ${path}`);
    }
    headers.Cookie = cookieHeader;
  }

  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function expectEnvelope(response, statuses) {
  assertStatus(response, statuses);
  const payload = await readJson(response);
  if (!payload || (payload.status !== "success" && payload.status !== "processing")) {
    throw new Error(`unexpected response envelope: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function assertStatus(response, statuses) {
  if (!statuses.includes(response.status)) {
    throw new Error(`expected HTTP ${statuses.join(" or ")}, got ${response.status}`);
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`response is not valid JSON: ${error.message}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function env(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}
