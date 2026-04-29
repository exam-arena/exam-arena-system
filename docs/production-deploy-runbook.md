# Production Deploy Runbook

Purpose: deploy the app/runtime stack after staging rehearsal has passed. This runbook does not replace the media gate; media remains a separate Go/No-Go item.

## 1. Pre-Deploy Checklist

Record before deploy:

```text
Date/time:
Operator:
Git commit:
Backend image/tag:
Frontend image/tag:
Database target:
Redis target:
Frontend domain:
Backend/API domain:
Media status: CloudFront ready / S3 direct fallback / blocked
```

Required checks:

- `.env.production` exists on the deploy host and is not committed.
- `JWT_SECRET` is a strong production value, not a placeholder.
- `DATABASE_URL` points to the intended production DB.
- `REDIS_URL` points to the intended production Redis.
- `ALLOWED_ORIGINS` contains only production frontend origins.
- `COOKIE_SECURE=true`.
- `NEXT_PUBLIC_API_URL` points to the production API base URL and is available at frontend build time.
- DB backup/snapshot exists before deploy.
- Media delivery decision is recorded in `docs/media-delivery-decision.md`.

## 2. Render Compose Config

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml config
```

Pass criteria:

- Config renders.
- Frontend build args include `NEXT_PUBLIC_API_URL`.
- Backend receives DB, Redis, JWT, CORS, cookie, worker, and rate-limit env.

## 3. Build Images

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml build backend frontend
```

Pass criteria:

- Backend production image builds.
- Frontend production image builds.
- No frontend build-time fallback to localhost.

## 4. Deploy/Update Stack

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml up -d
```

Check containers:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml ps
```

Pass criteria:

- Backend is healthy.
- Frontend is running.
- Restart count is stable.

## 5. Health Checks

Use the real API URL:

```powershell
curl.exe -i https://api.examarena.id.vn/healthz
curl.exe -i https://api.examarena.id.vn/readyz
```

Pass criteria:

- `/healthz` returns HTTP 200.
- `/readyz` returns HTTP 200.

If `/readyz` fails, stop and inspect DB/Redis before admitting users.

## 6. Smoke Test

Use a production-safe smoke account or staging-only account if this is still a production-like rehearsal:

```powershell
$env:SMOKE_API_URL="https://api.examarena.id.vn"
$env:SMOKE_IDENTIFIER="mock_student_0101"
$env:SMOKE_PASSWORD="Password@123"
$env:SMOKE_EXAM_ID="30000000-0000-0000-0000-000000010101"
node scripts/smoke-beta-flow.js
```

Pass criteria:

- Smoke script prints `[PASS] smoke beta flow`.
- No backend panic or repeated 5xx.

Do not run destructive seed/reset scripts against production unless this is a disposable production-like rehearsal environment.

## 7. Frontend Browser Check

Manual checks:

- Open production frontend URL.
- Login with a safe test account.
- Start an attempt.
- Save an answer.
- Submit if the account/exam is disposable.
- Confirm images render if media is ready.

Pass criteria:

- Cookie works over HTTPS.
- CORS does not block API calls.
- No broken image for required exam media.

## 8. Post-Deploy Monitoring

Backend logs:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml logs --tail=100 backend
```

Container resources:

```powershell
docker stats --no-stream
```

Redis checks depend on where Redis runs. For local compose Redis:

```powershell
docker exec -it exam-arena-system-redis-1 redis-cli XLEN exam_submit_stream
docker exec -it exam-arena-system-redis-1 redis-cli SCARD dirty_attempts
```

DB attempt state sample:

```sql
SELECT status, COUNT(*)
FROM exam_attempt
GROUP BY status;
```

Pass criteria:

- No repeated 5xx.
- No DB connection exhaustion.
- Redis queue does not grow without draining.
- Attempt statuses behave as expected.

## 9. Rollback

Rollback means returning to the previous known-good image/config.

Restart backend only:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml restart backend
```

Restart full stack:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml restart
```

Stop stack:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml down
```

Do not run destructive DB rollback commands during the exam unless the issue is understood and approved.

## 10. Go / No-Go

Production deploy is Go only if:

- Health and readiness pass.
- Smoke test passes.
- Browser auth/CORS/cookie check passes.
- DB/Redis monitoring is clean.
- Media gate is pass or explicitly accepted fallback.
- Rollback owner is present.
