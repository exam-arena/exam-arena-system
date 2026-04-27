-- =========================================================================
-- Seed data for Load Test - 800 students
-- Password for all users: "Password@123"
-- Import: psql "$DATABASE_URL" -f scripts/seed_load_test_users.sql
-- =========================================================================

BEGIN;

-- Clean up existing exam attempts for load test users
-- to avoid single-attempt policy blocking
DELETE FROM exam_attempt 
WHERE user_id IN (
    SELECT user_id FROM users 
    WHERE username LIKE 'load_student_%'
)
AND exam_id = '30000000-0000-0000-0000-000000010101';

-- Generate 800 load test users with room access
DO $$
DECLARE
    i INTEGER;
    v_user_id UUID;
    v_username TEXT;
    v_fullname TEXT;
    v_email TEXT;
    v_password_hash TEXT := '$2a$12$1eBJf8xpu4l9SxYM1zAc0Ov/t7fTcCWkilq6WkmCzEO6Hnjtp/N6i';
    v_room_id UUID := '20000000-0000-0000-0000-000000010101';
    v_admin_id UUID := '10000000-0000-0000-0000-000000010101';
BEGIN
    FOR i IN 1..800 LOOP
        v_username := 'load_student_' || LPAD(i::TEXT, 4, '0');
        v_fullname := 'Load Test Student ' || LPAD(i::TEXT, 4, '0');
        v_email := v_username || '@loadtest.local';
        
        -- Generate a deterministic UUID based on username
        -- This makes the script re-runnable without changing UUIDs
        v_user_id := md5(v_username)::UUID;
        
        -- Insert or update user (re-runnable)
        INSERT INTO users (user_id, username, password, fullname, email, role, deleted_at)
        VALUES (v_user_id, v_username, v_password_hash, v_fullname, v_email, 'student', NULL)
        ON CONFLICT (username) DO UPDATE
        SET password = EXCLUDED.password,
            fullname = EXCLUDED.fullname,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            deleted_at = NULL;
            
        -- Insert or update room access (180 days validity)
        INSERT INTO user_room_access (
            user_id, room_id, granted_at, expired_at, 
            source_type, source_ref_id, granted_by_user_id, 
            status, note
        )
        VALUES (
            v_user_id, v_room_id, 
            NOW(), NOW() + INTERVAL '180 days',
            'load_test', NULL, v_admin_id,
            'active', 'Load test access'
        )
        ON CONFLICT (user_id, room_id) DO UPDATE
        SET granted_at = EXCLUDED.granted_at,
            expired_at = EXCLUDED.expired_at,
            source_type = EXCLUDED.source_type,
            granted_by_user_id = EXCLUDED.granted_by_user_id,
            status = EXCLUDED.status,
            note = EXCLUDED.note,
            updated_at = CURRENT_TIMESTAMP;
    END LOOP;
END $$;

COMMIT;