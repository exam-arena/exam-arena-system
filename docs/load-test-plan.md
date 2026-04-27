# Beta Load Test Plan

Scope: k6 load test for the 2026-05-12 beta exam path with 500-800 concurrent students.

This plan assumes the staging smoke test in `docs/staging-smoke-test.md` has already passed.

## What This Tests

The full-flow k6 script runs one realistic exam attempt per virtual user:

1. Login as `load_student_0001..load_student_0800`.
2. Start the configured exam.
3. Fetch the attempt payload.
4. Save one answer several times to exercise autosave.
5. Submit the attempt.
6. Poll result and review until processing completes.

The script supports two IP modes:

- `LOAD_IP_MODE=same`: all VUs send the same `X-Forwarded-For` and `X-Real-IP`.
- `LOAD_IP_MODE=unique`: each VU sends a different `X-Forwarded-For` and `X-Real-IP`.

Important: `unique` simulates different client IPs only at application-header level because the backend currently trusts `X-Forwarded-For`. It does not create 800 real network source IPs. This is still useful for testing the app's IP-based rate limit behavior.

## Required Test Data

Run this against the same staging/load-test database used by the backend:

```powershell
psql "$env:DATABASE_URL" -f scripts/seed_mock_exam_0101.sql
psql "$env:DATABASE_URL" -f scripts/seed_load_test_users.sql
```

Run `seed_load_test_users.sql` again before each repeated load-test cycle. The seed removes previous attempts for the load users on the mock exam, which avoids the single-attempt policy blocking the next run.

Verify data:

```sql
SELECT COUNT(*) AS load_users
FROM users
WHERE username LIKE 'load_student_%';

SELECT COUNT(*) AS load_access
FROM user_room_access ura
JOIN users u ON u.user_id = ura.user_id
WHERE u.username LIKE 'load_student_%'
  AND ura.room_id = '20000000-0000-0000-0000-000000010101'
  AND ura.status = 'active';

SELECT status, COUNT(*)
FROM exam_attempt ea
JOIN users u ON u.user_id = ea.user_id
WHERE u.username LIKE 'load_student_%'
  AND ea.exam_id = '30000000-0000-0000-0000-000000010101'
GROUP BY status;
```

Expected before a fresh run: 800 users, 800 active access rows, and 0 attempts for this exam.

## Install k6

Windows with winget:

```powershell
winget install k6.k6
k6 version
```

If winget is not available, install from the official k6 Windows package, then reopen PowerShell and check `k6 version`.

## Common Environment

Set these once per terminal. The run examples still pass the important k6 values with `-e` so k6 receives them during script initialization.

```powershell
$env:BASE_URL="https://staging-api.example.com"
$env:LOAD_PASSWORD="Password@123"
$env:LOAD_EXAM_ID="30000000-0000-0000-0000-000000010101"
$env:LOAD_AUTOSAVE_ROUNDS="3"
$env:LOAD_AUTOSAVE_SLEEP_SECONDS="1"
$env:LOAD_RESULT_POLLS="12"
$env:LOAD_RESULT_POLL_SECONDS="1"
$env:LOAD_MAX_DURATION="20m"

$commonK6Args = @(
  "-e", "BASE_URL=$env:BASE_URL",
  "-e", "LOAD_PASSWORD=$env:LOAD_PASSWORD",
  "-e", "LOAD_EXAM_ID=$env:LOAD_EXAM_ID",
  "-e", "LOAD_AUTOSAVE_ROUNDS=$env:LOAD_AUTOSAVE_ROUNDS",
  "-e", "LOAD_AUTOSAVE_SLEEP_SECONDS=$env:LOAD_AUTOSAVE_SLEEP_SECONDS",
  "-e", "LOAD_RESULT_POLLS=$env:LOAD_RESULT_POLLS",
  "-e", "LOAD_RESULT_POLL_SECONDS=$env:LOAD_RESULT_POLL_SECONDS",
  "-e", "LOAD_MAX_DURATION=$env:LOAD_MAX_DURATION"
)
```

Replace `BASE_URL` with the real staging backend URL.

## Case 1: Same IP

This is the school/computer-lab worst case: many students appear behind one NAT/public IP.

With the backend's default login limit (`LOGIN_RATE_LIMIT_RPS=3`, `LOGIN_RATE_LIMIT_BURST=10`), a sudden 500-800 login burst from one IP is expected to hit `429 TOO_MANY_REQUESTS`. That is a valid finding, not a script failure.

Use this first to measure whether beta needs a login-window plan, rate-limit increase, or school-IP allowlist.

100-user rehearsal:

```powershell
k6 run @commonK6Args `
  -e LOAD_USER_COUNT=100 `
  -e LOAD_IP_MODE=same `
  -e LOAD_FIXED_IP=198.18.0.1 `
  -e LOAD_START_SPREAD_SECONDS=60 `
  scripts/load-beta-flow.js
```

500-user target:

```powershell
psql "$env:DATABASE_URL" -f scripts/seed_load_test_users.sql
k6 run @commonK6Args `
  -e LOAD_USER_COUNT=500 `
  -e LOAD_IP_MODE=same `
  -e LOAD_FIXED_IP=198.18.0.1 `
  -e LOAD_START_SPREAD_SECONDS=120 `
  scripts/load-beta-flow.js
```

800-user ceiling:

```powershell
psql "$env:DATABASE_URL" -f scripts/seed_load_test_users.sql
k6 run @commonK6Args `
  -e LOAD_USER_COUNT=800 `
  -e LOAD_IP_MODE=same `
  -e LOAD_FIXED_IP=198.18.0.1 `
  -e LOAD_START_SPREAD_SECONDS=180 `
  scripts/load-beta-flow.js
```

Interpretation:

- If many failures are `429` during login, the bottleneck is the login IP rate limit.
- If login passes but attempt APIs fail, inspect backend, DB, Redis, and worker metrics.
- If result/review stay processing, inspect Redis submit stream and worker logs.

## Case 2: Unique IP

This removes the single-public-IP login pressure and focuses more on backend, DB, Redis, and worker capacity.

100-user rehearsal:

```powershell
psql "$env:DATABASE_URL" -f scripts/seed_load_test_users.sql
k6 run @commonK6Args `
  -e LOAD_USER_COUNT=100 `
  -e LOAD_IP_MODE=unique `
  -e LOAD_START_SPREAD_SECONDS=30 `
  scripts/load-beta-flow.js
```

500-user target:

```powershell
psql "$env:DATABASE_URL" -f scripts/seed_load_test_users.sql
k6 run @commonK6Args `
  -e LOAD_USER_COUNT=500 `
  -e LOAD_IP_MODE=unique `
  -e LOAD_START_SPREAD_SECONDS=60 `
  scripts/load-beta-flow.js
```

800-user ceiling:

```powershell
psql "$env:DATABASE_URL" -f scripts/seed_load_test_users.sql
k6 run @commonK6Args `
  -e LOAD_USER_COUNT=800 `
  -e LOAD_IP_MODE=unique `
  -e LOAD_START_SPREAD_SECONDS=90 `
  scripts/load-beta-flow.js
```

## Monitoring During The Run

Backend logs:

```powershell
docker compose --env-file .env.staging -f docker-compose.prod.yml -f docker-compose.staging.yml logs -f backend
```

Container resources:

```powershell
docker stats
```

Redis queue and buffered-answer health, if Redis is reachable from Docker:

```powershell
docker exec -it exam-arena-redis redis-cli XLEN exam_submit_stream
docker exec -it exam-arena-redis redis-cli SCARD dirty_attempts
docker exec -it exam-arena-redis redis-cli INFO memory
```

Database attempt status:

```sql
SELECT status, COUNT(*)
FROM exam_attempt ea
JOIN users u ON u.user_id = ea.user_id
WHERE u.username LIKE 'load_student_%'
  AND ea.exam_id = '30000000-0000-0000-0000-000000010101'
GROUP BY status;
```

Slow or failed attempts:

```sql
SELECT u.username, ea.attempt_id, ea.status, ea.start_at, ea.end_at
FROM exam_attempt ea
JOIN users u ON u.user_id = ea.user_id
WHERE u.username LIKE 'load_student_%'
  AND ea.exam_id = '30000000-0000-0000-0000-000000010101'
ORDER BY ea.start_at DESC
LIMIT 50;
```

## Pass Criteria For Beta

For the 500-user target:

- `http_req_failed < 1%` after excluding intentional same-IP login rate-limit findings.
- k6 `checks` pass rate at least 99% for `unique IP`.
- p95 request duration under 1.5s for normal APIs.
- p99 request duration under 3s, excluding result/review polling while queued.
- Redis submit stream does not grow continuously after the run finishes.
- `dirty_attempts` returns to 0 after workers flush buffered answers.
- Database shows the expected number of `submitted` attempts.

For the 800-user ceiling:

- The system may be slower, but it must not collapse: no process crash, no DB connection exhaustion, no unbounded Redis backlog, and all submitted attempts eventually produce result/review.

## What To Record

For each run, save:

- Date/time.
- Git commit.
- Backend/frontend image tags.
- `LOAD_USER_COUNT`, `LOAD_IP_MODE`, `LOAD_START_SPREAD_SECONDS`.
- k6 summary output.
- Backend instance size and DB/Redis plan.
- Peak CPU/RAM.
- Redis stream length peak and final value.
- DB attempt status counts after the run.
