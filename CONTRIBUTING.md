# 🤝 CONTRIBUTING.md – Quy trình Phát triển ExamArena

> **Tài liệu này định nghĩa các luật làm việc bắt buộc cho tất cả thành viên trong team phát triển ExamArena.**  
> Tuân thủ chặt chẽ quy trình dưới đây để đảm bảo chất lượng code, tính nhất quán và tránh xung đột merge.

---

## 📋 Mục đích

Tài liệu này cung cấp hướng dẫn chi tiết về:

- ✅ Cách tạo nhánh và quản lý phiên bản code
- ✅ Quy tắc viết commit message
- ✅ Quy trình Pull Request (PR) và review code
- ✅ Các lệnh Git cần thiết cho team

---

## 🌳 1. Branching Strategy (Quy trình Quản lý Nhánh)

### 1.1 Cấu trúc nhánh

ExamArena sử dụng mô hình **Git Flow** đơn giản:

```
main (production)
  ↑
  └── develop (integration/staging)
        ↑
        ├── feature/login
        ├── feature/exam-engine
        ├── bugfix/timer-issue
        └── ... (các nhánh task khác)
```

### 1.2 Các nhánh chính

| Nhánh     | Mục đích                | Ai merge                | Quy tắc                                                                       |
| :-------- | :---------------------- | :---------------------- | :---------------------------------------------------------------------------- |
| `main`    | **Production Release**  | Team Leader             | **TUYỆT ĐỐI KHÔNG** push trực tiếp. Chỉ merge từ `develop` khi ready release. |
| `develop` | **Integration/Staging** | Mọi thành viên (via PR) | Code tại đây phải **pass test** trước khi merge lên `main`.                   |

### 1.3 Nhánh task (Feature/Bugfix)

**✅ Quy tắc bắt buộc:**

1. **Luôn tạo từ `develop`** – Không tạo từ `main`
2. **Đặt tên theo cấu trúc:**
   - Feature: `feature/[tên-tính-năng]` (VD: `feature/exam-login`, `feature/dashboard`)
   - Bugfix: `bugfix/[tên-bug]` (VD: `bugfix/timer-not-saving`, `bugfix/latex-render`)
   - Cải thiện: `improve/[tên-cải-thiện]` (VD: `improve/auth-performance`)

3. **Tên nhánh phải:**
   - Dùng tiếng Anh, chữ thường, dấu gạch ngang (không dùng dấu cách)
   - Ngắn gọn, mô tả rõ ràng

---

## 💻 Workflow Git Chi Tiết

### Bước 1: Cập nhật `develop` mới nhất

```bash
# Chuyển về nhánh develop
git checkout develop

# Cập nhật từ remote
git pull origin develop
```

### Bước 2: Tạo nhánh task mới

```bash
# Tạo nhánh feature từ develop
git checkout -b feature/my-feature develop

# Hoặc tạo bugfix
git checkout -b bugfix/my-bugfix develop
```

### Bước 3: Code & Commit

**Thực hiện công việc của bạn** (sửa file, thêm tính năng, fix bug)

### Bước 4: Commit Code

```bash
# Kiểm tra file thay đổi
git status

# Stage file
git add .

# Commit với message chuẩn (xem mục 2 bên dưới)
git commit -m "feat: add exam timer functionality"
```

### Bước 5: Push lên Remote

```bash
# Push nhánh của bạn lên origin
git push origin feature/my-feature
```

### Bước 6: Tạo Pull Request

Sau khi push, vào **GitHub** → chọn nhánh → click **"Compare & pull request"**
(Chi tiết ở mục 3)

---

## 💻 Workflow hằng ngày khi code

### Bước 1: Cập nhật `develop` mới nhất về local

```bash
# Chuyển về nhánh develop
git checkout develop

# Cập nhật từ remote
git pull origin develop
```

### Bước 2: Đồng bộ ngược (BẮT BUỘC TRƯỚC KHI TẠO PR)

```bash
# quay trở lại nhánh của mình
git checkout feature/my-feature 

# Rebase để đồng bộ với code ở develop
git rebase develop
```

### Bước 3: Sau đó code, commit và push lên nhánh của mình như Git flow bình thường

### Bước 4: Tạo Pull Request

Sau khi push, vào **GitHub** → chọn nhánh → click **"Compare & pull request"**
(Chi tiết ở mục 3)

---

## 📝 2. Commit Convention (Quy tắc Viết Commit Message)

ExamArena áp dụng tiêu chuẩn **Conventional Commits** – có cấu trúc, dễ đọc, thuận tiện cho automation.

### 2.1 Format commit message

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2.2 Giải thích chi tiết

| Phần        | Giải thích                   | Ví dụ                                                               |
| :---------- | :--------------------------- | :------------------------------------------------------------------ |
| **type**    | Loại thay đổi                | `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore` |
| **scope**   | Module/thành phần (tùy chọn) | `auth`, `exam`, `timer`, `ui`, `db`                                 |
| **subject** | Mô tả ngắn (<50 ký tự)       | `add JWT token validation`                                          |
| **body**    | Chi tiết (tùy chọn)          | Giải thích _tại sao_ thay đổi, không phải _cái gì_                  |
| **footer**  | Closes issue (tùy chọn)      | `Closes #123` (link issue)                                          |

### 2.3 Các loại commit (Type)

```
feat      - Tính năng mới
fix       - Sửa bug
docs      - Thay đổi documentation
style     - Formatting, semicolons, trailing space (không ảnh hưởng logic)
refactor  - Sắp xếp code, không thay đổi behavior
perf      - Cải thiện performance
test      - Thêm test case
chore     - Update dependencies, build config
ci        - Thay đổi CI/CD config
```

### 2.4 Ví dụ commit message

**❌ SAI:**

```
fixed stuff
updated code
feature123
```

**✅ ĐÚNG:**

```
feat(auth): add JWT token validation for login

- Validate token expiry before allowing access
- Add refreshToken mechanism
- Update error handling for invalid tokens

Closes #45
```

```
fix(timer): resolve countdown not pausing correctly

Timer was not pausing when exam paused button clicked due to
missing event listener. Added proper pause/resume handlers.

Closes #67
```

```
docs: update README with Docker setup instructions

Added section for Docker Compose setup and troubleshooting tips.
```

---

## 🔄 3. Pull Request (PR) Process

### 3.1 Trước khi tạo PR: Checklist bắt buộc

**Bạn PHẢI tự kiểm tra những điểm này:**

- [ ] Code đã được test **tại local** (không có lỗi runtime)
- [ ] Tuân thủ **Commit Convention** ở mục 2
- [ ] Không có **console.log**, **debugging code** còn sót
- [ ] **Code style** nhất quán với team (formatter chạy ok)
- [ ] **Rebase/pull develop** gần nhất để tránh conflict
- [ ] **Dependencies** được cài đặt đúng (nếu có thay đổi `package.json` hoặc `go.mod`)
- [ ] **Tổng số commit** hợp lý (không quá 1 commit, không quá 20 commit)

### 3.2 Tạo Pull Request

**Bước 1: Push code lên nhánh của bạn**

```bash
# Đảm bảo nhánh phát triển của bạn là up-to-date với develop
git fetch origin
git rebase origin/develop

# Push (nếu rebase, dùng force push)
git push origin feature/my-feature -f
```

**Bước 2: Tạo PR trên GitHub**

1. Vào repo → chọn tab **"Pull requests"**
2. Click **"New pull request"** (hoặc nút tự động hiện sau push)
3. Chọn:
   - **Base:** `develop` (không phải `main` !)
   - **Compare:** `feature/my-feature`

**Bước 3: Điền PR Title & Description**

**Title Format:**

```
[TYPE] Short description (50 characters max)

VD:
[FEATURE] Add exam countdown timer
[BUGFIX] Fix localStorage not saving answers
[DOCS] Update installation guide
```

**Description Template:**

```markdown
## 📋 Mô tả (Description)

Tóm tắt ngắn gọn công việc của bạn.

## 🎯 Liên quan đến Issue

Closes #123 (nếu có)

## 🧪 Cách test

Step-by-step để review code có thể kiểm chứng:

1. Chạy `docker compose up --build`
2. Truy cập http://localhost:3000
3. Click "Start Exam" → kiểm tra timer hoạt động

## 📷 Screenshots (nếu cần)

Attach ảnh UI thay đổi

## ✅ Checklist (Copy từ mục 3.1)

- [x] Code tested locally
- [x] Follow commit convention
- [x] No debugging code left
- [x] Rebased with latest develop
```

### 3.3 Code Review & Approval

**✅ Quy tắc bắt buộc:**

1. **Tối thiểu 1 reviewer** từ team khác (không reviewer chính mình)
   - Backend make PR → Frontend/QA review
   - Frontend make PR → Backend/QA review

2. **Reviewer có trách vụ:**
   - ✓ Kiểm tra logic & tính đúng đắn
   - ✓ Kiểm tra performance & bảo mật
   - ✓ Kiểm tra code style, naming convention
   - ✓ Kiểm tra test coverage

3. **Sau khi approved:** PR author merge vào `develop`

### 3.4 Merge & Cleanup

```bash
# Sau khi PR approved, merge vào develop
# (Có thể làm trên GitHub UI hoặc CLI)

# CLI:
git checkout develop
git pull origin develop
git merge feature/my-feature
git push origin develop

# Xóa nhánh feature (cleanup)
git branch -d feature/my-feature
git push origin --delete feature/my-feature
```

---

## 🔒 4. Quy tắc Bảo vệ Nhánh (Branch Protection)

**Đã thiết lập trên GitHub:**

✅ **Nhánh `main`:**

- ❌ Cấm push trực tiếp
- ✅ Yêu cầu 2 approval trước khi merge
- ✅ Yêu cầu test CI/CD pass

✅ **Nhánh `develop`:**

- ❌ Cấm push trực tiếp
- ✅ Yêu cầu 1 approval trước khi merge
- ✅ Yêu cầu test CI/CD pass

---

## 🚨 5. Các Lỗi Thường Gặp & Cách Khắc Phục

### ❌ Lỗi: "Rejected – push to main"

```
error: failed to push some refs to 'origin'
```

**Nguyên nhân:** Bạn đang cố push trực tiếp lên `main`

**Cách khắc phục:**

```bash
# Kiểm tra nhánh hiện tại
git branch

# Nếu ở main, chuyển sang develop
git checkout develop
git pull origin develop

# Tạo nhánh feature mới
git checkout -b feature/your-feature

# Push nhánh feature
git push origin feature/your-feature
```

### ❌ Lỗi: "Your branch has diverged"

```
Your branch and 'origin/develop' have diverged
```

**Nguyên nhân:** Nhánh local của bạn out-of-date

**Cách khắc phục:**

```bash
# Rebase với latest develop
git fetch origin
git rebase origin/develop

# Nếu có conflict, resolve sau đó
git add .
git rebase --continue

# Force push (cẩn thận!)
git push origin feature/your-feature -f
```

### ❌ Lỗi: "PR has merge conflicts"

**Cách khắc phục:**

```bash
# Cập nhật develop
git checkout develop
git pull origin develop

# Checkout về nhánh feature
git checkout feature/your-feature

# Rebase develop vào feature
git rebase develop

# Resolve conflicts trong VS Code
# Sau đó save file, stage & continue
git add .
git rebase --continue

# Push lại
git push origin feature/your-feature -f
```

---

## 📞 6. Hỗ trợ & Liên hệ

- **Thắc mắc về quy trình?** → Hỏi Team Leader (Quân)
- **Cần help debug?** → Hỏi các developer khác hoặc tag trong Slack
- **Phát hiện issue với quy trình?** → Tạo issue hoặc discuss trong team meeting

---

## 📚 7. Tài liệu Tham Khảo

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow Cheatsheet](https://danielkummer.github.io/git-flow-cheatsheet/)
- [GitHub Pull Request Guide](https://docs.github.com/en/pull-requests)

---

> **Last Updated:** March 2026  
> **Version:** 1.0  
> © ExamArena Development Team
