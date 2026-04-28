# Deploy Readiness Report

Generated: 2026-04-27

Scope: Step 1 of the current deployment pipeline. This audit checks whether the repository is ready to enter staging/deployment preparation for the 2026-05-12 beta exam.

## Summary

Current status: deployment blockers are being reduced, but staging is still gated by frontend production build verification and media migration.

The app can compile at the backend level and frontend lint passes, but there are production blockers that should be fixed before AWS staging:

- Dockerfiles are development-only.
- Backend lacks health/readiness endpoints.
- CORS reflects arbitrary origins while allowing credentials.
- Frontend production build could not be verified because the existing `.next` cache hit a filesystem permission error.
- Exam-critical question images still reference Cloudinary in seed/mock data.
- There is no production compose file or environment contract for staging/production.

## Verification Results

| Check | Result | Evidence |
|---|---|---|
| Read project guidance | Pass | `CLAUDE.md` reviewed before audit. |
| Backend tests | Pass with caveat | `go test ./...` passes, but all packages report `[no test files]`. |
| Backend production compile | Pass | `go build` succeeded when `GOCACHE` was redirected into a fresh workspace cache. |
| Frontend lint | Pass | `npm.cmd run lint` completed successfully. |
| Frontend production build | Blocked | `npm.cmd run build` failed with `EPERM` opening `frontend/.next/cache/.rscinfo`. This looks like a local build-cache/filesystem issue, not yet a confirmed code failure. |
| Git worktree visibility | Pass with workaround | `git -c safe.directory=D:/exam-arena-system status --short` works. |
| Secret files ignored | Partial | `.env` and `frontend/.env.local` exist and are not tracked. Need keep them out of commits. |

## Critical Blockers

### 1. Dockerfiles Are Development-Only

Files:

- `backend/Dockerfile`
- `frontend/Dockerfile`

Evidence:

- Backend installs and runs `air`.
- Frontend runs `npx next dev`.

Impact:

These images are not suitable for beta production. They add dev tooling, slower startup, hot reload behavior, and avoid optimized production builds.

Required action:

- Create production Dockerfiles or convert existing Dockerfiles to multi-stage production builds.
- Keep dev compose separate from production compose.

### 2. Missing Health And Readiness Endpoints

Files:

- `backend/main.go`
- `backend/routes/route.go`

Evidence:

- No `/healthz` or `/readyz` route is registered.

Impact:

ALB/EC2/Docker cannot reliably distinguish between:

- process is alive
- DB is reachable
- Redis is reachable
- app is ready for exam traffic

Required action:

- Add `GET /healthz`: process-level liveness.
- Add `GET /readyz`: checks DB ping and Redis ping/status.

### 3. CORS Is Unsafe For Production

File:

- `backend/middleware/cors.go`

Evidence:

- The middleware copies the request `Origin` into `Access-Control-Allow-Origin`.
- It also sets `Access-Control-Allow-Credentials: true`.

Impact:

For production with cookies/auth, this is too open. It should only allow known frontend domains.

Required action:

- Add `ALLOWED_ORIGINS` env.
- Reject or omit CORS headers for unknown origins.
- Include staging and production domains explicitly.

### 4. Frontend Build Verification Is Blocked

File/path:

- `frontend/.next/cache/.rscinfo`

Evidence:

- `npm.cmd run build` fails with `EPERM: operation not permitted, open 'D:\exam-arena-system\frontend\.next\cache\.rscinfo'`.

Impact:

We cannot yet certify frontend production build readiness.

Required action:

- Re-run build from a clean build cache.
- If the issue persists after clearing generated `.next`, inspect Next.js/Windows permissions.
- Do not deploy until `npm run build` passes in CI or a clean environment.

### 5. Exam Images Still Depend On Cloudinary

Files:

- `scripts/neon_seed_exam_arena.sql`
- `scripts/seed_mock_exam_0101.sql`
- `frontend/data.json`

Evidence:

- Multiple `image_url` values point to `https://res.cloudinary.com/...`.

Impact:

Cloudinary free-tier/quota should not be the critical path for question images during a 500-800 student exam.

Required action:

- Upload question and explanation images to S3.
- Serve through CloudFront.
- Update seed/data URLs to CloudFront URLs.
- Keep Cloudinary only for avatar until avatar storage is migrated.

## High Priority Risks

### Redis Is Operationally Required For The Beta

Evidence:

- Submit queue, rate limits, cache, answer buffering, and workers depend on Redis when enabled.
- Workers start in `backend/main.go`.

Risk:

Although code has fallbacks when Redis is disabled, the 500-800 concurrent exam path should treat Redis as required infrastructure.

Required action:

- Use ElastiCache/Valkey or a dedicated managed Redis for production beta.
- Add readiness signal for Redis.
- Monitor stream backlog and dirty answer flushing during load test.

### Backend Tests Are Not Providing Behavioral Coverage

Evidence:

- `go test ./...` reports no test files across packages.

Risk:

Compile success does not prove start attempt, autosave, submit, result, and review behavior.

Required action:

- Add at least smoke/integration scripts for beta-critical flows.
- Keep existing burst scripts and adapt them for staging/load testing.

### Production Environment Contract Is Incomplete

Evidence:

- `.env.example` only includes `DATABASE_URL` and `JWT_SECRET`.
- Runtime also needs Redis, Cloudinary, cookie, DB pool, attempt worker, and frontend API variables.

Required action:

- Add `.env.production.example`.
- Add `.env.staging.example`.
- Document all required variables and sane beta defaults.

## Recommended Next Actions

1. Add production Dockerfiles and `docker-compose.prod.yml`.
2. Add `/healthz` and `/readyz`.
3. Replace CORS reflection with `ALLOWED_ORIGINS`.
4. Re-run frontend build from clean cache or CI.
5. Create production/staging env examples.
6. Migrate exam-critical images from Cloudinary to S3 + CloudFront.
7. Prepare staging deploy runbook.
8. Run load test against the 800-student path before 2026-05-10.

## Current Gate Decision

Do not start AWS production deployment yet.

Staging can start after the remaining open items below are handled or explicitly accepted for a dry run.

## Step 2 Progress

Completed in Step 2:

- Added production backend image definition: `backend/Dockerfile.prod`.
- Added production frontend image definition: `frontend/Dockerfile.prod`.
- Added production compose file: `docker-compose.prod.yml`.
- Added backend liveness endpoint: `GET /healthz`.
- Added backend readiness endpoint: `GET /readyz`, checking database and Redis.
- Replaced CORS origin reflection with `ALLOWED_ORIGINS` whitelist behavior.
- Added staging and production env examples.
- Updated `.gitignore` to avoid committing environment-specific secret files.
- Raised frontend TypeScript target to `ES2018` so current regex usage type-checks.

Verification after Step 2:

- `go test ./...` passes, still with no test files.
- Backend `go build -buildvcs=false` passes.
- `npm.cmd run lint` passes.
- `npx.cmd tsc --noEmit --incremental false` passes.
- `docker compose --env-file .env.production.example -f docker-compose.prod.yml config` passes.

Still open:

- `npm.cmd run build` is still blocked by local `.next` cache permissions on `frontend/.next/cache/.rscinfo`.
- Exam-critical image URLs still need migration from Cloudinary to S3 + CloudFront.
- No beta-critical integration/load tests have been added yet.

## Step 3 Progress

Completed in Step 3:

- Re-read `CLAUDE.md` before executing this phase.
- Confirmed host frontend build remains blocked by old generated `.next` cache permissions.
- Confirmed frontend production build succeeds inside the clean Docker build context.
- Confirmed backend production Docker image builds successfully.
- Confirmed production compose config renders successfully with `.env.production.example`.
- Added media migration inventory: `docs/media-migration-inventory.md`.

Verification after Step 3:

- `go test ./...` passes, still with no test files.
- Backend `go build -buildvcs=false` passes.
- `npm.cmd run lint` passes.
- `npx.cmd tsc --noEmit --incremental false` passes.
- `docker build -f backend/Dockerfile.prod -t exam-arena-backend:step3 backend` passes.
- `docker build -f frontend/Dockerfile.prod -t exam-arena-frontend:step3 frontend` passes.
- `docker compose --env-file .env.production.example -f docker-compose.prod.yml config` passes.

Notes:

- Host `npm.cmd run build` still fails on `frontend/.next/cache/.rscinfo`; this is a local generated-cache/permission issue. The clean Docker build passes and is the more relevant deployment signal.
- Docker build output reports npm audit warnings: frontend dependencies currently show high/moderate vulnerabilities. This should be reviewed before production freeze.
- Next.js reports the `middleware` file convention is deprecated in favor of `proxy`; this is not a beta blocker but should be tracked.
- Runtime smoke testing with `docker compose up` was not completed because real staging DB/Redis endpoints are not configured yet.

Current Step 3 gate:

- Build readiness is acceptable for staging.
- Runtime readiness still requires staging DB/Redis and a real `.env.staging`.
- Media readiness still requires final image upload to S3 + CloudFront.

## Step 4 Progress

Completed in Step 4:

- Added beta smoke test script: `scripts/smoke-beta-flow.js`.
- Added local staging compose override with Redis: `docker-compose.staging.yml`.
- Added smoke test runbook: `docs/staging-smoke-test.md`.
- Confirmed existing k6 scripts are burst/load scripts, not smoke tests.
- Confirmed `scripts/seed_mock_exam_0101.sql` includes a mock student, room access, exam, sections, and questions for smoke testing.

Verification after Step 4:

- `node --check scripts/smoke-beta-flow.js` passes.
- Running the script without `SMOKE_PASSWORD` fails fast with a clear required-env message.
- `docker compose --env-file .env.staging.example -f docker-compose.prod.yml -f docker-compose.staging.yml config` passes.
- `go test ./...` passes, still with no test files.
- `npm.cmd run lint` passes.
- `npx.cmd tsc --noEmit --incremental false` passes.

Current Step 4 gate:

- Smoke/integration test foundation is ready.
- Runtime smoke execution still requires a real `.env.staging`, a reachable staging database, applied seed data, and the test user's plaintext password.
- The current Go test suite still has no behavioral tests; smoke coverage is script-based for beta readiness.

## Step 5 Progress

Completed in Step 5:

- Added k6 full-flow load test script: `scripts/load-beta-flow.js`.
- Added beta load test runbook: `docs/load-test-plan.md`.
- Covered both requested IP cases:
  - `LOAD_IP_MODE=same` for one shared public IP/NAT-style behavior.
  - `LOAD_IP_MODE=unique` for application-level unique client IP simulation via `X-Forwarded-For`.
- Documented seed/reset requirements for `scripts/seed_load_test_users.sql`.
- Documented PowerShell commands for 100-user rehearsal, 500-user target, and 800-user ceiling runs.
- Documented monitoring queries/commands for backend logs, container resources, Redis submit stream, dirty answer set, and database attempt status.

Verification after Step 5:

- `k6 inspect` succeeds for `scripts/load-beta-flow.js` with one VU and the documented common PowerShell argument pattern.

Current Step 5 gate:

- Load-test tooling is ready for staging execution.
- Actual k6 execution should only run after the staging backend points at the intended load-test Neon branch/database and `seed_load_test_users.sql` has been applied.
- The same-IP case may intentionally expose login IP rate-limit failures under default settings; treat repeated login `429` responses as a beta capacity/rate-limit decision, not as a k6-script defect.

## Step 6 Progress

Completed in Step 6:

- Reviewed `docs/load-test-results.md` and added correction notes so the report distinguishes load-test readiness from final production sign-off.
- Recorded the operational decision that same-IP 100 users is accepted for this beta, while same-IP 500/800 is intentionally skipped as an accepted risk.
- Added production-like rehearsal runbook: `docs/production-rehearsal-runbook.md`.
- Updated frontend production Docker build so `NEXT_PUBLIC_API_URL` is available at build time through Docker build args.
- Updated `docker-compose.prod.yml` to pass key auth, worker, and beta-critical rate-limit environment variables.
- Updated `.env.staging.example` and `.env.production.example` with auth timeout, login protection, and beta-critical rate-limit variables.

Verification after Step 6:

- `docker compose --env-file .env.staging.example -f docker-compose.prod.yml -f docker-compose.staging.yml config` renders successfully.
- `docker compose --env-file .env.production.example -f docker-compose.prod.yml config` renders successfully.
- Docker emitted `C:\Users\oOOo\.docker\config.json: Access is denied` warnings while rendering config, but both commands exited successfully and printed the expected service configuration.

Current Step 6 gate:

- Documentation and env contract are ready for production-like staging rehearsal.
- Final production Go/No-Go still requires the rehearsal runbook to pass on the intended staging stack.
- Media remains a separate gate: real exam question/answer images must be uploaded and verified, or explicitly accepted as a conditional beta risk.

## Step 7 Progress

Completed in Step 7:

- Re-scanned current media references in seed/data files.
- Rebuilt `docs/media-migration-inventory.md` with exact Cloudinary placeholder references and target status.
- Added working mapping template: `docs/media-url-mapping.csv`.
- Added S3 + CloudFront migration runbook: `docs/s3-cloudfront-media-runbook.md`.
- Confirmed current repo only contains UI/public assets under `frontend/public`; real exam images are not in the repo and must be mapped from the operator's local machine.

Current Step 7 gate:

- Do not update seed/data URLs yet because no real CloudFront base URL and no real local-file mapping have been provided.
- Media gate remains blocked until real exam image files are uploaded, CloudFront URLs are verified, and seed/data references are replaced or set to `NULL`.
- Avatar migration is intentionally out of scope for beta unless explicitly prioritized; Cloudinary may remain for avatars.
