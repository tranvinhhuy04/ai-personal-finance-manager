# Kế hoạch Triển khai Dự án OripioFin

## 1. Mục tiêu kế hoạch
Tài liệu này mô tả lộ trình triển khai theo 4 giai đoạn nhằm đưa OripioFin từ nền móng kỹ thuật đến hệ sinh thái tài chính cá nhân có AI hỗ trợ. Mỗi giai đoạn đều có phạm vi rõ ràng cho Frontend, Backend và tiêu chí nghiệm thu.

## 2. Kiến trúc và Stack thống nhất
- **Frontend:** Next.js/React.
- **Backend:** Kiến trúc Microservices phân tán với API Gateway (Node.js).
- **Core Services:** Wallet Service, Transaction Service.
- **AI Service:** Python.
- **Triển khai:** Container hóa bằng Docker.

Lưu ý: Trong Phase 2, theo yêu cầu triển khai kỹ thuật, Core Business Services được thực thi bằng Java/.NET để tối ưu năng lực xử lý nghiệp vụ và độ ổn định giao dịch.

## 3. Lộ trình 4 giai đoạn (Phases)

## Phase 1: Nền móng và Cửa ngõ

### Mục tiêu phase
Thiết lập xương sống hệ thống gồm API Gateway, hạ tầng container và năng lực nhận diện người dùng qua Identity & Auth Service.

### Task Frontend
1. Khởi tạo nền tảng giao diện Next.js/React, chuẩn hóa kiến trúc component và routing.
2. Xây dựng màn hình xác thực: Đăng ký, Đăng nhập, Quên mật khẩu, Xác thực 2FA.
3. Tích hợp cơ chế lưu phiên và refresh token.
4. Thiết lập lớp HTTP client tập trung cho toàn bộ API thông qua Gateway.

### Task Backend
1. Thiết lập API Gateway (Node.js): routing, auth middleware, rate-limiting, request validation cơ bản.
2. Xây dựng Identity & Auth Service:
   - Quản lý người dùng.
   - Đăng nhập/đăng xuất.
   - JWT Access + Refresh token.
   - Quản lý 2FA.
3. Thiết lập Docker Compose cho môi trường local gồm Gateway, Auth Service, Database và message broker nền tảng.
4. Chuẩn hóa logging và cấu trúc cấu hình môi trường (dev/staging/prod).

### Milestones nghiệm thu
1. Người dùng đăng ký/đăng nhập/refresh token hoạt động end-to-end.
2. 2FA bật/tắt, xác minh thành công theo chính sách bảo mật.
3. Toàn bộ thành phần Phase 1 khởi chạy ổn định bằng Docker.
4. Tài liệu API và quy chuẩn lỗi cơ bản được ban hành.

## Phase 2: Lõi Tài chính (Core Business)

### Mục tiêu phase
Hoàn thiện nghiệp vụ quản lý ví và giao dịch tài chính, đảm bảo toàn vẹn dữ liệu theo chuẩn ACID.

### Task Frontend
1. Xây dựng trang quản lý ví: danh sách ví, thêm/sửa ví, trạng thái, hạn mức.
2. Xây dựng màn hình tạo giao dịch thu/chi và lịch sử giao dịch.
3. Bổ sung bộ lọc theo ví, danh mục, thời gian, trạng thái.
4. Hiển thị đồng bộ số dư sau khi giao dịch thành công.

### Task Backend
1. Xây dựng Wallet Service bằng Java/.NET:
   - CRUD ví.
   - Quản lý hạn mức chi tiêu.
   - Kiểm soát trạng thái ví.
2. Xây dựng Transaction Service bằng Java/.NET:
   - Tạo giao dịch thu/chi.
   - Đảm bảo idempotency.
   - Quản lý trạng thái giao dịch.
3. Thiết kế giao tiếp an toàn giữa Transaction Service và Wallet Service.
4. Thiết lập kiểm thử tích hợp cho luồng nghiệp vụ tài chính cốt lõi.

### Milestones nghiệm thu
1. Tạo/sửa/khóa ví thành công, dữ liệu nhất quán.
2. Giao dịch thu/chi phản ánh đúng số dư theo quy tắc nghiệp vụ.
3. Không xảy ra cập nhật trùng giao dịch trong các tình huống retry.
4. Bộ integration test nghiệp vụ lõi đạt tỷ lệ pass theo mục tiêu dự án.

## Phase 3: Phân tích và Trải nghiệm

### Mục tiêu phase
Tăng giá trị sử dụng bằng phân tích dữ liệu tài chính theo thời gian thực gần đúng và thông báo chủ động.

### Task Frontend
1. Xây dựng dashboard phân tích (biểu đồ thu/chi, xu hướng tháng, phân bổ danh mục).
2. Thiết kế trung tâm thông báo người dùng.
3. Tối ưu hiệu năng render biểu đồ và lọc dữ liệu đa điều kiện.
4. Cải tiến UX cho hành trình theo dõi tài chính định kỳ.

### Task Backend
1. Xây dựng Analytics Service theo mô hình CQRS:
   - Read model tối ưu cho dashboard.
   - Pipeline cập nhật tổng hợp từ stream sự kiện.
2. Xây dựng Notification Service:
   - Cảnh báo vượt hạn mức.
   - Nhắc nhở giao dịch định kỳ.
3. Thiết lập event flow giữa Transaction Service -> Analytics Service -> Notification Service.
4. Xây dựng cơ chế quan sát (metrics, tracing, alerting) cho các service mới.

### Milestones nghiệm thu
1. Dashboard phân tích phản hồi nhanh, dữ liệu đúng theo SLA cập nhật.
2. Notification rule hoạt động đúng theo cấu hình người dùng.
3. Hệ thống CQRS vận hành ổn định với khối lượng dữ liệu mô phỏng mục tiêu.
4. Có dashboard giám sát phục vụ vận hành và xử lý sự cố.

## Phase 4: Giá trị gia tăng AI

### Mục tiêu phase
Đưa AI thành điểm khác biệt sản phẩm: giảm thao tác nhập liệu và tăng năng lực truy vấn tài chính thông minh.

### Task Frontend
1. Xây dựng luồng tải/chụp ảnh hóa đơn và xem kết quả OCR.
2. Cho phép người dùng chỉnh sửa dữ liệu OCR trước khi ghi nhận giao dịch.
3. Tích hợp chatbot tài chính trên giao diện chính.
4. Thiết kế fallback UI khi AI phản hồi chậm hoặc không chắc chắn.

### Task Backend
1. Xây dựng AI Service bằng Python:
   - OCR pipeline trích xuất thông tin hóa đơn.
   - NLP/LLM pipeline cho hỏi đáp tài chính.
2. Tích hợp AI Service qua API Gateway với phân quyền truy cập.
3. Thiết kế cơ chế retry, timeout và degrade khi AI lỗi.
4. Huấn luyện/tinh chỉnh mô hình theo dữ liệu tiếng Việt nghiệp vụ tài chính cá nhân.

### Milestones nghiệm thu
1. OCR tạo được bản ghi giao dịch nháp với độ chính xác mục tiêu.
2. Chatbot trả lời đúng ngữ cảnh dữ liệu người dùng theo tập câu hỏi kiểm thử.
3. Hệ thống vận hành ổn định dưới tải thực tế giả lập.
4. AI feature đạt tiêu chí phát hành beta cho nhóm người dùng thử nghiệm.

## 4. Rủi ro kỹ thuật chính của Microservices và cách phòng tránh

## Rủi ro 1: Bất nhất dữ liệu giữa các service
- **Mô tả:** Một nghiệp vụ tài chính đi qua nhiều service có thể tạo trạng thái lệch nếu một bước thất bại giữa chừng.
- **Tác động:** Sai số số dư, lệch báo cáo, giảm độ tin cậy hệ thống.
- **Phòng tránh:**
  - Áp dụng Saga pattern cho giao dịch phân tán.
  - Dùng Outbox pattern để đảm bảo event được phát tin cậy.
  - Bắt buộc idempotency key cho các lệnh ghi.
  - Có cơ chế reconciliation định kỳ để phát hiện và sửa lệch.

## Rủi ro 2: Độ trễ mạng và lỗi liên dịch vụ
- **Mô tả:** Chuỗi gọi đồng bộ dài có thể gây timeout, cascading failure.
- **Tác động:** Tăng tỷ lệ lỗi, suy giảm trải nghiệm người dùng.
- **Phòng tránh:**
  - Thiết kế timeout và retry có backoff.
  - Áp dụng circuit breaker và bulkhead isolation.
  - Ưu tiên event-driven cho tác vụ không yêu cầu đồng bộ tức thời.
  - Tách read/write path hợp lý để giảm áp lực service cốt lõi.

## Rủi ro 3: Khó giám sát, khó truy vết sự cố
- **Mô tả:** Nhiều service phân tán làm tăng độ phức tạp quan sát và điều tra lỗi.
- **Tác động:** MTTR cao, khó đảm bảo SLA.
- **Phòng tránh:**
  - Chuẩn hóa correlation ID xuyên suốt request chain.
  - Triển khai centralized logging, distributed tracing và metrics theo SLI/SLO.
  - Thiết lập cảnh báo chủ động theo ngưỡng lỗi, độ trễ và throughput.
  - Xây dựng runbook vận hành cho các tình huống sự cố điển hình.

## 5. Tiêu chí hoàn thành tổng thể dự án
1. Hoàn thành đầy đủ 4 phases và đạt các milestones bắt buộc.
2. Đáp ứng yêu cầu phi chức năng chính: hiệu năng, bảo mật, khả năng mở rộng.
3. Thiết lập được quy trình phát hành ổn định, có quan sát hệ thống và khả năng mở rộng trong tương lai.
