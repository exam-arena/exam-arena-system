# Media Delivery Decision

Date: 2026-04-29

Scope: beta exam question, answer, and explanation images.

## Current State

- Real exam images have been uploaded to S3.
- CloudFront is pending AWS account/free-tier verification.
- CloudFront pending status does not block backend/frontend deployment work.
- Media delivery remains a final Go/No-Go gate before the exam.

## Decision

Proceed with app deployment preparation while media delivery stays `PARTIAL PASS`.

Preferred path:

1. Wait for CloudFront to become available.
2. Put CloudFront in front of the S3 bucket.
3. Update `docs/media-url-mapping.csv` with CloudFront URLs.
4. Replace seed/data image URLs.
5. Re-seed staging and run smoke/browser media checks.

Fallback path if CloudFront is still unavailable near the exam:

1. Use S3 direct public-read URLs only for the required exam media prefix.
2. Verify every URL with `curl -I` and browser rendering.
3. Record the risk as accepted for beta.
4. Move to CloudFront after AWS verification completes.

Rejected path for final beta media:

- Do not rely on Cloudinary placeholder URLs for real exam images.
- Do not use short-lived presigned URLs for static exam images.

## Deadline

Set a hard media decision deadline before the beta exam:

```text
T-24h: CloudFront ready OR S3 direct fallback accepted and verified.
```

If neither CloudFront nor S3 fallback is verified by the deadline, the media gate is `BLOCKED` for any exam that requires images.

## Accepted Risk If Using S3 Direct

S3 direct delivery is acceptable only as a beta fallback and only if:

- Images are few enough and small enough for the expected traffic.
- Browser verification passes.
- S3 object URLs are stable and public for the exam window.
- Public access is limited to the media prefix, not broad write access.
- The team accepts lower cache/global delivery performance than CloudFront.

## Verification Commands

CloudFront or S3 direct URL check:

```powershell
curl.exe -I "https://media-domain-or-s3-url/path/to/image.png"
```

Required response:

- HTTP 200.
- Correct `Content-Type`.
- Cache header present if possible.
- Opens in a clean browser session.

Staging check after URL replacement:

```powershell
psql "$env:DATABASE_URL" -f scripts/seed_mock_exam_0101.sql
$env:SMOKE_API_URL="http://localhost:8080"
$env:SMOKE_IDENTIFIER="mock_student_0101"
$env:SMOKE_PASSWORD="Password@123"
$env:SMOKE_EXAM_ID="30000000-0000-0000-0000-000000010101"
node scripts/smoke-beta-flow.js
```

## Current Gate Status

```text
Media Delivery: PARTIAL PASS
Reason: S3 upload done; CloudFront pending AWS verification.
Required before exam: CloudFront verified OR S3 direct fallback accepted and verified.
```
