# 📜 API Contract – ExamArena v1

> **Tài liệu chuẩn hóa input/output cho TOÀN BỘ API. Mọi thành viên backend PHẢI tuân theo.**
>
> Cập nhật: 2026-03-23 | Phiên bản: v1.0

---

## 📖 Mục lục

1. [Response Format chuẩn (BẮT BUỘC)](#1-response-format-chuẩn-bắt-buộc)
2. [HTTP Status Codes](#2-http-status-codes)
3. [Authentication Header](#3-authentication-header)
4. [Go Helper Functions](#4-go-helper-functions)
5. [API Endpoints Contract](#5-api-endpoints-contract)
6. [Data Types Reference](#6-data-types-reference)

---

## 1. Response Format chuẩn (BẮT BUỘC)

> ⚠️ **Mọi endpoint PHẢI trả JSON theo envelope pattern dưới đây. KHÔNG ĐƯỢC trả plain text, KHÔNG ĐƯỢC trả data trực tiếp.**

### 1.1 Success Response

```json
{
  "status": "success",
  "data": { ... }
}
```

- `status`: Luôn là `"success"`
- `data`: Object hoặc Array chứa kết quả

**Ví dụ — Single Object:**

```json
{
  "status": "success",
  "data": {
    "name": "Nguyễn Văn A",
    "email": "a@example.com"
  }
}
```

**Ví dụ — Array:**

```json
{
  "status": "success",
  "data": [
    { "exam_id": "uuid-1", "title": "Đề thi thử THPT Quốc Gia 2026 - Môn Toán" },
    { "exam_id": "uuid-2", "title": "Đề thi thử THPT Quốc Gia 2026 - Môn Vật Lý" }
  ]
}
```

**Ví dụ — With Pagination:**

```json
{
  "status": "success",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45
  }
}
```

### 1.2 Error Response

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Mô tả lỗi cho user đọc"
  }
}
```

- `status`: Luôn là `"error"`
- `error.code`: Mã lỗi bằng SCREAMING_SNAKE_CASE (cho FE xử lý programmatic)
- `error.message`: Message tiếng Anh, dễ hiểu, **KHÔNG lộ internal error**

**Ví dụ:**

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect"
  }
}
```

### 1.3 Validation Error Response (422)

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Input validation failed",
    "details": [
      { "field": "email", "message": "Email is required" },
      { "field": "password", "message": "Password must be at least 8 characters" }
    ]
  }
}
```

### 1.4 Bảng Error Codes

| Code | HTTP | Khi nào dùng |
|------|------|-------------|
| `VALIDATION_FAILED` | 422 | Input không hợp lệ |
| `INVALID_CREDENTIALS` | 401 | Sai email/password |
| `UNAUTHORIZED` | 401 | Thiếu hoặc sai JWT token |
| `FORBIDDEN` | 403 | JWT hợp lệ nhưng không đủ quyền |
| `NOT_FOUND` | 404 | Resource không tồn tại |
| `CONFLICT` | 409 | Trùng lặp (email, username đã tồn tại) |
| `INTERNAL_ERROR` | 500 | Lỗi server (log chi tiết, trả message chung) |

---

## 2. HTTP Status Codes

| Code | Ý nghĩa | Khi nào dùng |
|------|---------|-------------|
| `200` | OK | GET/PUT/PATCH thành công |
| `201` | Created | POST tạo resource thành công |
| `204` | No Content | DELETE thành công |
| `400` | Bad Request | Request malformed (JSON sai, thiếu body) |
| `401` | Unauthorized | Chưa login / JWT hết hạn |
| `403` | Forbidden | Đã login nhưng không có quyền |
| `404` | Not Found | Resource không tồn tại |
| `405` | Method Not Allowed | Sai HTTP method (POST vào endpoint GET) |
| `409` | Conflict | Email/username đã tồn tại |
| `422` | Unprocessable Entity | Input đúng format nhưng sai logic (validation) |
| `500` | Internal Server Error | Lỗi server — **KHÔNG lộ stack trace** |

---

## 3. Authentication Header

### 3.1 Format

```
Authorization: Bearer <jwt_token>
```

### 3.2 JWT Claims (do Login trả về)

```json
{
  "sub": "user-uuid-here",
  "role": "student",
  "exp": 1711180800,
  "iat": 1711094400
}
```

| Claim | Type | Mô tả |
|-------|------|--------|
| `sub` | string (UUID) | User ID |
| `role` | string | `student` \| `teacher` \| `admin` |
| `exp` | number | Thời gian hết hạn (Unix) |
| `iat` | number | Thời gian tạo (Unix) |

### 3.3 Endpoints cần Auth

| Endpoint | Auth | Thêm điều kiện |
|----------|------|----------------|
| `POST /api/v1/auth/register` | ❌ | — |
| `POST /api/v1/auth/login` | ❌ | — |
| `GET /api/v1/auth/me` | ✅ JWT | — |
| `GET /api/v1/exams` | ✅ JWT | — |
| `GET /api/v1/exams/:id` | ✅ JWT | — |
| `POST /api/v1/exams/:id/submit` | ✅ JWT | — |
| `GET /api/v1/history` | ✅ JWT | — |
| `POST /api/v1/exams/:id/auto-save` | ✅ JWT | — |
| `GET /api/v1/admin/users` | ✅ JWT | `role = admin` |
| `GET /api/v1/admin/exams` | ✅ JWT | `role = admin` |

---

## 4. Go Helper Functions

> Dùng hai hàm dưới đây để trả response. **KHÔNG ĐƯỢC dùng `http.Error()` hay tự format JSON.**

### 4.1 File: `utils/response.go`

```go
package utils

import (
    "encoding/json"
    "log"
    "net/http"
)

// SuccessResponse — Format chuẩn cho response thành công.
type SuccessResponse struct {
    Status string      `json:"status"`
    Data   interface{} `json:"data"`
}

// ErrorBody — Phần error bên trong ErrorResponse.
type ErrorBody struct {
    Code    string            `json:"code"`
    Message string            `json:"message"`
    Details []ValidationError `json:"details,omitempty"`
}

// ErrorResponse — Format chuẩn cho response lỗi.
type ErrorResponse struct {
    Status string    `json:"status"`
    Error  ErrorBody `json:"error"`
}

// ValidationError — Chi tiết lỗi từng field.
type ValidationError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}

// PaginatedResponse — Response có phân trang.
type PaginatedResponse struct {
    Status string      `json:"status"`
    Data   interface{} `json:"data"`
    Meta   PaginationMeta `json:"meta"`
}

// PaginationMeta — Metadata phân trang.
type PaginationMeta struct {
    Page  int `json:"page"`
    Limit int `json:"limit"`
    Total int `json:"total"`
}

// SendSuccess ghi response thành công (HTTP 200).
func SendSuccess(w http.ResponseWriter, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    if err := json.NewEncoder(w).Encode(SuccessResponse{
        Status: "success",
        Data:   data,
    }); err != nil {
        log.Printf("response: encode error: %v", err)
    }
}

// SendCreated ghi response tạo mới thành công (HTTP 201).
func SendCreated(w http.ResponseWriter, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    if err := json.NewEncoder(w).Encode(SuccessResponse{
        Status: "success",
        Data:   data,
    }); err != nil {
        log.Printf("response: encode error: %v", err)
    }
}

// SendError ghi response lỗi với HTTP status code tương ứng.
func SendError(w http.ResponseWriter, statusCode int, code, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    if err := json.NewEncoder(w).Encode(ErrorResponse{
        Status: "error",
        Error: ErrorBody{
            Code:    code,
            Message: message,
        },
    }); err != nil {
        log.Printf("response: encode error: %v", err)
    }
}

// SendValidationError ghi response lỗi validation (HTTP 422).
func SendValidationError(w http.ResponseWriter, details []ValidationError) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusUnprocessableEntity)
    if err := json.NewEncoder(w).Encode(ErrorResponse{
        Status: "error",
        Error: ErrorBody{
            Code:    "VALIDATION_FAILED",
            Message: "Input validation failed",
            Details: details,
        },
    }); err != nil {
        log.Printf("response: encode error: %v", err)
    }
}

// SendPaginated ghi response có phân trang (HTTP 200).
func SendPaginated(w http.ResponseWriter, data interface{}, page, limit, total int) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    if err := json.NewEncoder(w).Encode(PaginatedResponse{
        Status: "success",
        Data:   data,
        Meta:   PaginationMeta{Page: page, Limit: limit, Total: total},
    }); err != nil {
        log.Printf("response: encode error: %v", err)
    }
}
```

### 4.2 Cách sử dụng trong Controller

```go
// ✅ ĐÚNG — Dùng helper
func (c *AuthController) Login(w http.ResponseWriter, r *http.Request) {
    // ... logic ...
    if err != nil {
        utils.SendError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Email or password is incorrect")
        return
    }
    utils.SendSuccess(w, LoginResponse{Token: token})
}

// ❌ SAI — KHÔNG dùng http.Error hay tự encode
func (c *AuthController) Login(w http.ResponseWriter, r *http.Request) {
    http.Error(w, "unauthorized", 401)          // ❌ plain text
    json.NewEncoder(w).Encode(map[string]any{   // ❌ không theo format
        "token": token,
    })
}
```

---

## 5. API Endpoints Contract

> Định nghĩa chi tiết input/output cho từng endpoint.

---

### 5.1 `POST /api/v1/auth/register`

**Mô tả:** Đăng ký tài khoản học sinh mới.

**Auth:** ❌ Không cần

**Request Body:**

```json
{
  "username": "nguyenvana",
  "password": "M@tkhau123",
  "fullname": "Nguyễn Văn A",
  "email": "a@student.edu.vn"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `username` | string | ✅ | 3-50 ký tự, unique |
| `password` | string | ✅ | ≥ 8 ký tự |
| `fullname` | string | ✅ | 1-100 ký tự |
| `email` | string | ✅ | Email hợp lệ, unique |

**Success Response (201):**

```json
{
  "status": "success",
  "data": {
    "user_id": "a83e3d8f-5e2b-4d89-9c1f-8a3b5c9d2e1f",
    "username": "nguyenvana",
    "fullname": "Nguyễn Văn A",
    "email": "a@student.edu.vn",
    "role": "student"
  }
}
```

**Error Responses:**

| HTTP | Code | Khi nào |
|------|------|---------|
| 409 | `CONFLICT` | Email hoặc username đã tồn tại |
| 422 | `VALIDATION_FAILED` | Input không hợp lệ |

---

### 5.2 `POST /api/v1/auth/login`

**Mô tả:** Đăng nhập, trả JWT token.

**Auth:** ❌ Không cần

**Request Body:**

```json
{
  "identifier": "a@student.edu.vn",
  "password": "M@tkhau123"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `identifier` | string | ✅ | Email hoặc username hợp lệ |
| `password` | string | ✅ | Không rỗng |

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "user_id": "a83e3d8f-...",
      "fullname": "Nguyễn Văn A",
      "username": "nguyenvana",
      "email": "a@student.edu.vn",
      "role": "student"
    }
  }
}
```

**Error Responses:**

| HTTP | Code | Khi nào |
|------|------|---------|
| 401 | `INVALID_CREDENTIALS` | Sai identifier hoặc password |
| 422 | `VALIDATION_FAILED` | Thiếu field bắt buộc |

---

### 5.3 `GET /api/v1/auth/me`

**Mô tả:** Lấy thông tin user hiện tại (từ JWT). Hiển thị góc màn hình FE.

**Auth:** ✅ `Authorization: Bearer <token>`

**Request:** Không có body. Không có query params.

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "user_id": "a83e3d8f-...",
    "fullname": "Nguyễn Văn A",
    "email": "a@student.edu.vn",
    "role": "student"
  }
}
```

**Error Responses:**

| HTTP | Code | Khi nào |
|------|------|---------|
| 401 | `UNAUTHORIZED` | Token thiếu, hết hạn, hoặc không hợp lệ |
| 404 | `NOT_FOUND` | User đã bị xóa (soft delete) |

---

### 5.4 `GET /api/v1/exams`

**Mô tả:** Danh sách tất cả đề thi (active, chưa bị xóa).

**Auth:** ✅ `Authorization: Bearer <token>`

**Query Params (optional):**

| Param | Type | Default | Mô tả |
|-------|------|---------|--------|
| `page` | int | 1 | Trang hiện tại |
| `limit` | int | 10 | Số lượng mỗi trang (max: 50) |

**Success Response (200):**

```json
{
  "status": "success",
  "data": [
    {
      "exam_id": "uuid-1",
      "title": "Đề thi thử THPT Quốc Gia 2026 - Môn Toán (Chuẩn cấu trúc mới)",
      "type": "practice",
      "duration": 5400,
      "start_time": "2026-04-01T09:00:00Z",
      "room": {
        "room_id": "uuid-room",
        "name": "Phòng luyện thi THPT 2026"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 23
  }
}
```

---

### 5.5 `GET /api/v1/exams/:id`

**Mô tả:** Chi tiết đề thi + danh sách sections + câu hỏi.

**Auth:** ✅ `Authorization: Bearer <token>`

**Path Params:**

| Param | Type | Mô tả |
|-------|------|--------|
| `id` | UUID | exam_id |

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "exam_id": "exam-thpt-math-2026-001",
    "title": "Đề thi thử THPT Quốc Gia 2026 - Môn Toán (Chuẩn cấu trúc mới)",
    "type": "practice",
    "duration": 5400,
    "capacity": 100,
    "questions": [
      {
        "question_id": "q-part1-001",
        "parent_id": null,
        "type": "single_choice",
        "content": "Phần I. Cho hàm số $f(x) = e^x + 2x$. Khẳng định nào dưới đây đúng?",
        "image_url": null,
        "options": [
          {"id": "A", "text": "$\\int f(x)dx = e^x + x^2 + C$"},
          {"id": "B", "text": "$\\int f(x)dx = e^x + 2x^2 + C$"},
          {"id": "C", "text": "$\\int f(x)dx = e^x - x^2 + C$"},
          {"id": "D", "text": "$\\int f(x)dx = e^x + C$"}
        ],
        "point": 1.0
      },
      {
        "question_id": "q-part2-context",
        "parent_id": null,
        "type": "cluster_context",
        "content": "Phần II. Cho hàm số bậc ba $y=f(x)$ có đồ thị như hình bên. Xét tính đúng sai của các phát biểu sau:",
        "image_url": "https://res.cloudinary.com/.../graph.png",
        "options": null,
        "point": null
      },
      {
        "question_id": "q-part2-child-a",
        "parent_id": "q-part2-context",
        "type": "true_false",
        "content": "a) Hàm số đã cho đồng biến trên khoảng $(-1; 1)$.",
        "image_url": null,
        "options": [
          {"id": "True", "text": "Đúng"},
          {"id": "False", "text": "Sai"}
        ],
        "point": 0.5
      },
      {
        "question_id": "q-part3-001",
        "parent_id": null,
        "type": "short_answer",
        "content": "Phần III. Một chất điểm chuyển động với gia tốc $a(t) = 3t^2 + t$ ($m/s^2$). Biết vận tốc ban đầu $v(0) = 2$ $m/s$. Quãng đường đi được trong 2 giây đầu tiên là bao nhiêu mét?",
        "image_url": null,
        "options": null,
        "point": 1.0
      }
    ]
  }
}
```

> ⚠️ **KHÔNG trả `correct_answer` và `explanation`** trong response này. Chỉ trả sau khi submit.

**Error Responses:**

| HTTP | Code | Khi nào |
|------|------|---------|
| 404 | `NOT_FOUND` | Exam không tồn tại hoặc đã bị xóa |

---

### 5.6 `POST /api/v1/exams/:id/submit`

**Mô tả:** Nộp bài thi → chấm điểm tự động → trả kết quả chi tiết.

**Auth:** ✅ `Authorization: Bearer <token>`

**Path Params:** `id` = exam_id (UUID)

**Request Body:**

```json
{
  "answers": {
    "q-part1-001": "A",
    "q-part1-002": "A",
    "q-part2-child-a": "False",
    "q-part2-child-b": "True",
    "q-part2-child-c": "True",
    "q-part3-001": "10.7",
    "q-part3-002": "4"
  }
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|--------|
| `answers` | object | ✅ | Map `question_id` → câu trả lời |

**Success Response (201):**

```json
{
"status": "success",
  "data": {
    "attempt_id": "uuid-attempt",
    "exam_id": "exam-thpt-math-2026-001",
    "score": 7.5,
    "total_questions": 8,
    "correct_count": 6,
    "status": "completed",
    "started_at": "2026-04-01T09:00:00Z",
    "end_at": "2026-04-01T10:28:30Z",
    "details": [
      {
        "question_id": "q-part1-001",
        "type": "single_choice",
        "selected_ans": "A",
        "correct_answer": "A",
        "is_correct": true,
        "explanation": "$\\int (e^x + 2x)dx = e^x + x^2 + C$",
        "point": 1.0
      },
      {
        "question_id": "q-part2-child-a",
        "type": "true_false",
        "selected_ans": "False",
        "correct_answer": "False",
        "is_correct": true,
        "explanation": "Nhìn vào đồ thị, hàm số nghịch biến trên khoảng $(-1; 1)$.",
        "point": 0.5
      },
      {
        "question_id": "q-part3-001",
        "type": "short_answer",
        "selected_ans": "10.7",
        "correct_answer": "10.7",
        "is_correct": true,
        "explanation": "$v(t) = t^3 + \\frac{t^2}{2} + 2$, quãng đường $= \\int_0^2 v(t)dt \\approx 10.7$ m",
        "point": 1.0
      }
    ]
  }
}
```

---

### 5.7 `GET /api/v1/history`

**Mô tả:** Lịch sử bài thi đã làm của user.

**Auth:** ✅ `Authorization: Bearer <token>`

**Query Params (optional):**

| Param | Type | Default | Mô tả |
|-------|------|---------|--------|
| `page` | int | 1 | Trang |
| `limit` | int | 10 | Số lượng (max: 50) |

**Success Response (200):**

```json
{
  "status": "success",
  "data": [
    {
      "attempt_id": "uuid-attempt",
      "exam": {
        "exam_id": "exam-thpt-math-2026-001",
        "title": "Đề thi thử THPT Quốc Gia 2026 - Môn Toán"
      },
      "score": 7.5,
      "status": "completed",
      "started_at": "2026-04-01T09:00:00Z",
      "end_at": "2026-04-01T10:28:30Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5
  }
}
```

---

### 5.8 `POST /api/v1/exams/:id/auto-save`

**Mô tả:** Lưu trạng thái làm bài tạm thời (FE gửi mỗi 5-10 giây).

**Auth:** ✅ `Authorization: Bearer <token>`

**Path Params:** `id` = exam_id (UUID)

**Request Body:**

```json
{
  "attempt_id": "uuid-attempt",
  "current_answers": {
    "q-part1-001": "A",
    "q-part1-002": "A",
    "q-part2-child-a": "False",
    "q-part3-001": "10.7"
  },
  "timer_remaining": 2400
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|--------|
| `attempt_id` | UUID | ✅ | ID lần thi hiện tại |
| `current_answers` | object | ✅ | Map câu trả lời hiện tại |
| `timer_remaining` | int | ✅ | Số giây còn lại |

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "saved_at": "2026-04-01T09:30:15Z"
  }
}
```

---

### 5.9 `GET /api/v1/admin/users`

**Mô tả:** Danh sách user (chỉ Admin).

**Auth:** ✅ `Authorization: Bearer <token>` + `role = admin`

**Query Params:**

| Param | Type | Default |
|-------|------|---------|
| `page` | int | 1 |
| `limit` | int | 20 |

**Success Response (200):**

```json
{
  "status": "success",
  "data": [
    {
      "user_id": "uuid-1",
      "username": "nguyenvana",
      "fullname": "Nguyễn Văn A",
      "email": "a@student.edu.vn",
      "role": "student",
      "created_at": "2026-03-01T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

**Error Responses:**

| HTTP | Code | Khi nào |
|------|------|---------|
| 403 | `FORBIDDEN` | User không phải admin |

---

### 5.10 `GET /api/v1/admin/exams`

**Mô tả:** Danh sách đề thi (chỉ Admin, bao gồm cả deleted).

**Auth:** ✅ `Authorization: Bearer <token>` + `role = admin`

**Query Params:**

| Param | Type | Default |
|-------|------|---------|
| `page` | int | 1 |
| `limit` | int | 20 |

**Success Response (200):**

```json
{
  "status": "success",
  "data": [
    {
      "exam_id": "exam-thpt-math-2026-001",
      "title": "Đề thi thử THPT Quốc Gia 2026 - Môn Toán (Chuẩn cấu trúc mới)",
      "type": "practice",
      "duration": 5400,
      "capacity": 100,
      "room": {
        "room_id": "uuid-room",
        "name": "Phòng luyện thi THPT 2026"
      },
      "created_at": "2026-03-15T10:00:00Z",
      "deleted_at": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 30
  }
}
```

---

## 6. Data Types Reference

### 6.1 Quy tắc chung

| Quy tắc | Giá trị |
|---------|---------|
| **ID format** | UUID v4 (`a83e3d8f-5e2b-4d89-9c1f-8a3b5c9d2e1f`) |
| **Thời gian** | ISO 8601 UTC (`2026-04-01T09:00:00Z`) |
| **Duration** | Số nguyên (giây) |
| **Điểm** | Decimal (2 chữ số thập phân) |
| **Giá** | Decimal (2 chữ số thập phân) |
| **JSON field names** | `snake_case` |
| **Boolean** | `true` / `false` (không dùng 0/1) |
| **Null** | `null` (không dùng `""` hay `0` thay thế) |

### 6.2 Role Enum

```
"student" | "admin"
```

### 6.3 Status Enums

| Entity | Giá trị hợp lệ |
|--------|----------------|
| **Exam Room** | `active`, `inactive`, `archived` |
| **Payment** | `pending`, `completed`, `failed` |
| **Exam Attempt** | `in_progress`, `completed`, `abandoned` |

---

> **📌 Lưu ý cho team:** Nếu cần thêm endpoint mới, cập nhật file này **TRƯỚC** khi code. FE và BE phải thống nhất contract trước khi implement.
