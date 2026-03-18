# 💾 Database.md – PostgreSQL 17 Schema & Quản lý

> **Tài liệu chi tiết về thiết kế cơ sở dữ liệu, quản lý kết nối, và best practices cho ExamArena.**

---

## 📖 Mục lục

0. [Backend Architecture Integration](#0-backend-architecture-integration)
1. [Cài đặt Kết nối](#1-connection-setup)
2. [Công cụ Quản lý Database](#2-database-management-tools)
3. [Sơ đồ Cơ sở dữ liệu](#3-database-schema)
4. [Mối quan hệ & Ràng buộc](#4-relationships--constraints)
5. [Chỉ mục & Hiệu năng](#5-indexing--performance)
6. [Tính toàn vẹn Dữ liệu](#6-data-integrity)
7. [Backup & Khôi phục](#7-backup--recovery)

---

## 0. Backend Architecture Integration

### 0.1 Luồng Truy cập Database từ Backend

ExamArena sử dụng **Layered Architecture** - Cấu trúc phân tầng đơn hướng:

```
┌─────────────────────────────────────────────────┐
│  🎯 Controllers (HTTP Request Handler)          │
│                                                 │
│  Trách vụ:                                      │
│  ✅ Nhận HTTP request                           │
│  ✅ Validate input                              │
│  ✅ Gọi service                                 │
│  ✅ Trả HTTP response                           │
│  ❌ KHÔNG logic phức tạp                        │
└──────────────────┬──────────────────────────────┘
                   │ Gọi
                   ↓
┌─────────────────────────────────────────────────┐
│  🧠 Services (Business Logic)                   │
│                                                 │
│  Trách vụ:                                      │
│  ✅ Logic chấm điểm                             │
│  ✅ Logic hash password, JWT token              │
│  ✅ Logic kiểm tra điều kiện thi                │
│  ✅ Gọi repository                              │
│  ❌ KHÔNG cắm GORM trực tiếp                    │
└──────────────────┬──────────────────────────────┘
                   │ Gọi
                   ↓
┌─────────────────────────────────────────────────┐
│  💾 Repositories (Data Access)                  │
│                                                 │
│  Trách vụ:                                      │
│  ✅ CRUD operations (Create, Read, Update, Del) │
│  ✅ DUY NHẤT nơi sắm GORM                       │
│  ✅ Thực thi truy vấn SQL                       │
│  ✅ Map database rows → Go structs              │
│  ❌ KHÔNG logic nghiệp vụ                       │
│  ❌ KHÔNG gọi trực tiếp từ controller           │
└──────────────────┬──────────────────────────────┘
                   │ Sắm GORM
                   ↓
┌─────────────────────────────────────────────────┐
│  🐘 PostgreSQL 17 (Neon Cloud)                  │
│                                                 │
│  Dữ liệu được tổ chức thành 10 bảng:            │
│  - users, exam, question, exam_attempt, ...    │
│  - JSONB columns cho dữ liệu linh hoạt          │
│  - UUID PKs, soft delete, triggers              │
└─────────────────────────────────────────────────┘
```

### 0.2 Ví dụ Cụ thể: Lấy Danh sách Exams

**Luồng hoàn chỉnh:**

```go
/* 1️⃣ CONTROLLER */
func (c *ExamController) ListExams(w http.ResponseWriter, r *http.Request) {
    // ✅ Validate JWT token (từ middleware)
    // ✅ Extract page/limit từ query params

    exams, err := c.examService.GetAllExams(page, limit)
    if err != nil {
        sendError(w, err)
        return
    }

    sendJSON(w, exams)
}

/* 2️⃣ SERVICE */
func (s *ExamService) GetAllExams(page, limit int) ([]*Exam, error) {
    // ✅ Logic: Kiểm tra role (student/teacher/admin)
    // ✅ Logic: Phân trang (page/limit validation)
    // ✅ Logic: Filter exam (active only)

    // ❌ KHÔNG viết GORM query ở đây!
    // Gọi repository:
    return s.examRepo.FindAll(page, limit)
}

/* 3️⃣ REPOSITORY */
func (r *ExamRepository) FindAll(page, limit int) ([]*Exam, error) {
    var exams []*Exam

    // ✅ GORM query:
    offset := (page - 1) * limit
    result := r.DB.
        Where("deleted_at IS NULL").
        Where("status = ?", "active").
        Offset(offset).
        Limit(limit).
        Find(&exams)

    return exams, result.Error
}

/* 4️⃣ DATABASE */
// PostgreSQL executes:
SELECT * FROM exam
WHERE deleted_at IS NULL
  AND status = 'active'
LIMIT 10 OFFSET 0;
```

**Quy tắc Vàng Phân Tầng:**

| Layer      | Làm được                         | KHÔNG làm                   |
| :--------- | :------------------------------- | :-------------------------- |
| Controller | Nhận request, trả response       | Logic phức tạp, SQL queries |
| Service    | Logic nghiệp vụ, flow điều khiển | Sắm GORM, tra DB trực tiếp  |
| Repository | CRUD DB, GORM queries            | Logic, validation           |
| Middleware | Check JWT, roles, CORS           | Gọi service                 |
| Utils      | Helper functions (không state)   | Logic, repositories         |

### 0.3 Khi Nào Gọi Nào

```
Frontend
   ↓ HTTP request
Controller ← Middleware (JWT check)
   ↓
Service ← có logic phức tạp?
   ↓
Repository ← chỉ DB operations
   ↓
PostgreSQL
```

**Sai cách:**

```
❌ Controller → PostgreSQL directly
❌ Controller → Repository → Backend logic → Repository
❌ Service → Service (circular dependency)
```

## 1. Connection Setup

### 1.1 Platform: Neon Serverless

ExamArena sử dụng **Neon PostgreSQL 17** (Cloud Serverless), không chạy Database ở local máy cá nhân.

**Lợi ích:**

- ✅ Zero database maintenance burden
- ✅ Single Source of Truth (một DB cho toàn team)
- ✅ Auto-scaling & Auto-backup
- ✅ Serverless (pay-as-you-go pricing)
- ✅ Instant provisioning

### 1.2 Connection String Format

```
postgresql://[user]:[password]@[neon-host]:5432/[database]

Example:
postgresql://examarena_user:super_secret_pass@ep-random-neon.us-east-1.aws.neon.tech:5432/examarena
```

### 1.3 Environment Configuration

**File: `.env` (NEVER commit to GitHub)**

```env
# Database Connection
DATABASE_URL=postgresql://user:password@host:5432/examarena
DB_HOST=neon.tech
DB_PORT=5432
DB_USER=examarena_user
DB_PASSWORD=your-secure-password
DB_NAME=examarena

# Connection Pooling
DB_MAX_CONNECTIONS=20
DB_MIN_CONNECTIONS=5
DB_CONNECTION_TIMEOUT=10
```

**In `.gitignore`:**

```
.env
.env.local
*.env
```

### 1.4 Connection from Backend

**Go Code (GORM):**

```go
package config

import (
    "os"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

func InitDB() *gorm.DB {
    dsn := os.Getenv("DATABASE_URL")

    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        panic("failed to connect database")
    }

    return db
}
```

---

## 2. Database Management Tools

### 2.1 Recommended Tools

| Tool         | Platform           | Status              | Reason                                    |
| :----------- | :----------------- | :------------------ | :---------------------------------------- |
| **DBeaver**  | Windows/Mac/Linux  | ✅ **RECOMMENDED**  | Free, powerful, SSH tunnel support        |
| **DataGrip** | Windows/Mac/Linux  | ✅ **RECOMMENDED**  | JetBrains IDE, paid, professional         |
| **pgAdmin**  | Web UI (localhost) | ❌ **NOT ALLOWED**  | Only for local development, not for cloud |
| **Postman**  | API tool           | ❌ Don't use for DB | Only for API testing                      |

### 2.2 Setup DBeaver Connection

**Step 1: Download & Install**

- https://dbeaver.io/download/

**Step 2: Create New Connection**

```
1. File → New → Database Connection
2. Select: PostgreSQL
3. Choose "Neon" (if available) or manual:
   - Server Host: ep-xxx.us-east-1.aws.neon.tech
   - Port: 5432
   - Database: examarena
   - Username: examarena_user
   - Password: [from .env]
4. Click "Test Connection"
```

**Step 3: SSH Tunnel (Production only)**

```
Tab: SSH
───────────────────────
Host: your-vps-server.com
Port: 22
Username: root
Auth Method: Password / Private Key
```

### 2.3 Setup DataGrip Connection

**Step 1: Open DataGrip**

**Step 2: New Data Source**

```
File → New → Data Source → PostgreSQL
```

**Step 3: Connection Details**

```
Host: ep-xxx.us-east-1.aws.neon.tech
Port: 5432
Database: examarena
User: examarena_user
Password: [from .env]
```

**Step 4: Test & Save**

---

## 3. Sơ đồ Cơ sở dữ liệu

### 3.1 Tổng quan Bảng chính

```
┌──────────────────────────────────────────────────────────────────┐
│                      ExamArena Database                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────────┐     ┌──────────────┐ │
│  │    users     │───→│ user_room_access │←────│  exam_room   │ │
│  └──────────────┘    └────────┬─────────┘     └──────┬───────┘ │
│       ▲                       │                      │           │
│       │                       │                      │ 1:N       │
│       │                       └──────────────────────┤           │
│       │                                          ┌───▼────┐     │
│       │                                          │  exam  │     │
│       │                                          └───┬────┘     │
│       │                                              │            │
│       │                                          ┌───▼─────────┐ │
│       │                                          │exam_section │ │
│       │                                          └───┬────────┘ │
│       │                                              │            │
│       │                                          ┌───▼─────────┐ │
│       │                                          │  question   │ │
│       │                                          │ (parent_id) │ │
│       │                                          └─────────────┘ │
│       │                                                          │
│       ├───────────────────────────┐                             │
│       │                           │                              │
│   ┌───▼──────────────┐    ┌──────▼─────────────────┐           │
│   │  exam_attempt    │─→  │attempt_section_log    │           │
│   └───────────────────┘    └───┬──────────────────┘           │
│                                │                                │
│                            ┌───▼──────────────┐                │
│                            │ attempt_detail   │                │
│                            └──────────────────┘                │
│                                                                  │
│  ┌──────────────────┐                                          │
│  │    payment       │                                          │
│  └──────────────────┘                                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Schema Chi tiết

#### **users** - Người dùng (Học sinh, Giáo viên, Quản trị viên)

```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,                  -- Bcrypt hashed
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'student',             -- student, teacher, admin
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL             -- Soft Delete Pattern
);
```

**Cột dữ liệu:**

- `user_id`: UUID Khóa chính (không tuần tự để bảo mật)
- `username`: Định danh đăng nhập duy nhất
- `password`: Mã hóa Bcrypt (không bao giờ plaintext)
- `fullname`: Tên hiển thị người dùng
- `email`: Duy nhất, dùng cho thông báo
- `role`: ENUM (student/teacher/admin)
- `deleted_at`: Đánh dấu xóa mềm (NULL = bản ghi hoạt động)

#### **exam_room** - Phòng thi (Thực thể Marketplace)

```sql
CREATE TABLE exam_room (
    room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),                               -- loại phòng thi
    price DECIMAL(10, 2) DEFAULT 0.0,               -- giá phòng (mô hình marketplace)
    test_quantity INT DEFAULT 0,                    -- số lượng đề thi trong phòng này
    status VARCHAR(20) DEFAULT 'active',            -- active/inactive/archived
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);
```

**Logic Kinh doanh:**

- Phòng thi là thực thể marketplace (học sinh mua quyền truy cập)
- `price`: Chi phí để học sinh truy cập phòng
- `test_quantity`: Có bao nhiêu đề thi có sẵn trong phòng

#### **user_room_access** - Lớp Kiểm soát Truy cập

```sql
CREATE TABLE user_room_access (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    room_id UUID REFERENCES exam_room(room_id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMPTZ,                         -- khi truy cập hết hạn
    PRIMARY KEY (user_id, room_id)
);
```

**Mục đích:**

- Bảng giao giữa quản lý ai có quyền truy cập phòng thi nào
- Cho phép RBAC (Kiểm soát Truy cập theo Vai trò)
- Hỗ trợ truy cập có mua/thời hạn

#### **payment** - Theo dõi Thanh toán

```sql
CREATE TABLE payment (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    room_id UUID REFERENCES exam_room(room_id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(50),                               -- loại thanh toán
    status VARCHAR(20) DEFAULT 'pending',           -- pending/completed/failed
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### **exam** - Đề thi

```sql
CREATE TABLE exam (
    exam_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES exam_room(room_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    type VARCHAR(50),
    capacity INT,                                   -- số người tham gia tối đa
    duration INT NOT NULL,                          -- thời gian (giây)
    start_time TIMESTAMPTZ,                         -- thời gian bắt đầu được lên lịch
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);
```

#### **exam_section** - Phần thi (Các phần trong Đề thi)

```sql
CREATE TABLE exam_section (
    section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exam(exam_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    duration INT                                    -- thời gian phần thi (giây)
);
```

#### **question** - Câu hỏi (Hỗ trợ Cấu trúc Phân cấp)

```sql
CREATE TABLE question (
    question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES exam_section(section_id) ON DELETE CASCADE,
    parent_id UUID REFERENCES question(question_id) ON DELETE CASCADE,  -- phân cấp
    content TEXT NOT NULL,                          -- nội dung câu hỏi (hỗ trợ LaTeX)
    image_url VARCHAR(255),                         -- ảnh tùy chọn cho câu hỏi
    options JSONB,                                  -- {"A": "...", "B": "...", "C": "...", "D": "..."}
    correct_answer TEXT,                            -- câu trả lời đúng
    explanation TEXT,                               -- lời giải chi tiết với LaTeX
    point DECIMAL(5, 2) DEFAULT 0.0,                -- điểm cho câu hỏi
    type VARCHAR(50),                               -- thể loại câu hỏi
    question_type VARCHAR(50),                      -- multiple_choice, essay, fill_blank
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);
```

**Cấu trúc Phân cấp:**

- `parent_id`: Tự tham chiếu cho các câu phụ thuộc/nhóm lại
- Ví dụ: Câu chính với các phần con

#### **exam_attempt** - Lịch sử Bài thi

```sql
CREATE TABLE exam_attempt (
    attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE RESTRICT,    -- bảo vệ lịch sử bài thi
    exam_id UUID REFERENCES exam(exam_id) ON DELETE RESTRICT,     -- bảo vệ lịch sử bài thi
    attempt_type VARCHAR(50),
    marks DECIMAL(5, 2) DEFAULT 0.0,                -- điểm/điểm kiếm được
    status VARCHAR(20) DEFAULT 'in_progress',       -- in_progress/completed/abandoned
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    end_at TIMESTAMPTZ,                             -- thời gian nộp/kết thúc
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**ON DELETE RESTRICT:** Bảo vệ lịch sử bài thi khỏi xóa cascade vô tình.

#### **attempt_section_log** - Theo dõi Phần thi Cấp độ

```sql
CREATE TABLE attempt_section_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES exam_attempt(attempt_id) ON DELETE CASCADE,
    section_id UUID REFERENCES exam_section(section_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    end_at TIMESTAMPTZ                             -- khi người dùng hoàn thành phần này
);
```

**Mục đích:**

- Theo dõi tiến độ từng phần (người dùng có thể bỏ qua phần)
- Thời gian riêng lẻ cho mỗi phần để phân tích
- Trạng thái phần (in_progress/completed)

#### **attempt_detail** - Chi tiết Câu trả lời

```sql
CREATE TABLE attempt_detail (
    detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES attempt_section_log(log_id) ON DELETE CASCADE,
    question_id UUID REFERENCES question(question_id) ON DELETE RESTRICT,  -- bảo vệ lịch sử
    selected_ans TEXT,                             -- câu trả lời của người dùng (A, B, C, D hoặc text)
    is_correct BOOLEAN                             -- cờ tính đúng/sai
);
```

**Ghi chú:**

- `selected_ans`: Câu trả lời đã nộp của người dùng (không phải `selected_answer`)
- `is_correct`: Cờ Boolean để tra cứu chấm điểm nhanh
- ON DELETE RESTRICT: Bảo toàn bản ghi nỗ lực ngay cả khi câu hỏi bị xóa

---

## 4. Mối quan hệ & Ràng buộc

### 4.1 Mối quan hệ Thực thể

```
Luồng Truy cập Chính:
─────────────────────
users ──(N)──→ user_room_access ←──(N)── exam_room
                                              ↓
                                          (1)exam
                                              ↓
                                      exam_section
                                              ↓
                                          question
                                          (parent_id)

Attempt Flow:
─────────────
users ──(N)──→ exam_attempt
                    ↓
            attempt_section_log
                    ↓
            attempt_detail ←── question

Payment:
────────
users ──(N)──→ payment ←──(N)── exam_room
```

### 4.2 Cascading Rules

| Relationship                         | ON DELETE | Reason                                    |
| :----------------------------------- | :-------- | :---------------------------------------- |
| exam_room → exam                     | CASCADE   | Delete exams when room is deleted         |
| exam → exam_section                  | CASCADE   | Delete sections when exam deleted         |
| exam_section → question              | CASCADE   | Delete questions when section deleted     |
| question → question (parent)         | CASCADE   | Delete child questions                    |
| exam_attempt → attempt_section_log   | CASCADE   | Delete logs when attempt deleted          |
| attempt_section_log → attempt_detail | CASCADE   | Delete details when log deleted           |
| exam_attempt ← user/exam             | RESTRICT  | Protect exam attempt history (no delete)  |
| question ← attempt_detail            | RESTRICT  | Preserve answer history even if Q deleted |
| user_room_access → user/room         | CASCADE   | Cleanup on user/room deletion             |

**Key Design:**

- RESTRICT on exam_attempt: Prevents accidental deletion of historical data
- CASCADE on details: Cleanup hierarchy automatically
- Soft Delete: Some tables use deleted_at instead of hard delete

### 4.3 Access Control Model

```sql
-- Student gains access to exam_room via user_room_access:
INSERT INTO user_room_access (user_id, room_id, granted_at, expired_at)
VALUES ('student-uuid', 'room-uuid', NOW(), NOW() + INTERVAL '30 days');

-- Then student can create exam_attempt for any exam in that room:
INSERT INTO exam_attempt (user_id, exam_id, attempt_type)
SELECT 'student-uuid', e.exam_id, 'practice'
FROM exam e
WHERE e.room_id = 'room-uuid'
AND EXISTS (
    SELECT 1 FROM user_room_access
    WHERE user_id = 'student-uuid'
    AND room_id = 'room-uuid'
    AND expired_at IS NULL OR expired_at > NOW()
);
```

---

## 5. Chỉ mục & Hiệu năng

### 5.1 Chỉ mục Cần thiết

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Access control
CREATE INDEX idx_user_room_access_user ON user_room_access(user_id);
CREATE INDEX idx_user_room_access_room ON user_room_access(room_id);

-- Payment tracking
CREATE INDEX idx_payment_user ON payment(user_id);
CREATE INDEX idx_payment_room ON payment(room_id);
CREATE INDEX idx_payment_status ON payment(status);

-- Exam hierarchy
CREATE INDEX idx_exam_room ON exam(room_id);
CREATE INDEX idx_exam_section_exam ON exam_section(exam_id);
CREATE INDEX idx_question_section ON question(section_id);
CREATE INDEX idx_question_parent ON question(parent_id);

-- Attempt tracking
CREATE INDEX idx_exam_attempt_user ON exam_attempt(user_id);
CREATE INDEX idx_exam_attempt_exam ON exam_attempt(exam_id);
CREATE INDEX idx_exam_attempt_user_exam ON exam_attempt(user_id, exam_id);
CREATE INDEX idx_exam_attempt_started ON exam_attempt(started_at DESC);

-- Section-level logs
CREATE INDEX idx_attempt_section_log_attempt ON attempt_section_log(attempt_id);
CREATE INDEX idx_attempt_section_log_section ON attempt_section_log(section_id);

-- Answer details
CREATE INDEX idx_attempt_detail_log ON attempt_detail(log_id);
CREATE INDEX idx_attempt_detail_question ON attempt_detail(question_id);

-- JSONB optimization for question options
CREATE INDEX idx_question_options ON question USING GIN (options);
```

### 5.2 Ví dụ Tối ưu hóa Truy vấn

```sql
-- Tra cứu nhanh: Lấy lịch sử bài thi của người dùng
EXPLAIN ANALYZE
SELECT a.attempt_id, a.exam_id, a.marks, a.started_at
FROM exam_attempt a
JOIN exam e ON a.exam_id = e.exam_id
WHERE a.user_id = 'user-uuid'
ORDER BY a.started_at DESC
LIMIT 10;
-- Sử dụng: idx_exam_attempt_user + idx_exam_room

-- Tra cứu nhanh: Kiểm tra truy cập trước khi cho phép nỗ lực
EXPLAIN ANALYZE
SELECT 1
FROM user_room_access ura
JOIN exam e ON ura.room_id = e.room_id
WHERE ura.user_id = 'user-uuid'
AND e.exam_id = 'exam-uuid'
AND (ura.expired_at IS NULL OR ura.expired_at > NOW());
-- Sử dụng: idx_user_room_access_user + idx_exam_room
```

### 5.3 Tối ưu hóa JSONB

```sql
-- For JSONB queries on options & state_data
CREATE INDEX idx_questions_options ON questions USING gin(options);
CREATE INDEX idx_attempts_state ON exam_attempts USING gin(state_data);
```

---

## 6. Tính toàn vẹn Dữ liệu

### 6.1 Mô hình Thiết kế

#### **Mô hình Xóa Mềm**

```sql
-- Không bao giờ xóa hard-delete bản ghi người dùng
UPDATE users
SET deleted_at = CURRENT_TIMESTAMP
WHERE user_id = 'user-uuid';

-- Truy vấn chỉ bản ghi hoạt động
SELECT * FROM users WHERE deleted_at IS NULL;

-- Bảng có xóa mềm: users, exam_room, exam, question
```

**Ưu điểm:**

- ✅ Bảo tồn dấu vết kiểm tra
- ✅ Hoàn tác dễ dàng (SET deleted_at = NULL)
- ✅ Tính toàn vẹn tham chiếu được duy trì
- ✅ Dữ liệu lịch sử cho phân tích

#### **Khóa chính UUID**

```sql
-- Ngăn chặn các cuộc tấn công đoán ID tuần tự
user_id UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- Tạo ra: a83e3d8f-5e2b-4d89-9c1f-8a3b5c9d2e1f

-- Tốt hơn auto-increment IDs như lộ:
-- - Có bao nhiêu người dùng tồn tại
-- - Thứ tự tạo chính xác
-- - Học liệu có thể đoán cho liệt kê
```

#### **Cập nhật Dấu thời gian Tự động thông qua Kích hoạt**

```sql
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng cho: users, exam_room, payment, exam, question, exam_attempt
-- Đảm bảo dấu vết kiểm tra mà không cần cập nhật dấu thời gian thủ công
```

### 6.2 Loại Ràng buộc

**Ràng buộc Duy nhất (Ngăn chặn Bản sao):**

```sql
-- Tên người dùng và email là duy nhất toàn toàn
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Kiểm soát truy cập: Một bản ghi cho mỗi cặp (người dùng, phòng)
ALTER TABLE user_room_access
    ADD PRIMARY KEY (user_id, room_id);
```

**Ràng buộc Khóa ngoài (Tính toàn vẹn Tham chiếu):**

```sql
-- Được xác định trong định nghĩa bảng:
exam_id UUID REFERENCES exam(exam_id) ON DELETE CASCADE
question_id UUID REFERENCES question(question_id) ON DELETE RESTRICT
```

**Ràng buộc Kiểm tra (Xác thực Dữ liệu):**

```sql
-- Quy tắc kinh doanh được thực thi ở mức cơ sở dữ liệu
CHECK (point >= 0)                              -- Điểm không thể âm
CHECK (price >= 0.0)                            -- Giá không thể âm
CHECK (duration > 0)                            -- Thời gian phải dương
CHECK (role IN ('student', 'teacher', 'admin')) -- Giá trị vai trò hợp lệ
```

### 6.3 Xác thực Dữ liệu (Backend - Go)

**Before inserting, validate in code:**

```go
func ValidateUser(user *models.User) error {
    if user.Username == "" || len(user.Username) > 50 {
        return errors.New("username required and ≤50 chars")
    }
    if user.Email == "" {
        return errors.New("email required")
    }
    if len(user.Password) < 8 {
        return errors.New("password must be ≥8 chars")
    }
    validRoles := map[string]bool{"student": true, "teacher": true, "admin": true}
    if !validRoles[user.Role] {
        return errors.New("invalid role")
    }
    return nil
}

func ValidateExamAttempt(attempt *models.ExamAttempt) error {
    if attempt.UserID == "" || attempt.ExamID == "" {
        return errors.New("user_id and exam_id required")
    }
    if attempt.Marks < 0 {
        return errors.New("marks cannot be negative")
    }
    // Check access: user must have user_room_access to this exam's room
    validStatus := map[string]bool{"in_progress": true, "completed": true, "abandoned": true}
    if !validStatus[attempt.Status] {
        return errors.New("invalid attempt status")
    }
    return nil
}
```

### 6.4 An toàn Giao dịch

```sql
-- Ví dụ: Cấp phép thanh toán nguyên tử + truy cập
BEGIN TRANSACTION;

    INSERT INTO payment (user_id, room_id, amount, type, status)
    VALUES ('user-uuid', 'room-uuid', 49.99, 'room_access', 'completed');

    INSERT INTO user_room_access (user_id, room_id, granted_at, expired_at)
    VALUES ('user-uuid', 'room-uuid', NOW(), NOW() + INTERVAL '30 days');

COMMIT;  -- Cả hai thành công hoặc cả hai rollback
```

---

## 7. Backup & Khôi phục

### 7.1 Tính năng Tự động của Neon

Neon PostgreSQL 17 tự động cung cấp:

- ✅ **Backup liên tục** (mỗi ảnh chụp)
- ✅ **Khôi phục Thời gian (PITR)** - Giữ lại 7 ngày
- ✅ **Sao chép đa vùng** (tự động)
- ✅ **Tự động mở rộng** (tính toán + lưu trữ)
- ✅ **Kết nối gộp** (PgBouncer tích hợp sẵn)

**Không cần backup thủ công cho hoạt động bình thường** — các ảnh chụp hàng ngày là tự động.

### 7.2 Backup Thủ công (Phát triển)

**Xuất thông qua DBeaver:**

```
1. Nhấp chuột phải vào Database (examarena)
2. Tools → Backup Database
3. Chọn định dạng SQL (.sql)
4. Lưu vào thư mục backup được kiểm soát phiên bản
5. Commit với: git commit -m "DB backup: YYYY-MM-DD"
```

### 7.3 Khôi phục Thủ công

```bash
# Khôi phục từ tệp sao lưu
psql postgresql://user:password@host:5432/examarena < backup.sql

# Hoặc trong DBeaver:
# 1. Nhấp chuột phải vào Database
# 2. Tools → Restore Database
# 3. Chọn tệp .sql
```

### 7.4 Khôi phục Thời gian (PITR)

```bash
# Khôi phục đến dấu thời gian cụ thể (thông qua bảng điều khiển Neon)
# Neon cung cấp trang PITR để khôi phục đến bất kỳ điểm nào trong 7 ngày qua
```

---

## 8. Định nghĩa Schema & Bảo trì

### 8.1 Nguồn Sự thật: init.sql

Schema PostgreSQL 17 hoàn chỉnh, có thẩm quyền được định nghĩa trong:

```
d:\exam-arena-system\init.sql
```

**Cấu trúc:**

- 10 bảng lõi (users, exam_room, user_room_access, payment, exam, exam_section, question, exam_attempt, attempt_section_log, attempt_detail)
- Kích hoạt function để cập nhật `updated_at` tự động
- Chỉ mục trên tất cả các khóa ngoài và cột truy vấn thường xuyên
- Ràng buộc khóa ngoài với các quy tắc CASCADE/RESTRICT thích hợp
- Mô hình xóa mềm qua `deleted_at TIMESTAMPTZ DEFAULT NULL`

**Để Khởi tạo Cơ sở dữ liệu:**

```bash
# 1. Tạo dự án Neon mới
# 2. Lấy chuỗi kết nối từ bảng điều khiển Neon
# 3. Tải schema:
psql postgresql://user:password@host:5432/examarena < init.sql

# 4. Xác minh:
psql postgresql://user:password@host:5432/examarena
# examarena=> \dt
# Liệt kê tất cả 10 bảng
```

### 8.2 Tóm tắt Bảng & Cột

| Bảng                    | Cột                                                                                                                                                                  | Mục đích                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **users**               | user_id, username, password, fullname, email, role, created_at, updated_at, deleted_at                                                                               | Xác thực người dùng & hồ sơ                         |
| **exam_room**           | room_id, name, type, price, test_quantity, status, created_at, updated_at, deleted_at                                                                                | Phòng thi marketplace                               |
| **user_room_access**    | user_id, room_id, granted_at, expired_at                                                                                                                             | Kiểm soát truy cập (ai có quyền truy cập phòng nào) |
| **payment**             | transaction_id, user_id, room_id, amount, type, status, created_at, updated_at                                                                                       | Theo dõi thanh toán                                 |
| **exam**                | exam_id, room_id, title, type, capacity, duration, start_time, created_at, updated_at, deleted_at                                                                    | Đề thi riêng lẻ                                     |
| **exam_section**        | section_id, exam_id, title, duration                                                                                                                                 | Phần thi trong đề                                   |
| **question**            | question_id, section_id, parent_id, content, image_url, options (JSONB), correct_answer, explanation, point, type, question_type, created_at, updated_at, deleted_at | Câu hỏi (phân cấp)                                  |
| **exam_attempt**        | attempt_id, user_id, exam_id, attempt_type, marks, status, started_at, end_at, updated_at                                                                            | Lịch sử nộp đề                                      |
| **attempt_section_log** | log_id, attempt_id, section_id, status, started_at, end_at                                                                                                           | Theo dõi từng phần nỗ lực                           |
| **attempt_detail**      | detail_id, log_id, question_id, selected_ans, is_correct                                                                                                             | Bản ghi câu trả lời riêng lẻ                        |

### 8.3 Tạo Mô hình Backend

**Mô hình GORM (Go):**

```go
// models/user.go
type User struct {
    UserID    uuid.UUID `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    Username  string    `gorm:"index;size:50;unique"`
    Password  string    `gorm:"size:255"` // Mã hóa bằng Bcrypt
    Fullname  string    `gorm:"size:100"`
    Email     string    `gorm:"index;size:100;unique"`
    Role      string    `gorm:"default:'student';size:20"` // student/teacher/admin
    CreatedAt time.Time `gorm:"autoCreateTime:milli"`
    UpdatedAt time.Time `gorm:"autoUpdateTime:milli"`
    DeletedAt *time.Time
}

// models/exam_room.go
type ExamRoom struct {
    RoomID        uuid.UUID `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    Name          string    `gorm:"size:100"`
    Type          string    `gorm:"size:50"`
    Price         decimal.Decimal `gorm:"type:numeric(10,2)"`
    TestQuantity  int
    Status        string `gorm:"default:'active';size:20"`
    CreatedAt     time.Time
    UpdatedAt     time.Time
    DeletedAt     *time.Time
}

// Tự động tạo:
db.AutoMigrate(&User{}, &ExamRoom{}, &Payment{}, &Exam{}, ...)
```

### 8.4 Hướng dẫn An toàn Chuyển tiếp

**Khi sửa đổi schema:**

1. **Kiểm tra trong phát triển trước** (bản sao cục bộ của init.sql)
2. **Sử dụng ALTER TABLE (không DROP)** cho các bảng hiện có
3. **Thêm cột mới với giá trị DEFAULT** để tránh xung đột NULL
4. **Duy trì khả năng tương thích ngược** với mã chạy
5. **Tài liệu những thay đổi schema** trong tệp chuyển tiếp

**Ví dụ chuyển tiếp an toàn:**

```sql
-- Chuyển tiếp: Thêm cột status exam_room (nếu chưa có trong init.sql)
BEGIN;
  ALTER TABLE exam_room ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
  CREATE INDEX IF NOT EXISTS idx_exam_room_status ON exam_room(status);
COMMIT;
```

### 8.5 Quản lý Phiên bản Schema

```
backend/migrations/
├── init.sql                          -- v0.1.0 Schema ban đầu (nguồn sự thật)
├── 001_add_field_name.sql            -- v0.1.1
├── 002_add_index.sql                 -- v0.2.0
└── README.md                         -- Hướng dẫn chuyển tiếp

# Được theo dõi trong kiểm soát phiên bản & áp dụng theo thứ tự
```

---

## 9. Best Practices

✅ **Quản lý Kết nối:**

- Luôn sử dụng kết nối gộp (10-20 kết nối)
- Đặt hết thời gian chờ (10-30 phút)
- Đặt hết thời gian truy vấn (30 giây mặc định)
- Đóng kết nối đúng cách khi tắt ứng dụng

✅ **Bảo mật:**

- Không bao giờ commit tệp `.env` (thêm vào `.gitignore`)
- Sử dụng mật khẩu mạnh (tối thiểu 16-20 ký tự)
- Xoay thay đổi thông tin xác thực hàng quý
- Sử dụng đường hầm SSH cho truy cập sản xuất (qua DBeaver)
- Bật danh sách cho phép IP Neon (nếu cần)

✅ **Hiệu năng:**

- Chỉ mục khóa ngoài và cột được lọc thường xuyên
- Sử dụng EXPLAIN ANALYZE trước khi triển khai truy vấn
- Giám sát nhật ký truy vấn chậm
- Giám sát số lượng kết nối (nên ổn định)
- Sử dụng chỉ mục GIN JSONB cho truy vấn phức tạp

✅ **Giám sát:**

- Theo dõi các truy vấn chậm (>1 giây)
- Giám sát mức sử dụng đĩa (Neon tự động mở rộng)
- Theo dõi các giao dịch thất bại
- Đặt cảnh báo số lượng kết nối
- Giám sát sử dụng CPU

✅ **Kiểm tra:**

- Sử dụng cơ sở dữ liệu kiểm tra riêng (test_examarena)
- Seed dữ liệu kiểm tra từ init.sql
- Cơ sở dữ liệu sạch giữa các lần chạy kiểm tra
- Sử dụng giao dịch để cô lập kiểm tra

---

> **Last Updated:** March 2026  
> **Version:** 1.0  
> © ExamArena Development Team
