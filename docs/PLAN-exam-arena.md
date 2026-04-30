# 📋 PLAN – ExamArena Comprehensive Project Plan v2

> **Mục tiêu:** Kế hoạch triển khai hoàn chỉnh cho hệ thống ExamArena, focus vào **khả năng chịu tải 1,000+ CCU**.
> **Ngày tạo:** 2026-03-24 | **Target Release:** Beta – Tháng 05/2026
> **Team:** 5 members (1 PM/Architect, 2 FE, 2 BE)

---

## 🔍 Phân Tích Hiện Trạng Sau Sprint 1

### ✅ Đã hoàn thành
- Database schema (10 bảng, `init.sql`)
- Docker Compose setup (FE + BE containers)
- Backend: `main.go` + `config/database.go` (kết nối Neon)
- Frontend: 15 pages scaffolded (login, register, rooms, exams, attempts, documents)
- Documentation: `architecture.md`, `database.md`, `api-contract.md`, `CONTRIBUTING.md`

### ❌ Vấn đề phát hiện
1. **Backend gần như trống:** Chỉ có health check endpoint, chưa có models/controllers/services/repositories
2. **Thiếu cấu trúc CCU:** Không có connection pooling config, rate limiting, hay caching strategy
3. **Auto-save chưa có backend:** Schema thiếu cột `state_data JSONB` trong `exam_attempt`
4. **Frontend pages chưa kết nối API:** Tất cả pages đều dùng mock data
5. **Thiếu middleware hoàn chỉnh:** Chỉ có folder `middlewares/` trống
6. **Port không nhất quán:** `main.go` dùng port 8080, docs nói 8081
7. **Chưa có testing infrastructure:** Không có test files nào

---

## 🏗️ Kiến Trúc Chịu Tải (CCU Architecture)

### Mục tiêu CCU: 1,000 thí sinh làm bài đồng thời

```
                        ┌─────────────────────────┐
                        │    Nginx Reverse Proxy   │
                        │  (Rate Limit + SSL +     │
                        │   Load Balancing)         │
                        └──────────┬──────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
              │ Go API #1 │ │ Go API #2 │ │ Go API #N │  (Horizontal Scale)
              └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
                    │              │              │
                    └──────────────┼──────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
              │   Redis    │ │ PgBouncer │ │   Neon    │
              │  (Cache +  │ │  (Pool)   │ │PostgreSQL │
              │ Auto-save) │ │           │ │   17      │
              └────────────┘ └───────────┘ └───────────┘
```

### Chiến lược chịu tải theo tầng

| Tầng | Giải pháp | Chi tiết kỹ thuật |
|------|-----------|-------------------|
| **Reverse Proxy** | Nginx | Rate limit: 100 req/s/IP, Connection limit: 50/IP |
| **Backend** | Go net/http + Goroutines | Go tự xử lý concurrency qua goroutines, mỗi request = 1 goroutine |
| **Connection Pool** | GORM + `database/sql` | `MaxOpenConns=50`, `MaxIdleConns=25`, `ConnMaxLifetime=5m` |
| **Caching** | Redis (hoặc in-memory) | Cache exam data, questions (TTL 5 phút), giảm 80% DB reads |
| **Auto-save** | Redis + Batch Write | Buffer auto-save vào Redis, flush xuống DB mỗi 30s |
| **Database** | Neon PgBouncer | Built-in connection pooling, auto-scale compute |
| **Static Assets** | Next.js Static Export / CDN | HTML/CSS/JS serve từ CDN, không qua API server |

### Tính toán tải

```
1,000 CCU × auto-save mỗi 5s = 200 req/s (auto-save)
1,000 CCU × exam load (1 lần) = ~17 req/s (exam fetch, giả sử load trong 1 phút)
Peak total: ~250 req/s

Go xử lý: 10,000+ req/s (đủ headroom 40x)
PostgreSQL: 50 connections × 100 queries/s = 5,000 qps (đủ headroom 20x)
Redis: 100,000+ ops/s (không bottleneck)
```

---

## 📅 Sprint Plan Chi Tiết

> Mỗi sprint = 1 tuần. Mỗi task có **chi tiết kỹ thuật** để người thực hiện có thể bắt tay làm ngay.

---

### Sprint 2 (24/03 – 28/03): Backend Foundation + Exam Room UI

**Mục tiêu:** Hoàn thành backend layered architecture + UI phòng thi

---

#### TASK 2.1: Backend Project Structure & Models (BE – Đức + Nhi) ⏱️ 1 ngày

**Mô tả:** Tạo toàn bộ folder structure theo layered architecture và GORM models

**Chi tiết kỹ thuật:**

```
backend/
├── config/database.go          # ĐÃ CÓ - Cần bổ sung connection pooling
├── models/
│   ├── user.go                 # struct User  (map bảng users)
│   ├── exam_room.go            # struct ExamRoom
│   ├── exam.go                 # struct Exam
│   ├── exam_section.go         # struct ExamSection
│   ├── question.go             # struct Question
│   ├── exam_attempt.go         # struct ExamAttempt
│   ├── attempt_section_log.go  # struct AttemptSectionLog
│   ├── attempt_detail.go       # struct AttemptDetail
│   ├── payment.go              # struct Payment
│   └── user_room_access.go     # struct UserRoomAccess
├── controllers/
├── services/
├── repositories/
├── routes/routes.go
├── middlewares/
│   ├── auth.go
│   ├── cors.go
│   └── rate_limit.go
└── utils/
    ├── response.go             # Copy từ api-contract.md Section 4
    ├── jwt.go
    └── hash.go
```

**Yêu cầu kỹ thuật cho Models:**
- Mỗi model PHẢI dùng `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"` cho PK
- PHẢI có JSON tags (`json:"user_id"`) cho API response
- Dùng `*time.Time` cho `deleted_at` (soft delete pattern)
- PHẢI thêm `TableName()` method để map đúng tên bảng PostgreSQL

**Ví dụ mẫu (User model):**
```go
package models

import (
    "time"
    "github.com/google/uuid"
)

type User struct {
    UserID    uuid.UUID  `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"user_id"`
    Username  string     `gorm:"size:50;uniqueIndex;not null" json:"username"`
    Password  string     `gorm:"size:255;not null" json:"-"` // json:"-" ẩn password
    Fullname  string     `gorm:"size:100;not null" json:"fullname"`
    Email     string     `gorm:"size:100;uniqueIndex;not null" json:"email"`
    Role      string     `gorm:"size:20;default:'student'" json:"role"`
    CreatedAt time.Time  `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
    DeletedAt *time.Time `gorm:"index" json:"deleted_at,omitempty"`
}

func (User) TableName() string { return "users" }
```

**Bổ sung connection pooling trong `config/database.go`:**
```go
sqlDB, _ := db.DB()
sqlDB.SetMaxOpenConns(50)        // Tối đa 50 connections đồng thời
sqlDB.SetMaxIdleConns(25)        // Giữ 25 connections idle
sqlDB.SetConnMaxLifetime(5 * time.Minute) // Recycle mỗi 5 phút
```

**Verify:** Chạy `go build ./...` thành công, không lỗi compile.

---

#### TASK 2.2: Auth API hoàn chỉnh (BE – Nhi) ⏱️ 2 ngày

**Mô tả:** Implement Register + Login + GetMe theo api-contract.md

**Files cần tạo:**
1. `utils/response.go` – Copy helper functions từ `api-contract.md` Section 4
2. `utils/hash.go` – Bcrypt hash/verify
3. `utils/jwt.go` – Generate/Parse JWT token
4. `repositories/user_repository.go` – CRUD User (GORM)
5. `services/auth_service.go` – Business logic (validate, hash, JWT)
6. `controllers/auth_controller.go` – HTTP handlers
7. `routes/routes.go` – Route registration
8. `middlewares/auth.go` – JWT verification middleware
9. `middlewares/cors.go` – CORS handling

**Chi tiết kỹ thuật:**

**`utils/hash.go`:**
```go
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12) // 12 rounds
    return string(bytes), err
}
func CheckPasswordHash(password, hash string) bool {
    return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
```

**`utils/jwt.go`:**
```go
// Claims: sub (user_id UUID), role (string), exp (24h), iat
// Secret: os.Getenv("JWT_SECRET") – tối thiểu 32 ký tự
// Library: github.com/golang-jwt/jwt/v5
func GenerateToken(userID uuid.UUID, role string) (string, error)
func ParseToken(tokenString string) (*Claims, error)
```

**`repositories/user_repository.go`:**
```go
type UserRepository struct { DB *gorm.DB }
func (r *UserRepository) Create(user *models.User) error
func (r *UserRepository) FindByEmail(email string) (*models.User, error)
func (r *UserRepository) FindByUsername(username string) (*models.User, error)
func (r *UserRepository) FindByIdentifier(identifier string) (*models.User, error) // email OR username
func (r *UserRepository) FindByID(id uuid.UUID) (*models.User, error)
```

**`services/auth_service.go`:**
```go
func (s *AuthService) Register(req RegisterRequest) (*models.User, error)
    // 1. Validate input (username 3-50 chars, password ≥8, email format)
    // 2. Check duplicate email/username → return CONFLICT error
    // 3. Hash password (bcrypt 12 rounds)
    // 4. Create user via repository
    // 5. Return user (without password)

func (s *AuthService) Login(identifier, password string) (string, *models.User, error)
    // 1. Find user by email OR username
    // 2. Verify password hash
    // 3. Generate JWT token
    // 4. Return token + user info
```

**`controllers/auth_controller.go`:**
```go
// POST /api/v1/auth/register → 201 Created
// POST /api/v1/auth/login    → 200 OK
// GET  /api/v1/auth/me        → 200 OK (requires JWT middleware)
// Response format: PHẢI dùng utils.SendSuccess/SendError/SendCreated
```

**`middlewares/auth.go`:**
```go
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc
    // 1. Extract "Authorization: Bearer <token>" header
    // 2. Parse JWT → extract userID, role
    // 3. Store in context: context.WithValue(r.Context(), "userID", claims.Sub)
    // 4. Nếu token invalid → utils.SendError(w, 401, "UNAUTHORIZED", "...")
```

**`middlewares/cors.go`:**
```go
func CORSMiddleware(next http.Handler) http.Handler
    // Allow: localhost:3000 (dev), examarena.com (prod)
    // Methods: GET, POST, PUT, DELETE, OPTIONS
    // Headers: Content-Type, Authorization
    // Credentials: true
```

**Port:** Fix `main.go` → port 8081 (đồng nhất với docs)

**Verify:**
```bash
# Test Register
curl -X POST http://localhost:8081/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test@1234","fullname":"Test User","email":"test@test.com"}'
# Expected: 201 + envelope format

# Test Login
curl -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@test.com","password":"Test@1234"}'
# Expected: 200 + token + user object

# Test Me
curl http://localhost:8081/api/v1/auth/me \
  -H "Authorization: Bearer <token_from_login>"
# Expected: 200 + user info
```

---

#### TASK 2.3: Exam Room & Exam List UI (FE – Việt + Thắng) ⏱️ 3 ngày

**Mô tả:** Xây dựng giao diện Phòng thi và Danh sách đề thi, ban đầu dùng mock JSON

**Files cần cập nhật/tạo:**
1. `frontend/app/rooms/page.tsx` – Danh sách phòng thi (marketplace cards)
2. `frontend/app/rooms/[id]/page.tsx` – Chi tiết phòng thi + danh sách exam
3. `frontend/app/exams/page.tsx` – Danh sách tất cả exam (có phân trang)
4. `frontend/components/RoomCard.tsx` – Card component cho phòng thi
5. `frontend/components/ExamCard.tsx` – Card component cho đề thi
6. `frontend/components/Pagination.tsx` – Pagination component
7. `frontend/services/api.ts` – Axios instance (base URL, interceptors)
8. `frontend/services/examService.ts` – API calls cho exam endpoints
9. `frontend/types/exam.ts` – TypeScript interfaces (từ api-contract.md)
10. `frontend/store/authStore.ts` – Zustand store (token + user state)

**Chi tiết UI:**
- Room Cards: Hiển thị name, type, price, test_quantity, status badge
- Exam List: Title, duration (format "90 phút"), capacity, type badge
- Pagination: Page numbers + Previous/Next buttons
- Loading skeleton khi fetch data
- Error state khi API fail

**TypeScript interfaces (bắt buộc):**
```typescript
// types/exam.ts – Map chính xác với api-contract.md
interface Exam {
  exam_id: string;
  title: string;
  type: string;
  duration: number; // giây
  capacity: number;
  start_time: string | null;
  room?: { room_id: string; name: string };
}

interface ExamRoom {
  room_id: string;
  name: string;
  type: string;
  price: number;
  test_quantity: number;
  status: 'active' | 'inactive' | 'archived';
}

// API Response envelope
interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  meta?: { page: number; limit: number; total: number };
}
```

**Axios instance:**
```typescript
// services/api.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081',
  timeout: 10000, // 10s timeout
});

// Interceptor: Auto-attach JWT token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: Handle 401 → redirect login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

**Verify:** Mở `http://localhost:3000/rooms` → hiển thị cards với mock data, click card → vào detail page

---

### Sprint 3 (31/03 – 04/04): Exam Engine Core

**Mục tiêu:** Hoàn thành flow làm bài thi end-to-end

---

#### TASK 3.1: Exam & Question APIs (BE – Đức) ⏱️ 2 ngày

**Mô tả:** API lấy danh sách exam, chi tiết exam + questions, tạo attempt

**Files cần tạo:**
1. `repositories/exam_repository.go`
2. `repositories/question_repository.go`
3. `services/exam_service.go`
4. `controllers/exam_controller.go`

**Endpoints:**

| Method | Path | Chi tiết |
|--------|------|----------|
| GET | `/api/v1/exams` | Paginated list, filter `deleted_at IS NULL`, join room info |
| GET | `/api/v1/exams/:id` | Exam + sections + questions (ẨN `correct_answer`, `explanation`) |
| POST | `/api/v1/exams/:id/start` | Tạo `exam_attempt` + `attempt_section_log`, return attempt_id |

**Lưu ý kỹ thuật QUAN TRỌNG cho CCU:**
```go
// exam_repository.go – Preload để tránh N+1 queries
func (r *ExamRepository) FindByIDWithQuestions(examID uuid.UUID) (*models.Exam, error) {
    var exam models.Exam
    err := r.DB.
        Preload("Sections", func(db *gorm.DB) *gorm.DB {
            return db.Order("exam_section.title ASC")
        }).
        Preload("Sections.Questions", func(db *gorm.DB) *gorm.DB {
            return db.Where("deleted_at IS NULL").
                Select("question_id, section_id, parent_id, content, image_url, options, point, type, question_type").
                // KHÔNG select correct_answer, explanation
                Order("question.created_at ASC")
        }).
        Where("exam_id = ? AND deleted_at IS NULL", examID).
        First(&exam).Error
    return &exam, err
}

// Pagination helper
func Paginate(page, limit int) func(db *gorm.DB) *gorm.DB {
    return func(db *gorm.DB) *gorm.DB {
        if page <= 0 { page = 1 }
        if limit <= 0 || limit > 50 { limit = 10 }
        offset := (page - 1) * limit
        return db.Offset(offset).Limit(limit)
    }
}
```

**Verify:**
```bash
# Seed test data trước (insert 1 exam + 3 sections + 10 questions vào Neon DB)
curl http://localhost:8081/api/v1/exams -H "Authorization: Bearer <token>"
# Expected: paginated list, envelope format

curl http://localhost:8081/api/v1/exams/<exam_id> -H "Authorization: Bearer <token>"
# Expected: exam + sections + questions, KHÔNG có correct_answer
```

---

#### TASK 3.2: Giao diện Làm Bài Thi (FE – Việt) ⏱️ 3 ngày

**Mô tả:** Trang làm bài thi với timer, navigation, KaTeX rendering

**Files:**
1. `frontend/app/exams/[id]/page.tsx` – Main exam page (đã có, cần implement)
2. `frontend/components/exam/QuestionCard.tsx` – Render câu hỏi (MCQ, True/False, Short answer)
3. `frontend/components/exam/Timer.tsx` – Countdown timer component
4. `frontend/components/exam/QuestionNav.tsx` – Sidebar navigation (đánh dấu đã trả lời)
5. `frontend/components/exam/MathRenderer.tsx` – KaTeX wrapper
6. `frontend/hooks/useTimer.ts` – Timer logic hook
7. `frontend/hooks/useAutoSave.ts` – Auto-save hook (gửi mỗi 5s)
8. `frontend/store/examStore.ts` – Zustand: currentAnswers, timerRemaining, attemptId

**Chi tiết UI kỹ thuật:**

```typescript
// store/examStore.ts
interface ExamState {
  attemptId: string | null;
  exam: Exam | null;
  currentAnswers: Record<string, string>; // questionId → answer
  timerRemaining: number; // seconds
  setAnswer: (questionId: string, answer: string) => void;
  setTimer: (seconds: number) => void;
}

// hooks/useTimer.ts
function useTimer(initialSeconds: number, onExpire: () => void) {
  // useEffect với setInterval(1000ms)
  // Khi timer = 0 → auto submit bài thi
  // Persist vào localStorage mỗi 10s (fallback)
  // Trả về: { minutes, seconds, isExpired }
}

// hooks/useAutoSave.ts - QUAN TRỌNG CHO CCU
function useAutoSave(attemptId: string, answers: Record<string,string>, timerRemaining: number) {
  // Debounce 5 giây (không gửi liên tục)
  // POST /api/v1/exams/:id/auto-save
  // Nếu network error → save vào localStorage (fallback)
  // Retry logic: 3 lần, exponential backoff
}
```

**KaTeX rendering:**
```typescript
// components/exam/MathRenderer.tsx
import katex from 'katex';
// Render inline: $...$ và display: $$...$$
// Dùng dangerouslySetInnerHTML với sanitized output
// Lazy load KaTeX CSS
```

**Verify:** Mở trang exam → thấy questions, timer đếm ngược, click answer → highlight, sidebar cập nhật

---

#### TASK 3.3: Submit & Scoring API (BE – Đức + Nhi) ⏱️ 2 ngày

**Mô tả:** API nộp bài + chấm điểm tự động + lưu kết quả

**Files:**
1. `repositories/attempt_repository.go`
2. `services/scoring_service.go`
3. `controllers/attempt_controller.go`

**Logic chấm điểm (scoring_service.go):**
```go
func (s *ScoringService) ScoreExam(attemptID uuid.UUID, answers map[string]string) (*ScoreResult, error) {
    // 1. Load exam questions với correct_answer (dùng DB transaction)
    // 2. Loop qua từng answer:
    //    - MCQ/True-False: strings.EqualFold(selected, correct)
    //    - Short Answer: strings.TrimSpace + normalize → compare
    // 3. Tính tổng điểm: sum(is_correct * point)
    // 4. Trong 1 Transaction:
    //    a. Batch INSERT attempt_details (tất cả câu trả lời)
    //    b. UPDATE exam_attempt: marks, status='completed', end_at=NOW()
    //    c. UPDATE attempt_section_log: status='completed', end_at=NOW()
    // 5. Return ScoreResult (score, correct_count, details with explanation)
}
```

**⚠️ CCU Critical – Dùng Database Transaction:**
```go
err := s.DB.Transaction(func(tx *gorm.DB) error {
    // Tất cả INSERT/UPDATE trong 1 transaction
    // Nếu 1 bước fail → rollback toàn bộ
    // Giảm số lượng DB round-trips
    return nil
})
```

**Verify:**
```bash
curl -X POST http://localhost:8081/api/v1/exams/<id>/submit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"answers":{"q1":"A","q2":"True","q3":"10.7"}}'
# Expected: 201 + score + details with correct_answer + explanation
```

---

#### TASK 3.4: Auto-save API (BE – Nhi) ⏱️ 1 ngày

**Mô tả:** API lưu trạng thái làm bài tạm thời

**⚠️ Cần migration DB:** Thêm cột `state_data` vào bảng `exam_attempt`
```sql
-- migrations/002_add_autosave_state.sql
ALTER TABLE exam_attempt ADD COLUMN IF NOT EXISTS state_data JSONB DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_exam_attempt_state ON exam_attempt USING GIN (state_data);
```

**Endpoint:** `POST /api/v1/exams/:id/auto-save`

**Logic (CCU-optimized):**
```go
func (s *ExamService) AutoSave(attemptID uuid.UUID, answers map[string]string, timerRemaining int) error {
    // QUAN TRỌNG: Chỉ UPDATE 1 cột JSONB, không load toàn bộ record
    return s.DB.Model(&models.ExamAttempt{}).
        Where("attempt_id = ? AND status = ?", attemptID, "in_progress").
        Update("state_data", datatypes.JSON(marshal(AutoSavePayload{
            CurrentAnswers:  answers,
            TimerRemaining:  timerRemaining,
            SavedAt:         time.Now(),
        }))).Error
    // Đây là lightweight query: UPDATE 1 cột, WHERE primary key
    // ~0.5ms per query → 2,000 saves/s per connection
}
```

**Verify:**
```bash
curl -X POST http://localhost:8081/api/v1/exams/<id>/auto-save \
  -H "Authorization: Bearer <token>" \
  -d '{"attempt_id":"<id>","current_answers":{"q1":"A"},"timer_remaining":2400}'
# Expected: 200 + saved_at timestamp
```

---

### Sprint 4 (07/04 – 11/04): History, Analytics, Admin

---

#### TASK 4.1: History & Results APIs (BE – Đức) ⏱️ 1.5 ngày

**Endpoints:**
- `GET /api/v1/history` – Paginated, JOIN exam title, ORDER BY started_at DESC
- `GET /api/v1/attempts/:id` – Chi tiết 1 attempt + details + correct answers + explanations

**Query tối ưu CCU:**
```go
// Dùng composite index: idx_exam_attempt_user_exam
func (r *AttemptRepository) FindByUser(userID uuid.UUID, page, limit int) ([]AttemptSummary, int64, error) {
    var attempts []AttemptSummary
    var total int64
    
    r.DB.Model(&models.ExamAttempt{}).Where("user_id = ?", userID).Count(&total)
    
    r.DB.Model(&models.ExamAttempt{}).
        Select("attempt_id, exam_id, marks, status, started_at, end_at").
        Where("user_id = ?", userID).
        Order("started_at DESC").
        Scopes(Paginate(page, limit)).
        Joins("LEFT JOIN exam ON exam.exam_id = exam_attempt.exam_id").
        Find(&attempts)
    
    return attempts, total, nil
}
```

---

#### TASK 4.2: History & Results UI (FE – Thắng) ⏱️ 2 ngày

**Files:**
1. `frontend/app/attempts/page.tsx` hoặc sử dụng `frontend/app/home/page.tsx` – Lịch sử thi
2. `frontend/app/attempts/[id]/result/page.tsx` – Chi tiết kết quả
3. `frontend/components/history/AttemptCard.tsx`
4. `frontend/components/results/ScoreBoard.tsx`
5. `frontend/components/results/QuestionReview.tsx` – Review từng câu (đúng/sai + giải thích)

**UI yêu cầu:**
- History list: Cards với exam title, score, date, status badge (completed/abandoned)
- Result page: Score summary (điểm/tổng, % đúng, thời gian), từng câu review

---

#### TASK 4.3: Admin APIs (BE – Nhi) ⏱️ 1.5 ngày

**Endpoints:**
- `GET /api/v1/admin/users` – Paginated user list (role=admin only)
- `GET /api/v1/admin/exams` – Paginated exam list (bao gồm deleted)

**Middleware:**
```go
func RoleMiddleware(requiredRole string) func(http.HandlerFunc) http.HandlerFunc {
    return func(next http.HandlerFunc) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
            role := r.Context().Value("role").(string)
            if role != requiredRole {
                utils.SendError(w, 403, "FORBIDDEN", "Insufficient permissions")
                return
            }
            next(w, r)
        }
    }
}
```

---

#### TASK 4.4: Admin Dashboard UI (FE – Việt) ⏱️ 2 ngày

**Files:**
1. `frontend/app/admin/page.tsx` – Dashboard overview (tổng users, exams, attempts)
2. `frontend/app/admin/users/page.tsx` – User management table
3. `frontend/app/admin/exams/page.tsx` – Exam management table
4. `frontend/components/admin/DataTable.tsx` – Reusable table component
5. `frontend/components/admin/StatsCard.tsx` – Statistics card

---

### Sprint 5 (14/04 – 18/04): CCU Hardening + Rate Limiting + Testing

**Mục tiêu:** Đảm bảo hệ thống chịu được 1,000+ CCU

---

#### TASK 5.1: Rate Limiting Middleware (BE – Nhi) ⏱️ 1 ngày

**Chi tiết kỹ thuật:**
```go
// middlewares/rate_limit.go
// Thuật toán: Token Bucket (hoặc Sliding Window)
// Library: golang.org/x/time/rate

type RateLimiter struct {
    visitors map[string]*rate.Limiter  // IP → limiter
    mu       sync.RWMutex
}

// Config khác nhau cho từng loại endpoint:
var rateLimits = map[string]rate.Limit{
    "auth":      rate.Every(time.Second),      // 1 req/s (brute-force protection)
    "auto-save": rate.Every(time.Second / 5),  // 5 req/s (mỗi 5s/user)
    "default":   rate.Every(time.Second / 20), // 20 req/s
}

// Middleware:
func (rl *RateLimiter) Limit(category string) func(http.HandlerFunc) http.HandlerFunc
```

---

#### TASK 5.2: Connection Pool Tuning + Query Optimization (BE – Đức) ⏱️ 1 ngày

**Checklist:**
- [ ] Verify GORM connection pool settings đã set (MaxOpen=50, MaxIdle=25)
- [ ] Add request logging middleware: log method, path, duration, status code
- [ ] Run EXPLAIN ANALYZE trên top 5 queries
- [ ] Đảm bảo index `idx_exam_attempt_user_exam` hoạt động cho history query
- [ ] Đảm bảo không có N+1 queries (check GORM Preload)
- [ ] Set query timeout: `db.Statement.Context` với `context.WithTimeout` (30s)

---

#### TASK 5.3: Load Testing (Team – Quân lead) ⏱️ 1 ngày

**Tool:** k6 (https://k6.io/) hoặc `hey` (Go load testing tool)

```javascript
// k6 script: load_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp up → 100 users
    { duration: '1m', target: 500 },    // Ramp up → 500 users
    { duration: '2m', target: 1000 },   // Hold 1000 users
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% requests < 500ms
    http_req_failed: ['rate<0.01'],     // <1% failure rate
  },
};

export default function () {
  // Simulate exam workflow:
  // 1. Login → get token
  // 2. GET /exams/:id → load exam
  // 3. POST /auto-save (loop 5 lần, mỗi 5s)
  // 4. POST /submit
  sleep(5);
}
```

**Target metrics:**
| Metric | Target | Critical |
|--------|--------|----------|
| Response time p95 | < 500ms | < 1000ms |
| Throughput | > 250 req/s | > 150 req/s |
| Error rate | < 1% | < 5% |
| Concurrent connections | 1,000 | 500 |

---

#### TASK 5.4: Frontend Performance Optimization (FE – Việt + Thắng) ⏱️ 1 ngày

**Checklist:**
- [ ] Lazy load KaTeX CSS/JS (chỉ load khi vào trang exam)
- [ ] Next.js Image optimization cho question images
- [ ] Debounce auto-save (5s minimum gap)
- [ ] Memoize QuestionCard components (React.memo)
- [ ] Virtual scrolling nếu exam > 50 câu (react-virtualized)
- [ ] Service Worker cho offline fallback (auto-save to localStorage)
- [ ] Bundle analyzer: đảm bảo initial JS < 200KB gzipped

---

### Sprint 6 (21/04 – 25/04): Security + Deployment Prep

---

#### TASK 6.1: Security Hardening (BE – Nhi + Quân) ⏱️ 2 ngày

**Checklist:**
- [ ] Input sanitization: HTML escape tất cả user input
- [ ] SQL injection: Verify GORM parameterized queries (đã có sẵn)
- [ ] XSS: Frontend Next.js có built-in protection, verify custom dangerouslySetInnerHTML
- [ ] JWT: Set proper expiration (24h access, 7d refresh)
- [ ] CORS: Chỉ allow production domain
- [ ] Helmet-like headers: X-Content-Type-Options, X-Frame-Options
- [ ] Rate limit auth endpoints: 5 req/phút/IP
- [ ] Password policy: Enforce ≥8 chars tại cả FE và BE
- [ ] Exam access control: Verify user_room_access trước khi cho vào exam

**Headers middleware:**
```go
func SecurityHeaders(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("X-XSS-Protection", "1; mode=block")
        w.Header().Set("Strict-Transport-Security", "max-age=31536000")
        next.ServeHTTP(w, r)
    })
}
```

---

#### TASK 6.2: Production Deployment Setup (DevOps – Quân) ⏱️ 2 ngày

**Files cần tạo/cập nhật:**
1. `docker-compose.prod.yml` – Production config (no hot reload, multi-stage build)
2. `nginx/nginx.conf` – Reverse proxy + SSL + rate limit
3. `backend/Dockerfile` – Multi-stage build (giảm image size)
4. `frontend/Dockerfile` – Static export build

**Nginx config (CCU-focused):**
```nginx
upstream go_api {
    server go-api-1:8081;
    server go-api-2:8081;  # Scale khi cần
    keepalive 32;           # Connection reuse
}

server {
    listen 443 ssl http2;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    limit_conn_zone $binary_remote_addr zone=conn:10m;
    
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        limit_conn conn 50;
        proxy_pass http://go_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";  # Enable keepalive
    }
    
    location / {
        root /var/www/examarena;     # Static Next.js export
        try_files $uri $uri.html /index.html;
    }
}
```

---

### Sprint 7 (28/04 – 02/05): E2E Testing + Bug Fixes + Polish

---

#### TASK 7.1: E2E Test Scenarios (Team) ⏱️ 2 ngày

**Test scenarios bắt buộc:**
1. ✅ Register → Login → thấy dashboard
2. ✅ Vào Room → chọn Exam → Start → làm bài → Submit → xem kết quả
3. ✅ Auto-save: Làm giữa bài → close tab → mở lại → resume (answers + timer restored)
4. ✅ Timer hết giờ → auto submit
5. ✅ Admin: Login admin → xem user list → xem exam list
6. ✅ Duplicate register (email/username) → error 409
7. ✅ Access exam without login → redirect login (401)
8. ✅ Student access admin page → 403

---

#### TASK 7.2: Bug Fixes + UI Polish (Team) ⏱️ 3 ngày

**Reserve time cho:**
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Responsive testing (Desktop, Tablet)
- Fix edge cases from Sprint 5 load testing
- Performance regression testing

---

### Sprint 8 (05/05 – 09/05): Beta Release

---

#### TASK 8.1: Staging Deployment (Quân) ⏱️ 1 ngày
- Deploy lên VPS staging
- SSL certificate (Let's Encrypt)
- Verify Nginx + Docker Compose production

#### TASK 8.2: Final Load Test on Staging (Quân + Đức) ⏱️ 1 ngày
- Run k6 test against staging environment
- Verify 1,000 CCU target met

#### TASK 8.3: Production Release (Quân) ⏱️ 1 ngày
- Blue-green deployment
- DNS cutover
- Monitor first 24 hours

---

## 📊 Bảng Phân Công Tổng Quan

| Sprint | Quân (PM) | Việt (FE) | Thắng (FE) | Đức (BE) | Nhi (BE) |
|--------|-----------|-----------|------------|----------|----------|
| S2 | Review | Room/Exam UI | Room/Exam UI | Models + Structure | Auth API |
| S3 | Review + Seed Data | Exam Taking UI | Support | Exam + Scoring API | Auto-save API |
| S4 | Review | Admin Dashboard | History UI | History API | Admin API |
| S5 | Load Testing | FE Performance | FE Performance | Query Optimization | Rate Limiting |
| S6 | Deployment Setup | Support | Support | Support | Security |
| S7 | Coordination | Bug Fixes | Bug Fixes | E2E Tests | E2E Tests |
| S8 | Release | Monitor | Monitor | Monitor | Monitor |

---

## 🎯 Definition of Done (DoD)

Mỗi task được coi là DONE khi:
1. ✅ Code pass `go build ./...` (BE) hoặc `npm run build` (FE)
2. ✅ Tuân thủ API contract format (envelope pattern)
3. ✅ Manual test curl/browser thành công
4. ✅ PR created, 1 reviewer approved, merged vào `develop`
5. ✅ Không có console.log/fmt.Println debug code

---

## ⚠️ Rủi Ro & Giải Pháp

| Rủi ro | Xác suất | Giải pháp |
|--------|----------|-----------|
| Neon DB latency cao (cold start) | Trung bình | Enable Neon's `always-on` compute endpoint |
| Auto-save tạo quá nhiều DB writes | Cao | Batch writes: buffer 30s trước khi flush |
| KaTeX bundle size quá lớn | Thấp | Lazy load + CDN |
| Team thiếu kinh nghiệm Go | Trung bình | Code review chặt, pair programming |
| Load test fail at 1000 CCU | Trung bình | Scale Go instances horizontally via Docker |

---

> **📌 Lưu ý:** Plan này là living document. Cập nhật sau mỗi sprint retrospective.
> 
> **Last Updated:** 2026-03-24
> **Author:** AI Assistant + Team ExamArena
