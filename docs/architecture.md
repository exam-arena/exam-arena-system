# 🏗️ Architecture.md – Kiến trúc Hệ thống ExamArena v2026

> **Tài liệu kiến trúc toàn diện cho team onboarding. Mô tả chi tiết cách các thành phần tương tác trong hệ thống ExamArena.**

---

## 📖 Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Mô hình Kiến trúc Decoupled](#2-mô-hình-kiến-trúc-decoupled)
3. [Frontend (Next.js)](#3-frontend-nextjs)
4. [Backend (Go + GORM)](#4-backend-go--gorm)
5. [Cơ sở dữ liệu (PostgreSQL 17)](#5-cơ-sở-dữ-liệu-postgresql-17)
6. [Swagger/OpenAPI Documentation](#6-swaggeropenapi-documentation)
7. [Quy trình Request-Response](#7-quy-trình-request-response)
8. [DevOps & Deployment](#8-devops--deployment)

📚 **Tài liệu liên quan:**

- [docs/database.md](database.md) – Schema chi tiết, management tools, backup strategy
- [CONTRIBUTING.md](../CONTRIBUTING.md) – Development workflow & Git standards
- [CHANGELOG.md](../CHANGELOG.md) – Version history

---

## 1. Tổng quan kiến trúc

ExamArena sử dụng kiến trúc **Decoupled** (Phân tán 3-Tier):

```
┌──────────────────────────────────────────────────────────┐
│        🌐 PRESENTATION LAYER (Frontend)                 │
│     Next.js 16 | React 19 | TypeScript                  │
│  - UI Components (Login, Exam, Dashboard, Admin)        │
│  - Client-Side Rendering & State Management             │
│  - KaTeX Math Rendering                                 │
│  - Auto-save (5-10 seconds interval)                    │
│  Port: 3000                                              │
└──────────────────────┬───────────────────────────────────┘
                       │
        ↓ (REST API / HTTP JSON)
                       │
┌──────────────────────────────────────────────────────────┐
│      🔧 BUSINESS LOGIC LAYER (Backend)                  │
│     Go 1.26 | GORM | RESTful API                        │
│  - API Handlers & Controllers                            │
│  - JWT Authentication + Bcrypt Hashing                   │
│  - Exam Engine (Scoring, Timer, Questions)              │
│  - Auto-save State (JSONB Storage)                      │
│  - Analytics & Report Generation                         │
│  - Swagger/OpenAPI Documentation                         │
│  Port: 8080                                              │
└──────────────────────┬───────────────────────────────────┘
                       │
        ↓ (PostgreSQL Protocol)
                       │
┌──────────────────────────────────────────────────────────┐
│          💾 DATA LAYER (Cloud Database)                 │
│   PostgreSQL 17 on Neon Serverless Cloud               │
│  - Users (Students, Teachers, Admins)                   │
│  - Exams & Exam Sections                                │
│  - Questions with JSONB Options                         │
│  - Exam Attempts & Attempt Details                      │
│  - Analytics & Aggregated Data                          │
│  - UUID Primary Keys (Not Integer Auto-increment)       │
│  Port: 5432                                              │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Mô hình Kiến trúc Decoupled

**Đặc điểm:**

- ✅ Frontend & Backend phát triển độc lập
- ✅ Giao tiếp chỉ qua RESTful API (JSON)
- ✅ Dễ scale từng thành phần riêng lẻ
- ✅ Backend có thể serve nhiều client types (web, mobile, app)

**Luồng dữ liệu:**

```
Frontend (localhost:3000)
      │
      ├──→ POST /api/v1/auth/login
      ├──→ GET /api/v1/exams
      ├──→ POST /api/v1/exams/:id/submit
      └──→ GET /api/v1/exams/:id/results
                    ↓
           Backend (localhost:8080)
                    │
                    ├──→ Validate JWT Token
                    ├──→ Business Logic Processing
                    ├──→ GORM Database Queries
                    └──→ JSON Response
                           ↓
              Neon PostgreSQL 17 Cloud
```

---

## 3. Frontend (Next.js)

**Công nghệ:** Next.js 16 + React 19 + TypeScript + TailwindCSS v4 + KaTeX

**Cấu trúc folder (Tầng Lớp - Layered Architecture):**

```
frontend/
│
├── app/                              # 🔀 (Tầng Routing)
│   ├── layout.tsx                   # Root layout & providers
│   ├── page.tsx                     # Home page
│   ├── globals.css                  # Global styles (TailwindCSS)
│   ├── (auth)/
│   │   ├── login/page.tsx          # Trang đăng nhập
│   │   └── register/page.tsx       # Trang đăng ký
│   ├── exam/
│   │   ├── [examId]/page.tsx       # Giao diện làm bài thi
│   │   ├── results/page.tsx        # Trang xem kết quả
│   │   └── history/page.tsx        # Lịch sử bài thi
│   ├── teacher/                     # Dashboard giáo viên
│   └── admin/                       # Admin panel
│
├── components/                      # 🎨 (Tầng UI)
│   │                                # Các mảnh ghép giao diện
│   ├── Header.tsx                  # Header component
│   ├── Footer.tsx                  # Footer component
│   ├── Modal.tsx                   # Modal component
│   ├── Button.tsx                  # Button component
│   ├── QuestionCard.tsx            # Question component
│   ├── Timer.tsx                   # Countdown timer
│   ├── ExamForm.tsx                # Form component
│   └── ...
│
├── services/                        # 🔌 (Tầng Kết nối)
│   │                                # DUY NHẤT được phép gọi API
│   ├── authService.ts              # API auth (login, register)
│   ├── examService.ts              # API exam (get exam, submit)
│   ├── resultService.ts            # API results
│   └── api.ts                      # Cấu hình Axios base instance
│
├── types/                           # 📋 (Tầng Định nghĩa)
│   │                                # TypeScript interfaces từ Backend
│   ├── user.ts                     # interface User, UserRole
│   ├── exam.ts                     # interface Exam, Question
│   ├── attempt.ts                  # interface ExamAttempt
│   └── index.ts                    # Export tất cả types
│
├── store/                           # 💾 (Tầng Trạng thái)
│   │                                # Global state management (Zustand/Redux)
│   ├── authStore.ts                # Auth state: user, token, isLogged
│   ├── examStore.ts                # Exam state: currentExam, timer
│   ├── uiStore.ts                  # UI state: modal, loading
│   └── index.ts                    # Export store
│
├── hooks/                           # ⚙️ (Custom React Hooks)
│   ├── useTimer.ts                 # Hook countdown timer
│   ├── useAuth.ts                  # Hook kiểm tra auth
│   ├── useFetch.ts                 # Hook fetch API
│   └── ...
│
├── lib/                             # 🛠️ (Tầng Công cụ)
│   ├── axios.ts                    # Cấu hình Axios mặc định
│   ├── formatters.ts               # Format time, date, numbers
│   ├── validators.ts               # Validate form inputs
│   └── constants.ts                # APP_CONSTANTS
│
├── public/                          # 📦 Static assets
├── tailwind.config.ts              # TailwindCSS config
├── tsconfig.json                   # TypeScript config
├── next.config.ts                  # Next.js config
├── eslint.config.mjs               # ESLint config
├── postcss.config.mjs              # PostCSS config
├── package.json
├── .env.local                      # Config (KHÔNG COMMIT!)
└── .gitignore
```

**Phân Tầng Chi Tiết:**

### 📍 Tầng Routing (app/)

- ✅ Cứ tạo thư mục = thành đường dẫn web (app/login → /login)
- ✅ Chỉ có page.tsx & layout.tsx
- ✅ KHÔNG viết logic ở đây

### 🎨 Tầng UI (components/)

- ✅ Các mảnh ghép giao diện (Button, Modal, Header, Footer, QuestionCard)
- ✅ Pure components - nhận props, render UI
- ✅ KHÔNG gọi API trực tiếp

### 🔌 Tầng Kết nối (services/)

- ✅ **DUY NHẤT** gọi Backend API bằng Axios/Fetch
- ✅ Wrapper các HTTP requests
- ✅ Quản lý JWT token headers
- ✅ KHÔNG logic nghiệp vụ

### 📋 Tầng Định nghĩa (types/)

- ✅ **CỰC KỲ QUAN TRỌNG** - TypeScript interfaces
- ✅ Định nghĩa hình dáng JSON từ Backend
- ✅ Tái sử dụng các types trong suốt app

### 💾 Tầng Trạng thái (store/)

- ✅ Global state: user đang đăng nhập, countdown timer
- ✅ Zustand hoặc Redux
- ✅ Chia nhỏ store: authStore, examStore, uiStore

### ⚙️ Custom Hooks (hooks/)

- ✅ Tái sử dụng logic React: useTimer, useAuth, useFetch
- ✅ Kết hợp store + logic

### 🛠️ Công cụ (lib/)

- ✅ Hàm tiện ích: định dạng ngày giờ, validate form
- ✅ Cấu hình axios mặc định
- ✅ Constants

**Trách vụ Frontend:**

- ✅ Render UI/UX pages & components
- ✅ Client-side validation & form handling
- ✅ KaTeX rendering cho công thức toán
- ✅ Gọi Backend qua services/ (KHÔNG trực tiếp)
- ✅ Lưu JWT Token & kiểm tra auth
- ✅ Auto-save exam state mỗi 5-10 giây
- ✅ Real-time counter/timer display
- ✅ Client-Side Rendering (CSR)

---

## 4. Backend (Go + GORM)

**Công nghệ:** Go 1.26 + GORM ORM + RESTful API + Swagger/OpenAPI

**Cấu trúc folder (Tầng Lớp - Layered Architecture):**

```
backend/
│
├── config/                          # ⚙️ (Tầng Cấu hình)
│   └── database.go                 # PostgreSQL connection (GORM)
│
├── models/                          # 📚 (Tầng Models)
│   │                                # Golang Structs ánh xạ Database
│   ├── user.go                     # User model
│   ├── exam.go                     # Exam & ExamSection models
│   ├── question.go                 # Question model
│   └── attempt.go                  # ExamAttempt, AttemptDetail models
│
├── controllers/                     # 🎯 (Tầng Giao tiếp)
│   │                                # Nhận Request JSON → trả Response JSON
│   ├── auth_controller.go          # Login, Register endpoints
│   ├── exam_controller.go          # Get exams, Get exam detail
│   ├── attempt_controller.go       # Submit exam, Get results
│   └── admin_controller.go         # Admin operations
│
├── services/                        # 🧠 (Tầng Nghiệp vụ)
│   │                                # NÓI "não bộ" hệ thống
│   ├── auth_service.go             # Logic hash password, JWT token
│   ├── exam_service.go             # Logic chấm điểm, tính điểm
│   ├── validation_service.go       # Logic kiểm tra điều kiện thi
│   └── analytics_service.go        # Logic generate report
│
├── repositories/                    # 💾 (Tầng Dữ liệu)
│   │                                # DUY NHẤT được phép gọi GORM
│   ├── user_repository.go          # CRUD User
│   ├── exam_repository.go          # CRUD Exam, ExamSection, Question
│   ├── attempt_repository.go       # CRUD ExamAttempt, AttemptDetail
│   └── payment_repository.go       # CRUD Payment
│
├── routes/                          # 🛣️ (Tầng Routing)
│   │                                # Định nghĩa đường dẫn URL
│   └── routes.go                   # POST /api/v1/auth/login, etc...
│
├── middlewares/                     # 🔐 (Tầng Guard - Khoá cửa)
│   ├── auth_middleware.go          # Verify JWT Token
│   ├── role_middleware.go          # Check admin/student role
│   ├── cors_middleware.go          # CORS handling
│   └── logging_middleware.go       # Request logging
│
├── utils/                           # 🛠️ (Tầng Công cụ)
│   │                                # Hàm tiện ích dùng chung
│   ├── hash.go                     # Hash password, verify hash
│   ├── jwt.go                      # Generate JWT, parse JWT
│   ├── random.go                   # Sinh chuỗi random
│   ├── formatters.go               # Format time, date
│   └── validators.go               # Validate input
│
├── main.go                          # 🎼 (Nhạc trưởng)
│   │                                # Start server, connect DB, setup routes
│
├── go.mod                           # Quản lý dependencies
├── go.sum
├── Dockerfile
├── .env                             # Config (KHÔNG COMMIT!)
└── .gitignore
```

**Phân Tầng Chi Tiết:**

### ⚙️ Tầng Cấu hình (config/)

- ✅ Kết nối Database (GORM + PostgreSQL)
- ✅ Load environment variables
- ✅ Connection pooling setup

### 📚 Tầng Models (models/)

- ✅ Golang Structs ánh xạ bảng Database (GORM tags)
- ✅ Định nghĩa cấu trúc dữ liệu
- ✅ Tái sử dụng trong toàn backend

**Ví dụ:**

```go
package models

type User struct {
    UserID    string    `gorm:"primaryKey"`
    Username  string    `gorm:"unique"`
    Password  string    // Bcrypt hashed
    FullName  string
    Email     string    `gorm:"unique"`
    Role      string    // student, teacher, admin
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt *time.Time `gorm:"index"` // Soft delete
}
```

### 🎯 Tầng Controllers (controllers/)

- ✅ **Tầng Giao tiếp** - Nhận HTTP requests
- ✅ Validate input từ Frontend
- ✅ Gọi services để xử lý logic
- ✅ Trả JSON responses
- ✅ **TUYỆT ĐỐI KHÔNG** viết logic phức tạp ở đây

**Ví dụ:**

```go
// ❌ SAI - Logic phức tạp trong controller
func (c *AuthController) Register(w http.ResponseWriter, r *http.Request) {
    // Hash password
    // Validate email format
    // Check duplicate username
    // Generate JWT
}

// ✅ ĐÚNG - Controller chỉ nhận/trả request/response
func (c *AuthController) Register(w http.ResponseWriter, r *http.Request) {
    var req RegisterRequest
    json.NewDecoder(r.Body).Decode(&req)

    user, err := c.AuthService.Register(req.Email, req.Password, req.FullName)
    if err != nil {
        json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
        return
    }

    json.NewEncoder(w).Encode(user)
}
```

### 🧠 Tầng Services (services/)

- ✅ **"Não bộ"** hệ thống - Chứa logic nghiệp vụ phức tạp
- ✅ Hash password, verify password
- ✅ JWT token generation
- ✅ Exam scoring logic (tính điểm)
- ✅ Validation logic (kiểm tra điều kiện)
- ✅ Gọi repositories để truy cập DB (KHÔNG trực tiếp GORM)
- ✅ Xử lý lỗi business logic

**Ví dụ:**

```go
type AuthService struct {
    UserRepo *repositories.UserRepository
}

func (s *AuthService) Register(email, password, fullname string) (*User, error) {
    // Validate email format
    if !isValidEmail(email) {
        return nil, errors.New("invalid email")
    }

    // Hash password
    hashedPassword := hashPassword(password)

    // Create user via repository
    user := &User{Email: email, Password: hashedPassword, FullName: fullname}
    return s.UserRepo.Create(user)
}

func (s *AuthService) Login(email, password string) (string, error) {
    user, err := s.UserRepo.FindByEmail(email)
    if err != nil {
        return "", err
    }

    if !verifyPassword(user.Password, password) {
        return "", errors.New("invalid password")
    }

    // Generate JWT token
    token := generateJWT(user.UserID, user.Role)
    return token, nil
}
```

### 💾 Tầng Repositories (repositories/)

- ✅ **DUY NHẤT** được phép gọi GORM để chọc xuống Database
- ✅ Create, Read, Update, Delete (CRUD)
- ✅ Các methods: `Create()`, `FindByID()`, `FindAll()`, `Update()`, `Delete()`
- ✅ TUYỆT ĐỐI KHÔNG logic nghiệp vụ ở đây

**Ví dụ:**

```go
type UserRepository struct {
    DB *gorm.DB
}

func (r *UserRepository) Create(user *User) (*User, error) {
    return user, r.DB.Create(user).Error
}

func (r *UserRepository) FindByEmail(email string) (*User, error) {
    var user User
    return &user, r.DB.Where("email = ?", email).First(&user).Error
}

func (r *UserRepository) FindByID(userID string) (*User, error) {
    var user User
    return &user, r.DB.First(&user, "user_id = ?", userID).Error
}

func (r *UserRepository) Update(user *User) (*User, error) {
    return user, r.DB.Save(user).Error
}

func (r *UserRepository) Delete(userID string) error {
    return r.DB.Delete(&User{}, "user_id = ?", userID).Error
}
```

### 🛣️ Tầng Routes (routes/)

- ✅ Định nghĩa đường dẫn URL
- ✅ Gắn controllers với HTTP methods & paths
- ✅ Áp dụng middlewares

**Ví dụ:**

```go
func SetupRoutes(router *http.ServeMux) {
    // Auth routes (public)
    router.HandleFunc("POST /api/v1/auth/register", authController.Register)
    router.HandleFunc("POST /api/v1/auth/login", authController.Login)

    // Exam routes (protected)
    router.HandleFunc("GET /api/v1/exams",
        authMiddleware(examController.ListExams))
    router.HandleFunc("GET /api/v1/exams/{id}",
        authMiddleware(examController.GetExam))

    // Admin routes (admin only)
    router.HandleFunc("GET /api/v1/admin/users",
        authMiddleware(roleMiddleware("admin", adminController.ListUsers)))
}
```

### 🔐 Tầng Middlewares (middlewares/)

- ✅ **Đứng gác cửa** - Kiểm tra trước khi cho vào controller
- ✅ JWT Token verification
- ✅ Role-based access control (Admin/Student/Teacher)
- ✅ CORS handling
- ✅ Request logging

**Ví dụ:**

```go
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")

        if token == "" {
            http.Error(w, "Missing token", http.StatusUnauthorized)
            return
        }

        claims, err := parseJWT(token)
        if err != nil {
            http.Error(w, "Invalid token", http.StatusUnauthorized)
            return
        }

        // Lưu user info vào request context
        ctx := context.WithValue(r.Context(), "userID", claims.UserID)
        next(w, r.WithContext(ctx))
    }
}
```

### 🛠️ Tầng Utils (utils/)

- ✅ Hàm tiện ích dùng chung
- ✅ Hash password (Bcrypt)
- ✅ JWT generation & parsing
- ✅ String validation & formatting
- ✅ Random string generation

### 🎼 Main (main.go) - Nhạc trưởng

- ✅ Start HTTP server
- ✅ Kết nối Database
- ✅ Setup routes
- ✅ Load environment variables
- ✅ Run tất cả thành phần

**Ví dụ:**

```go
func main() {
    // Load env vars
    dotenv.Load()

    // Connect database
    db := config.InitDB()

    // Initialize repositories
    userRepo := repositories.NewUserRepository(db)
    examRepo := repositories.NewExamRepository(db)

    // Initialize services
    authService := services.NewAuthService(userRepo)
    examService := services.NewExamService(examRepo)

    // Initialize controllers
    authController := controllers.NewAuthController(authService)
    examController := controllers.NewExamController(examService)

    // Setup routes
    routes.SetupRoutes(authController, examController)

    // Start server
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

**API Endpoints (v1):**

| Method | Endpoint                      | Mô tả                     | Protection   |
| :----- | :---------------------------- | :------------------------ | :----------- |
| `POST` | `/api/v1/auth/register`       | Đăng ký (hash password)   | ❌           |
| `POST` | `/api/v1/auth/login`          | Đăng nhập (trả JWT token) | ❌           |
| `GET`  | `/api/v1/auth/me`             | Lấy info user hiện tại    | ✅ JWT       |
| `GET`  | `/api/v1/exams`               | Danh sách tất cả exams    | ✅ JWT       |
| `GET`  | `/api/v1/exams/:id`           | Chi tiết exam + questions | ✅ JWT       |
| `POST` | `/api/v1/exams/:id/submit`    | Nộp bài (tính điểm auto)  | ✅ JWT       |
| `GET`  | `/api/v1/history`             | Lịch sử attempts của user | ✅ JWT       |
| `POST` | `/api/v1/exams/:id/auto-save` | Auto-save exam state      | ✅ JWT       |
| `GET`  | `/api/v1/admin/users`         | (Admin) List users        | ✅ JWT+Admin |
| `GET`  | `/api/v1/admin/exams`         | (Admin) List exams        | ✅ JWT+Admin |

**Quy tắc Phân tầng Backend:**

| Layer        | Chức năng                        | Gọi ai        | Gọi thằng nào  |
| :----------- | :------------------------------- | :------------ | :------------- |
| Controllers  | Nhận request → trả response      | Routes        | Services       |
| Services     | Logic nghiệp vụ                  | Controllers   | Repositories   |
| Repositories | CRUD Database                    | Services      | GORM           |
| Models       | Struct ánh xạ bảng Database      | Tất cả layers | -              |
| Middlewares  | Guard cửa - Check JWT, role      | Routes        | -              |
| Utils        | Hàm tiện ích                     | Tất cả layers | -              |
| Config       | Cấu hình Database                | main()        | -              |
| Routes       | Định nghĩa URL paths             | main()        | Controllers    |
| main.go      | Start server, connect components | -             | Config, Routes |

---

## 5. Cơ sở dữ liệu (PostgreSQL 17)

📚 **Chi tiết đầy đủ về Database: Xem [docs/database.md](database.md)**

### 5.1 Tổng quan Database Architecture

ExamArena sử dụng **PostgreSQL 17 trên Neon Serverless Cloud**:

- ✅ **Platform:** Neon (managed PostgreSQL)
- ✅ **No local database** - Team kết nối chung vào Cloud
- ✅ **Automatic backups** - Neon cung cấp PITR (7 days)
- ✅ **UUID Primary Keys** - Bảo mật (không sequential IDs)
- ✅ **JSONB Columns** - Flexible data structures (questions, auto-save state)

**Connection:**

```
Backend (Go + GORM)
    ↓ (Connection Pool)
PostgreSQL 17 (Neon Cloud)
    ├─ SSH Tunnel (production DBeaver/DataGrip access)
    └─ DBeaver/DataGrip (team database management)
```

### 5.2 Cấu trúc Bảng chính

**10 Bảng chính trong PostgreSQL 17 (Xem [docs/database.md](database.md) để định nghĩa đầy đủ):**

| Bảng                    | Cột                                                                                                                               | Mục đích                                 | Ghi chú                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| **users**               | user_id, username, password, fullname, email, role, deleted_at                                                                    | Xác thực & Hồ sơ người dùng              | Xóa mềm, mật khẩu mã hóa Bcrypt                                      |
| **exam_room**           | room_id, name, type, price, test_quantity, status, deleted_at                                                                     | Phòng thi marketplace (truy cập trả phí) | Xóa mềm, giá để học sinh truy cập                                    |
| **user_room_access**    | user_id, room_id, granted_at, expired_at                                                                                          | Kiểm soát truy cập (RBAC)                | PK ghép, truy cập có thời hạn                                        |
| **payment**             | transaction_id, user_id, room_id, amount, type, status                                                                            | Theo dõi thanh toán                      | Dấu vết kiểm ốđun để ghi nhận giao dịch                              |
| **exam**                | exam_id, room_id, title, type, capacity, duration, start_time, deleted_at                                                         | Đề thi riêng lẻ                          | Xóa mềm, thuộc exam_room                                             |
| **exam_section**        | section_id, exam_id, title, duration                                                                                              | Phần thi trong đề                        | Phân cấp tổ chức                                                     |
| **question**            | question_id, section_id, parent_id, content, options (JSONB), correct_answer, explanation, point, type, question_type, deleted_at | Câu hỏi với LaTeX & phân cấp             | Xóa mềm, parent_id tự tham chiếu cho câu phụ                         |
| **exam_attempt**        | attempt_id, user_id, exam_id, attempt_type, marks, status, started_at, end_at                                                     | Lịch sử nộp đề                           | ON DELETE RESTRICT (bảo vệ lịch sử), theo dõi marks không phải score |
| **attempt_section_log** | log_id, attempt_id, section_id, status, started_at, end_at                                                                        | Theo dõi phần thi cấp độ                 | Bảng trung gian để theo dõi tiến độ                                  |
| **attempt_detail**      | detail_id, log_id, question_id, selected_ans, is_correct                                                                          | Bản ghi câu trả lời riêng lẻ             | Cột là selected_ans (không phải selected_answer), cờ tính đúng/sai   |

**Tính năng Cơ sở dữ liệu Chính:**

✅ **Mô hình Xóa Mềm:** Nhiều bảng có `deleted_at TIMESTAMPTZ` để dấu vết kiểm tra  
✅ **Câu hỏi Phân cấp:** `question.parent_id` cho phép cấu trúc câu hỏi lồng nhau  
✅ **Dấu thời gian Tự động:** Kích hoạtfunction `update_modified_column()` giữ `updated_at` hiện tại  
✅ **Cột JSONB:** Tùy chọn câu hỏi được lưu trữ dưới dạng JSON linh hoạt: `{"A": "...", "B": "...", "C": "...", "D": "..."}`  
✅ **Khóa chính UUID:** Bảo mật (không đoán ID tuần tự), hỗ trợ nhiều vùng  
✅ **Mô hình Marketplace:** exam_room + user_room_access + payment cho phép truy cập đề thi trả phí

### 5.3 Mô hình Marketplace & Kiểm soát Truy cập

**Học sinh truy cập đề thi như thế nào:**

```
1. Học sinh thấy exam_room (ví dụ: "Gói IELTS 2026 Hoàn chỉnh")
   - price: $49.99
   - test_quantity: 10 đề thi

2. Học sinh mua → bảng payment ghi nhận giao dịch

3. user_room_access cấp quyền truy cập
   - granted_at: NOW()
   - expired_at: NOW() + 30 ngày

4. Học sinh có thể tạo exam_attempt cho bất kỳ đề thi nào trong phòng đó

5. Luồng nỗ lực:
   exam_attempt → attempt_section_log → attempt_detail
   (theo dõi điểm, dấu thời gian, selected_ans cho mỗi câu hỏi)
```

### 5.4 Các Nguyên tắc Thiết kế Chính

✅ **Tính toàn vẹn Dữ liệu:**

- ON DELETE RESTRICT on exam_attempt (bảo toàn lịch sử)
- ON DELETE CASCADE on details (dọn dẹp tầng xếp)
- UUID Primary Keys (bảo mật, không đoán ID)
- Ràng buộc khóa ngoại xuyên suốt

✅ **Hiệu năng:**

- Chỉ mục chiến lược trên cột FK + trường được truy vấn thường xuyên
- Chỉ mục GIN JSONB cho tìm kiếm tùy chọn câu hỏi
- Kết nối gộp thông qua GORM (10-20 kết nối)
- Chỉ mục ghép trên (user_id, exam_id) để tra cứu nhanh

✅ **Bảo mật:**

- Mã hóa mật khẩu Bcrypt (không bao giờ plaintext)
- Xác thực dựa trên JWT (không trạng thái)
- Ngăn chặn SQL injection (các truy vấn GORM tham số hóa)
- Xóa mềm (dữ liệu được bảo toàn, không mất vĩnh viễn)
- Mô hình Delayed_at cho phép khôi phục dữ liệu

✅ **Kiểm tra & Tuân thủ:**

- Dấu thời gian updated_at tự động (thông qua kích hoạt)
- Lịch sử exam_attempt bất biến (ON DELETE RESTRICT)
- Nhật ký giao dịch thanh toán (không thể sửa đổi)
- Cột deleted_at cho xóa mềm (ai/khi đã xóa)

📖 **Để biết Chi tiết Đầy đủ:**

- Định nghĩa schema đầy đủ → [docs/database.md - Phần 3](database.md#3-sơ-đồ-cơ-sở-dữ-liệu)
- Mối quan hệ & quy tắc tầng xếp → [docs/database.md - Phần 4](database.md#4-mối-quan-hệ--ràng-buộc)
- Chiến lược chỉ mục & tối ưu hóa → [docs/database.md - Phần 5](database.md#5-chỉ-mục--hiệu-năng)
- Kích hoạt & tự động hóa → [docs/database.md - Phần 8.5](database.md#85-phiên-bản-schema)

---

## 6. Swagger/OpenAPI Documentation

### 6.1 Phương pháp Documentation

**KHÔNG:**

- ❌ Viết file `.md` thủ công để document API
- ❌ Dùng Postman collection
- ❌ File Word/PDF

**CÓ:**

- ✅ Backend viết Swagger comments trên code Go
- ✅ Auto-generate Swagger UI từ comments
- ✅ Frontend truy cập `/swagger/index.html` để test API

### 6.2 Cách viết Swagger comments (Backend)

```go
// @Summary Đăng nhập người dùng
// @Description Xác thực credentials và trả JWT token
// @Tags auth
// @Accept json
// @Produce json
// @Param input body LoginRequest true "Email & Password"
// @Success 200 {object} LoginResponse
// @Router /api/v1/auth/login [post]
func Login(w http.ResponseWriter, r *http.Request) {
    // handler code...
}
```

### 6.3 Generate & Access

```bash
# Backend generate swagger docs
swag init

# Access at
http://localhost:8080/swagger/index.html
```

---

## 7. Quy trình Request-Response

### 7.1 Exam Submission Flow

```
1. User làm bài → Click "Nộp bài"
   (Frontend)

2. POST /api/v1/exams/:id/submit
   {
     user_id: "uuid",
     answers: {...},
     time_spent: 1200
   }
   (include JWT in header)

3. Backend receives
   ├─ Verify JWT token
   ├─ Validate exam_id & user_id
   ├─ Check exam open status
   └─ Load correct answers from DB

4. Business Logic (GORM queries)
   ├─ Compare user answers vs correct
   ├─ Calculate total score
   ├─ Generate result JSON
   └─ Save exam_attempts, attempt_details

5. Return response
   {
     status: "success",
     score: 85,
     total_questions: 50,
     correct_count: 42,
     results: [...]
   }

6. Frontend
   └─ Display results page
```

### 7.2 Auto-save Flow

```
1. User enters answer → React State updated

2. Timer: Every 5-10 seconds
   POST /api/v1/exams/:id/auto-save
   {
     current_answers: {...},
     timer_remaining: 2400
   }

3. Backend (GORM)
   ├─ Update exam_attempts.state_data (JSONB)
   └─ Very fast (JSON update, no scoring)

4. Frontend
   └─ LocalStorage fallback if network error

5. Browser crash? On restart:
   GET /api/v1/exams/:id/resume
   └─ Load state_data from exam_attempts
   └─ Restore answers & timer
```

---

## 8. DevOps & Deployment

### 8.1 Local Development

**Docker Compose:**

```bash
docker compose up --build
```

**Services:**

- Frontend container (Next.js, port 3000)
- Backend container (Go, port 8080)
- Database (Neon Cloud - external)

### 8.2 Production Deployment (May 2026)

**Architecture:**

```
Internet (HTTPS)
    ↓
Nginx Reverse Proxy (port 80/443, SSL certificate)
    ↓
Docker containers (Go API backend)
    ↓
SSH Tunnel
    ↓
PostgreSQL 17 (Neon Cloud)
```

**Components:**

- **VPS:** Linux 24/7 running Docker
- **Nginx:** SSL termination + routing
- **SSH Tunnel:** Secure DB access (DBeaver/DataGrip)
- **Database:** Neon Serverless PostgreSQL

### 8.3 Environment Variables

**Backend `.env`:**

```
DATABASE_URL=postgresql://user:pass@neon.tech:5432/examarena
JWT_SECRET=your-min-32-chars-secret
GO_ENV=production
API_PORT=8080
```

**Frontend `.env.local`:**

```
NEXT_PUBLIC_API_URL=https://api.examarena.com
NEXT_PUBLIC_STORAGE_KEY=examarena_storage
```

---

## 📚 Best Practices

✅ **Frontend:**

- Use TypeScript strictly
- Component composition
- Validate input (client + server)
- Handle loading/error states

✅ **Backend:**

- Always validate input
- Use middleware for cross-cutting concerns
- Proper error handling & logging
- Database transactions for multi-step ops
- Write unit tests

✅ **Database:**

- Use parameterized queries (prevent SQL injection)
- Add indexes for frequent queries
- Regular backups
- Use transactions for critical operations

---

## 📚 Tài liệu Liên quan

- **[docs/database.md](database.md)** – Schema chi tiết, công cụ quản lý, chỉ mục, backup
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** – Quy trình Git, tiêu chuẩn commit, quy trình PR
- **[README.md](../README.md)** – Tổng quan dự án & hướng dẫn cài đặt
- **[CHANGELOG.md](../CHANGELOG.md)** – Lịch sử phiên bản & ghi chú phát hành

---

> **Last Updated:** March 2026  
> **Version:** 1.0  
> © ExamArena Development Team
