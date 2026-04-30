# Changelog

Tất cả các thay đổi đáng chú ý tới dự án **ExamArena** sẽ được ghi chép trong file này.

Format của file này tuân theo chuẩn [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
và dự án sử dụng [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### 🔨 Đang phát triển (Planned for v0.2.0-beta)

#### Added

- WebSocket support cho real-time exam notifications
- User profile page với lịch sử thi và thống kê chi tiết
- Admin dashboard để quản lý đề thi, phòng thi, users
- Email notifications (exam submit, password reset)
- Redis caching cho performance optimization (future)
- Question bank seeding & management
- Multi-section exam support
- Export results as PDF

#### Changed

- Improve auto-save mechanism: từ 10 seconds → 3-5 seconds
- Consider Gin framework refactor (if performance needed)
- Database query optimization with more indexes

#### Security

- Implement rate limiting on auth endpoints
- Add CSRF protection
- Input sanitization enhancement
- Secure SSH tunnel for production DB access

---

## [0.1.0-beta] – 2026-05-15

### 🎉 First Beta Release

#### Added

- **Core Exam Engine:**
  - ✅ Quản lý đề thi & phòng thi (90 phút chuẩn, phân tầng sections)
  - ✅ Câu hỏi trắc nghiệm + Điền từ (flexible JSONB options)
  - ✅ Hỗ trợ công thức toán với KaTeX render
  - ✅ Timer đếm ngược (pause/resume/auto-submit)
  - ✅ Auto-scoring & instant feedback

- **User Authentication & Authorization:**
  - ✅ Đăng ký (Register) & Đăng nhập (Login)
  - ✅ JWT token-based authentication
  - ✅ Bcrypt password hashing (12 rounds)
  - ✅ RBAC: Student, Teacher, Admin roles

- **Dashboard & Analytics:**
  - ✅ Lịch sử thi (Exam attempt history)
  - ✅ Biểu đồ tiến bộ (Progress visualization)
  - ✅ Phân tích kết quả (Score breakdown, wrong answers)
  - ✅ Xem lại bài thi (Review & detailed feedback)

- **Auto-save Mechanism:**
  - ✅ Auto-save mỗi 5-10 giây (JSONB state)
  - ✅ LocalStorage fallback nếu network error
  - ✅ Resume from crash (restore exam state)

- **Frontend (Next.js 16):**
  - ✅ Responsive UI (Desktop + Tablet)
  - ✅ Dark mode support (TailwindCSS)
  - ✅ WCAG 2.1 Accessibility
  - ✅ Loading states & Error boundaries

- **Backend (Go 1.26 + GORM):**
  - ✅ RESTful API (v1 endpoints)
  - ✅ Swagger/OpenAPI documentation (auto-generated)
  - ✅ GORM ORM for database
  - ✅ Middleware (Auth, CORS, Logging)

- **Database (PostgreSQL 17 on Neon):**
  - ✅ Cloud Serverless (no local DB)
  - ✅ UUID Primary Keys (security, no sequential IDs)
  - ✅ JSONB columns (flexible questions & state)
  - ✅ Schema: users, exams, exam_sections, questions, exam_attempts, attempt_details, exam_rooms

- **DevOps:**
  - ✅ Docker & Docker Compose
  - ✅ Frontend + Backend containerization
  - ✅ Hot reload development environment
  - ✅ Environment variables management (.env)

- **Documentation:**
  - ✅ README.md (Project overview & setup)
  - ✅ CONTRIBUTING.md (Git workflow & standards)
  - ✅ docs/architecture.md (System design & DB schema)
  - ✅ CHANGELOG.md (Version history)

#### Changed

- N/A (First release)

#### Fixed

- N/A (First release)

#### Security

- ✅ JWT secret in environment variables
- ✅ Bcrypt password hashing (12 rounds)
- ✅ CORS configured (localhost:3000 for dev)
- ✅ SQL injection prevention (parameterized GORM)
- ✅ XSS protection (Next.js defaults)
- ✅ Connection String in .env (never committed)

#### Known Issues

- ⚠️ Timer doesn't pause when tab unfocused (v0.2.0)
- ⚠️ Mobile UI responsive WIP (tablet OK)
- ⚠️ Load testing (1000+ concurrent) not performed
- ⚠️ pgAdmin Web UI NOT supported (use DBeaver/DataGrip)

#### Changed

- N/A (First release)

#### Fixed

- N/A (First release)

#### Deprecated

- N/A (First release)

#### Removed

- N/A (First release)

#### Security

- JWT secret management via environment variables
- Password hashing (bcrypt with salt rounds = 10)
- CORS configured (tạm thời allow localhost:3000)
- SQL injection prevention (parameterized queries)

#### Known Issues

- ⚠️ Timer không pause khi tab không focus (sẽ fix v0.2.0)
- ⚠️ Mobile UI cần cải thiện (Responsive chưa hoàn hảo)
- ⚠️ Performance test với 1000+ đồng thời users chưa thực hiện

---

## [0.0.1-alpha] – 2025-03-15

### 📋 Alpha Release (Internal Testing Only)

#### Added

- **Minimal Exam Flow:**
  - Basic exam creation
  - Question display (plain text, no KaTeX)
  - Answer submission
  - Score calculation

- **Authentication (Basic):**
  - Simple login/register
  - No JWT (Session-based)

- **Database Schema:**
  - Basic tables (users, exams, questions, results)
  - No indexes

- **Frontend (Prototype):**
  - HTML + CSS (Bootstrap)
  - No TypeScript
  - No TailwindCSS

- **DevOps:**
  - Docker setup (basic)
  - Manual database initialization

#### Known Limitations

- ❌ Không có auto-save (mất bài khi F5)
- ❌ Không hỗ trợ công thức toán
- ❌ Không có dashboard
- ❌ Performance chưa tối ưu
- ❌ Tài liệu chưa đầy đủ

#### Next Steps

- Upgrade to Next.js + React
- Add JWT authentication
- Implement KaTeX support
- Add auto-save mechanism
- Create comprehensive docs

---

## Hướng dẫn sử dụng file Changelog

### Khi nào cập nhật?

✅ **UPDATE changelog khi:**

- Có feature mới released
- Có bug sửa được release
- Có breaking changes
- Major version bumps

❌ **KHÔNG UPDATE khi:**

- Cập nhật bên trong `[Unreleased]` section (cập nhật khi merge PR)
- Mỗi lần push code (chỉ cập nhật khi release version)

### Quy tắc format

1. **Version Format:** `[MAJOR.MINOR.PATCH]` hoặc `[MAJOR.MINOR.PATCH-prerelease]`
   - `0.1.0` (Stable)
   - `0.1.0-beta` (Beta)
   - `0.1.0-alpha` (Alpha)

2. **Date Format:** `YYYY-MM-DD`

3. **Section Order:** Added → Changed → Deprecated → Removed → Fixed → Security

4. **Emoji Usage:**
   - 🎉 Release, milestone
   - ✨ New feature
   - 🐛 Bug fix
   - ⚠️ Breaking change
   - 🔒 Security fix
   - 📚 Documentation
   - 🔄 Changed/Refactor

### Ví dụ cập nhật Unreleased:

```markdown
## [Unreleased]

### Added

- WebSocket support cho real-time notifications

### Fixed

- Timer bug khi exam pause
```

Khi release version 0.2.0, ta sẽ:

```markdown
## [0.2.0-beta] – 2025-06-30

### Added

- WebSocket support cho real-time notifications

### Fixed

- Timer bug khi exam pause
```

---

## Links & References

- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Releases](https://github.com/your-username/exam-arena-system/releases)

---

**Last Updated:** March 18, 2026  
**Maintained by:** Quân (Team Leader)  
**Next Review:** June 1, 2026 (v0.2.0-beta release)
