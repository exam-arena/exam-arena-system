# 🎓 ExamArena – Nền tảng Luyện thi & Đánh giá Năng lực Trực tuyến

![ExamArena Banner](https://via.placeholder.com/1200x400?text=ExamArena+-+Beta+Launch+5/2026)

> **Phòng thi ảo thực tế – Chấm điểm tự động – Quản lý đề thi hiệu quả**

## 📖 Giới thiệu (Overview)

**ExamArena** là nền tảng luyện thi và đánh giá năng lực trực tuyến toàn diện, cho phép:

- 🎓 **Học sinh:** Tham gia làm bài thi thời gian thực, nhận feedback tức thì và phân tích chi tiết điểm yếu.
- 👨‍🏫 **Giáo viên:** Quản lý đề thi, phòng thi, xem kết quả và phân tích hiệu suất học sinh.
- 🔐 **Quản trị viên:** Kiểm soát hệ thống, dữ liệu và bảo mật toàn nền tảng.

Kiến trúc **Decoupled** - Frontend và Backend hoàn toàn tách biệt, giao tiếp qua RESTful API + JSON.

🚀 **Phiên bản Beta dự kiến ra mắt:** Tháng 05/2026.
🎯 **Khuyến năng:** Xử lý >1,000 thí sinh làm bài đồng thời.

### ✨ Tính năng chính (Key Features)

- � **Quản lý Đề thi & Phòng thi:** Tạo, chỉnh sửa, xóa đề thi. Quản lý cấu trúc câu hỏi đa dạng (Trắc nghiệm, Điền từ).
- ⚡ **Chấm điểm Tự động & Tức thì:** Hệ thống tự động chấm, trả về kết quả và lời giải chi tiết ngay sau khi nộp bài.
- 🕒 **Timer chính xác:** Đếm ngược thời gian làm bài, tự động submit khi hết giờ.
- 💾 **Auto-save thông minh:** Tự động lưu trạng thái làm bài mỗi 3-5 giây, phục hồi nếu browser crash.
- 📊 **Dashboard & Analytics:** Theo dõi lịch sử thi, biểu đồ tiến bộ, phân tích câu đúng/sai chi tiết.
- 🔢 **Hỗ trợ Công thức Toán học:** Render công thức toán học chuẩn xác dùng KaTeX.
- 🛡️ **Bảo mật & Ổn định:** JWT Authentication, mã hóa mật khẩu Bcrypt, chịu tải cao, chống gian lận.
- 🔄 **Quản lý Người dùng:** Phân quyền (Học sinh, Giáo viên, Admin) với RBAC (Role-Based Access Control).

---

## 🛠 Kiến trúc hệ thống (Tech Stack)

Dự án sử dụng các công nghệ hiện đại nhất (2026), tối ưu hóa cho hiệu suất (Performance) và khả năng mở rộng (Scalability). Kiến trúc **Decoupled** đảm bảo Frontend và Backend độc lập với nhau.

| Thành phần   | Công nghệ sử dụng                                                                                                                                                                                 | Chi tiết                                                                              |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------ |
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat&logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black) | Next.js (ReactJS Framework), TypeScript, TailwindCSS v4, KaTeX, Client-Side Rendering |
| **Backend**  | ![Go](https://img.shields.io/badge/Golang-1.26-00ADD8?style=flat&logo=go&logoColor=white)                                                                                                         | Go 1.26, GORM (ORM), RESTful API, Swagger/OpenAPI, JWT Auth                           |
| **Database** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat&logo=postgresql&logoColor=white)                                                                                       | PostgreSQL 17 trên **Neon Serverless** (Cloud), UUID Primary Keys, JSONB Columns      |
| **DevOps**   | ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)                                                                                              | Docker & Docker Compose, Nginx (Production), SSH Tunnel                               |
| **Tools**    | ![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D?style=flat&logo=swagger&logoColor=black)                                                                                           | Swagger UI (API Docs), DBeaver/DataGrip (DB Management)                               |

---

## ⚙️ Yêu cầu & Cài đặt (Prerequisites & Installation)

### 1. Bắt buộc (Dành cho TOÀN BỘ Team)

Để chạy dự án trên máy local, bạn cần cài sẵn:

- **Git** – Để clone repo
- **Docker Desktop** – Chạy containers (Frontend & Backend)
  - Trên **Windows:** Bật WSL 2 trong Docker Desktop settings
  - Tải tại: https://www.docker.com/products/docker-desktop/

### 2. Tùy chọn (Tuỳ thuộc vào vai trò)

- **Team Backend:** Cài [Golang v1.26+](https://go.dev/) & extension **Go** trong VS Code để IntelliSense.
- **Team Frontend:** Cài [Node.js LTS](https://nodejs.org/) để local development (tùy chọn, vì Docker cũng hoạt động).

### 3. Database

⚠️ **Quan trọng:** Dự án **KHÔNG chạy Database ở local**. Toàn bộ team kết nối chung vào:

- **Neon Serverless (PostgreSQL 17)** – Cloud database
- Connection String được lưu trong file `.env`
- Để quản lý DB: Dùng **DBeaver Desktop** hoặc **DataGrip** (cấm dùng pgAdmin Web UI)

---

### Các bước cài đặt

**Bước 1: Clone dự án**

```bash
git clone https://github.com/your-username/exam-arena-system.git
cd exam-arena-system
```

**Bước 2: Cấu hình Environment Variables**

Tạo file `.env` trong thư mục gốc:

```env
# Backend
DATABASE_URL=postgresql://user:password@host:5432/examarena
JWT_SECRET=your-secret-key-min-32-chars
GO_ENV=development
API_PORT=8081

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8081
```

⚠️ **Lưu ý:** File `.env` chứa thông tin nhạy cảm - **TUYỆT ĐỐI KHÔNG PUSH LÊN GITHUB**. Nó đã được thêm vào `.gitignore`.

---

## 🚀 Hướng dẫn chạy dự án (Running the App)

### Khởi chạy toàn bộ stack (1 lệnh duy nhất)

```bash
docker compose up --build
```

**Lệnh này sẽ:**

- ✅ Build Docker image cho Frontend (Next.js)
- ✅ Build Docker image cho Backend (Go + GORM)
- ✅ Tiếp nối với Neon Cloud Database
- ✅ Hot reload nhật tự động khi edit code

### Truy cập ứng dụng

Sau khi container chạy thành công:

| Dịch vụ                | URL                                                                                  | Chi tiết              |
| :--------------------- | :----------------------------------------------------------------------------------- | :-------------------- |
| **Web App (Frontend)** | [http://localhost:3000](http://localhost:3000)                                       | Next.js UI            |
| **API Backend**        | [http://localhost:8081](http://localhost:8081)                                       | Go RESTful API        |
| **API Documentation**  | [http://localhost:8081/swagger/index.html](http://localhost:8081/swagger/index.html) | Swagger UI (Test API) |

### Dừng containers

```bash
docker compose down
```

### Lưu ý về Database

- Database chạy trên **Neon Cloud** – không phải local
- Để quản lý DB: Dùng **DBeaver** hoặc **DataGrip**
  - Kết nối bằng `DATABASE_URL` trong file `.env`
  - Không dùng pgAdmin Web UI

### Cấu trúc thư mục

```
exam-arena-system/
├── docker-compose.yml       # Container orchestration
├── .env                     # Environment variables (secret!)
├── .gitignore
│
├── frontend/                # Next.js Frontend
│   ├── app/                 # App Router (pages)
│   ├── components/          # React Components
│   ├── public/              # Static assets
│   ├── Dockerfile
│   └── package.json
│
└── backend/                 # Go Backend
    ├── main.go              # Entry point
    ├── config/              # Database connection
    ├── models/              # Golang Structs (GORM)
    ├── handlers/            # API Handlers
    ├── services/            # Business Logic
    ├── go.mod               # Go dependencies (GORM, Godotenv)
    ├── Dockerfile
    └── docs/                # Swagger API docs
```

---

## 👥 Nhóm phát triển (Development Team)

Dự án ExamArena được phát triển bởi team 5 thành viên chuyên nghiệp:

| Thành viên       | Vai trò                                     | Trách vụ                                                                |
| :--------------- | :------------------------------------------ | :---------------------------------------------------------------------- |
| 👨‍💼 **Minh Quân** | **Project Manager (PM) / System Architect** | Thiết kế kiến trúc hệ thống, quản lý tiến độ, Database, DevOps, hạ tầng |
| 💻 **Việt**      | Frontend Developer                          | Xây dựng UI/UX, tương tác API, KaTeX rendering                          |
| 🎨 **Thắng**     | Frontend Developer                          | Thiết kế giao diện (Figma), responsive design                           |
| ⚙️ **Đức**       | Backend Developer                           | Thiết kế API, logic chấm điểm, E2E Testing                              |
| 🔒 **Nhi**       | Backend Developer                           | Authentication (JWT), Exam Logic, Bảo mật                               |

---

## 📝 Roadmap (Sprints)

Kế hoạch phát triển tuân theo Agile Sprint Framework (1 sprint = 1 tuần):

- [x] **Sprint 0 (03/03-13/03):** Kickoff, Setup Base Framework, Database Design (ERD), Figma UI Flow.
- [ ] **Sprint 1 (16/03-20/03):** Database + Base Code & API Auth (Login/Register, JWT).
- [ ] **Sprint 2 (23/03-25/03):** Mock JSON & Ui Phòng thi (Khung giao diện).
- [ ] **Sprint 3 (30/03-03/04):** Gợi API Lịch sử, Chấm điểm, Analytics.
- [ ] **Sprint 4 (06/04-08/04):** Deploy hệ thống lên Production / Cloud Server, E2E Testing.

**Target:** Beta Release vào **tháng 05/2026**

---

## 📚 Tài liệu Bổ sung

- 📖 **[CONTRIBUTING.md](CONTRIBUTING.md)** – Quy trình phát triển, Git workflow, Commit convention
- 🏗️ **[docs/architecture.md](docs/architecture.md)** – Kiến trúc chi tiết, Database schema, API design
- 📋 **[CHANGELOG.md](CHANGELOG.md)** – Lịch sử phiên bản và thay đổi

---

> © 2025 ExamArena Project. All rights reserved.
