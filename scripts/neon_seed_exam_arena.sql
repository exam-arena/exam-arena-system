-- Dữ liệu seed cho ExamArena trên Neon PostgreSQL
-- Cách import:
--   psql "$DATABASE_URL" -f scripts/neon_seed_exam_arena.sql
--
-- Ghi chú:
-- - Giả định schema trong init.sql đã được tạo trước.
-- - Dùng UUID cố định để import lặp lại an toàn.
-- - Mật khẩu cho toàn bộ user seed: Password@123
-- - Nội dung toán học dùng cú pháp KaTeX với $...$ hoặc $$...$$.
-- - Trong options JSONB, dấu \ được escape thành \\ theo chuẩn JSON.

BEGIN;

-- Dọn các seed cũ không còn thuộc phạm vi beta hiện tại.
DELETE FROM attempt_detail
WHERE question_id IN (
    '40000000-0000-0000-0000-000000000101',
    '40000000-0000-0000-0000-000000000102',
    '40000000-0000-0000-0000-000000000103',
    '40000000-0000-0000-0000-000000000104',
    '40000000-0000-0000-0000-000000000105',
    '40000000-0000-0000-0000-000000000106',
    '40000000-0000-0000-0000-000000000107',
    '40000000-0000-0000-0000-000000000108',
    '40000000-0000-0000-0000-000000000201',
    '40000000-0000-0000-0000-000000000202',
    '40000000-0000-0000-0000-000000000203',
    '40000000-0000-0000-0000-000000000204',
    '40000000-0000-0000-0000-000000000205',
    '40000000-0000-0000-0000-000000000206',
    '40000000-0000-0000-0000-000000000301',
    '40000000-0000-0000-0000-000000000302'
);

DELETE FROM question
WHERE question_id IN (
    '40000000-0000-0000-0000-000000000101',
    '40000000-0000-0000-0000-000000000102',
    '40000000-0000-0000-0000-000000000103',
    '40000000-0000-0000-0000-000000000104',
    '40000000-0000-0000-0000-000000000105',
    '40000000-0000-0000-0000-000000000106',
    '40000000-0000-0000-0000-000000000107',
    '40000000-0000-0000-0000-000000000108',
    '40000000-0000-0000-0000-000000000201',
    '40000000-0000-0000-0000-000000000202',
    '40000000-0000-0000-0000-000000000203',
    '40000000-0000-0000-0000-000000000204',
    '40000000-0000-0000-0000-000000000205',
    '40000000-0000-0000-0000-000000000206',
    '40000000-0000-0000-0000-000000000301',
    '40000000-0000-0000-0000-000000000302'
);

DELETE FROM attempt_section_log
WHERE section_id IN (
       '31000000-0000-0000-0000-000000000021',
       '31000000-0000-0000-0000-000000000031',
       '31000000-0000-0000-0000-000000000041'
   )
   OR attempt_id IN (
       '50000000-0000-0000-0000-000000000001',
       '50000000-0000-0000-0000-000000000002',
       '50000000-0000-0000-0000-000000009004'
   );

DELETE FROM exam_attempt
WHERE exam_id IN (
       '30000000-0000-0000-0000-000000000002',
       '30000000-0000-0000-0000-000000000003',
       '30000000-0000-0000-0000-000000000004'
   )
   OR user_id IN (
       '10000000-0000-0000-0000-000000000002',
       '10000000-0000-0000-0000-000000000003'
   );

DELETE FROM exam_section
WHERE section_id IN (
    '31000000-0000-0000-0000-000000000021',
    '31000000-0000-0000-0000-000000000031',
    '31000000-0000-0000-0000-000000000041'
);

DELETE FROM payment
WHERE room_id IN (
       '20000000-0000-0000-0000-000000000002',
       '20000000-0000-0000-0000-000000000003'
   )
   OR user_id IN (
       '10000000-0000-0000-0000-000000000002',
       '10000000-0000-0000-0000-000000000003'
   );

DELETE FROM user_room_access
WHERE room_id IN (
       '20000000-0000-0000-0000-000000000002',
       '20000000-0000-0000-0000-000000000003'
   )
   OR user_id IN (
       '10000000-0000-0000-0000-000000000002',
       '10000000-0000-0000-0000-000000000003'
   );

DELETE FROM exam
WHERE exam_id IN (
    '30000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000004'
);

DELETE FROM exam_room
WHERE room_id IN (
    '20000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003'
);

DELETE FROM users
WHERE user_id IN (
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003'
);

INSERT INTO users (user_id, username, password, fullname, email, role)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'admin01',   '$2a$12$1eBJf8xpu4l9SxYM1zAc0Ov/t7fTcCWkilq6WkmCzEO6Hnjtp/N6i', 'ExamArena Admin', 'admin@examarena.local', 'admin'),
    ('10000000-0000-0000-0000-000000000101', 'student01', '$2a$12$1eBJf8xpu4l9SxYM1zAc0Ov/t7fTcCWkilq6WkmCzEO6Hnjtp/N6i', 'Lê Hoàng An', 'student1@examarena.local', 'student'),
    ('10000000-0000-0000-0000-000000000102', 'student02', '$2a$12$1eBJf8xpu4l9SxYM1zAc0Ov/t7fTcCWkilq6WkmCzEO6Hnjtp/N6i', 'Phạm Thu Hà', 'student2@examarena.local', 'student'),
    ('10000000-0000-0000-0000-000000000103', 'student03', '$2a$12$1eBJf8xpu4l9SxYM1zAc0Ov/t7fTcCWkilq6WkmCzEO6Hnjtp/N6i', 'Võ Gia Huy', 'student3@examarena.local', 'student'),
    ('10000000-0000-0000-0000-000000000104', 'student04', '$2a$12$1eBJf8xpu4l9SxYM1zAc0Ov/t7fTcCWkilq6WkmCzEO6Hnjtp/N6i', 'Bùi Khánh Linh', 'student4@examarena.local', 'student')
ON CONFLICT (user_id) DO UPDATE
SET
    username = EXCLUDED.username,
    password = EXCLUDED.password,
    fullname = EXCLUDED.fullname,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    deleted_at = NULL;

INSERT INTO exam_room (room_id, name, type, price, test_quantity, status)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'Toán 12 THPT 2026 Premium', 'premium_math', 199000, 1, 'active')
ON CONFLICT (room_id) DO UPDATE
SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    price = EXCLUDED.price,
    test_quantity = EXCLUDED.test_quantity,
    status = EXCLUDED.status,
    deleted_at = NULL;

INSERT INTO user_room_access (user_id, room_id, granted_at, expired_at)
VALUES
    ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '30 days', NULL),
    ('10000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '7 days', NOW() + INTERVAL '90 days'),
    ('10000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days', NOW() + INTERVAL '90 days'),
    ('10000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days', NOW() + INTERVAL '90 days'),
    ('10000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day', NOW() + INTERVAL '90 days')
ON CONFLICT (user_id, room_id) DO UPDATE
SET
    granted_at = EXCLUDED.granted_at,
    expired_at = EXCLUDED.expired_at;

INSERT INTO payment (transaction_id, user_id, room_id, amount, type, status, created_at)
VALUES
    ('21000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000001', 199000, 'room_purchase', 'completed', NOW() - INTERVAL '7 days'),
    ('21000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000001', 199000, 'room_purchase', 'completed', NOW() - INTERVAL '3 days'),
    ('21000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000001', 0, 'free_access', 'completed', NOW() - INTERVAL '15 days'),
    ('21000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000001', 0, 'free_access', 'completed', NOW() - INTERVAL '1 day')
ON CONFLICT (transaction_id) DO UPDATE
SET
    user_id = EXCLUDED.user_id,
    room_id = EXCLUDED.room_id,
    amount = EXCLUDED.amount,
    type = EXCLUDED.type,
    status = EXCLUDED.status;

INSERT INTO exam (exam_id, room_id, title, type, capacity, duration, start_time)
VALUES
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Đề thi thử THPT 2026 môn Toán - Cấu trúc chuẩn', 'practice', 500, 5400, NOW() + INTERVAL '7 days')
ON CONFLICT (exam_id) DO UPDATE
SET
    room_id = EXCLUDED.room_id,
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    capacity = EXCLUDED.capacity,
    duration = EXCLUDED.duration,
    start_time = EXCLUDED.start_time,
    deleted_at = NULL;

INSERT INTO exam_section (section_id, exam_id, title, duration)
VALUES
    ('31000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000001', 'Phần I - Trắc nghiệm nhiều lựa chọn', 1800),
    ('31000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000001', 'Phần II - Trắc nghiệm Đúng/Sai', 1800),
    ('31000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000001', 'Phần III - Trả lời ngắn', 1800)
ON CONFLICT (section_id) DO UPDATE
SET
    exam_id = EXCLUDED.exam_id,
    title = EXCLUDED.title,
    duration = EXCLUDED.duration;

INSERT INTO question (
    question_id, section_id, parent_id, content, image_url, options, correct_answer,
    explanation, point, type, question_type
)
VALUES
    ('40000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000011', NULL, 'Phần I. Cho hàm số $f(x) = e^x + 2x$. Khẳng định nào dưới đây đúng?', NULL, '[{"id":"A","text":"$\\\\int f(x)\\\\,dx = e^x + x^2 + C$"},{"id":"B","text":"$\\\\int f(x)\\\\,dx = e^x + 2x^2 + C$"},{"id":"C","text":"$\\\\int f(x)\\\\,dx = e^x - x^2 + C$"},{"id":"D","text":"$\\\\int f(x)\\\\,dx = e^x + C$"}]'::jsonb, 'A', 'Ta có $\\int e^x\\,dx = e^x$ và $\\int 2x\\,dx = x^2$, do đó đáp án đúng là A.', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000011', NULL, 'Phần I. Cho khối chóp $S.ABCD$ có đáy là hình vuông cạnh $a$, $SA$ vuông góc với đáy và $SA = a\\sqrt{2}$. Thể tích khối chóp bằng:', 'https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767290691/Gemini_Generated_Image_qa9n92qa9n92qa9n_hvuawy.png', '[{"id":"A","text":"$\\\\dfrac{\\\\sqrt{2}a^3}{3}$"},{"id":"B","text":"$\\\\dfrac{\\\\sqrt{2}a^3}{6}$"},{"id":"C","text":"$\\\\sqrt{2}a^3$"},{"id":"D","text":"$\\\\dfrac{a^3}{3}$"}]'::jsonb, 'A', 'Thể tích khối chóp là $V = \\dfrac{1}{3}S_{\\text{đáy}}h = \\dfrac{1}{3}\\cdot a^2 \\cdot a\\sqrt{2} = \\dfrac{\\sqrt{2}a^3}{3}$.', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000011', NULL, 'Phần I. Đạo hàm của hàm số $y = \\ln(x^2 + 1)$ tại $x = 1$ bằng:', NULL, '[{"id":"A","text":"$1$"},{"id":"B","text":"$2$"},{"id":"C","text":"$\\\\dfrac{1}{2}$"},{"id":"D","text":"$0$"}]'::jsonb, 'A', 'Ta có $y'' = \\dfrac{2x}{x^2 + 1}$, thay $x = 1$ được $1$.', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000000004', '31000000-0000-0000-0000-000000000011', NULL, 'Phần I. Cấp số nhân có $u_1 = 3$, công bội $q = 2$. Giá trị $u_4$ bằng:', NULL, '[{"id":"A","text":"$12$"},{"id":"B","text":"$18$"},{"id":"C","text":"$24$"},{"id":"D","text":"$48$"}]'::jsonb, 'C', 'Ta có $u_4 = u_1q^3 = 3\\cdot 2^3 = 24$.', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000000005', '31000000-0000-0000-0000-000000000011', NULL, 'Phần I. Trong mặt phẳng tọa độ $Oxy$, véc-tơ pháp tuyến của đường thẳng $2x - y + 3 = 0$ là:', NULL, '[{"id":"A","text":"$(2;-1)$"},{"id":"B","text":"$(1;2)$"},{"id":"C","text":"$(-2;1)$"},{"id":"D","text":"$(2;1)$"}]'::jsonb, 'A', 'Đường thẳng $ax + by + c = 0$ có một véc-tơ pháp tuyến là $(a;b)$.', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000000006', '31000000-0000-0000-0000-000000000011', NULL, 'Phần I. Số phức $z = 3 - 4i$ có mô-đun bằng:', NULL, '[{"id":"A","text":"$7$"},{"id":"B","text":"$5$"},{"id":"C","text":"$1$"},{"id":"D","text":"$25$"}]'::jsonb, 'B', 'Ta có $|z| = \\sqrt{3^2 + (-4)^2} = 5$.', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000000007', '31000000-0000-0000-0000-000000000011', NULL, 'Phần I. Nghiệm của phương trình $\\log_2(x - 1) = 3$ là:', NULL, '[{"id":"A","text":"$7$"},{"id":"B","text":"$8$"},{"id":"C","text":"$9$"},{"id":"D","text":"$4$"}]'::jsonb, 'C', 'Ta có $x - 1 = 2^3 = 8$, suy ra $x = 9$.', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000000008', '31000000-0000-0000-0000-000000000011', NULL, 'Phần I. Một hộp có $5$ bóng đỏ và $3$ bóng xanh. Chọn ngẫu nhiên $1$ bóng. Xác suất chọn được bóng đỏ bằng:', NULL, '[{"id":"A","text":"$\\\\dfrac{3}{8}$"},{"id":"B","text":"$\\\\dfrac{5}{8}$"},{"id":"C","text":"$\\\\dfrac{1}{5}$"},{"id":"D","text":"$\\\\dfrac{5}{3}$"}]'::jsonb, 'B', 'Tổng cộng có $8$ bóng, trong đó có $5$ bóng đỏ nên xác suất là $\\dfrac{5}{8}$.', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000000009', '31000000-0000-0000-0000-000000000011', NULL, 'Phần I. Mặt cầu tâm $O$ bán kính $3$ có thể tích bằng:', NULL, '[{"id":"A","text":"$12\\\\pi$"},{"id":"B","text":"$27\\\\pi$"},{"id":"C","text":"$36\\\\pi$"},{"id":"D","text":"$18\\\\pi$"}]'::jsonb, 'C', 'Thể tích mặt cầu là $V = \\dfrac{4}{3}\\pi r^3 = \\dfrac{4}{3}\\pi\\cdot 27 = 36\\pi$.', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000011', NULL, 'Phần I. Hàm số $y = x^3 - 3x$ đạt giá trị cực tiểu tại $x =$', NULL, '[{"id":"A","text":"$-1$"},{"id":"B","text":"$0$"},{"id":"C","text":"$1$"},{"id":"D","text":"$3$"}]'::jsonb, 'C', 'Hàm số đạt cực tiểu tại $x = 1$.', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000000011', '31000000-0000-0000-0000-000000000011', NULL, 'Phần I. Tích phân $\\int_0^2 x\\,dx$ bằng:', NULL, '[{"id":"A","text":"$1$"},{"id":"B","text":"$2$"},{"id":"C","text":"$3$"},{"id":"D","text":"$4$"}]'::jsonb, 'B', 'Ta có $\\int_0^2 x\\,dx = \\left[\\dfrac{x^2}{2}\\right]_0^2 = 2$.', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000000012', '31000000-0000-0000-0000-000000000011', NULL, 'Phần I. Cho dãy số liệu $7, 8, 8, 9, 10$. Số trung bình cộng là:', NULL, '[{"id":"A","text":"$8.0$"},{"id":"B","text":"$8.2$"},{"id":"C","text":"$8.4$"},{"id":"D","text":"$8.6$"}]'::jsonb, 'C', 'Số trung bình cộng là $\\dfrac{7 + 8 + 8 + 9 + 10}{5} = \\dfrac{42}{5} = 8.4$.', 0.25, 'single_choice', 'multiple_choice'),

    ('40000000-0000-0000-0000-000000000013', '31000000-0000-0000-0000-000000000012', NULL, 'Phần II. Cho hàm số bậc ba $y = f(x)$ có đồ thị như hình bên. Căn cứ vào đồ thị, xét tính đúng sai của các phát biểu sau:', 'https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767291860/Gemini_Generated_Image_koyi8ckoyi8ckoyi_wtyvft.png', NULL, NULL, 'Câu nhóm phục vụ giao diện đúng/sai.', 0.00, 'cluster_context', 'grouped_context'),
    ('40000000-0000-0000-0000-000000000014', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000013', 'a) Hàm số đã cho đồng biến trên khoảng $(-1;1)$.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'False', 'Theo mô tả đồ thị, hàm số nghịch biến trên khoảng $(-1;1)$.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000015', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000013', 'b) Giá trị cực đại của hàm số là $2$.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'True', 'Theo dữ liệu mô tả từ đề gốc, giá trị cực đại bằng $2$.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000016', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000013', 'c) Phương trình $f(x) - 1 = 0$ có đúng $3$ nghiệm phân biệt.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'True', 'Đường thẳng $y = 1$ cắt đồ thị tại $3$ điểm phân biệt.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000017', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000013', 'd) Hàm số có hai điểm cực trị nằm về hai phía của trục tung.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'True', 'Đồ thị bậc ba có hai điểm cực trị ứng với hai giá trị $x$ trái dấu.', 0.25, 'true_false', 'true_false')
ON CONFLICT (question_id) DO UPDATE
SET
    section_id = EXCLUDED.section_id,
    parent_id = EXCLUDED.parent_id,
    content = EXCLUDED.content,
    image_url = EXCLUDED.image_url,
    options = EXCLUDED.options,
    correct_answer = EXCLUDED.correct_answer,
    explanation = EXCLUDED.explanation,
    point = EXCLUDED.point,
    type = EXCLUDED.type,
    question_type = EXCLUDED.question_type,
    deleted_at = NULL;

INSERT INTO exam_attempt (attempt_id, user_id, exam_id, attempt_type, marks, status, started_at, end_at)
VALUES
    ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000102', '30000000-0000-0000-0000-000000000001', 'practice', 0.00, 'in_progress', NOW() - INTERVAL '6 hours', NULL)
ON CONFLICT (attempt_id) DO UPDATE
SET
    user_id = EXCLUDED.user_id,
    exam_id = EXCLUDED.exam_id,
    attempt_type = EXCLUDED.attempt_type,
    marks = EXCLUDED.marks,
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    end_at = EXCLUDED.end_at;

INSERT INTO attempt_section_log (log_id, attempt_id, section_id, status, started_at, end_at)
VALUES
    ('51000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000011', 'completed', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours 30 minutes'),
    ('51000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000012', 'in_progress', NOW() - INTERVAL '5 hours 30 minutes', NULL)
ON CONFLICT (log_id) DO UPDATE
SET
    attempt_id = EXCLUDED.attempt_id,
    section_id = EXCLUDED.section_id,
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    end_at = EXCLUDED.end_at;

INSERT INTO attempt_detail (detail_id, log_id, question_id, selected_ans, is_correct)
VALUES
    ('52000000-0000-0000-0000-000000000201', '51000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'A', TRUE),
    ('52000000-0000-0000-0000-000000000202', '51000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', 'B', FALSE),
    ('52000000-0000-0000-0000-000000000203', '51000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', 'A', TRUE),
    ('52000000-0000-0000-0000-000000000204', '51000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000014', 'False', TRUE),
    ('52000000-0000-0000-0000-000000000205', '51000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000015', 'True', TRUE)
ON CONFLICT (detail_id) DO UPDATE
SET
    log_id = EXCLUDED.log_id,
    question_id = EXCLUDED.question_id,
    selected_ans = EXCLUDED.selected_ans,
    is_correct = EXCLUDED.is_correct;

INSERT INTO question (
    question_id, section_id, parent_id, content, image_url, options, correct_answer,
    explanation, point, type, question_type
)
VALUES
    ('40000000-0000-0000-0000-000000000018', '31000000-0000-0000-0000-000000000012', NULL, 'Phần II. Cho hàm số $y = x^3 - 3x$. Xét tính đúng sai của các phát biểu sau:', NULL, NULL, NULL, 'Câu nhóm về đạo hàm và biến thiên.', 0.00, 'cluster_context', 'grouped_context'),
    ('40000000-0000-0000-0000-000000000019', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000018', 'a) Đạo hàm của hàm số là $y'' = 3x^2 - 3$.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'True', 'Tính đạo hàm trực tiếp từ $y = x^3 - 3x$.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000020', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000018', 'b) Hàm số đồng biến trên khoảng $(-1;1)$.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'False', 'Trên $(-1;1)$, ta có $y'' < 0$ nên hàm số nghịch biến.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000021', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000018', 'c) Hàm số đạt cực đại tại $x = -1$.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'True', 'Dấu của $y''$ đổi từ dương sang âm tại $x = -1$.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000022', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000018', 'd) Giá trị cực tiểu của hàm số bằng $-2$.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'True', 'Ta có $f(1) = 1 - 3 = -2$.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000023', '31000000-0000-0000-0000-000000000012', NULL, 'Phần II. Trong không gian $Oxyz$, cho mặt phẳng $(P): 2x - y + 2z - 5 = 0$ và điểm $A(1;0;2)$. Xét tính đúng sai của các phát biểu sau:', NULL, NULL, NULL, 'Câu nhóm về hình học không gian.', 0.00, 'cluster_context', 'grouped_context'),
    ('40000000-0000-0000-0000-000000000024', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000023', 'a) Một véc-tơ pháp tuyến của $(P)$ là $\\vec{n} = (2;-1;2)$.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'True', 'Đọc trực tiếp hệ số trong phương trình mặt phẳng.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000025', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000023', 'b) Điểm $A$ thuộc mặt phẳng $(P)$.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'False', 'Thay tọa độ điểm $A$ vào $(P)$ được giá trị $1 \\ne 0$.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000026', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000023', 'c) Khoảng cách từ $A$ đến $(P)$ bằng $\\dfrac{1}{3}$.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'True', 'Ta có $d(A,(P)) = \\dfrac{|2\\cdot 1 - 0 + 2\\cdot 2 - 5|}{\\sqrt{2^2 + (-1)^2 + 2^2}} = \\dfrac{1}{3}$.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000027', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000023', 'd) Mặt phẳng $(P)$ song song với trục $Oy$.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'False', 'Nếu song song với $Oy$ thì véc-tơ chỉ phương $(0;1;0)$ phải nằm trong $(P)$, nhưng $\\vec{n}\\cdot(0;1;0) = -1 \\ne 0$.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000028', '31000000-0000-0000-0000-000000000012', NULL, 'Phần II. Một hộp có $5$ bóng đỏ và $3$ bóng xanh. Chọn ngẫu nhiên $2$ bóng không hoàn lại. Xét tính đúng sai của các phát biểu sau:', NULL, NULL, NULL, 'Câu nhóm về xác suất.', 0.00, 'cluster_context', 'grouped_context'),
    ('40000000-0000-0000-0000-000000000029', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000028', 'a) Số phần tử của không gian mẫu bằng $\\mathrm{C}_8^2 = 28$.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'True', 'Lấy $2$ bóng từ $8$ bóng có $\\mathrm{C}_8^2 = 28$ cách.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000030', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000028', 'b) Xác suất chọn được $2$ bóng đỏ bằng $\\dfrac{5}{14}$.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'True', 'Ta có $P = \\dfrac{\\mathrm{C}_5^2}{\\mathrm{C}_8^2} = \\dfrac{10}{28} = \\dfrac{5}{14}$.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000031', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000028', 'c) Xác suất chọn được $1$ bóng đỏ và $1$ bóng xanh bằng $\\dfrac{15}{28}$.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'True', 'Ta có $P = \\dfrac{\\mathrm{C}_5^1\\mathrm{C}_3^1}{\\mathrm{C}_8^2} = \\dfrac{15}{28}$.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000032', '31000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000028', 'd) Xác suất chọn được $2$ bóng xanh lớn hơn xác suất chọn được $2$ bóng đỏ.', NULL, '[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]'::jsonb, 'False', 'Ta có $P(2\\text{ xanh}) = \\dfrac{\\mathrm{C}_3^2}{\\mathrm{C}_8^2} = \\dfrac{3}{28}$ nhỏ hơn $\\dfrac{5}{14}$.', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000000033', '31000000-0000-0000-0000-000000000013', NULL, 'Phần III. Một chất điểm chuyển động với gia tốc $a(t) = 3t^2 + t$ (m/s$^2$). Biết vận tốc ban đầu $v(0) = 2$ m/s. Quãng đường chất điểm đi được trong $2$ giây đầu tiên là bao nhiêu mét? Làm tròn đến $1$ chữ số thập phân.', NULL, NULL, '10.7', 'Ta có $v(t) = t^3 + \\dfrac{t^2}{2} + 2$. Quãng đường trong $[0;2]$ là $\\int_0^2 v(t)\\,dt = \\dfrac{32}{3} \\approx 10.7$.', 0.50, 'short_answer', 'fill_blank'),
    ('40000000-0000-0000-0000-000000000034', '31000000-0000-0000-0000-000000000013', NULL, 'Phần III. Trong không gian $Oxyz$, cho mặt phẳng $(P): 2x - y + 2z - 5 = 0$ và điểm $A(1;0;2)$. Khoảng cách từ $A$ đến $(P)$ bằng $\\dfrac{a}{b}$ với phân số tối giản. Tính $S = a + b$.', NULL, NULL, '4', 'Khoảng cách bằng $\\dfrac{1}{3}$ nên $a = 1$, $b = 3$ và $S = 4$.', 0.50, 'short_answer', 'fill_blank'),
    ('40000000-0000-0000-0000-000000000035', '31000000-0000-0000-0000-000000000013', NULL, 'Phần III. Giải phương trình $\\log_2(x - 1) + \\log_2(x - 3) = 3$. Tìm nghiệm $x$.', NULL, NULL, '5', 'Điều kiện là $x > 3$. Khi đó $\\log_2[(x - 1)(x - 3)] = 3$, giải được $x = 5$.', 0.50, 'short_answer', 'fill_blank'),
    ('40000000-0000-0000-0000-000000000036', '31000000-0000-0000-0000-000000000013', NULL, 'Phần III. Tính tổng $6$ số hạng đầu của cấp số cộng có $u_1 = 3$, công sai $d = 2$.', NULL, NULL, '48', 'Ta có $S_6 = \\dfrac{6}{2}[2\\cdot 3 + 5\\cdot 2] = 48$.', 0.50, 'short_answer', 'fill_blank'),
    ('40000000-0000-0000-0000-000000000037', '31000000-0000-0000-0000-000000000013', NULL, 'Phần III. Hàm số $y = x^3 - 3x$ đạt giá trị cực tiểu bằng bao nhiêu?', NULL, NULL, '-2', 'Hàm số có cực tiểu tại $x = 1$ và $f(1) = -2$.', 0.50, 'short_answer', 'fill_blank'),
    ('40000000-0000-0000-0000-000000000038', '31000000-0000-0000-0000-000000000013', NULL, 'Phần III. Một mặt cầu có bán kính $3$. Tính $\\dfrac{V}{\\pi}$.', NULL, NULL, '36', 'Ta có $V = 36\\pi$ nên $\\dfrac{V}{\\pi} = 36$.', 0.50, 'short_answer', 'fill_blank')
ON CONFLICT (question_id) DO UPDATE
SET
    section_id = EXCLUDED.section_id,
    parent_id = EXCLUDED.parent_id,
    content = EXCLUDED.content,
    image_url = EXCLUDED.image_url,
    options = EXCLUDED.options,
    correct_answer = EXCLUDED.correct_answer,
    explanation = EXCLUDED.explanation,
    point = EXCLUDED.point,
    type = EXCLUDED.type,
    question_type = EXCLUDED.question_type,
    deleted_at = NULL;

COMMIT;
