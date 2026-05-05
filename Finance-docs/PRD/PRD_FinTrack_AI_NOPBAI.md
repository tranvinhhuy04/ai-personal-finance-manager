# PRD - Tài liệu Yêu cầu Sản phẩm

# FinTrack AI - Ứng dụng Quản lý Thu Chi Cá nhân Tích hợp Trí tuệ Nhân tạo

---

| Thông tin | Nội dung |
|---|---|
| Tên sản phẩm | FinTrack AI |
| Phiên bản | 2.0 (Bản nộp học thuật, đồng bộ mã nguồn) |
| Ngày cập nhật | 03/05/2026 |
| Trạng thái | Draft - Sẵn sàng review/nộp |
| Đối tượng | Team Dev, QA, BA, Giảng viên hướng dẫn |
| Nền tảng | Web SPA (React + TypeScript) + Backend Microservices |
| Ngôn ngữ sản phẩm | Tiếng Việt |

---

## 1. Tóm tắt điều hành

FinTrack AI là hệ thống quản lý tài chính cá nhân đa ví, được thiết kế theo kiến trúc microservices và tích hợp AI theo hướng thực dụng: ưu tiên dữ liệu nội bộ đáng tin cậy, bổ sung AI ở các điểm tạo giá trị trực tiếp cho người dùng.

Ba năng lực cốt lõi:
- Quản trị giao dịch thu/chi chính xác và có khả năng đối soát.
- Phân tích dòng tiền theo thời gian và theo danh mục trên dashboard.
- Tương tác ngôn ngữ tự nhiên để truy vấn/tư vấn và nhập liệu nhanh.

Sản phẩm phục vụ mục tiêu học thuật nhưng đã có nền tảng kỹ thuật có thể mở rộng cho triển khai thực tế ở quy mô lớn hơn.

## 2. Bối cảnh và vấn đề

Người dùng cá nhân thường gặp các vấn đề:
- Dữ liệu tiền nằm rải rác ở nhiều nguồn (tiền mặt, ngân hàng, ví điện tử).
- Khó duy trì kỷ luật nhập liệu do thao tác thủ công tốn thời gian.
- Thiếu góc nhìn định lượng rõ ràng về tổng thu, tổng chi, và xu hướng theo kỳ.

FinTrack AI giải quyết bằng một luồng thống nhất:
- Quản lý đa ví trong cùng một tài khoản.
- Ghi nhận giao dịch có idempotency để tránh trùng lặp.
- Cập nhật read model analytics qua event bus để truy vấn nhanh.
- Bổ sung AI chat/OCR/extract-text để giảm ma sát nhập liệu và tăng khả năng hỏi đáp.

## 3. Mục tiêu sản phẩm

### 3.1 Mục tiêu kinh doanh
- Hoàn thiện đồ án với kiến trúc kỹ thuật rõ ràng, có bằng chứng kiểm thử end-to-end.
- Chứng minh năng lực tích hợp AI vào bài toán tài chính cá nhân theo ngữ cảnh tiếng Việt.
- Thiết lập nền tảng có thể mở rộng thêm budget, forecast, mobile, open banking.

### 3.2 Mục tiêu người dùng
- Nhập giao dịch nhanh, giảm thời gian thao tác.
- Theo dõi số dư và biến động tài chính xuyên suốt theo kỳ.
- Hỏi đáp tài chính bằng ngôn ngữ tự nhiên và nhận phản hồi có ngữ cảnh dữ liệu cá nhân.

## 4. Đối tượng người dùng mục tiêu

- Sinh viên và người mới đi làm: cần công cụ đơn giản, dễ duy trì.
- Nhân viên văn phòng: cần theo dõi danh mục chi tiêu để tối ưu ngân sách cá nhân.
- Freelancer/kinh doanh nhỏ: cần tách ví theo mục đích và quan sát dòng tiền biến động.

## 5. Phạm vi chức năng (As-built)

### 5.1 Chức năng đã triển khai
- Xác thực tài khoản, quản lý token, hồ sơ người dùng.
- Cài đặt người dùng: locale, currency, theme, 2FA, cấu hình AI runtime.
- Quản lý ví (wallet), danh mục (category), giao dịch (transaction).
- Hóa đơn: upload, trích xuất dữ liệu, xác nhận tạo giao dịch.
- Quy tắc giao dịch định kỳ (recurring), mục tiêu tiết kiệm/đầu tư (savings).
- Dashboard analytics theo tháng/khoảng thời gian.
- Notification lưu trữ và phát realtime qua SSE.
- AI BFF tại gateway với 3 nhánh route:
  - record_transactions
  - analytics_chat
  - advisor_chat

### 5.2 Ngoài phạm vi phiên bản hiện tại
- Ứng dụng native iOS/Android.
- Đồng bộ Open Banking tự động.
- Cổng thanh toán trực tuyến.
- Cổng quản trị hệ thống chuyên biệt.

## 6. Kiến trúc hệ thống

Hệ thống gồm 8 dịch vụ độc lập:
- api-gateway: kiểm tra token, điều phối request, BFF cho AI.
- service-identity: auth + user + user settings.
- service-wallet: ví và số dư.
- service-transaction: transaction/category/invoice/recurring/saving/outbox.
- analytics-service: read model monthly_aggregates và API dashboard.
- notification-service: consume sự kiện và cung cấp notification API/SSE.
- ai-service (FastAPI): NLP, OCR, advisor pipeline, Gemini integration.
- cloud-service: upload/delete media Cloudinary.

Cơ chế liên dịch vụ:
- Event-driven qua RabbitMQ.
- Outbox pattern ở transaction-service.
- Dedup/idempotency ở producer và consumer để bảo toàn dữ liệu tài chính.

## 7. Danh mục tính năng (Feature Inventory)

| ID | Tính năng | Mô tả | Ưu tiên |
|---|---|---|---|
| F-001 | Authentication | Đăng ký, đăng nhập, refresh token | Must |
| F-002 | User Settings | 2FA, locale, currency, theme, runtime AI | Must |
| F-003 | Wallet | CRUD ví, theo dõi số dư | Must |
| F-004 | Transaction | Tạo và truy vấn giao dịch có idempotency | Must |
| F-005 | Category | Quản lý danh mục thu/chi | Must |
| F-006 | Invoice OCR | Trích xuất hóa đơn và xác nhận giao dịch | Should |
| F-007 | Recurring | Quy tắc giao dịch định kỳ | Should |
| F-008 | Savings | Mục tiêu tiết kiệm/đầu tư | Should |
| F-009 | Analytics | Summary, breakdown, trend | Must |
| F-010 | Notification | Danh sách thông báo + SSE | Should |
| F-011 | AI Chat Router | Định tuyến thông minh 3 nhánh | Must |
| F-012 | Extract Text | Tách nhiều draft giao dịch từ văn bản | Must |
| F-013 | Advisor Chat | Tư vấn/chỉ báo tri thức công khai | Should |

## 8. User Stories tiêu biểu

1. Là người dùng đã đăng nhập, tôi muốn tạo giao dịch chi tiêu để số dư ví cập nhật đúng.
2. Là người dùng, tôi muốn tạo nhiều ví để tách dòng tiền theo mục đích.
3. Là người dùng, tôi muốn xem dashboard theo tháng để biết tổng quan tài chính.
4. Là người dùng, tôi muốn gửi câu tự nhiên để hệ thống tự trích xuất giao dịch.
5. Là người dùng, tôi muốn hỏi AI về tổng chi/thu theo kỳ bằng tiếng Việt.
6. Là người dùng, tôi muốn upload hóa đơn và xác nhận trước khi lưu.
7. Là người dùng, tôi muốn nhận thông báo khi số dư có biến động.

## 9. Functional Requirements

### 9.1 Authentication & Identity
- FR-AUTH-01: Đăng ký bằng email duy nhất và mật khẩu hợp lệ.
- FR-AUTH-02: Đăng nhập trả về access token + refresh token.
- FR-AUTH-03: Access token TTL 40 phút.
- FR-AUTH-04: User có runtime AI config riêng (gemini_api_key, selected_ai_model).

### 9.2 Wallet
- FR-WAL-01: Tạo ví với walletType, walletName, balance ban đầu.
- FR-WAL-02: Liệt kê ví theo user đã xác thực.
- FR-WAL-03: Cập nhật trạng thái ví.
- FR-WAL-04: Cập nhật số dư qua event với optimistic locking.

### 9.3 Transaction & Category
- FR-TXN-01: Tạo transaction yêu cầu idempotency_key.
- FR-TXN-02: Transaction được tạo PENDING và finalize theo luồng event.
- FR-TXN-03: Truy vấn transaction theo user/wallet/thời gian.
- FR-TXN-04: Quản lý category theo categoryType (INCOME/EXPENSE).

### 9.4 Invoice/OCR
- FR-INV-01: Trích xuất merchantName, totalAmount, transactionDate.
- FR-INV-02: Chỉ tạo transaction sau bước confirm invoice.
- FR-INV-03: Lỗi OCR phải trả về schema lỗi rõ ràng.

### 9.5 Analytics
- FR-ANA-01: Dashboard trả summary (totalIncome, totalExpense, netCashFlow).
- FR-ANA-02: Trả breakdown theo danh mục và trend theo kỳ.
- FR-ANA-03: Read model được cập nhật bởi consumer event.

### 9.6 Notification
- FR-NOTI-01: Tạo notification khi có sự kiện wallet balance updated.
- FR-NOTI-02: API danh sách và đánh dấu đã đọc.
- FR-NOTI-03: Hỗ trợ stream SSE realtime.

### 9.7 AI Chat/NLP qua Gateway BFF
- FR-AI-01: /api/v1/ai/chat định tuyến 3 route hợp lệ.
- FR-AI-02: Guardrail ưu tiên advisor cho market query và analytics cho personal metrics query.
- FR-AI-03: Route record_transactions gọi extract-text, map category, tạo transaction hàng loạt.
- FR-AI-04: Route analytics_chat enrich financialContext từ analytics-service.
- FR-AI-05: Route advisor_chat gọi advisor pipeline và map intent về schema thống nhất.
- FR-AI-06: Ghi usage logs khi có model/usage khả dụng.

## 10. Business Rules

- BR-001: amount giao dịch > 0.
- BR-002: transaction_type chỉ nhận INCOME hoặc EXPENSE.
- BR-003: idempotency_key bắt buộc cho tác vụ ghi tài chính.
- BR-004: Dữ liệu cách ly theo user.
- BR-005: OCR bắt buộc confirm trước khi tạo transaction.
- BR-006: NLP extract có thể trả nhiều draft, chỉ draft hợp lệ mới được ghi.
- BR-007: Route AI phải qua guardrail trước khi execute.
- BR-008: Luồng event chấp nhận eventual consistency có kiểm soát.
- BR-009: Timeout/rate-limit từ AI phải trả lỗi có cấu trúc, không làm sập hệ thống.

## 11. Dữ liệu chính

- Identity DB: users, user_settings.
- Wallet DB: wallets (+ processed_transaction_ids ở consumer model).
- Transaction DB: transactions, categories, recurring_rules, savings, invoices, outbox.
- Analytics DB: monthly_aggregates.
- Notification DB: notifications.

## 12. Quy trình nghiệp vụ trọng tâm

### 12.1 Luồng tạo giao dịch chuẩn
1. Client gửi request tạo transaction.
2. transaction-service ghi transaction PENDING + outbox record.
3. Outbox publisher phát sự kiện lên RabbitMQ.
4. wallet-service consume và cập nhật số dư.
5. wallet-service phát wallet.balance.updated.
6. transaction-service consume phản hồi, finalize transaction.
7. analytics-service cập nhật aggregate theo tháng.
8. notification-service tạo thông báo cho user.

### 12.2 Luồng AI chat nội bộ (analytics_chat)
1. Gateway nhận câu hỏi.
2. Router + guardrail xác định route.
3. Gateway lấy financial context từ analytics dashboard (cache TTL).
4. Gửi payload đã enrich sang ai-service /ai/chat.
5. Trả answer + query_plan.router + meta.routePlan.

### 12.3 Luồng AI ghi giao dịch (record_transactions)
1. Router nhận diện intent ghi giao dịch.
2. Gateway gọi /ai/extract-text.
3. Parse draft transactions từ raw_output.
4. Gọi wallet/category services để map dữ liệu.
5. Tạo giao dịch hàng loạt với idempotency key.
6. Trả kết quả đã lưu cùng metadata chi tiết.

## 13. Non-functional Requirements

### 13.1 Reliability
- Bảo toàn dữ liệu qua outbox + idempotency + dedup.
- Có fallback heuristic khi LLM router không khả dụng.
- Có timeout chủ động cho mọi cuộc gọi AI/context/tool.

### 13.2 Performance
- API nghiệp vụ thường: mục tiêu p95 < 500ms (ngoại trừ AI call).
- Dashboard ưu tiên read model để giảm latency.
- AI route có hard timeout để không treo request.

### 13.3 Security
- JWT kiểm soát truy cập qua gateway và service.
- Mật khẩu hash trước khi lưu.
- API key Gemini lưu server-side theo settings/env.

### 13.4 Maintainability
- Bounded context theo microservice.
- TypeScript strict cho backend Node.
- AI service tách độc lập để dễ thay đổi model/provider.

## 14. Acceptance Criteria cấp hệ thống

- AC-01: Login thành công trả token hợp lệ và gọi được API có bảo vệ.
- AC-02: Tạo transaction thành công làm thay đổi trạng thái/so-du/analytics theo luồng event.
- AC-03: AI chat nội bộ trả kết quả đúng schema và có route plan.
- AC-04: AI chat thị trường đi advisor route.
- AC-05: OCR flow yêu cầu xác nhận trước khi sinh transaction.
- AC-06: Notification có thể truy vấn và nhận realtime.

## 15. Rủi ro và kiểm soát

| Rủi ro | Tác động | Kiểm soát |
|---|---|---|
| 429/503 từ AI provider | Gián đoạn AI feature | Fallback + thông báo lỗi cấu trúc + test schema-first |
| Duplicate event/request | Sai số dư hoặc trùng giao dịch | idempotency_key + dedup consumer + optimistic locking |
| Event propagation delay | Dashboard cập nhật trễ | Outbox polling + monitor queue + eventual consistency |
| Router chọn route chưa tối ưu | Trả lời kém phù hợp | Guardrail heuristic bổ sung |
| OCR sai | Tạo dữ liệu sai | Bắt buộc confirm bởi người dùng |

## 16. KPI vận hành đề xuất

- Tỷ lệ ghi transaction thành công không duplicate: >= 99%.
- Tỷ lệ AI request thành công (không timeout): >= 95%.
- Tỷ lệ extract/OCR trả kết quả parse hợp lệ: >= 80% trên bộ dữ liệu test.
- Độ trễ đồng bộ event transaction -> wallet -> analytics: <= 10 giây (môi trường demo).

## 17. Lộ trình phát triển tiếp theo

### Ngắn hạn
- Chuẩn hóa contract sự kiện bằng shared package.
- Cải thiện UX xử lý lỗi 429/503 trên AI views.
- Bổ sung smoke test định kỳ cho outbox và các consumer.

### Trung hạn
- Budget theo danh mục và cảnh báo vượt ngân sách.
- Xuất báo cáo PDF/Excel.
- Nâng cao observability (trace, metrics, alerting).

### Dài hạn
- Mobile app native/hybrid.
- Open Banking integration.
- Cá nhân hóa gợi ý tài chính sâu hơn theo lịch sử dài hạn.

---

Tài liệu này là bản PRD học thuật hóa từ hệ thống đã triển khai (as-built), đồng bộ với mã nguồn và kiểm thử end-to-end tại thời điểm cập nhật.