# Room Exams API

## Endpoint

`GET /api/v1/rooms/{roomId}/exams?page=1&limit=8`

## Purpose

Return a paginated list of exam summaries that belong to a single room.

This endpoint is designed for room detail pages and intentionally excludes heavy exam detail fields such as sections, questions, options, and explanations.

## Query Parameters

- `page`
  - Optional
  - Default: `1`
  - Values `<= 0` are normalized to `1`
- `limit`
  - Optional
  - Default: `8`
  - Values `<= 0` are normalized to `8`
  - Values `> 50` are capped to `50`

## Success Response

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "exam_id": "30000000-0000-0000-0000-000000000001",
        "room_id": "20000000-0000-0000-0000-000000000001",
        "title": "De thi thu THPT 2026 mon Toan - Cau truc chuan",
        "type": "practice",
        "duration": 5400,
        "start_time": "2026-04-02T00:00:00Z"
      }
    ],
    "totalItems": 17,
    "currentPage": 1,
    "totalPages": 3,
    "itemsPerPage": 8
  }
}
```

## Error Responses

### Room not found

```json
{
  "status": "error",
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "Room not found"
  }
}
```

### Invalid method

```json
{
  "status": "error",
  "error": {
    "code": "METHOD_NOT_ALLOWED",
    "message": "Method not allowed"
  }
}
```

## Performance Notes

- The endpoint returns summary fields only to keep payloads small.
- Pagination is mandatory for frontend usage and defaults to `8` items per page.
- Recommended database index:
  - `(room_id, start_time DESC)`
- Recommended cache key:
  - `room-exams:{roomId}:{page}:{limit}`
- Suggested cache TTL:
  - `30-60s`

## Frontend Usage

Room detail page should request:

`/api/v1/rooms/{roomId}/exams?page={currentPage}&limit=8`

The response shape matches the frontend pagination contract:

- `items`
- `totalItems`
- `currentPage`
- `totalPages`
- `itemsPerPage`
