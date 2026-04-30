-- =========================================================================
-- 0. PostgreSQL / Neon bootstrap
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 1. Master data
-- =========================================================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    avatar_provider VARCHAR(50),
    avatar_key VARCHAR(255),
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
    deleted_at TIMESTAMPTZ DEFAULT NULL
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
-- 2. Access and payments
-- =========================================================================

CREATE TABLE user_room_access (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    room_id UUID REFERENCES exam_room(room_id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMPTZ,
    source_type VARCHAR(50) NOT NULL DEFAULT 'system',
    source_ref_id UUID,
    granted_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    note VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
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

CREATE TABLE room_activity_stats (
    room_id UUID PRIMARY KEY REFERENCES exam_room(room_id) ON DELETE CASCADE,
    attempt_count BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 3. Exam structure
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
    image_url VARCHAR(255),
    options JSONB,
    correct_answer TEXT,
    point DECIMAL(5, 2) DEFAULT 0.0,
    type VARCHAR(50),
    question_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Explanation is separated from question because a solution can be composed
-- from multiple ordered text/image blocks. For Part II, each a/b/c/d item is a
-- child question whose correct_answer remains True/False; attach explanations
-- to the child rows when each item needs its own solution.
CREATE TABLE question_explanation (
    explanation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES question(question_id) ON DELETE CASCADE,
    display_order INT NOT NULL DEFAULT 1,
    block_type VARCHAR(20) NOT NULL,
    content_text TEXT,
    image_url VARCHAR(255),
    alt_text VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT chk_question_explanation_block_type CHECK (
        block_type IN ('text', 'image')
    ),
    CONSTRAINT chk_question_explanation_has_content CHECK (
        (block_type = 'text' AND content_text IS NOT NULL)
        OR (block_type = 'image' AND image_url IS NOT NULL)
    )
);

-- =========================================================================
-- 4. Attempt tracking
-- =========================================================================

CREATE TABLE exam_attempt (
    attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE RESTRICT,
    exam_id UUID REFERENCES exam(exam_id) ON DELETE RESTRICT,
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
    question_id UUID REFERENCES question(question_id) ON DELETE RESTRICT,
    selected_ans TEXT,
    is_correct BOOLEAN
);

-- =========================================================================
-- 5. Triggers
-- =========================================================================

CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_exam_room_modtime
BEFORE UPDATE ON exam_room
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_user_room_access_modtime
BEFORE UPDATE ON user_room_access
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_payment_modtime
BEFORE UPDATE ON payment
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_exam_modtime
BEFORE UPDATE ON exam
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_question_modtime
BEFORE UPDATE ON question
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_question_explanation_modtime
BEFORE UPDATE ON question_explanation
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_exam_attempt_modtime
BEFORE UPDATE ON exam_attempt
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =========================================================================
-- 6. Indexes
-- =========================================================================

CREATE INDEX idx_user_room_access_user
ON user_room_access(user_id);

CREATE INDEX idx_user_room_access_user_status_expiry
ON user_room_access(user_id, status, expired_at);

CREATE INDEX idx_user_room_access_room_status
ON user_room_access(room_id, status);

CREATE INDEX idx_user_room_access_source
ON user_room_access(source_type, source_ref_id);

CREATE INDEX idx_payment_user
ON payment(user_id);

CREATE INDEX idx_room_activity_stats_attempt_count
ON room_activity_stats(attempt_count DESC, updated_at DESC);

CREATE INDEX idx_exam_room
ON exam(room_id);

CREATE INDEX idx_exam_section_exam_id
ON exam_section(exam_id);

CREATE INDEX idx_question_section
ON question(section_id);

CREATE INDEX idx_question_parent
ON question(parent_id);

CREATE INDEX idx_question_options
ON question USING GIN (options);

CREATE INDEX idx_question_explanation_question_order
ON question_explanation(question_id, display_order);

CREATE INDEX idx_exam_attempt_user_exam
ON exam_attempt(user_id, exam_id);

CREATE UNIQUE INDEX uq_exam_attempt_user_exam_in_progress
ON exam_attempt(user_id, exam_id)
WHERE status = 'in_progress';

CREATE INDEX idx_exam_attempt_status_started_at
ON exam_attempt(status, started_at DESC);

CREATE INDEX idx_exam_attempt_exam_id
ON exam_attempt(exam_id);

CREATE INDEX idx_exam_attempt_exam_user
ON exam_attempt(exam_id, user_id);

CREATE UNIQUE INDEX uq_attempt_section_log_attempt_section
ON attempt_section_log(attempt_id, section_id);

CREATE INDEX idx_attempt_detail_question_id
ON attempt_detail(question_id);

CREATE UNIQUE INDEX uq_attempt_detail_log_question
ON attempt_detail(log_id, question_id);
