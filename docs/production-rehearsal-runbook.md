# Production-Like Staging Rehearsal Runbook

Purpose: rehearse the beta deployment flow before the 2026-05-12 exam using production Docker images, a staging/load-test database, Redis, and the same smoke/load checks used during readiness work.

This runbook does not deploy to production. It is the final staging rehearsal gate.

## 1. Rehearsal Scope

Target flow:

1. Build production backend and frontend images.
2. Start the staging stack with production compose files.
3. Verify `/healthz` and `/readyz`.
4. Apply seed data to the staging/load-test database.
5. Run beta smoke test.
6. Run a small load sanity check.
7. Verify Redis, database, and backend logs.
8. Decide Go / No-Go for beta production deployment.

Required assumptions:

- `DATABASE_URL` points to the intended Neon staging/load-test branch, not a shared dev database.
- `.env.staging` is created from `.env.staging.example` and contains real secrets.
- `NEXT_PUBLIC_API_URL` is the externally reachable backend API URL.
- `API_INTERNAL_URL` remains `http://backend:8080` when frontend and backend run in the same Docker network.
- Question images for the real exam are uploaded and URLs are final, or the media gate is explicitly accepted as conditional.

## 2. Prepare Environment

Create `.env.staging` from the example and fill real values:

```powershell
Copy-Item .env.staging.example .env.staging
notepad .env.staging
```

Minimum values to verify:

```text
DATABASE_URL=...
JWT_SECRET=...
REDIS_URL=redis://redis:6379/0
ALLOWED_ORIGINS=https://staging.example.com
COOKIE_SECURE=true
NEXT_PUBLIC_API_URL=https://staging-api.example.com
API_INTERNAL_URL=http://backend:8080
```

If students may share one public IP during the real exam, decide the beta login policy before rehearsal:

```text
LOGIN_RATE_LIMIT_RPS=3
LOGIN_RATE_LIMIT_BURST=10
```

The default is conservative. If the exam uses a shared school NAT and students log in at the same time, raise `LOGIN_RATE_LIMIT_RPS` and `LOGIN_RATE_LIMIT_BURST` temporarily during the login window, then restore after the exam starts.

## 3. Build Production Images

```powershell
docker compose --env-file .env.staging -f docker-compose.prod.yml -f docker-compose.staging.yml build backend frontend
```

Pass criteria:

- Backend image builds successfully.
- Frontend image builds successfully.
- Build logs do not show missing `NEXT_PUBLIC_API_URL`.

## 4. Start Stack

```powershell
docker compose --env-file .env.staging -f docker-compose.prod.yml -f docker-compose.staging.yml up -d
```

Check containers:

```powershell
docker compose --env-file .env.staging -f docker-compose.prod.yml -f docker-compose.staging.yml ps
```

Pass criteria:

- `backend` is healthy.
- `frontend` is running.
- `redis` is running.

## 5. Health And Readiness

```powershell
curl.exe -i http://localhost:8080/healthz
curl.exe -i http://localhost:8080/readyz
```

Pass criteria:

- `/healthz` returns HTTP 200.
- `/readyz` returns HTTP 200.
- If `/readyz` fails, inspect DB and Redis configuration before continuing.

## 6. Apply Staging Test Data

Run against the same DB used by the backend:

```powershell
psql "$env:DATABASE_URL" -f scripts/seed_mock_exam_0101.sql
psql "$env:DATABASE_URL" -f scripts/seed_load_test_users.sql
```

Verify:

```sql
SELECT COUNT(*) AS load_users
FROM users
WHERE username LIKE 'load_student_%';

SELECT COUNT(*) AS active_access
FROM user_room_access ura
JOIN users u ON u.user_id = ura.user_id
WHERE u.username LIKE 'load_student_%'
  AND ura.room_id = '20000000-0000-0000-0000-000000010101'
  AND ura.status = 'active';
```

Pass criteria:

- 800 load users.
- 800 active room access rows.

## 7. Smoke Test

```powershell
$env:SMOKE_API_URL="http://localhost:8080"
$env:SMOKE_IDENTIFIER="mock_student_0101"
$env:SMOKE_PASSWORD="Password@123"
$env:SMOKE_EXAM_ID="30000000-0000-0000-0000-000000010101"
node scripts/smoke-beta-flow.js
```

Pass criteria:

- Smoke script prints `[PASS] smoke beta flow`.
- Backend logs have no panic, repeated 5xx, DB timeout, or Redis timeout.

## 8. Load Sanity Check

Use a small run for rehearsal. Full 500/800 load was already covered in load testing; this step checks the production-like stack wiring.

```powershell
$env:BASE_URL="http://localhost:8080"
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

psql "$env:DATABASE_URL" -f scripts/seed_load_test_users.sql
k6 run @commonK6Args -e LOAD_USER_COUNT=100 -e LOAD_IP_MODE=unique -e LOAD_START_SPREAD_SECONDS=30 scripts/load-beta-flow.js
```

Optional same-IP sanity check:

```powershell
psql "$env:DATABASE_URL" -f scripts/seed_load_test_users.sql
k6 run @commonK6Args -e LOAD_USER_COUNT=100 -e LOAD_IP_MODE=same -e LOAD_FIXED_IP=198.18.0.1 -e LOAD_START_SPREAD_SECONDS=60 scripts/load-beta-flow.js
```

Pass criteria:

- `http_req_failed` is 0% for unique-IP sanity.
- k6 checks pass.
- Same-IP 100 user result is accepted as the beta NAT coverage gate.

## 9. Runtime Verification

Backend logs:

```powershell
docker compose --env-file .env.staging -f docker-compose.prod.yml -f docker-compose.staging.yml logs --tail=100 backend
```

Container resources:

```powershell
docker stats --no-stream
```

Redis:

```powershell
docker exec -it exam-arena-system-redis-1 redis-cli XLEN exam_submit_stream
docker exec -it exam-arena-system-redis-1 redis-cli SCARD dirty_attempts
docker exec -it exam-arena-system-redis-1 redis-cli INFO memory
```

Database:

```sql
SELECT status, COUNT(*)
FROM exam_attempt ea
JOIN users u ON u.user_id = ea.user_id
WHERE u.username LIKE 'load_student_%'
  AND ea.exam_id = '30000000-0000-0000-0000-000000010101'
GROUP BY status;
```

Pass criteria:

- No repeated 5xx in backend logs.
- No DB connection exhaustion.
- Redis stream and dirty set do not grow after the run finishes.
- Attempts eventually reach submitted/completed state according to current service behavior.

  ## 10. Media Gate

  Before production deploy, verify:

  - No real exam question/answer image still points to a placeholder URL.
  - Cloudinary usage is below the free quota if it remains in the beta path.
  - Real exam image URLs load from a browser without auth.
  - A local source folder or URL inventory exists for recovery.

  ### Cloudinary Status (Verified 2026-04-27)

  ```
  Plan: Free
  Storage: 250 MB / 10 GB (2.5% used)
  Bandwidth: 84 MB / 75 GB (0.11% used)
  Credits: 0.32 / 25.0 (1.28% used)
  Images: 210 objects
  ```

  Gate decision:

  - `PASS`: ✅ **all real exam media is uploaded and verified** (Cloudinary quota is safe with 98% remaining).
  - `CONDITIONAL PASS`: Cloudinary remains for beta, quota and URL inventory are accepted.
  - `BLOCKED`: real exam images are missing or still use test placeholders.

## 11. Go / No-Go Checklist

Go only if all required items pass:

- Production Docker images build.
- Stack starts with `.env.staging`.
- `/healthz` and `/readyz` pass.
- Smoke test passes.
- 100-user production-like load sanity passes.
- Unique-IP 500/800 load test report is accepted.
- Same-IP 100 result is accepted; same-IP 500/800 is an accepted risk.
- Env contract is complete for DB, Redis, JWT, CORS, cookie, workers, rate limits, Cloudinary, frontend API URL.
- Media gate is pass or explicitly conditional pass.
- Rollback/restart commands are known.

## 12. Restart And Rollback

Restart backend only:

```powershell
docker compose --env-file .env.staging -f docker-compose.prod.yml -f docker-compose.staging.yml restart backend
```

Restart full stack:

```powershell
docker compose --env-file .env.staging -f docker-compose.prod.yml -f docker-compose.staging.yml restart
```

Stop stack:

```powershell
docker compose --env-file .env.staging -f docker-compose.prod.yml -f docker-compose.staging.yml down
```

Rollback for this compose-based rehearsal means returning to the last known good image tag/config and restarting the stack. Do not run destructive DB rollback commands during the exam window unless the failure mode is understood and approved.
