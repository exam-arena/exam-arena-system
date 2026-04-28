# Staging Smoke Test

Purpose: verify the beta-critical exam flow after a local-production or staging deployment.

This is not a load test. It is a fast pass/fail check for:

1. Backend liveness and readiness.
2. Login and authenticated session cookie.
3. Exam attempt creation.
4. Answer save.
5. Submit.
6. Result and review availability.

## Required Seed Data

The default smoke script expects the mock beta seed:

- Seed file: `scripts/seed_mock_exam_0101.sql`
- Test user identifier: `mock_student_0101`
- Test exam id: `30000000-0000-0000-0000-000000010101`

Apply the seed to the staging database before running the smoke test.

## Local-Production Runtime

Create a real `.env.staging` from `.env.staging.example`, then set at least:

- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `NEXT_PUBLIC_API_URL`
- Cloudinary avatar variables if avatar endpoints are tested

For local HTTP browser testing, use:

```powershell
COOKIE_SECURE=false
NEXT_PUBLIC_API_URL=http://localhost:8080
ALLOWED_ORIGINS=http://localhost:3000
```

Run production containers with local Redis:

```powershell
docker compose --env-file .env.staging -f docker-compose.prod.yml -f docker-compose.staging.yml up --build
```

Expected:

- Backend listens on `http://localhost:8080`.
- Frontend listens on `http://localhost:3000`.
- Redis listens on `localhost:6379`.
- `GET http://localhost:8080/healthz` returns HTTP 200.
- `GET http://localhost:8080/readyz` returns HTTP 200 after DB and Redis are reachable.

## Run Smoke Test

The smoke script requires the test user's plaintext password through an environment variable.

```powershell
$env:SMOKE_API_URL="http://localhost:8080"
$env:SMOKE_IDENTIFIER="mock_student_0101"
$env:SMOKE_PASSWORD="Password@123"
$env:SMOKE_EXAM_ID="30000000-0000-0000-0000-000000010101"
node scripts/smoke-beta-flow.js
```

Expected output shape:

```text
[RUN] healthz ... pass
[RUN] readyz ... pass
[RUN] login ... pass
[RUN] auth/me ... pass
[RUN] list rooms ... pass
[RUN] list exams ... pass
[RUN] start attempt ... pass
[RUN] get attempt ... pass
[RUN] save answer ... pass
[RUN] submit attempt ... pass
[RUN] result ... pass
[RUN] review ... pass
[PASS] smoke beta flow
```

## Environment Variables

| Variable | Required | Default | Notes |
|---|---:|---|---|
| `SMOKE_API_URL` | No | `http://localhost:8080` | Backend base URL. |
| `SMOKE_IDENTIFIER` | No | `mock_student_0101` | Login identifier. |
| `SMOKE_PASSWORD` | Yes | none | Plaintext test-user password. |
| `SMOKE_EXAM_ID` | No | `30000000-0000-0000-0000-000000010101` | Seeded mock exam. |
| `SMOKE_RESULT_POLLS` | No | `12` | Poll attempts for result/review. |
| `SMOKE_RESULT_POLL_DELAY_MS` | No | `1000` | Delay between polls. |

## Notes

- The script uses the `access_token` cookie returned by login.
- If the same user has already completed a single-attempt exam, reset/reseed the smoke data before running again.
- If submit returns quickly but result/review stay in processing, inspect Redis stream/worker logs first.
