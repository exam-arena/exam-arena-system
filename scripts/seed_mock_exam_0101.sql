-- Seed data for ExamArena mock exam 0101.
-- Assumes init.sql has already been applied.
-- Import:
--   psql "$DATABASE_URL" -f scripts/seed_mock_exam_0101.sql

BEGIN;

-- Keep this seed re-runnable while preserving unrelated data.
DELETE FROM question_explanation
WHERE question_id IN (
    SELECT q.question_id
    FROM question q
    JOIN exam_section s ON s.section_id = q.section_id
    WHERE s.exam_id = '30000000-0000-0000-0000-000000010101'
);

INSERT INTO users (user_id, username, password, fullname, email, role)
VALUES
    ('10000000-0000-0000-0000-000000010101', 'mock_admin_0101', '$2a$12$1eBJf8xpu4l9SxYM1zAc0Ov/t7fTcCWkilq6WkmCzEO6Hnjtp/N6i', 'ExamArena Mock Admin', 'mock-admin-0101@examarena.local', 'admin'),
    ('10000000-0000-0000-0000-000000010102', 'mock_student_0101', '$2a$12$1eBJf8xpu4l9SxYM1zAc0Ov/t7fTcCWkilq6WkmCzEO6Hnjtp/N6i', 'Thi sinh De 0101', 'mock-student-0101@examarena.local', 'student')
ON CONFLICT (user_id) DO UPDATE
SET username = EXCLUDED.username,
    password = EXCLUDED.password,
    fullname = EXCLUDED.fullname,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    deleted_at = NULL;

INSERT INTO exam_room (room_id, name, type, price, test_quantity, status)
VALUES (
    '20000000-0000-0000-0000-000000010101',
    'Thi thu Tot nghiep THPT 2026 - Dot 1',
    'official',
    0,
    1,
    'active'
)
ON CONFLICT (room_id) DO UPDATE
SET name = EXCLUDED.name,
    type = EXCLUDED.type,
    price = EXCLUDED.price,
    test_quantity = EXCLUDED.test_quantity,
    status = EXCLUDED.status,
    deleted_at = NULL;

INSERT INTO room_activity_stats (room_id, attempt_count)
VALUES ('20000000-0000-0000-0000-000000010101', 0)
ON CONFLICT (room_id) DO UPDATE
SET attempt_count = EXCLUDED.attempt_count,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO user_room_access (
    user_id, room_id, granted_at, expired_at, source_type, granted_by_user_id, status, note
)
VALUES
    ('10000000-0000-0000-0000-000000010101', '20000000-0000-0000-0000-000000010101', NOW(), NULL, 'seed', NULL, 'active', 'Seed access for mock exam 0101'),
    ('10000000-0000-0000-0000-000000010102', '20000000-0000-0000-0000-000000010101', NOW(), NOW() + INTERVAL '180 days', 'seed', '10000000-0000-0000-0000-000000010101', 'active', 'Seed access for mock exam 0101')
ON CONFLICT (user_id, room_id) DO UPDATE
SET granted_at = EXCLUDED.granted_at,
    expired_at = EXCLUDED.expired_at,
    source_type = EXCLUDED.source_type,
    granted_by_user_id = EXCLUDED.granted_by_user_id,
    status = EXCLUDED.status,
    note = EXCLUDED.note,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO exam (exam_id, room_id, title, type, capacity, duration, start_time)
VALUES (
    '30000000-0000-0000-0000-000000010101',
    '20000000-0000-0000-0000-000000010101',
    'De on tap Tot nghiep THPT 2026 - Ma de 0101',
    'official',
    1000,
    5400,
    NOW() - INTERVAL '10 minutes'
)
ON CONFLICT (exam_id) DO UPDATE
SET room_id = EXCLUDED.room_id,
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    capacity = EXCLUDED.capacity,
    duration = EXCLUDED.duration,
    start_time = EXCLUDED.start_time,
    deleted_at = NULL;

INSERT INTO exam_section (section_id, exam_id, title, duration)
VALUES
    ('31000000-0000-0000-0000-000000010101', '30000000-0000-0000-0000-000000010101', 'Phan I - Trac nghiem nhieu phuong an lua chon', 1800),
    ('31000000-0000-0000-0000-000000010102', '30000000-0000-0000-0000-000000010101', 'Phan II - Trac nghiem dung sai', 1800),
    ('31000000-0000-0000-0000-000000010103', '30000000-0000-0000-0000-000000010101', 'Phan III - Tra loi ngan', 1800)
ON CONFLICT (section_id) DO UPDATE
SET exam_id = EXCLUDED.exam_id,
    title = EXCLUDED.title,
    duration = EXCLUDED.duration;

INSERT INTO question (
    question_id, section_id, parent_id, content, image_url, options, correct_answer, point, type, question_type
)
VALUES
    ('40000000-0000-0000-0000-000000010101', '31000000-0000-0000-0000-000000010101', NULL, $q$Cho hàm số $y=f(x)$ có bảng biến thiên như hình. Hàm số đã cho đồng biến trên khoảng nào dưới đây?$q$, 'https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767290691/Gemini_Generated_Image_qa9n92qa9n92qa9n_hvuawy.png', $json$[{"id":"A","text":"$(-3;3)$"},{"id":"B","text":"$(-3;0)$"},{"id":"C","text":"$(0;3)$"},{"id":"D","text":"$(-\\infty;-3)$"}]$json$::jsonb, 'B', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000010102', '31000000-0000-0000-0000-000000010101', NULL, $q$Trong không gian $Oxyz$, cho hai điểm $A(1;1;-2)$ và $B(2;2;1)$. Vectơ $\overrightarrow{AB}$ có tọa độ là$q$, NULL, $json$[{"id":"A","text":"$(-1;-1;-3)$"},{"id":"B","text":"$(3;1;1)$"},{"id":"C","text":"$(1;1;3)$"},{"id":"D","text":"$(3;3;-1)$"}]$json$::jsonb, 'C', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000010103', '31000000-0000-0000-0000-000000010101', NULL, $q$Tìm tập xác định của hàm số $y=\log_2(x-3)$.$q$, NULL, $json$[{"id":"A","text":"$\\mathcal{D}=(-\\infty;3)$"},{"id":"B","text":"$\\mathcal{D}=\\mathbb{R}$"},{"id":"C","text":"$\\mathcal{D}=(3;+\\infty)$"},{"id":"D","text":"$\\mathcal{D}=[3;+\\infty)$"}]$json$::jsonb, 'C', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000010104', '31000000-0000-0000-0000-000000010101', NULL, $q$Xác định số hạng đầu $u_1$ và công sai $d$ của cấp số cộng $(u_n)$ có $u_9=5u_2$ và $u_{13}=2u_6+5$.$q$, NULL, $json$[{"id":"A","text":"$u_1=3$ và $d=4$"},{"id":"B","text":"$u_1=3$ và $d=5$"},{"id":"C","text":"$u_1=4$ và $d=5$"},{"id":"D","text":"$u_1=4$ và $d=3$"}]$json$::jsonb, 'A', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000010105', '31000000-0000-0000-0000-000000010101', NULL, $q$Họ nguyên hàm của hàm số $f(x)=3x^2+\sin x$ là$q$, NULL, $json$[{"id":"A","text":"$x^3+\\cos x+C$"},{"id":"B","text":"$x^3+\\sin x+C$"},{"id":"C","text":"$x^3-\\cos x+C$"},{"id":"D","text":"$3x^3-\\sin x+C$"}]$json$::jsonb, 'C', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000010106', '31000000-0000-0000-0000-000000010101', NULL, $q$Cho hình hộp $ABCD.A'B'C'D'$. Tổng của ba vectơ $\overrightarrow{B'A'}+\overrightarrow{B'C'}+\overrightarrow{B'B}$ bằng vectơ nào dưới đây?$q$, 'https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767290691/Gemini_Generated_Image_qa9n92qa9n92qa9n_hvuawy.png', $json$[{"id":"A","text":"$\\overrightarrow{DB'}$"},{"id":"B","text":"$\\overrightarrow{B'D'}$"},{"id":"C","text":"$\\overrightarrow{BD'}$"},{"id":"D","text":"$\\overrightarrow{B'D}$"}]$json$::jsonb, 'D', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000010107', '31000000-0000-0000-0000-000000010101', NULL, $q$Người ta thống kê khối lượng của 80 quả măng cụt (đơn vị gam) và thu được mẫu số liệu ghép nhóm sau
$$\begin{array}{|c|c|c|c|c|c|}\hline \text{Khối lượng (gam)} & [80;82) & [82;84) & [84;86) & [86;88) & [88;90) \\\hline \text{Số quả} & 17 & 20 & 25 & 16 & 12 \\\hline \end{array}$$
Khoảng biến thiên của mẫu số liệu ghép nhóm trên là$q$, NULL, $json$[{"id":"A","text":"$11$ gam"},{"id":"B","text":"$12$ gam"},{"id":"C","text":"$10$ gam"},{"id":"D","text":"$20$ gam"}]$json$::jsonb, 'C', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000010108', '31000000-0000-0000-0000-000000010101', NULL, $q$Diện tích phần gạch sọc trong hình vẽ bằng$q$, 'https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767290691/Gemini_Generated_Image_qa9n92qa9n92qa9n_hvuawy.png', $json$[{"id":"A","text":"$\\int_{-3}^{1}|-x^2-2x-3|\\,dx$"},{"id":"B","text":"$\\int_{-3}^{1}(x^2-2x-3)\\,dx$"},{"id":"C","text":"$\\int_{-3}^{1}(x^2+2x-3)\\,dx$"},{"id":"D","text":"$\\int_{-3}^{1}(-x^2-2x+3)\\,dx$"}]$json$::jsonb, 'D', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000010109', '31000000-0000-0000-0000-000000010101', NULL, $q$Mỗi ngày bác Mạnh đều đi bộ để rèn luyện sức khỏe. Quãng đường đi bộ mỗi ngày của bác trong $20$ ngày được thống kê lại ở bảng sau
$$\begin{array}{|c|c|c|c|c|c|}\hline \text{Quãng đường} & [2{,}7;\,3{,}0) & [3{,}0;\,3{,}3) & [3{,}3;\,3{,}6) & [3{,}6;\,3{,}9) & [3{,}9;\,4{,}2) \\\hline \text{Số ngày} & 3 & 6 & 5 & 4 & 2 \\\hline \end{array}$$
Phương sai của mẫu số liệu ghép nhóm gần nhất với giá trị nào sau đây?$q$, NULL, $json$[{"id":"A","text":"$0,19$"},{"id":"B","text":"$1,26$"},{"id":"C","text":"$0,13$"},{"id":"D","text":"$0,26$"}]$json$::jsonb, 'C', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000010110', '31000000-0000-0000-0000-000000010101', NULL, $q$Cho hàm số $y=f(x)$ có đạo hàm $f'(x)=(x-2)(x+1),\forall x\in\mathbb{R}$. Mệnh đề nào dưới đây đúng?$q$, NULL, $json$[{"id":"A","text":"Hàm số đã cho đồng biến trên $(-1;+\\infty)$"},{"id":"B","text":"Hàm số đã cho nghịch biến trên $(2;+\\infty)$"},{"id":"C","text":"Hàm số đã cho nghịch biến trên $(-1;2)$"},{"id":"D","text":"Hàm số đã cho đồng biến trên $(-1;2)$"}]$json$::jsonb, 'C', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000010111', '31000000-0000-0000-0000-000000010101', NULL, $q$Trong không gian $Oxyz$, mặt phẳng đi qua tâm của mặt cầu $(x-1)^2+(y+2)^2+z^2=12$ và song song với mặt phẳng $(Oxz)$ có phương trình là$q$, NULL, $json$[{"id":"A","text":"$y+1=0$"},{"id":"B","text":"$y-2=0$"},{"id":"C","text":"$y+2=0$"},{"id":"D","text":"$x+z-1=0$"}]$json$::jsonb, 'C', 0.25, 'single_choice', 'multiple_choice'),
    ('40000000-0000-0000-0000-000000010112', '31000000-0000-0000-0000-000000010101', NULL, $q$Biết đồ thị $(C)$ của hàm số $y=\dfrac{x^2-4x+5}{x-1}$ có hai điểm cực trị. Đường thẳng đi qua hai điểm cực trị của đồ thị $(C)$ cắt trục hoành tại điểm $M$ có hoành độ $x_M$ bằng$q$, NULL, $json$[{"id":"A","text":"$x_M=2$"},{"id":"B","text":"$x_M=1-\\sqrt{2}$"},{"id":"C","text":"$x_M=1$"},{"id":"D","text":"$x_M=1+\\sqrt{2}$"}]$json$::jsonb, 'A', 0.25, 'single_choice', 'multiple_choice'),

    ('40000000-0000-0000-0000-000000010201', '31000000-0000-0000-0000-000000010102', NULL, $q$Cho hàm số $y=f(x)=ax+b+\dfrac{1}{x-c}$ có đồ thị như hình vẽ. Xét tính đúng sai của các phát biểu sau.$q$, 'https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767290691/Gemini_Generated_Image_qa9n92qa9n92qa9n_hvuawy.png', NULL, NULL, 0.00, 'cluster_context', 'grouped_context'),
    ('40000000-0000-0000-0000-000000010202', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010201', $q$a) Đồ thị hàm số nhận đường thẳng $y=x$ làm tiệm cận xiên.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'True', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000010203', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010201', $q$b) Giá trị nhỏ nhất của hàm số trên $(1;+\infty)$ đạt được tại $x=2$.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'True', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000010204', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010201', $q$c) $a+b+c=0$.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'False', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000010205', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010201', $q$d) Gọi $A$ và $B$ là hai điểm cực trị của đồ thị hàm số và điểm $M$ thuộc tia $Ox$ thỏa mãn $\widehat{AMB}\le 90^\circ$ thì giá trị nhỏ nhất của đoạn $OM$ bằng $3,5$.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'False', 0.25, 'true_false', 'true_false'),

    ('40000000-0000-0000-0000-000000010206', '31000000-0000-0000-0000-000000010102', NULL, $q$Chọn $6$ số phân biệt từ tập hợp $X=\{1;2;3;4;5;6;7;8;9\}$ để xếp vào $6$ ô hình tròn tại các đỉnh $(A;B;C)$ và các trung điểm $(M;N;P)$ của một tam giác. Gọi $\Omega$ là tập hợp tất cả các cách xếp sao cho $3$ số trên mỗi cạnh của tam giác luôn lập thành một cấp số cộng. Chọn ngẫu nhiên một cách sắp xếp từ tập $\Omega$. Xét tính đúng sai của các phát biểu sau.$q$, 'https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767290691/Gemini_Generated_Image_qa9n92qa9n92qa9n_hvuawy.png', NULL, NULL, 0.00, 'cluster_context', 'grouped_context'),
    ('40000000-0000-0000-0000-000000010207', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010206', $q$a) $n(\Omega)=48$.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'True', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000010208', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010206', $q$b) Xác suất để ba số ở các đỉnh $(A;B;C)$ đều là số chẵn bằng $0,25$.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'True', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000010209', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010206', $q$c) Xác suất để chữ số $5$ nằm ở vị trí trung điểm bằng $0,65$.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'False', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000010210', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010206', $q$d) Biết rằng ba số ở các đỉnh đều là số lẻ thì xác suất để chữ số $7$ có mặt trong cách sắp xếp đó bằng $0,83$ (làm tròn đến hàng phần trăm).$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'True', 0.25, 'true_false', 'true_false'),

    ('40000000-0000-0000-0000-000000010211', '31000000-0000-0000-0000-000000010102', NULL, $q$Một người đang lái xe ô tô phát hiện chướng ngại vật cách đầu xe $25$ m. Kể từ thời điểm đạp phanh, ô tô chuyển động chậm dần đều với vận tốc $v(t)=-10t+20$ m/s. Gọi $s(t)$ là quãng đường xe đi được trong $t$ giây. Xét tính đúng sai của các phát biểu sau.$q$, NULL, NULL, NULL, 0.00, 'cluster_context', 'grouped_context'),
    ('40000000-0000-0000-0000-000000010212', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010211', $q$a) $s(t)=\int v(t)\,dt$.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'True', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000010213', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010211', $q$b) $s(t)=-5t^2+20$.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'False', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000010214', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010211', $q$c) Thời gian kể từ lúc đạp phanh đến khi ô tô dừng hẳn là $20$ giây.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'False', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000010215', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010211', $q$d) Xe ô tô không va vào chướng ngại vật ở trên đường.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'True', 0.25, 'true_false', 'true_false'),

    ('40000000-0000-0000-0000-000000010216', '31000000-0000-0000-0000-000000010102', NULL, $q$Tại một nút giao thông của một khu vực đông dân cư với tốc độ tối đa cho phép đối với ô tô là $50$ km/h, người ta gắn một camera phạt nguội tại điểm $S(0;0;14)$ trong không gian $Oxyz$ (đơn vị trên mỗi trục tọa độ là mét), mặt phẳng $Oxy$ song song với mặt đường và chứa vùng nhận diện biển số xe. Camera nhận diện tốt nhất biển số xe khi biển số nằm trong hình thang cân $ABCD$ với $SA=SB=27$ mét, $OD=OC=5$ mét, $AB=14$ mét, $CD=9,6$ mét. Tia $Ox$ nằm trên đường trung trực các đoạn thẳng $AB$ và $DC$. Giả sử lúc 9h00 một ô tô chuyển động thẳng đều theo phương song song với trục $Ox$, hướng về phía trục $Oy$ và có vị trí biển số xe là $M(50;-6;0)$. Xét tính đúng sai của các phát biểu sau.$q$, 'https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767290691/Gemini_Generated_Image_qa9n92qa9n92qa9n_hvuawy.png', NULL, NULL, 0.00, 'cluster_context', 'grouped_context'),
    ('40000000-0000-0000-0000-000000010217', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010216', $q$a) $D(1,4;-4,8;0)$.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'False', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000010218', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010216', $q$b) Đường thẳng $AD$ có phương trình $\begin{cases}x=1,4-20,6t\\y=-4,8+2,2t\\z=0\end{cases}, t\in\mathbb{R}$.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'False', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000010219', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010216', $q$c) Nếu ô tô đi với vận tốc $45$ km/h thì sau đúng $2,2$ giây kể từ thời điểm xuất phát, biển số xe đã nằm trong vùng nhận diện tốt nhất của camera.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'False', 0.25, 'true_false', 'true_false'),
    ('40000000-0000-0000-0000-000000010220', '31000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010216', $q$d) Nếu camera ghi nhận hình ảnh biển số ô tô liên tục trong khoảng thời gian kéo dài đúng $0,7$ giây và khoảng thời gian này kết thúc đồng thời với thời điểm xe vừa ra khỏi vùng nhận diện tốt nhất, thì ô tô đã vượt quá tốc độ cho phép.$q$, NULL, $json$[{"id":"True","text":"Đúng"},{"id":"False","text":"Sai"}]$json$::jsonb, 'False', 0.25, 'true_false', 'true_false'),

    ('40000000-0000-0000-0000-000000010301', '31000000-0000-0000-0000-000000010103', NULL, $q$Thùng xe tải hình chữ nhật $ABCD$ có độ dài một cạnh là $3$ m. Khi thùng xe đang song song mặt đất, nó được nâng lên quanh góc $B$ và nắp thùng $FG$ dài $3$ m mở vuông góc với mặt đất như hình. Biết chiều cao của $B$ và $G$ so với mặt đất lần lượt là $80$ cm và $20$ cm. Khi đó độ dài $CH$ bằng bao nhiêu mét?$q$, 'https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767290691/Gemini_Generated_Image_qa9n92qa9n92qa9n_hvuawy.png', NULL, '4', 0.50, 'short_answer', 'fill_blank'),
    ('40000000-0000-0000-0000-000000010302', '31000000-0000-0000-0000-000000010103', NULL, $q$Một cái ly nước hình trụ có chiều cao $9$ cm. Lượng nước trong ly chiếm $\dfrac{2}{3}$ thể tích ly nước. An đặt một viên kim cương hình lập phương vào miệng ly nước thì thấy một đỉnh của viên kim cương chạm vào mặt nước và đồng thời mô hình ly nước và kim cương cùng lấy trục ly nước làm trục đối xứng. Nếu ban đầu An đổ nước đầy ly thì sau khi đặt khối lập phương như trên, lượng nước tràn ra là bao nhiêu cm$^3$? Làm tròn kết quả đến hàng phần chục và bỏ qua độ dày của ly.$q$, 'https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767290691/Gemini_Generated_Image_qa9n92qa9n92qa9n_hvuawy.png', NULL, '23,4', 0.50, 'short_answer', 'fill_blank'),
    ('40000000-0000-0000-0000-000000010303', '31000000-0000-0000-0000-000000010103', NULL, $q$Một nhà hàng có tổng cộng $100$ nhân viên và chi trả mức lương cố định cho mỗi nhân viên thường xuyên tăng ca là $400$ USD/tháng. Vì nhà hàng liên tục đón những đoàn khách với số lượng lớn nhưng không thể thuê thêm nhân viên nên chủ nhà hàng muốn khuyến khích nhân viên của mình tăng ca. Ông chủ quyết định cứ một nhân viên quyết định tăng ca thì mức lương của tất cả nhân viên tăng ca trong nhà hàng đều được tăng thêm $3\%$. Tương tự nếu $k$ nhân viên tăng ca thì lương cho mỗi người trong số $k$ người đó sẽ tăng $3k$ (%). Bên cạnh tiền lương cho nhân viên thì tiền điện nước và duy trì cơ sở vật chất là cố định $8000$ USD/tháng. Doanh thu trung bình từ khách hàng là $40000$ USD/tháng và mỗi nhân viên tăng ca trung bình sẽ được khách hàng tip $800$ USD/tháng (tiền tip phải nộp lại cho chủ cửa hàng và tính vào doanh thu). Xác định số nhân viên còn lại không tăng ca cần có để lợi nhuận của nhà hàng đạt giá trị lớn nhất.$q$, NULL, NULL, '67', 0.50, 'short_answer', 'fill_blank'),
    ('40000000-0000-0000-0000-000000010304', '31000000-0000-0000-0000-000000010103', NULL, $q$Cho hình phẳng $(H)$ được giới hạn bởi một đường cong parabol và một đường thẳng có các kích thước như hình. Diện tích hình phẳng $(H)$ là phần được tô màu bằng bao nhiêu cm$^2$? Làm tròn đến hàng đơn vị.$q$, 'https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767290691/Gemini_Generated_Image_qa9n92qa9n92qa9n_hvuawy.png', NULL, '478', 0.50, 'short_answer', 'fill_blank'),
    ('40000000-0000-0000-0000-000000010305', '31000000-0000-0000-0000-000000010103', NULL, $q$Trong không gian $Oxyz$, treo một quả lồng đèn dạng hình lập phương $ABCD.A'B'C'D'$ cạnh $10$ cm sao cho điểm $A$ gần mặt đất. Biết các đỉnh $B,D,A'$ kề $A$ lần lượt cách mặt đất $10$ cm, $11$ cm và $12$ cm. Hỏi đỉnh $A$ cách mặt đất bao nhiêu cm? Làm tròn đến hàng phần trăm.$q$, 'https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767290691/Gemini_Generated_Image_qa9n92qa9n92qa9n_hvuawy.png', NULL, '5,28', 0.50, 'short_answer', 'fill_blank'),
    ('40000000-0000-0000-0000-000000010306', '31000000-0000-0000-0000-000000010103', NULL, $q$Anh An mới mua một chiếc xe ô tô nhãn hiệu Mercedes S450. Sau quá trình bấm biển số thì biển số xe có dạng $29E-abcde$ với $a,b,c,d,e$ là các chữ số phân biệt từ $0$ đến $9$. Chiếc biển xe của anh An được coi là biển xe “may mắn” nếu không có hai chữ số nào có tổng bằng $10$. Hãy tính xác suất để anh Đạt bấm được một biển xe “may mắn”, biết rằng biển số đó có chứa chữ số $5$. Làm tròn kết quả đến hàng phần trăm.$q$, 'https://res.cloudinary.com/dfbsdiq9p/image/upload/v1767290691/Gemini_Generated_Image_qa9n92qa9n92qa9n_hvuawy.png', NULL, '0,38', 0.50, 'short_answer', 'fill_blank')
ON CONFLICT (question_id) DO UPDATE
SET section_id = EXCLUDED.section_id,
    parent_id = EXCLUDED.parent_id,
    content = EXCLUDED.content,
    image_url = EXCLUDED.image_url,
    options = EXCLUDED.options,
    correct_answer = EXCLUDED.correct_answer,
    point = EXCLUDED.point,
    type = EXCLUDED.type,
    question_type = EXCLUDED.question_type,
    deleted_at = NULL;

INSERT INTO question_explanation (
    explanation_id, question_id, display_order, block_type, content_text, image_url, alt_text
)
VALUES
    ('41000000-0000-0000-0000-000000010101', '40000000-0000-0000-0000-000000010101', 1, 'text', $e$Dựa vào bảng biến thiên, ta thấy hàm số $y=f(x)$ đồng biến trên các khoảng $(-3;0)$ và $(3;+\infty)$.
Trong các phương án đã cho, khoảng đúng là $(-3;0)$.
Chọn đáp án B.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010102', '40000000-0000-0000-0000-000000010102', 1, 'text', $e$Ta có $\overrightarrow{AB}=(x_B-x_A;\;y_B-y_A;\;z_B-z_A)=(2-1;\;2-1;\;1-(-2))=(1;\;1;\;3)$.
Chọn đáp án C.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010103', '40000000-0000-0000-0000-000000010103', 1, 'text', $e$Điều kiện xác định của hàm số là $x-3>0 \Leftrightarrow x>3$.
Vậy tập xác định của hàm số là $\mathcal{D}=(3;+\infty)$.
Chọn đáp án C.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010104', '40000000-0000-0000-0000-000000010104', 1, 'text', $e$Theo giả thiết ta có $\begin{cases}u_9=5u_2\\u_{13}=2u_6+5\end{cases} \Leftrightarrow \begin{cases}u_1+8d=5(u_1+d)\\u_1+12d=2(u_1+5d)+5\end{cases} \Leftrightarrow \begin{cases}4u_1-3d=0\\u_1-2d=-5\end{cases}$.
Giải hệ được $u_1=3$ và $d=4$.
Chọn đáp án A.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010105', '40000000-0000-0000-0000-000000010105', 1, 'text', $e$Ta có $\int(3x^2+\sin x)\,dx = x^3 - \cos x + C$.
Chọn đáp án C.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010106', '40000000-0000-0000-0000-000000010106', 1, 'text', $e$Theo quy tắc hình hộp ta có $\overrightarrow{B'A'}+\overrightarrow{B'C'}+\overrightarrow{B'B}=\overrightarrow{B'D}$.
Chọn đáp án D.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010107', '40000000-0000-0000-0000-000000010107', 1, 'text', $e$Khoảng biến thiên của mẫu số liệu ghép nhóm là hiệu giữa cận trên nhóm cuối và cận dưới nhóm đầu:
$R = 90 - 80 = 10$ gam.
Chọn đáp án C.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010108', '40000000-0000-0000-0000-000000010108', 1, 'text', $e$Từ hình vẽ ta thấy hai đồ thị hai hàm số $y = x^2 + x - 2$ và $y = -x + 1$ cắt nhau tại hai điểm có hoành độ $x = -3$; $x = 1$.
Diện tích hình phẳng cần tính là $S = \int_{-3}^{1}\left[-x+1-(x^2+x-2)\right]dx = \int_{-3}^{1}(-x^2-2x+3)\,dx$.
Chọn đáp án D.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010109', '40000000-0000-0000-0000-000000010109', 1, 'text', $e$Cỡ mẫu là $n = 20$.
Ta bổ sung hàng giá trị đại diện cho mẫu số liệu ghép nhóm
$$\begin{array}{|c|c|c|c|c|c|}\hline \text{Quãng đường} & [2{,}7;\,3{,}0) & [3{,}0;\,3{,}3) & [3{,}3;\,3{,}6) & [3{,}6;\,3{,}9) & [3{,}9;\,4{,}2) \\\hline \text{Giá trị đại diện} & 2{,}85 & 3{,}15 & 3{,}45 & 3{,}75 & 4{,}05 \\\hline \text{Số ngày} & 3 & 6 & 5 & 4 & 2 \\\hline \end{array}$$
Giá trị trung bình của mẫu số liệu ghép nhóm là $\bar{x} = \dfrac{2{,}85 \cdot 3 + 3{,}15 \cdot 6 + 3{,}45 \cdot 5 + 3{,}75 \cdot 4 + 4{,}05 \cdot 2}{20} = 3{,}39$.
Phương sai của mẫu số liệu ghép nhóm là $s^2 = \dfrac{1}{20}\left(2{,}85^2 \cdot 3 + 3{,}15^2 \cdot 6 + 3{,}45^2 \cdot 5 + 3{,}75^2 \cdot 4 + 4{,}05^2 \cdot 2\right) - 3{,}39^2 \approx 0{,}13$.
Chọn đáp án C.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010110', '40000000-0000-0000-0000-000000010110', 1, 'text', $e$Ta có $f'(x) = 0 \Leftrightarrow (x-2)(x+1) = 0 \Leftrightarrow x = 2$ hoặc $x = -1$.
Bảng xét dấu của $f'(x)$ như sau
Hàm số đồng biến trên các khoảng $(-\infty;-1)$, $(2;+\infty)$ và nghịch biến trên khoảng $(-1;2)$.
Chọn đáp án C.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010111', '40000000-0000-0000-0000-000000010111', 1, 'text', $e$Mặt cầu đã cho có tâm $I(1;-2;0)$ và bán kính $R = 2\sqrt{3}$.
Mặt phẳng $(P)$ song song mặt phẳng $(Oxz): y = 0$ nên có dạng $(P): y + m = 0$, $(m \ne 0)$.
Vì $(P)$ qua $I(1;-2;0)$ nên $-2 + m = 0 \Rightarrow m = 2$.
Vậy phương trình cần tìm là $(P): y + 2 = 0$.
Chọn đáp án C.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010112', '40000000-0000-0000-0000-000000010112', 1, 'text', $e$Tập xác định $\mathcal{D} = \mathbb{R}\setminus\{1\}$.
Ta có $y' = \dfrac{(2x-4)(x-1) - (x^2-4x+5)}{(x-1)^2} = \dfrac{x^2-2x-1}{(x-1)^2}$.
Khi đó $y' = 0 \Leftrightarrow x^2 - 2x - 1 = 0 \Leftrightarrow x = 1 \pm \sqrt{2}$.
Lại có $y = \dfrac{x^2-4x+5}{x-1} = x - 3 + \dfrac{2}{x-1}$.
Tại các điểm cực trị, từ $y' = 0 \Leftrightarrow 1 - \dfrac{2}{(x-1)^2} = 0 \Leftrightarrow \dfrac{2}{x-1} = x - 1$.
Thay vào biểu thức hàm số ta được $y = (x-3) + (x-1) = 2x - 4$.
Vậy đường thẳng qua hai điểm cực trị là $(d): y = 2x - 4$.
Điểm $M \in Ox$ nên $y_M = 0$, suy ra $2x_M - 4 = 0 \Leftrightarrow x_M = 2$.
Chọn đáp án A.$e$, NULL, NULL),

    ('41000000-0000-0000-0000-000000010202', '40000000-0000-0000-0000-000000010202', 1, 'text', $e$Gọi phương trình đường tiệm cận xiên là $y = ax + b$.
Đường này đi qua $O(0;0)$ và $I(1;1)$ nên $\begin{cases}b = 0\\a + b = 1\end{cases} \Leftrightarrow \begin{cases}a = 1\\b = 0\end{cases}$.
Vậy phương trình đường tiệm cận xiên là $y = x$.
Mệnh đề đúng.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010203', '40000000-0000-0000-0000-000000010203', 1, 'text', $e$Đồ thị có tiệm cận đứng $x = 1$ nên $c = 1$.
Khi đó $f(x) = x + \dfrac{1}{x-1} = (x-1) + \dfrac{1}{x-1} + 1 \ge 2\sqrt{(x-1)\cdot\dfrac{1}{x-1}} + 1 = 3$ trên $(1;+\infty)$.
Dấu đẳng thức xảy ra khi $x - 1 = \dfrac{1}{x-1} \Leftrightarrow (x-1)^2 = 1 \Leftrightarrow x = 2$.
Mệnh đề đúng.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010204', '40000000-0000-0000-0000-000000010204', 1, 'text', $e$Ta có $\begin{cases}a = 1\\b = 0\\c = 1\end{cases}$ nên $a + b + c = 1 + 0 + 1 = 2$, không bằng $0$.
Mệnh đề sai.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010205', '40000000-0000-0000-0000-000000010205', 1, 'text', $e$Xét hàm số $y = f(x) = x + \dfrac{1}{x-1}$, có $y' = \dfrac{x^2-2x}{(x-1)^2} = 0 \Leftrightarrow \begin{cases}x = 0\\x = 2\end{cases}$.
Vậy hai điểm cực trị là $A(0;-1)$ và $B(2;3)$. Gọi $M(m;0)$.
Ta có $\overrightarrow{MA} = (-m;-1)$, $\overrightarrow{MB} = (2-m;3)$.
$\widehat{AMB} \le 90^\circ \Leftrightarrow \cos(\widehat{MA},\widehat{MB}) \ge 0 \Leftrightarrow \overrightarrow{MA}\cdot\overrightarrow{MB} \ge 0$.
Tức $m^2 - 2m - 3 \ge 0$, suy ra $m \le -1$ hoặc $m \ge 3$.
Vì $M$ thuộc tia $Ox$ nên $m \ge 3$, do đó $OM_{\min} = 3$, không phải $3{,}5$.
Mệnh đề sai.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010207', '40000000-0000-0000-0000-000000010207', 1, 'text', $e$Xét hai trường hợp sau.
Trường hợp 1: Ba số ở đỉnh đều chẵn.
Tập số chẵn $E = \{2;4;6;8\}$, có $4$ phần tử. Các bộ số chẵn có thể chọn là $\{2;4;6\}$, $\{2;4;8\}$, $\{2;6;8\}$, $\{4;6;8\}$.
Kiểm tra điều kiện các số khác nhau:
– Bộ $\{2;4;6\}$: Trung điểm là $3; 5; 4$ (trùng số $4$ ở đỉnh) nên loại.
– Bộ $\{4;6;8\}$: Trung điểm là $5; 7; 6$ (trùng số $6$ ở đỉnh) nên loại.
– Bộ $\{2;4;8\}$: Trung điểm là $3; 6; 5$ (thỏa mãn khác nhau).
– Bộ $\{2;6;8\}$: Trung điểm là $4; 7; 5$ (thỏa mãn khác nhau).
Vậy có $2$ bộ số thỏa mãn. Mỗi bộ hoán vị vào $3$ đỉnh có $3! = 6$ cách.
Nên số cách xếp trường hợp này $2 \cdot 6 = 12$ cách.
Trường hợp 2: Ba số ở đỉnh đều lẻ.
Tập số lẻ $O = \{1;3;5;7;9\}$, có $5$ phần tử. Số tập con $3$ phần tử là $C_5^3 = 10$.
Các bộ số lẻ lập thành cấp số cộng (bị loại vì trung điểm trùng đỉnh) là $\{1;3;5\}$, $\{3;5;7\}$, $\{5;7;9\}$, $\{1;5;9\}$.
Suy ra có $10 - 4 = 6$ bộ số thỏa mãn: $\{1;3;7\}$, $\{1;3;9\}$, $\{1;5;7\}$, $\{1;7;9\}$, $\{3;5;9\}$, $\{3;7;9\}$.
Mỗi bộ hoán vị $3$ đỉnh có $3! = 6$ cách.
Suy ra số cách xếp trường hợp này $6 \cdot 6 = 36$ cách.
Vậy tổng số cách xếp là $n(\Omega) = 12 + 36 = 48$.
Mệnh đề đúng.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010208', '40000000-0000-0000-0000-000000010208', 1, 'text', $e$Gọi $A$ là biến cố "ba số ở các đỉnh đều là số chẵn".
Ta có $n(A) = 12$.
Vậy $P(A) = \dfrac{12}{48} = \dfrac{1}{4} = 0{,}25$.
Mệnh đề đúng.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010209', '40000000-0000-0000-0000-000000010209', 1, 'text', $e$Để số $5$ nằm ở trung điểm thì tổng hai số ở hai đỉnh kề nó phải bằng $10$.
Các cặp số có tổng bằng $10$ trong $X$ là $(2;8)$, $(4;6)$ (chẵn) và $(1;9)$, $(3;7)$ (lẻ).
Với các bộ đỉnh chẵn:
– Bộ $\{2;4;8\}$ chứa cặp $(2;8)$ nên có số $5$.
– Bộ $\{2;6;8\}$ chứa cặp $(2;8)$ nên có số $5$.
Cả $2$ bộ đều thỏa mãn nên $2 \cdot 6 = 12$ cách.
Với các bộ đỉnh lẻ:
– $\{1;3;7\}$ chứa $(3;7)$ nên có.
– $\{1;3;9\}$ chứa $(1;9)$ nên có.
– $\{1;5;7\}$ số $5$ nằm ở đỉnh nên không.
– $\{1;7;9\}$ chứa $(1;9)$ nên có.
– $\{3;5;9\}$ số $5$ nằm ở đỉnh nên không.
– $\{3;7;9\}$ chứa $(3;7)$ nên có.
Có $4$ bộ thỏa mãn nên $4 \cdot 6 = 24$ cách.
Tổng số cách để số $5$ ở trung điểm là $12 + 24 = 36$.
Xác suất là $\dfrac{36}{48} = 0{,}75$, không phải $0{,}65$.
Mệnh đề sai.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010210', '40000000-0000-0000-0000-000000010210', 1, 'text', $e$Gọi $\Omega_L$ là không gian mẫu khi các đỉnh đều lẻ, $n(\Omega_L) = 36$.
Xét $6$ bộ đỉnh lẻ thỏa mãn:
– $\{1;3;7\}$ có số $7$ ở đỉnh.
– $\{1;3;9\}$: Trung điểm là $2; 6; 5$. Tập hợp $\{1;2;3;5;6;9\}$ nên không có $7$.
– $\{1;5;7\}$ có số $7$ ở đỉnh.
– $\{1;7;9\}$ có số $7$ ở đỉnh.
– $\{3;5;9\}$: Trung điểm là $4; 7; 6$ nên có số $7$ ở trung điểm.
– $\{3;7;9\}$ có số $7$ ở đỉnh.
Có $5$ bộ số chứa số $7$ (chỉ trừ bộ $\{1;3;9\}$).
Số cách xếp thuận lợi là $5 \cdot 6 = 30$.
Xác suất cần tìm là $P = \dfrac{30}{36} = \dfrac{5}{6} \approx 0{,}83$.
Mệnh đề đúng.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010212', '40000000-0000-0000-0000-000000010212', 1, 'text', $e$Quãng đường $s(t)$ mà xe ô tô đi được trong $t$ giây là một nguyên hàm của vận tốc $v(t)$.
Do đó $s(t) = \int v(t)\,dt$.
Mệnh đề đúng.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010213', '40000000-0000-0000-0000-000000010213', 1, 'text', $e$Ta có $s(t) = \int(-10t+20)\,dt = -5t^2 + 20t + C$.
Lại có $s(0) = 0$ nên suy ra $C = 0$.
Vậy $s(t) = -5t^2 + 20t$, không phải $-5t^2 + 20$.
Mệnh đề sai.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010214', '40000000-0000-0000-0000-000000010214', 1, 'text', $e$Ô tô dừng hẳn khi $v(t) = 0 \Leftrightarrow -10t + 20 = 0 \Leftrightarrow t = 2$ giây.
Mệnh đề sai (đề nói $20$ giây).$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010215', '40000000-0000-0000-0000-000000010215', 1, 'text', $e$Quãng đường đi được $S = \int_0^2(-10t+20)\,dt = 20$ m $< 25$ m.
Vậy xe ô tô không va vào chướng ngại vật.
Mệnh đề đúng.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010217', '40000000-0000-0000-0000-000000010217', 1, 'text', $e$Xét $(Oxy)$, gọi $H$ là trung điểm $CD$, ta có $CD = 9{,}6$ suy ra $DH = 4{,}8$ nên $y_D = -4{,}8$.
Tam giác $DOH$ vuông tại $H$ nên $OH = \sqrt{OD^2 - DH^2} = \sqrt{5^2 - 4{,}8^2} = 1{,}4$ nên $x_D = 1{,}4$.
Vậy $D(1{,}4;\;-4{,}8;\;0)$.
Mệnh đề sai.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010218', '40000000-0000-0000-0000-000000010218', 1, 'text', $e$Do $AB = 14$ nên $AK = 7$, suy ra $A(x_A;\;-7;\;0)$ với $x_A > 0$.
Vì $\triangle SOA$ vuông tại $O$ nên $OA^2 + SO^2 = SA^2 \Leftrightarrow x_A^2 + 49 + 196 = 729$, suy ra $x_A = 22$.
Vậy $A(22;\;-7;\;0)$ và $\overrightarrow{DA} = (20{,}6;\;-2{,}2;\;0)$.
Đường thẳng $AD$ đi qua $D(1{,}4;\;-4{,}8;\;0)$ nhận $\overrightarrow{DA}$ làm vectơ chỉ phương, có phương trình:
$\begin{cases}x = 1{,}4 + 20{,}6t\\y = -4{,}8 - 2{,}2t\\z = 0\end{cases},\;(t \in \mathbb{R})$.
Mệnh đề sai.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010219', '40000000-0000-0000-0000-000000010219', 1, 'text', $e$Biển số của xe ô tô nằm trong vùng nhận diện tốt nhất của camera khi ô tô đi qua hình thang cân $ABCD$ và tạo hai giao điểm $E, F$.
Ta có $MF = 50 - 22 = 28$ mét.
Thời gian từ $M$ đến $F$ là $t = \dfrac{MF}{v_{\text{ô tô}}} = \dfrac{28}{\dfrac{45}{3{,}6}} = 2{,}24$ giây.
Vì $2{,}24 \ne 2{,}2$ nên sau đúng $2{,}2$ giây biển số chưa vào vùng nhận diện.
Mệnh đề sai.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010220', '40000000-0000-0000-0000-000000010220', 1, 'text', $e$Áp dụng định lý Thales:
$\dfrac{EF}{DI} = \dfrac{AF}{AI} = \dfrac{7 - 6}{7 - 4{,}8} = \dfrac{1}{2{,}2}$.
Suy ra $EF = DI \cdot \dfrac{1}{2{,}2} = \dfrac{22 - 1{,}4}{2{,}2} = \dfrac{103}{11}$.
Vận tốc $v = \dfrac{s}{t} = \dfrac{EF}{0{,}7} = \dfrac{\dfrac{103}{11}}{0{,}7} = \dfrac{1030}{77}$ m/s $= \dfrac{3708}{77}$ km/h $\approx 48{,}16$ km/h $< 50$ km/h.
Vậy xe không vượt quá tốc độ cho phép.
Mệnh đề sai.$e$, NULL, NULL),

    ('41000000-0000-0000-0000-000000010301', '40000000-0000-0000-0000-000000010301', 1, 'text', $e$Kẻ $BK \perp FG$ tại $K$.
Ta có $h_C = 3 + 0{,}8 = 3{,}8$ m và $h_F = 3 + 0{,}2 = 3{,}2$ m.
Suy ra độ lệch giữa $C$ và $F$ là $3{,}8 - 3{,}2 = 0{,}6$ m.
Do đó $FK = 3 - 0{,}6 = 2{,}4$ m.
Ta có $BK = \sqrt{BF^2 - FK^2} = \sqrt{3^2 - 2{,}4^2} = 1{,}8$.
Ta có $\triangle BKF \sim \triangle BCH$ nên
$\Rightarrow \dfrac{BK}{BC} = \dfrac{BF}{BH}$
$\Rightarrow \dfrac{BK}{BC} = \dfrac{BC}{BH}$
$\Rightarrow BC^2 = BK \cdot BH$
$\Rightarrow BH = \dfrac{BC^2}{BK} = \dfrac{3^2}{1{,}8} = 5$.
Vậy $CH = \sqrt{BH^2 - BC^2} = \sqrt{5^2 - 3^2} = 4$ m.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010302', '40000000-0000-0000-0000-000000010302', 1, 'text', $e$Xét hình chóp tam giác đều $S.ABC$ trong đó $S$ là đỉnh của hình lập phương nằm bên trong ly nước và $A, B, C$ là các điểm chung của kim cương với miệng ly; $O$ là trọng tâm tam giác $ABC$ và $H$ là trung điểm $BC$.
Đặt $x$ cm là cạnh đáy hình chóp thì
$AO = \dfrac{2}{3}AH = \dfrac{2}{3} \cdot \dfrac{x\sqrt{3}}{2} = \dfrac{x\sqrt{3}}{3}$.
Vì hình chóp $S.ABC$ có $SA, SB, SC$ bằng nhau và đôi một vuông góc tại đỉnh $S$ nên độ dài cạnh $SA = SB = SC = \dfrac{x}{\sqrt{2}}$.
Từ đó suy ra $SO = \sqrt{SA^2 - OA^2} = \sqrt{\dfrac{x^2}{2} - \dfrac{x^2}{3}} = \dfrac{x\sqrt{6}}{6}$.
Theo giả thiết thì chiều cao hình chóp $S.ABC$ bằng $\dfrac{1}{3}$ chiều cao ly nước $SO = \dfrac{1}{3} \cdot 9 = 3$ cm.
Suy ra chiều dài cạnh đáy của hình chóp $\dfrac{x\sqrt{6}}{6} = 3 \Rightarrow x = 3\sqrt{6}$ cm.
Vậy thể tích nước tràn ra bằng với thể tích khối chóp $S.ABC$.
Thể tích đó là $V = \dfrac{1}{3} SO \cdot S_{ABC} = \dfrac{1}{3} \cdot 3 \cdot \dfrac{(3\sqrt{6})^2\sqrt{3}}{4} = \dfrac{27\sqrt{3}}{2} \approx 23{,}4$ cm$^3$.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010303', '40000000-0000-0000-0000-000000010303', 1, 'text', $e$Xét với $k$ là số nhân viên tăng ca thì lương mỗi nhân viên sau tăng ca là $400(1 + 0{,}03k)$ USD.
Tổng lương cho $k$ nhân viên là $400k(1 + 0{,}03k) = 4k(100 + 3k)$.
Với $100 - k$ nhân viên còn lại thì mức lương vẫn $400$ USD nên tổng sẽ là $400(100 - k)$ USD.
Cứ $k$ nhân viên tăng ca doanh thu tăng $800k$ USD nên doanh thu tổng là $40000 + 800k$ USD.
Suy ra lợi nhuận tổng của nhà hàng là
$T(k) = 40000 + 800k - 4k(100 + 3k) - 8000 - 400(100 - k) = -8000 + 800k - 12k^2$.
Ta có $T'(k) = 800 - 24k$.
Giải $T'(k) = 0 \Leftrightarrow k = \dfrac{100}{3} \notin \mathbb{N}$ nên $\begin{bmatrix} k = 33 \\ k = 34 \end{bmatrix}$.
Xét $T(33) = 5332$; $T(34) = 5328$.
Suy ra $T(33) > T(34)$.
Do đó $T_{\max} = T(33)$ tức lợi nhuận lớn nhất là khi số nhân viên tăng ca là $33$ tức số nhân viên còn lại không tăng ca là $100 - 33 = 67$.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010304', '40000000-0000-0000-0000-000000010304', 1, 'text', $e$Tọa độ đỉnh của parabol là $I(a;48)$, đi qua các điểm $O(0;0)$ và $A(24;32)$.
Khi đó $y = k(x-a)^2 + 48$ nên
$\begin{cases} ka^2 + 48 = 0 \\ k(24-a)^2 + 48 = 32 \end{cases} \Rightarrow \dfrac{(24-a)^2}{a^2} = \dfrac{1}{3} \Leftrightarrow \begin{bmatrix} a = 36 - 12\sqrt{3} \\ a = 36 + 12\sqrt{3} \end{bmatrix}$.
Kiểm tra lại điều kiện $-\dfrac{b}{2a} < 24$ nên chọn $a = 36 - 12\sqrt{3}$ thỏa mãn nên $k = \dfrac{-(\sqrt{3}+1)^2}{36}$.
Vậy phương trình parabol là $y = \dfrac{-(\sqrt{3}+1)^2}{36}(x-36+12\sqrt{3})^2 + 48$.
Đường thẳng $OA$ đi qua $\begin{cases} O(0;0) \\ A(24;32) \end{cases}$ có phương trình $y = \dfrac{4}{3}x$.
Diện tích hình phẳng là $S = \int_0^{24} \left[ \dfrac{-(\sqrt{3}+1)^2}{36}(x-36+12\sqrt{3})^2 + 48 - \dfrac{4}{3}x \right] dx \approx 478$ cm$^2$.
Vậy diện tích hình phẳng $(H)$ là phần được tô màu bằng $478$ cm$^2$.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010305', '40000000-0000-0000-0000-000000010305', 1, 'text', $e$Ta thấy bốn đỉnh $B, D, A'$ và $A$ tạo thành một tam diện vuông bên trong hình lập phương $ABCD.A'B'C'D'$ nên ta có thể chọn hệ trục tọa độ $Oxyz$ với điểm $A$ trùng với gốc tọa độ và các trục $Ox, Oy, Oz$ lần lượt trùng với các cạnh $OB, OD, OA'$ như hình vẽ dưới đây.
Suy ra các tọa độ $A(0;0;0)$, $B(10;0;0)$, $D(0;10;0)$, $A'(0;0;10)$.
Khi đó ta gọi $(P): ax+by+cz+d=0$ và chọn $d=10$, ta có $(P): ax+by+cz+10=0$.
Từ đây lần lượt có được như sau (với $a,b,c \in \mathbb{R}^+$).
• $d(B;(P)) = \dfrac{|10a+10|}{\sqrt{a^2+b^2+c^2}} = 10$.
• $d(D;(P)) = \dfrac{|10b+10|}{\sqrt{a^2+b^2+c^2}} = 11$.
• $d(A';(P)) = \dfrac{|10c+10|}{\sqrt{a^2+b^2+c^2}} = 12$.
Đặt $t = \sqrt{a^2+b^2+c^2}$, khi ấy ta có dãy tỉ lệ thức sau
$\dfrac{a+1}{10} = \dfrac{b+1}{11} = \dfrac{c+1}{12} = t \Rightarrow \begin{cases} a = 10t-1 \\ b = 11t-1 \\ c = 12t-1 \end{cases}$.
Suy ra $t = \sqrt{a^2+b^2+c^2} = \sqrt{(10t-1)^2 + (11t-1)^2 + (12t-1)^2} = \sqrt{365t^2-66t+3}$.
Khi đó ta có phương trình
$d(B;(P)) = \dfrac{|10a+10|}{\sqrt{a^2+b^2+c^2}} = \dfrac{|100t|}{\sqrt{365t^2-66t+3}} = 10$
$\Leftrightarrow 265t^2-66t+3=0$
$\Leftrightarrow t=t_0=\dfrac{33+7\sqrt{6}}{265}$.
Vậy ta suy ra khoảng cần tìm là $d(A;(P)) = \left. \dfrac{|10|}{\sqrt{365t^2-66t+3}} \right|_{t=t_0} = \dfrac{33-7\sqrt{6}}{3} \approx 5{,}28$ cm.$e$, NULL, NULL),
    ('41000000-0000-0000-0000-000000010306', '40000000-0000-0000-0000-000000010306', 1, 'text', $e$Tìm số lượng các biển số có $5$ chữ số đôi một khác nhau lập từ tập $S = \{0;1;2;\ldots;9\}$ mà trong đó bắt buộc có chữ số $5$.
Gọi $A$ là biến cố "Biển số xe may mắn" và $B$ là biến cố "Biển số xe có chữ số $5$".
Tổng số biển có $5$ chữ số khác nhau $A_{10}^5$.
Số biển không chứa chữ số $5$ là $A_9^5$ nên $n(B) = A_{10}^5 - A_9^5 = 15120$ (biển).
Các cặp số có tổng bằng $10$ là $\{1;9\}$, $\{2;8\}$, $\{3;7\}$, $\{4;6\}$.

• **Trường hợp 1.** Chọn số $0$.
Bộ số hiện có $\{5;0\}$ thì ta cần chọn thêm $3$ số nữa được lấy từ $\{1;9\}$, $\{2;8\}$, $\{3;7\}$, $\{4;6\}$ mỗi nhóm $1$ số.
Chọn $3$ nhóm từ $4$ nhóm có $C_4^3 = 4$ (cách).
Trong mỗi nhóm đã chọn, có $2$ cách chọn một số nên có $2 \cdot 2 \cdot 2 = 8$ (cách).
Xếp $5$ số này vào $5$ vị trí có $5!$ (cách).
Số biển thỏa mãn cho trường hợp này là $4 \cdot 8 \cdot 5! = 3840$ (cách).

• **Trường hợp 2.** Không chọn số $0$.
Bộ số hiện có là $\{5\}$ thì ta cần chọn thêm $4$ số nữa từ $\{1;9\}$, $\{2;8\}$, $\{3;7\}$, $\{4;6\}$ mỗi nhóm $1$ số và $4$ số này phải lấy từ cả $4$ nhóm nên có $1$ cách chọn.
Trong mỗi nhóm, có hai cách chọn $1$ số nên có $2 \cdot 2 \cdot 2 \cdot 2 = 16$ cách.
Số cách chọn bộ số là $1 \cdot 16 = 16$ cách.
Xếp $5$ số này vào $5$ vị trí có $5!$ cách.
Số biển thỏa mãn cho trường hợp này là $16 \cdot 5! = 1920$ (biển).

Tổng số biển cố thuận lợi là $n(A \cap B) = 3840 + 1920 = 5760$.
Vậy xác suất cần tính là $P(A \mid B) = \dfrac{n(A \cap B)}{n(B)} = \dfrac{5760}{15120} = \dfrac{8}{21} \approx 0{,}38$.$e$, NULL, NULL)
ON CONFLICT (explanation_id) DO UPDATE
SET question_id = EXCLUDED.question_id,
    display_order = EXCLUDED.display_order,
    block_type = EXCLUDED.block_type,
    content_text = EXCLUDED.content_text,
    image_url = EXCLUDED.image_url,
    alt_text = EXCLUDED.alt_text,
    deleted_at = NULL;

COMMIT;
