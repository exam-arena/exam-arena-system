-- =========================================================================
-- 0. HÀM HỖ TRỢ (TRIGGER FUNCTION TỰ ĐỘNG CẬP NHẬT updated_at)
-- =========================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 1. BẢNG MASTER (DỮ LIỆU CỐT LÕI)
-- =========================================================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    avatar_url TEXT,
    gender VARCHAR(20),
    date_of_birth DATE,
    phone VARCHAR(20),
    province_code VARCHAR(20),
    province_name VARCHAR(100),
    ward_code VARCHAR(20),
    ward_name VARCHAR(100),
    address_detail VARCHAR(255),
    role VARCHAR(20) DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL -- Phục vụ Soft Delete
);

CREATE TABLE exam_room (
    room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    price DECIMAL(10, 2) DEFAULT 0.0,
    test_quantity INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- =========================================================================
-- 2. BẢNG QUẢN LÝ QUYỀN VÀ GIAO DỊCH
-- =========================================================================

CREATE TABLE user_room_access (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    room_id UUID REFERENCES exam_room(room_id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, room_id)
);

CREATE TABLE payment (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    room_id UUID REFERENCES exam_room(room_id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 3. BẢNG CẤU TRÚC ĐỀ THI
-- =========================================================================

CREATE TABLE exam (
    exam_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES exam_room(room_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    type VARCHAR(50),
    capacity INT,
    duration INT NOT NULL, 
    start_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE exam_section (
    section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exam(exam_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    duration INT 
);

CREATE TABLE question (
    question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES exam_section(section_id) ON DELETE CASCADE,
    parent_id UUID REFERENCES question(question_id) ON DELETE CASCADE, 
    content TEXT NOT NULL,
    image_url VARCHAR(255), -- Đã bổ sung theo ERD
    options JSONB, 
    correct_answer TEXT,
    explanation TEXT,
    point DECIMAL(5, 2) DEFAULT 0.0,
    type VARCHAR(50),
    question_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- =========================================================================
-- 4. BẢNG TRACKING QUÁ TRÌNH THI (LỊCH SỬ)
-- =========================================================================

CREATE TABLE exam_attempt (
    attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE RESTRICT, -- Thay đổi thành RESTRICT để bảo vệ dữ liệu thi
    exam_id UUID REFERENCES exam(exam_id) ON DELETE RESTRICT,  -- Thay đổi thành RESTRICT
    attempt_type VARCHAR(50),
    marks DECIMAL(5, 2) DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    end_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attempt_section_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES exam_attempt(attempt_id) ON DELETE CASCADE,
    section_id UUID REFERENCES exam_section(section_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    end_at TIMESTAMPTZ
);

CREATE TABLE attempt_detail (
    detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES attempt_section_log(log_id) ON DELETE CASCADE,
    question_id UUID REFERENCES question(question_id) ON DELETE RESTRICT, -- Ngăn việc xóa câu hỏi làm hỏng chi tiết bài làm cũ
    selected_ans TEXT,
    is_correct BOOLEAN
);

-- =========================================================================
-- 5. ÁP DỤNG TRIGGERS
-- =========================================================================
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_exam_room_modtime BEFORE UPDATE ON exam_room FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_payment_modtime BEFORE UPDATE ON payment FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_exam_modtime BEFORE UPDATE ON exam FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_question_modtime BEFORE UPDATE ON question FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_exam_attempt_modtime BEFORE UPDATE ON exam_attempt FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =========================================================================
-- 6. TẠO INDEXES (TỐI ƯU HIỆU SUẤT TRUY VẤN)
-- =========================================================================

CREATE INDEX idx_user_room_access_user ON user_room_access(user_id);
CREATE INDEX idx_payment_user ON payment(user_id);
CREATE INDEX idx_exam_room ON exam(room_id);
CREATE INDEX idx_question_section ON question(section_id);
CREATE INDEX idx_question_parent ON question(parent_id);
CREATE INDEX idx_exam_attempt_user_exam ON exam_attempt(user_id, exam_id);
CREATE INDEX idx_attempt_detail_log ON attempt_detail(log_id);

-- Tối ưu truy vấn JSONB cho các options câu hỏi
CREATE INDEX idx_question_options ON question USING GIN (options);


-- 1. Tăng tốc lấy section theo exam
CREATE INDEX IF NOT EXISTS idx_exam_section_exam_id
ON exam_section(exam_id);

-- 2. Tăng tốc log section theo attempt
CREATE INDEX IF NOT EXISTS idx_attempt_section_log_attempt_id
ON attempt_section_log(attempt_id);

-- 3. Nếu hay query section cụ thể trong 1 attempt
CREATE INDEX IF NOT EXISTS idx_attempt_section_log_attempt_section
ON attempt_section_log(attempt_id, section_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_attempt_section_log_attempt_section
ON attempt_section_log(attempt_id, section_id);

-- 4. Tăng tốc lookup answer theo question
CREATE INDEX IF NOT EXISTS idx_attempt_detail_question_id
ON attempt_detail(question_id);

-- 5. Chặn 1 câu bị lưu nhiều dòng trong cùng 1 log
CREATE UNIQUE INDEX IF NOT EXISTS uq_attempt_detail_log_question
ON attempt_detail(log_id, question_id);

-- 6. Chặn 1 user có nhiều bài đang làm cho cùng 1 exam
CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_attempt_user_exam_in_progress
ON exam_attempt(user_id, exam_id)
WHERE status = 'in_progress';

-- 7. Tăng tốc query bài đang làm / lịch sử gần nhất
CREATE INDEX IF NOT EXISTS idx_exam_attempt_status_started_at
ON exam_attempt(status, started_at DESC);

-- 8. Tăng tốc query attempt theo exam
CREATE INDEX IF NOT EXISTS idx_exam_attempt_exam_id
ON exam_attempt(exam_id);

-- 9. Tăng tốc đếm người đã luyện tập theo đề
CREATE INDEX IF NOT EXISTS idx_exam_attempt_exam_user
ON exam_attempt(exam_id, user_id);

