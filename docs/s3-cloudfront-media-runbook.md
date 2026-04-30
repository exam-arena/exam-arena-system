# S3 + CloudFront Media Migration Runbook

Purpose: move exam-critical question, answer, and explanation images from Cloudinary placeholders to S3 + CloudFront before beta production sign-off.

This runbook intentionally keeps avatar upload on Cloudinary for beta. Avatar storage migration is a separate post-beta task unless explicitly prioritized.

## 1. Inputs Needed

Before changing seed/data URLs, prepare:

- Real local image folder on your machine.
- AWS region, recommended: `ap-southeast-1` for S3 bucket near Vietnam/Singapore.
- S3 bucket name, for example `exam-arena-production-media`.
- CloudFront distribution domain, for example `https://dxxxxx.cloudfront.net`.
- Optional custom domain, for example `https://media.examarena.id.vn`.
- Completed `docs/media-url-mapping.csv`.

Do not commit real image binaries into this repo unless they are intentionally part of the source project.

## 2. AWS Resource Setup

Recommended architecture:

```text
Browser
  -> CloudFront distribution
  -> Origin Access Control
  -> private S3 bucket
```

Security defaults:

- S3 Block Public Access: ON.
- S3 bucket objects: private.
- CloudFront Origin Access Control: ON.
- Viewer protocol policy: redirect HTTP to HTTPS.
- Allowed methods: GET, HEAD.
- Cache policy: optimized/caching enabled for static images.

### Create S3 Bucket

Set variables:

```powershell
$env:AWS_REGION="ap-southeast-1"
$env:MEDIA_BUCKET="exam-arena-production-media"
```

Create bucket:

```powershell
aws s3api create-bucket `
  --bucket $env:MEDIA_BUCKET `
  --region $env:AWS_REGION `
  --create-bucket-configuration LocationConstraint=$env:AWS_REGION
```

Block public access:

```powershell
aws s3api put-public-access-block `
  --bucket $env:MEDIA_BUCKET `
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

Enable versioning:

```powershell
aws s3api put-bucket-versioning `
  --bucket $env:MEDIA_BUCKET `
  --versioning-configuration Status=Enabled
```

### Create CloudFront

Use AWS Console for the first setup to reduce risk:

1. Open CloudFront.
2. Create distribution.
3. Origin domain: the S3 bucket.
4. Origin access: Origin Access Control.
5. Viewer protocol policy: Redirect HTTP to HTTPS.
6. Allowed methods: GET, HEAD.
7. Default root object: leave blank.
8. Add custom domain only if ACM certificate is ready in `us-east-1`.
9. After creation, apply the generated bucket policy that allows CloudFront to read the S3 bucket.

Record:

```powershell
$env:MEDIA_BASE_URL="https://dxxxxx.cloudfront.net"
```

If using custom domain:

```powershell
$env:MEDIA_BASE_URL="https://media.examarena.id.vn"
```

## 3. Prepare Local Files

Recommended local folder layout:

```text
D:\exam-media\
  exams\
    30000000-0000-0000-0000-000000010101\
      questions\
      answers\
      explanations\
```

Object keys should match `docs/media-url-mapping.csv`.

Example:

```text
exams/30000000-0000-0000-0000-000000010101/questions/40000000-0000-0000-0000-000000010101.png
```

## 4. Upload Images

For versioned/final exam images:

```powershell
$env:LOCAL_MEDIA_DIR="D:\exam-media"
aws s3 sync $env:LOCAL_MEDIA_DIR "s3://$env:MEDIA_BUCKET" `
  --cache-control "public,max-age=31536000,immutable" `
  --exclude "*" `
  --include "*.png" `
  --include "*.jpg" `
  --include "*.jpeg" `
  --include "*.webp"
```

If you may replace files before beta, use shorter cache during rehearsal:

```powershell
aws s3 sync $env:LOCAL_MEDIA_DIR "s3://$env:MEDIA_BUCKET" `
  --cache-control "public,max-age=3600" `
  --exclude "*" `
  --include "*.png" `
  --include "*.jpg" `
  --include "*.jpeg" `
  --include "*.webp"
```

## 5. Fill URL Mapping

Update `docs/media-url-mapping.csv`:

- `local_file`: absolute local path.
- `s3_key`: object key under the bucket.
- `cloudfront_url`: `$env:MEDIA_BASE_URL/<s3_key>`.
- `status`: set to `uploaded` after S3 upload.

Example:

```text
cloudfront_url=https://media.examarena.id.vn/exams/30000000-0000-0000-0000-000000010101/questions/40000000-0000-0000-0000-000000010101.png
```

## 6. Verify URLs

For each CloudFront URL:

```powershell
curl.exe -I "https://media.examarena.id.vn/exams/30000000-0000-0000-0000-000000010101/questions/40000000-0000-0000-0000-000000010101.png"
```

Pass criteria:

- HTTP status is `200`.
- `Content-Type` matches the file type.
- `Cache-Control` is present.
- URL opens in a clean browser session.
- URL does not require signed cookies or signed URLs.

After verification, set row `status=verified`.

## 7. Update Seed/Data Files

Only after all required rows are `verified`:

- Replace placeholder Cloudinary URLs in seed/data with `cloudfront_url`.
- If a question does not need an image, set `image_url` to `NULL`.
- Do not keep one shared placeholder image for multiple real questions.

Likely files:

- `scripts/seed_mock_exam_0101.sql`
- `scripts/neon_seed_exam_arena.sql`
- `frontend/data.json` if still used by the app.

## 8. Apply And Verify Staging

Re-seed staging:

```powershell
psql "$env:DATABASE_URL" -f scripts/seed_mock_exam_0101.sql
```

Run smoke:

```powershell
$env:SMOKE_API_URL="http://localhost:8080"
$env:SMOKE_IDENTIFIER="mock_student_0101"
$env:SMOKE_PASSWORD="Password@123"
$env:SMOKE_EXAM_ID="30000000-0000-0000-0000-000000010101"
node scripts/smoke-beta-flow.js
```

Manual browser verification:

- Open an attempt with image-heavy questions.
- Confirm every expected image renders.
- Confirm no broken image icon appears.

## 9. Final Media Gate

Pass only when:

- `docs/media-url-mapping.csv` has no `pending` rows for real exam media.
- Every real image row is `verified` or explicitly `not_needed`.
- Seed/data files contain no Cloudinary URL for exam-critical question, answer, or explanation images.
- Staging smoke passes after reseed.
- Manual browser image check passes.
- Local source image folder is backed up outside the repo.

## 10. Rollback

If CloudFront image delivery fails before production:

1. Do not deploy the new seed to production.
2. Fix CloudFront/S3/OAC or object keys.
3. Re-run URL verification.
4. Re-seed staging and smoke test again.

Avoid rolling back to Cloudinary for exam-critical images unless there is an explicit Go/No-Go decision accepting that risk.
