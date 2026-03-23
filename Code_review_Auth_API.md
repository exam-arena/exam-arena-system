# 🔍 Code Review: Auth API (Register / Login)

> **Review Date:** 2026-03-21  
> **Reviewer:** Backend Specialist + Security Auditor  
> **Target:** Hệ thống thi thử CCU lớn (>1,000 thí sinh đồng thời)

---

## Tổng quan

Đã review toàn bộ **12 files** Auth API trên **8 layers**: [main.go](file:///d:/exam-arena-system/backend/main.go), `config/`, `models/`, `controllers/`, `services/`, `repositories/`, `utils/`, `routes/`.

### Đánh giá tổng thể

| Tiêu chí                      | Đánh giá         | Chi tiết                                      |
| ----------------------------- | ---------------- | --------------------------------------------- |
| **Phân tầng kiến trúc**       | ✅ Tốt           | Controller → Service → Repository đúng chuẩn  |
| **Clean Code**                | ✅ Tốt           | Code clean, dễ đọc, đặt tên hợp lý            |
| **Validation**                | ⚠️ Cần cải thiện | Có nhưng còn thiếu vài điểm                   |
| **Bảo mật**                   | 🔴 Cần khắc phục | JWT Secret bị khởi tạo sai, thiếu middleware  |
| **Chịu tải cao (CCU)**        | 🔴 Cần khắc phục | Thiếu connection pooling, rate limiting, CORS |
| **Tuân thủ Architecture Doc** | ⚠️ Một phần      | Route path thiếu `/v1/`, port không khớp      |

---

## 🔴 LỖI NGHIÊM TRỌNG (Critical – Phải sửa ngay)

### 1. JWT Secret bị khởi tạo rỗng (Empty Key)

**File:** [jwt.go](file:///d:/exam-arena-system/backend/utils/jwt.go#L11)

```go
// ❌ BUG: os.Getenv() chạy lúc IMPORT TIME, TRƯỚC KHI .env được load
var jwtKey = []byte(os.Getenv("JWT_SECRET"))
```

> [!CAUTION]
> `jwtKey` được khởi tạo ở **package-level** → chạy trước [main()](file:///d:/exam-arena-system/backend/main.go#13-29) → trước khi Docker load [.env](file:///d:/exam-arena-system/.env) → **luôn luôn = `[]byte("")`**. Token sẽ được ký bằng key rỗng → **bất kỳ ai cũng có thể forge JWT token**.

**Fix:**

```diff
-var jwtKey = []byte(os.Getenv("JWT_SECRET"))
+func getJWTKey() []byte {
+    key := os.Getenv("JWT_SECRET")
+    if key == "" {
+        log.Fatal("❌ JWT_SECRET is not set")
+    }
+    return []byte(key)
+}

 func GenerateJWT(user *models.User) (string, error) {
     // ...
-    return token.SignedString(jwtKey)
+    return token.SignedString(getJWTKey())
 }
```

---

### 2. Thiếu Auth Middleware hoàn toàn

**File:** [middlewares/](file:///d:/exam-arena-system/backend/middlewares) – Thư mục rỗng

> [!CAUTION]
> Architecture doc yêu cầu `auth_middleware.go` để verify JWT cho các route protected. Hiện tại **thư mục rỗng**, nghĩa là không có endpoint nào được bảo vệ. Endpoint `/api/v1/auth/me` (GET user info) cũng chưa tồn tại.

**Cần tạo:**

- `middlewares/auth_middleware.go` – Verify JWT, extract `userID` + `role` vào `context`
- `middlewares/cors_middleware.go` – CORS handling
- [utils/jwt.go](file:///d:/exam-arena-system/backend/utils/jwt.go) cần thêm hàm `ParseJWT(tokenString) (*Claims, error)`

---

### 3. Thiếu CORS Middleware → Frontend không gọi được API

Hiện tại **không có CORS configuration** nào. Frontend (`localhost:3000`) gọi API Backend (`localhost:8081`) sẽ bị **browser chặn** do Same-Origin Policy.

**Cần thêm `middlewares/cors_middleware.go`:**

```go
func CORSMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

---

### 4. Route không khớp Architecture Doc

**File:** [route.go](file:///d:/exam-arena-system/backend/routes/route.go)

| Hiện tại             | Architecture Doc        | Vấn đề                  |
| -------------------- | ----------------------- | ----------------------- |
| `/api/auth/register` | `/api/v1/auth/register` | Thiếu prefix `/v1/`     |
| `/api/auth/login`    | `/api/v1/auth/login`    | Thiếu prefix `/v1/`     |
| Không có             | `/api/v1/auth/me`       | Endpoint chưa implement |

> [!IMPORTANT]
> Thiếu `/v1/` sẽ gây khó khăn khi cần versioning API sau này. Nên sửa để khớp doc ngay từ đầu.

---

## ⚠️ VẤN ĐỀ QUAN TRỌNG (High – Nên sửa trước khi merge)

### 5. Thiếu Connection Pooling → Không chịu được tải CCU lớn

**File:** [database.go](file:///d:/exam-arena-system/backend/config/database.go)

```go
// ❌ Hiện tại: Chỉ mở kết nối, KHÔNG cấu hình pool
database, err := gorm.Open(postgres.Open(dsn), config)
DB = database
```

> [!WARNING]
> Hệ thống cần xử lý >1,000 CCU. Nếu thiếu connection pooling, mỗi request sẽ mở 1 connection mới → exhausted Neon connection limit → **database crash**.

**Fix:**

```go
func ConnectDatabase() {
    // ...
    DB = database

    sqlDB, err := DB.DB()
    if err != nil {
        log.Fatal("❌ Cannot get SQL DB instance: ", err)
    }

    sqlDB.SetMaxOpenConns(20)
    sqlDB.SetMaxIdleConns(5)
    sqlDB.SetConnMaxLifetime(30 * time.Minute)
    sqlDB.SetConnMaxIdleTime(5 * time.Minute)
}
```

---

### 6. Password TrimSpace trước khi verify → Side effect nguy hiểm

**File:** [user_services.go](file:///d:/exam-arena-system/backend/services/user_services.go#L117)

```go
// ❌ NGUY HIỂM: password = "  mypass123  " sẽ thành "mypass123"
password := strings.TrimSpace(input.Password)
```

> [!WARNING]
> Whitespace ở đầu/cuối password **là ký tự hợp lệ**. Nếu user đăng ký với password `"  abc123  "`, bcrypt hash sẽ lưu hash của chuỗi gốc (chưa trim). Nhưng khi login lại trim → **password mismatch** → user bị khóa ngoài.

**Fix:** Không trim password. Chỉ trim `identifier`:

```diff
 identifier := strings.TrimSpace(input.Identifier)
-password := strings.TrimSpace(input.Password)
+password := input.Password
```

**Tương tự ở Register:** Hiện tại [RegisterUser](file:///d:/exam-arena-system/backend/services/user_services.go#41-109) KHÔNG trim password ở bước normalize → OK. Nhưng cần document rõ: **"password không được trim"**.

---

### 7. Model thiếu `json` tags → Response sẽ leak password hash

**File:** [user.go](file:///d:/exam-arena-system/backend/models/user.go)

```go
type User struct {
    // ❌ Thiếu json tags, đặc biệt Password cần json:"-"
    Password string `gorm:"size:255;not null"`
}
```

> [!WARNING]
> Nếu bất kỳ endpoint nào trả [User](file:///d:/exam-arena-system/backend/models/user.go#5-16) struct trực tiếp (ví dụ `/api/v1/auth/me`), **password hash sẽ bị lộ** trong JSON response.

**Fix:**

```go
type User struct {
    UserID    string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"user_id"`
    Username  string     `gorm:"size:50;unique;not null" json:"username"`
    Password  string     `gorm:"size:255;not null" json:"-"`
    Fullname  string     `gorm:"size:100;not null" json:"fullname"`
    Email     string     `gorm:"size:100;unique;not null" json:"email"`
    Role      string     `gorm:"size:20;default:student" json:"role"`
    CreatedAt time.Time  `json:"created_at"`
    UpdatedAt time.Time  `json:"updated_at"`
    DeletedAt *time.Time `gorm:"index" json:"-"`
}
```

---

### 8. Response format thiếu `status` và `error` field

**File:** [auth_controller.go](file:///d:/exam-arena-system/backend/controllers/auth_controller.go#L25-L28)

```go
type APIResponse struct {
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"`
}
```

Theo API best practice (Envelope pattern), nên có:

```go
type APIResponse struct {
    Status  string      `json:"status"`            // "success" | "error"
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`    // chi tiết lỗi (chỉ dev mode)
}
```

---

### 9. Login Response thiếu thông tin user

**File:** [user_services.go](file:///d:/exam-arena-system/backend/services/user_services.go#L27-L29)

```go
type LoginResponse struct {
    Token string  // ❌ Chỉ trả token, thiếu user info
}
```

Frontend cần user info ngay sau login (username, role, fullname) để render UI. Hiện tại phải gọi thêm 1 request `/api/v1/auth/me` → **tăng latency**.

**Fix:**

```go
type LoginResponse struct {
    Token string       `json:"token"`
    User  UserResponse `json:"user"`
}

type UserResponse struct {
    UserID   string `json:"user_id"`
    Username string `json:"username"`
    Fullname string `json:"fullname"`
    Email    string `json:"email"`
    Role     string `json:"role"`
}
```

---

## 💡 CẢI THIỆN (Medium – Nên làm trước Sprint 2)

### 10. Validator password quá yếu cho production

**File:** [validators.go](file:///d:/exam-arena-system/backend/utils/validators.go#L13-L15)

```go
func IsValidPassword(password string) bool {
    return len(password) >= 6  // ❌ Quá yếu cho hệ thống exam
}
```

Nên yêu cầu tối thiểu: **8 ký tự, chữ hoa + chữ thường + số**.

---

### 11. Method check thủ công trong Controller

**File:** [auth_controller.go](file:///d:/exam-arena-system/backend/controllers/auth_controller.go#L34-L37)

```go
if r.Method != http.MethodPost {
    respondJSON(w, http.StatusMethodNotAllowed, "method not allowed", nil)
    return
}
```

Go 1.22+ (bạn đang dùng 1.26) hỗ trợ **method routing** trong `http.HandleFunc`:

```go
// route.go
http.HandleFunc("POST /api/v1/auth/register", controllers.Register)
http.HandleFunc("POST /api/v1/auth/login", controllers.Login)
```

→ Bỏ toàn bộ method check trong controller → code gọn hơn.

---

### 12. Function-based thay vì Struct-based Repositories

**File:** [user_repository.go](file:///d:/exam-arena-system/backend/repositories/user_repository.go)

Hiện tại dùng **package-level functions** truy cập `config.DB` trực tiếp:

```go
func CreateUser(user *models.User) error {
    return config.DB.Create(user).Error
}
```

> [!NOTE]
> Cách này hoạt động được, nhưng **không thể test** (không inject mock DB). Architecture doc mô tả dùng struct-based pattern. Tuy nhiên với scope Sprint 1, cách hiện tại chấp nhận được. Nên chuyển sang struct khi có test.

---

### 13. Soft Delete chưa được xử lý trong Repository queries

**File:** [user_repository.go](file:///d:/exam-arena-system/backend/repositories/user_repository.go)

```go
func GetUserByEmail(email string) (*models.User, error) {
    err := config.DB.Where("email = ?", email).First(&user).Error
    // ❌ Không lọc deleted_at IS NULL
}
```

> [!IMPORTANT]
> GORM **tự động** xử lý soft delete NẾU model dùng `gorm.DeletedAt` thay vì `*time.Time`. Hiện tại model dùng `DeletedAt *time.Time` → GORM **không tự động filter** → user đã bị soft-delete vẫn có thể login.

**Fix (chọn 1 trong 2):**

**Option A (recommend):** Đổi model sang `gorm.DeletedAt`:

```go
import "gorm.io/gorm"

type User struct {
    // ...
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
```

**Option B:** Thêm manual filter:

```go
config.DB.Where("email = ? AND deleted_at IS NULL", email).First(&user)
```

---

### 14. Thiếu Graceful Shutdown cho HTTP Server

**File:** [main.go](file:///d:/exam-arena-system/backend/main.go#L27)

```go
log.Fatal(http.ListenAndServe(":8080", nil))
```

Với 1,000 CCU, server cần **graceful shutdown** để xử lý xong request đang chạy trước khi tắt:

```go
srv := &http.Server{Addr: ":8080"}
go func() { log.Fatal(srv.ListenAndServe()) }()

quit := make(chan os.Signal, 1)
signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
<-quit

ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
srv.Shutdown(ctx)
```

---

### 15. Port mismatch giữa main.go ↔ docker-compose.yml

| Nơi                                                                   | Port                         |
| --------------------------------------------------------------------- | ---------------------------- |
| [main.go](file:///d:/exam-arena-system/backend/main.go)               | `:8080`                      |
| [docker-compose.yml](file:///d:/exam-arena-system/docker-compose.yml) | `8081:8080` (host:container) |
| Architecture doc                                                      | Backend port: `8081`         |

Port mapping **hoạt động đúng** (Docker maps 8081→8080), nhưng nên thống nhất: dùng env var `API_PORT` từ [.env](file:///d:/exam-arena-system/.env) thay vì hardcode.

---

## ✅ ĐIỂM TỐT (Đã làm đúng)

| #   | Điểm                                                                                                                                                                                                               | Đánh giá |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | **Phân tầng kiến trúc** đúng chuẩn Layered Architecture                                                                                                                                                            | ⭐⭐⭐   |
| 2   | **Error handling** tách biệt: sentinel errors trong service, HTTP mapping trong controller                                                                                                                         | ⭐⭐⭐   |
| 3   | **Bcrypt cost = 12** – phù hợp production                                                                                                                                                                          | ⭐⭐⭐   |
| 4   | **Identifier login** (email HOẶC username) – UX tốt                                                                                                                                                                | ⭐⭐⭐   |
| 5   | **Input normalization** (TrimSpace, ToLower email)                                                                                                                                                                 | ⭐⭐     |
| 6   | **Không phân biệt** "user not found" vs "wrong password" → chống enumeration attack                                                                                                                                | ⭐⭐⭐   |
| 7   | **Tách riêng** [IsEmailExists](file:///d:/exam-arena-system/backend/repositories/user_repository.go#65-79) / [IsUsernameExists](file:///d:/exam-arena-system/backend/repositories/user_repository.go#80-94) checks | ⭐⭐     |
| 8   | **UUID primary key** với `gen_random_uuid()`                                                                                                                                                                       | ⭐⭐⭐   |

---

## 📋 Bảng tổng kết ưu tiên sửa

| #   | Vấn đề                     | Mức độ      | Ảnh hưởng CCU                  |
| --- | -------------------------- | ----------- | ------------------------------ | ------------------------------------- | ---- |
| 1   | JWT Secret rỗng            | 🔴 Critical | Token có thể bị forge          | Done                                  |
| 2   | Thiếu Auth Middleware      | 🔴 Critical | Không bảo vệ route             | Chưa xét                              |
| 3   | Thiếu CORS                 | 🔴 Critical | Frontend không gọi được API    | Chưa xét                              |
| 4   | Route thiếu `/v1/`         | 🔴 Critical | Không khớp architecture        | Done                                  |
| 5   | Thiếu Connection Pooling   | ⚠️ High     | DB crash khi >100 CCU          | Cache xử lý 90%, DB chỉ xử lý 10%     | Done |
| 6   | Password TrimSpace         | ⚠️ High     | User bị khóa ngoài             | Done                                  |
| 7   | Model thiếu `json:"-"`     | ⚠️ High     | Leak password hash             | Done                                  |
| 8   | Soft Delete chưa filter    | ⚠️ High     | Deleted user vẫn login được    | Sửa sau -> chuyển sang gorm.DeletedAt |
| 9   | Response format chưa chuẩn | 💡 Medium   | Frontend khó xử lý             | Done                                  |
| 10  | Login thiếu user info      | 💡 Medium   | Thêm 1 request không cần thiết | Done                                  |
| 11  | Password validation yếu    | 💡 Medium   | Bảo mật yếu                    | Done                                  |
| 12  | Method check thủ công      | 💡 Medium   | Code dư thừa                   | Sửa sau                               |
| 13  | Graceful shutdown          | 💡 Medium   | Request bị mất khi deploy      | Done                                  |
| 14  | Struct-based repository    | 💡 Low      | Không testable                 |

---

> 🤖 **Applying knowledge of `@[backend-specialist]` + `@[security-auditor]`**
