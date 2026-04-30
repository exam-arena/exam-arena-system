# ExamArena - Business & Marketing Spec cho Beta 17/05/2026

**Mục đích tài liệu:** onboarding nhanh cho thành viên phụ trách marketing/business để hiểu dự án, bản beta, mục tiêu kinh doanh, thông điệp truyền thông và những phần cần phối hợp với team sản phẩm/kỹ thuật.

**Đối tượng đọc:** marketing, business development, vận hành beta, đối tác nội dung, người phụ trách cộng đồng học sinh.

**Ngày lập:** 27/04/2026  
**Mốc beta do team đặt:** 17/05/2026  
**Lưu ý dữ liệu:** trong repo hiện có một số tài liệu kỹ thuật nhắc tới bài thi beta/ngưỡng rehearsal ngày 12/05/2026. Tài liệu này lấy 17/05/2026 làm mốc beta chính theo yêu cầu hiện tại, còn 12/05/2026 được hiểu là mốc kiểm thử/rehearsal nội bộ cần xác nhận lại với PM.

---

## 1. Tóm tắt ngắn gọn

ExamArena là nền tảng luyện thi và thi thử trực tuyến, hiện tập trung vào học sinh THPTQG. Sản phẩm mô phỏng trải nghiệm làm bài trong môi trường thi thật: có phòng luyện thi, đề thi theo cấu trúc, đồng hồ đếm ngược, lưu đáp án tự động, chống mở nhiều tab, cảnh báo rời màn hình, nộp bài, chấm điểm, xem kết quả và đáp án/lời giải.

Định vị ngắn:

> ExamArena giúp học sinh tổng duyệt trước kỳ thi thật bằng đề thi bám sát cấu trúc, trải nghiệm làm bài nghiêm túc và kết quả phản hồi ngay sau khi nộp.

Thông điệp hiện có trên giao diện:

> Tổng duyệt trước kỳ thi thật - Biết điểm thật - Tăng điểm thật

Bản beta 17/05/2026 nên được xem là một đợt kiểm chứng sản phẩm với người dùng thật, không chỉ là một lần demo kỹ thuật. Mục tiêu là chứng minh: học sinh dùng được end-to-end, hệ thống chịu tải tốt, dữ liệu kết quả đủ tin cậy, và team thu được insight để quyết định hướng thương mại hóa.

---

## 2. Bối cảnh dự án

### 2.1 Vấn đề thị trường

Học sinh cuối cấp thường gặp 4 vấn đề trước kỳ thi:

- Có nhiều tài liệu ôn tập nhưng khó biết đề nào bám sát cấu trúc thật.
- Làm đề rời rạc, thiếu cảm giác áp lực thời gian và quy chế thi.
- Sau khi làm xong không có phản hồi nhanh, khó biết điểm yếu cụ thể.
- Các lớp/nhóm luyện thi khó tổ chức thi thử online đồng loạt với dữ liệu kết quả đáng tin cậy.

ExamArena giải quyết bằng một trải nghiệm luyện thi có tổ chức: phòng thi, đề thi, thời gian, nộp bài, chấm điểm và review.

### 2.2 Sản phẩm đang xây

ExamArena hiện có các phần chính:

- Trang chủ giới thiệu hệ thống luyện thi THPTQG.
- Danh sách phòng luyện thi.
- Chi tiết phòng thi và danh sách đề trong phòng.
- Luồng đăng ký/đăng nhập.
- Luồng tham gia phòng miễn phí hoặc đi qua trang thanh toán nếu phòng có giá.
- Luồng bắt đầu bài thi.
- Màn hình làm bài với 3 dạng câu hỏi chính.
- Tự động lưu đáp án.
- Cảnh báo rời fullscreen/rời tab và giới hạn vi phạm.
- Nộp bài và chấm điểm.
- Trang kết quả.
- Trang đáp án tham khảo/review chi tiết.
- Lịch sử làm bài.
- Hồ sơ người dùng/avatar.
- Hạ tầng staging/production, Redis worker, smoke test và load test.

---

## 3. Người dùng mục tiêu

### 3.1 Nhóm chính: học sinh luyện thi THPTQG

Nhu cầu:

- Làm đề thử đúng cấu trúc.
- Biết điểm nhanh.
- Xem lại câu sai, đáp án và lời giải.
- Luyện tập trong bối cảnh gần thi thật.

Thông điệp nên dùng:

- Thi thử nghiêm túc như thi thật.
- Biết điểm ngay sau khi nộp.
- Xem lại đáp án để biết lỗ hổng kiến thức.
- Tổng duyệt trước kỳ thi thật.

### 3.2 Nhóm phụ: giáo viên/lớp học/trung tâm

Nhu cầu:

- Tổ chức thi thử cho một nhóm học sinh.
- Có đề theo phòng/gói.
- Theo dõi kết quả học sinh.
- Giảm công sức chấm bài.

Trạng thái hiện tại:

- Sản phẩm đã có nền tảng phòng thi, đề thi, user access và kết quả.
- Dashboard giáo viên/admin nâng cao chưa nên hứa quá mạnh nếu chưa được xác nhận hoàn thiện.

### 3.3 Nhóm vận hành nội bộ

Nhu cầu:

- Seed đề thi và tài khoản test.
- Kiểm tra smoke test trước ngày beta.
- Theo dõi log, Redis worker, database và kết quả nộp bài.
- Xử lý tình huống trong phòng thi beta.

---

## 4. Định vị và USP

### 4.1 Định vị đề xuất

ExamArena là nền tảng luyện thi trực tuyến mô phỏng kỳ thi thật, giúp học sinh THPTQG làm đề, nộp bài, nhận điểm và xem lời giải trong một quy trình khép kín.

### 4.2 Điểm khác biệt nên nhấn mạnh

- Mô phỏng phòng thi: học sinh vào phòng, chọn đề, làm bài theo thời gian.
- Bám sát cấu trúc đề: giao diện hiện chia theo phần trắc nghiệm nhiều lựa chọn, đúng/sai và trả lời ngắn.
- Phản hồi nhanh: có kết quả điểm, số câu đúng/sai/bỏ qua và review đáp án.
- Trải nghiệm thi nghiêm túc: fullscreen warning, focus violation, chặn làm cùng một attempt ở nhiều tab.
- Ổn định cho beta đông người: load test unique-IP đã pass 100/500/800 users với 0% HTTP failure trong môi trường local staging + Neon PostgreSQL.

### 4.3 Không nên hứa quá mức trong beta

- Không nên hứa “chống gian lận tuyệt đối”. Hiện có cảnh báo fullscreen/focus/tab, nhưng chưa phải hệ thống proctoring đầy đủ.
- Không nên hứa “AI cá nhân hóa lộ trình học” nếu chưa có trong sản phẩm.
- Không nên hứa dashboard giáo viên/phân tích nâng cao nếu chưa kiểm chứng end-to-end.
- Không nên hứa production final sign-off nếu rehearsal/media gate chưa pass.

---

## 5. Mục tiêu bản beta 17/05/2026

### 5.1 Mục tiêu sản phẩm

- Cho học sinh trải nghiệm đầy đủ luồng: đăng nhập -> vào phòng -> chọn đề -> bắt đầu attempt -> làm bài -> autosave -> nộp bài -> xem điểm -> xem đáp án.
- Kiểm chứng độ dễ hiểu của giao diện làm bài.
- Kiểm chứng độ tin cậy của chấm điểm và lưu đáp án.
- Kiểm chứng các guard cơ bản trong khi thi: một tab, fullscreen/focus warning, timer.

### 5.2 Mục tiêu kỹ thuật/vận hành

- Chạy ổn định với nhóm beta thực tế.
- Không mất đáp án hàng loạt.
- Không nghẽn khi nhiều học sinh login/start/submit gần cùng lúc.
- Có smoke test trước giờ thi.
- Có người trực vận hành theo dõi backend, Redis, database và frontend.

Hiện trạng theo tài liệu load test:

- Unique-IP 100/500/800 users: pass.
- 0% HTTP failure trong các kịch bản đã ghi nhận.
- p95 latency khoảng 454-471ms trong các run chính.
- Same-IP 100 users được chấp nhận cho beta; same-IP 500/800 là rủi ro vận hành đã được ghi nhận.
- Đây là tín hiệu load-test readiness, chưa phải final production sign-off.

### 5.3 Mục tiêu business/marketing

- Thu hút một nhóm học sinh đủ lớn để validate nhu cầu.
- Thu thập feedback định tính: vì sao học sinh dùng, phần nào khó hiểu, có muốn làm thêm đề không.
- Đo conversion trong beta: xem phòng -> đăng ký/vào phòng -> bắt đầu đề -> nộp bài -> xem review.
- Xác định thông điệp nào hiệu quả nhất: “thi thử như thi thật”, “biết điểm ngay”, hay “bám sát cấu trúc”.
- Tạo tư liệu cho launch sau beta: ảnh màn hình, số liệu tham gia, phản hồi học sinh, case study lớp/nhóm nếu có.

---

## 6. Phạm vi tính năng beta

### 6.1 Nên có trong beta

**Tài khoản**

- Đăng ký.
- Đăng nhập.
- Xem profile.
- Avatar/profile ở mức cơ bản.

**Phòng thi**

- Xem danh sách phòng luyện thi.
- Xem phòng hot.
- Xem chi tiết phòng.
- Join phòng miễn phí.
- Điều hướng sang thanh toán nếu phòng có giá.

**Đề thi**

- Xem danh sách đề.
- Xem danh sách đề trong phòng.
- Xem chi tiết đề trước khi làm.
- Bắt đầu bài thi.

**Làm bài**

- Hiển thị câu hỏi có LaTeX và ảnh nếu có.
- Hỗ trợ 3 dạng: single choice, đúng/sai theo cụm, short answer.
- Timer theo thời lượng đề.
- Sidebar điều hướng câu hỏi.
- Đánh dấu/bookmark câu hỏi.
- Lưu đáp án tự động theo debounce.
- Retry khi lưu lỗi tạm thời.
- Cảnh báo fullscreen/focus.
- Chặn cùng một attempt ở nhiều tab.

**Sau khi nộp**

- Chấm điểm/worker processing.
- Trang kết quả: điểm, số câu đúng/sai/bỏ qua.
- Trang review: đáp án đúng, đáp án học sinh, lời giải.
- Polling khi kết quả đang xử lý.

### 6.2 Có thể để sau beta nếu chưa ổn định

- Dashboard phân tích nâng cao cho giáo viên.
- Admin management UI đầy đủ.
- Payment production thật.
- Cá nhân hóa lộ trình học.
- Proctoring nâng cao bằng camera/microphone.
- Ranking/leaderboard.
- Mobile app native.

---

## 7. Luồng người dùng beta

### 7.1 Luồng học sinh lý tưởng

1. Nhận link beta từ team/marketing.
2. Vào trang chủ ExamArena.
3. Đăng ký hoặc đăng nhập.
4. Vào danh sách phòng luyện thi.
5. Chọn phòng beta.
6. Join phòng nếu miễn phí hoặc đi qua bước thanh toán nếu có cấu hình giá.
7. Chọn đề beta.
8. Bấm bắt đầu.
9. Làm bài trên màn hình attempt.
10. Hệ thống tự lưu đáp án trong quá trình làm.
11. Học sinh nộp bài.
12. Hệ thống xử lý/chấm điểm.
13. Học sinh xem điểm.
14. Học sinh xem đáp án tham khảo/lời giải.
15. Marketing xin feedback nhanh.

### 7.2 Điểm cần đo trong funnel

- Số người vào landing/home.
- Số người đăng ký/đăng nhập thành công.
- Số người vào phòng.
- Số người start attempt.
- Số người submit.
- Số người xem result.
- Số người xem review.
- Tỷ lệ bỏ giữa chừng.
- Lỗi phổ biến theo từng bước.

---

## 8. KPI đề xuất cho beta

### 8.1 KPI sản phẩm

- Start attempt rate: số học sinh bắt đầu bài / số học sinh đăng nhập.
- Submit completion rate: số học sinh nộp bài / số học sinh bắt đầu.
- Review view rate: số học sinh xem đáp án / số học sinh nộp bài.
- Median time to result: thời gian từ submit đến thấy điểm.
- Autosave error rate: tỷ lệ lỗi lưu đáp án.
- Support tickets per 100 users: số vấn đề cần hỗ trợ.

### 8.2 KPI marketing/business

- Registration conversion rate.
- Cost per beta participant nếu chạy ads.
- Nguồn traffic hiệu quả nhất: group lớp, KOL giáo dục, page, referral, teacher/community.
- Tỷ lệ học sinh muốn làm thêm đề.
- Tỷ lệ học sinh sẵn sàng trả tiền/gợi ý mức giá.
- Số giáo viên/trung tâm quan tâm sau beta.

### 8.3 KPI kỹ thuật tối thiểu

- HTTP failure rate gần 0 trong giờ beta.
- Không có mất dữ liệu đáp án hàng loạt.
- `/healthz` và `/readyz` pass trước giờ beta.
- Smoke test pass trước khi mở link chính thức.
- Redis submit stream/dirty attempts không backlog vô hạn.

---

## 9. Trạng thái sẵn sàng hiện tại

### 9.1 Điểm mạnh đã có

- Luồng học sinh end-to-end đã được xây dựng ở frontend/backend.
- Có API route rõ cho auth, rooms, exams, attempts, result/review.
- Có health/readiness endpoints.
- Có Dockerfile production và compose production/staging.
- Có smoke test script cho beta flow.
- Có load test script và báo cáo 100/500/800 users.
- Có runbook rehearsal staging.
- Có kế hoạch media migration S3 + CloudFront.

### 9.2 Rủi ro còn mở

- Final production sign-off vẫn cần production-like staging rehearsal pass.
- Media gate: ảnh câu hỏi/lời giải thật cần upload/verify hoặc chấp nhận conditional risk.
- Host frontend build từng bị lỗi cache `.next`, dù Docker build sạch đã pass.
- Same-IP 500/800 chưa test, được ghi nhận là accepted risk nếu beta có NAT lớn.
- Backend Go test hiện chủ yếu compile, chưa có nhiều behavioral unit test; beta dựa nhiều vào smoke/load script.
- Payment production thật có thể chưa nên dùng làm trọng tâm beta nếu chưa xác nhận.

---

## 10. Thông điệp marketing đề xuất

### 10.1 One-liner

ExamArena là phòng thi thử online giúp học sinh tổng duyệt trước kỳ thi thật, biết điểm ngay và xem lại đáp án chi tiết sau khi nộp.

### 10.2 Tagline

Tổng duyệt trước kỳ thi thật - Biết điểm thật - Tăng điểm thật.

### 10.3 Value propositions

- Thi thử như thi thật: có thời gian, giao diện làm bài và quy trình nộp bài rõ ràng.
- Bám sát cấu trúc: hỗ trợ các dạng câu hỏi quan trọng trong đề THPTQG.
- Biết kết quả nhanh: điểm, số câu đúng/sai/bỏ qua.
- Học từ câu sai: xem đáp án và lời giải sau khi hoàn thành.
- Phù hợp cho cá nhân hoặc nhóm/lớp muốn tổ chức thi thử online.

### 10.4 Nội dung nên chuẩn bị trước beta

- Bài giới thiệu ngắn cho học sinh.
- Hướng dẫn 5 bước tham gia beta.
- FAQ: đăng nhập, vào phòng, làm bài, nộp bài, xem kết quả.
- Form feedback sau khi thi.
- Kịch bản support trong giờ beta.
- Bộ ảnh chụp màn hình: home, room, exam, attempt, result, review.
- Bài recap sau beta: số lượng tham gia, tỷ lệ hoàn thành, feedback nổi bật.

---

## 11. Câu hỏi cần chốt với team

- Beta 17/05/2026 là public beta, closed beta hay một buổi thi thử có kiểm soát?
- Số lượng học sinh mục tiêu là bao nhiêu: 100, 300, 500 hay 800?
- Học sinh sẽ dùng mạng phân tán hay nhiều em cùng một trường/lớp chung IP?
- Phòng beta miễn phí hay có test payment?
- Môn/đề beta chính thức là gì?
- Ảnh câu hỏi/lời giải đã có bản final chưa?
- Ai trực support trong giờ thi?
- Kênh thu feedback chính là Google Form, Zalo, Discord, Facebook group hay trong app?
- Sau beta có offer thương mại không: gói đề, phòng trả phí, lớp/nhóm, trung tâm?

---

## 12. Checklist cho bạn marketing/business

Trước beta:

- Hiểu demo end-to-end từ home đến review.
- Chốt persona chính: học sinh cá nhân, lớp học hay trung tâm.
- Chốt thông điệp chính và landing copy ngắn.
- Chuẩn bị nội dung hướng dẫn tham gia.
- Chuẩn bị form feedback.
- Chốt kênh tuyển người tham gia beta.
- Chốt số lượng mục tiêu và thời gian mở beta.
- Chốt cách xử lý khi học sinh quên mật khẩu/lỗi đăng nhập/lỗi làm bài.

Trong beta:

- Theo dõi số người tham gia từng bước funnel.
- Ghi lại câu hỏi/lỗi lặp lại.
- Thu feedback ngay sau khi học sinh xem kết quả.
- Ghi nhận cảm nhận về đề, giao diện, tốc độ và độ tin cậy.

Sau beta:

- Tổng hợp số liệu funnel.
- Tổng hợp feedback định tính.
- Tách lỗi sản phẩm và insight business.
- Đề xuất định giá/gói sản phẩm nếu tín hiệu tốt.
- Đề xuất thông điệp launch chính thức.

---

## 13. Nguồn tham chiếu trong repo

- `README.md`: tổng quan sản phẩm, team, roadmap.
- `docs/PLAN-exam-arena.md`: kế hoạch sản phẩm và mục tiêu chịu tải.
- `docs/architecture.md`: kiến trúc hệ thống, mô hình dữ liệu, luồng request.
- `docs/api-contract.md`: contract API ban đầu.
- `backend/routes/route.go`: route thực tế hiện tại.
- `frontend/app/page.tsx`: trang chủ hiện tại.
- `frontend/app/rooms/page.tsx`: danh sách phòng.
- `frontend/app/attempts/[id]/page.tsx`: màn hình làm bài.
- `frontend/app/attempts/[id]/result/page.tsx`: kết quả.
- `frontend/app/attempts/[id]/review/page.tsx`: review đáp án.
- `docs/deploy-readiness-report.md`: trạng thái readiness.
- `docs/load-test-results.md`: kết quả load test.
- `docs/production-rehearsal-runbook.md`: checklist rehearsal trước production.
- `docs/s3-cloudfront-media-runbook.md`: media gate.
