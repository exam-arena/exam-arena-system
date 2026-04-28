# Media Migration Inventory

Generated: 2026-04-27

Scope: beta exam media references that currently point to Cloudinary placeholders. The real exam images are stored outside this repo on the operator's machine and still need to be uploaded to S3 + CloudFront.

## Current Decision

- Cloudinary URLs in seed/data are test placeholders only.
- Exam-critical images must move to S3 + CloudFront before final production Go/No-Go.
- User avatars can remain on Cloudinary for beta because avatar upload is not exam-critical.
- Seed/data URLs should not be changed until the real CloudFront base URL and image mapping are available.

## Summary

Current Cloudinary references found: 15

Files:

- `scripts/neon_seed_exam_arena.sql`: 2 references
- `scripts/seed_mock_exam_0101.sql`: 11 references
- `frontend/data.json`: 2 references

Known placeholder URLs:

- `https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767290691/Gemini_Generated_Image_qa9n92qa9n92qa9n_hvuawy.png`
- `https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767291860/Gemini_Generated_Image_koyi8ckoyi8ckoyi_wtyvft.png`

No `question_explanation.image_url` rows currently contain non-null image URLs in `scripts/seed_mock_exam_0101.sql`.

## S3 Key Convention

Use the exam ID as the stable namespace:

```text
exams/<exam_id>/questions/<question_id>.<ext>
exams/<exam_id>/answers/<question_id>-<option_id>.<ext>
exams/<exam_id>/explanations/<question_id>-exp-<order>.<ext>
```

For the current mock/beta exam:

```text
exams/30000000-0000-0000-0000-000000010101/questions/40000000-0000-0000-0000-000000010101.png
```

If the real exam uses a different `exam_id`, use that real ID instead. Do not upload final beta assets under the mock exam path unless the mock exam is the actual beta exam.

## Inventory Table

| Source file | Line | Entity | Current URL | Target status |
|---|---:|---|---|---|
| `scripts/neon_seed_exam_arena.sql` | 208 | question `40000000-0000-0000-0000-000000000002` | placeholder 1 | Needs real image mapping |
| `scripts/neon_seed_exam_arena.sql` | 220 | question `40000000-0000-0000-0000-000000000013` | placeholder 2 | Needs real image mapping |
| `scripts/seed_mock_exam_0101.sql` | 100 | question `40000000-0000-0000-0000-000000010101` | placeholder 1 | Needs real image mapping |
| `scripts/seed_mock_exam_0101.sql` | 105 | question `40000000-0000-0000-0000-000000010106` | placeholder 1 | Needs real image mapping |
| `scripts/seed_mock_exam_0101.sql` | 109 | question `40000000-0000-0000-0000-000000010108` | placeholder 1 | Needs real image mapping |
| `scripts/seed_mock_exam_0101.sql` | 117 | question `40000000-0000-0000-0000-000000010201` | placeholder 1 | Needs real image mapping |
| `scripts/seed_mock_exam_0101.sql` | 123 | question `40000000-0000-0000-0000-000000010206` | placeholder 1 | Needs real image mapping |
| `scripts/seed_mock_exam_0101.sql` | 135 | question `40000000-0000-0000-0000-000000010216` | placeholder 1 | Needs real image mapping |
| `scripts/seed_mock_exam_0101.sql` | 141 | question `40000000-0000-0000-0000-000000010301` | placeholder 1 | Needs real image mapping |
| `scripts/seed_mock_exam_0101.sql` | 142 | question `40000000-0000-0000-0000-000000010302` | placeholder 1 | Needs real image mapping |
| `scripts/seed_mock_exam_0101.sql` | 144 | question `40000000-0000-0000-0000-000000010304` | placeholder 1 | Needs real image mapping |
| `scripts/seed_mock_exam_0101.sql` | 145 | question `40000000-0000-0000-0000-000000010305` | placeholder 1 | Needs real image mapping |
| `scripts/seed_mock_exam_0101.sql` | 146 | question `40000000-0000-0000-0000-000000010306` | placeholder 1 | Needs real image mapping |
| `frontend/data.json` | 167 | question `40000000-0000-0000-0000-000000000002` | placeholder 1 | Needs real image mapping if this file is still used |
| `frontend/data.json` | 493 | question `40000000-0000-0000-0000-000000000013` | placeholder 2 | Needs real image mapping if this file is still used |

## Mapping File

Use `docs/media-url-mapping.csv` as the working file. Fill:

- `local_file`: absolute path to the real image on your machine.
- `s3_key`: final object key.
- `cloudfront_url`: final public URL.
- `status`: `pending`, `uploaded`, `verified`, or `not_needed`.

Do not update seed/data files until every required row is `verified` or explicitly `not_needed`.

## Gate

Media gate passes only when:

- All real exam images are uploaded to S3.
- CloudFront returns HTTP 200 for every final URL.
- `Content-Type` is correct for each file.
- No real exam question uses a shared placeholder image.
- Seed/data URLs point to CloudFront or are `NULL` when the question does not need an image.
- Staging smoke test passes after reseeding with final media URLs.
