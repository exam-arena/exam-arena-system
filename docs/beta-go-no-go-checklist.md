# Beta Go / No-Go Checklist

Date: 2026-04-29

Use statuses:

- `PASS`
- `PARTIAL PASS`
- `BLOCKED`
- `ACCEPTED RISK`

## Current Summary

| Area | Status | Notes |
|---|---|---|
| Backend build/runtime | PASS | Production Dockerfile and health/readiness endpoints are available. |
| Frontend build/runtime | PASS | Production Dockerfile passes `NEXT_PUBLIC_API_URL` at build time. |
| Env contract | PASS | Staging env contract has all expected keys; production example documents required keys. |
| Smoke test | PASS | User reported staging smoke test passed. |
| Load test | PASS | Unique-IP 100/500/800 passed; same-IP 100 accepted. |
| Same-IP 500/800 | ACCEPTED RISK | Intentionally skipped for beta. |
| Media delivery | PARTIAL PASS | Real images uploaded to S3; CloudFront pending AWS verification. |
| Avatar storage | ACCEPTED RISK | Cloudinary remains for avatar during beta. |
| DB/Redis readiness | PASS | Rehearsal checklist reported passed by operator. |
| Secret hygiene | NEEDS CHECK | Run Step 8 secret scan before final deploy. |
| Final production deploy | PENDING | Requires production deploy runbook execution. |

## App Runtime Gate

- [ ] `docker compose --env-file .env.production -f docker-compose.prod.yml config` renders.
- [ ] Backend image builds.
- [ ] Frontend image builds.
- [ ] `/healthz` returns HTTP 200.
- [ ] `/readyz` returns HTTP 200.
- [ ] Backend logs show no panic/repeated 5xx.
- [ ] Frontend can call API without CORS errors.
- [ ] HTTPS cookie works with `COOKIE_SECURE=true`.

## Database And Redis Gate

- [ ] Production DB target confirmed.
- [ ] DB backup/snapshot exists.
- [ ] Redis target confirmed.
- [ ] Redis submit stream drains after submit traffic.
- [ ] `dirty_attempts` does not grow without draining.
- [ ] DB pool limits are acceptable for the number of backend instances.

## Auth And Rate Limit Gate

- [ ] `JWT_SECRET` is strong and non-placeholder.
- [ ] `ALLOWED_ORIGINS` contains only intended production origins.
- [ ] Login rate limit policy for exam window is decided.
- [ ] Same-IP 100 result accepted.
- [ ] Same-IP 500/800 skipped as accepted risk.

## Media Gate

Current status:

```text
PARTIAL PASS
Reason: real images uploaded to S3, CloudFront pending AWS verification.
```

Before exam, one of these must be true:

- [ ] CloudFront ready, CloudFront URLs verified, seed/data updated, smoke/browser check passed.
- [ ] S3 direct fallback accepted, S3 URLs verified, seed/data updated, smoke/browser check passed.
- [ ] Exam version contains no required images and image URLs are `NULL`.

Blocked if:

- [ ] Required images still use Cloudinary placeholders.
- [ ] Required images have no stable public URL.
- [ ] Browser rendering shows broken images.

## Monitoring Gate

- [ ] Operator knows backend log command.
- [ ] Operator knows Redis stream/dirty set checks.
- [ ] Operator knows DB attempt status query.
- [ ] Operator has contact/escalation path during the 90-minute exam.

## Rollback Gate

- [ ] Previous known-good image/config identified.
- [ ] Backend restart command known.
- [ ] Full stack restart command known.
- [ ] DB destructive rollback is explicitly forbidden during exam unless approved.

## Final Decision

```text
GO / NO-GO:
Decision time:
Decision owner:
Open accepted risks:
```
