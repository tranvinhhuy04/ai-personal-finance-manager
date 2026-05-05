# Danh sách Test Case Bao phủ Toàn hệ thống

Tài liệu này là ma trận test case chuẩn cho lần kiểm chứng hệ thống hiện tại.

## Quy ước cột
- Input: dữ liệu đầu vào hoặc request chính.
- Expected Result: kết quả kỳ vọng để xác định pass/fail.

| ID | Module | Test Case | Input | Expected Result |
|---|---|---|---|---|
| TC-SYS-001 | Gateway | Gateway health endpoint hoạt động | GET http://127.0.0.1:3000/health | HTTP 200, status=ok |
| TC-SYS-002 | Identity Service | Identity health endpoint hoạt động | GET http://127.0.0.1:3001/health | HTTP 200 |
| TC-SYS-003 | Wallet Service | Wallet health endpoint hoạt động | GET http://127.0.0.1:3002/health | HTTP 200, service=wallet-service |
| TC-SYS-004 | Transaction Service | Transaction health endpoint hoạt động | GET http://127.0.0.1:3003/health | HTTP 200, service=transaction-service |
| TC-SYS-005 | Analytics Service | Analytics health endpoint hoạt động | GET http://127.0.0.1:3004/health | HTTP 200, service=analytics-service |
| TC-SYS-006 | Notification Service | Notification health endpoint hoạt động | GET http://127.0.0.1:3005/health | HTTP 200, service=notification-service |
| TC-SYS-007 | Cloud Service | Cloud health endpoint hoạt động | GET http://127.0.0.1:3006/health | HTTP 200, status=ok |
| TC-SYS-008 | AI Service | AI service health endpoint hoạt động | GET http://127.0.0.1:8000/health | HTTP 200, status=ok |
| TC-SYS-009 | Auth | Login API thành công | POST /api/v1/auth/login (account seed) | HTTP 200, trả accessToken |
| TC-SYS-010 | Auth | Lấy thông tin người dùng đăng nhập | GET /api/v1/auth/me | HTTP 200, email khớp account test |
| TC-SYS-011 | Identity Settings | Lấy user settings | GET /api/v1/settings | HTTP 200, có currency/locale/theme |
| TC-SYS-012 | AI Provider | Kiểm tra trạng thái provider | GET /api/v1/ai/provider-status | HTTP 200, success=true, có status |
| TC-SYS-013 | Wallet | Lấy danh sách ví | GET /api/v1/wallets | HTTP 200, danh sách ví > 0 |
| TC-SYS-014 | Category | Lấy danh mục chi tiêu | GET /api/v1/categories?category_type=EXPENSE | HTTP 200, danh sách category > 0 |
| TC-SYS-015 | Transaction | Tạo giao dịch mới | POST /api/v1/transactions (wallet_id, category_id, idempotency_key...) | HTTP 201, có transaction id |
| TC-SYS-016 | Transaction | Kiểm tra giao dịch vừa tạo | GET /api/v1/transactions?limit=100 | Có description giao dịch vừa tạo |
| TC-SYS-017 | Analytics | Dashboard có summary hợp lệ | GET /api/v1/analytics/dashboard | HTTP 200, summary số hợp lệ |
| TC-SYS-018 | Notification | Danh sách thông báo trả đúng schema | GET /api/v1/notifications | HTTP 200, notifications/list hợp lệ |
| TC-SYS-019 | AI Chat Router | Câu hỏi tài chính nội bộ route đúng | POST /api/v1/ai/chat (tổng chi tháng) | success=true, route analytics/advisor hợp lệ |
| TC-SYS-020 | AI Chat Router | Câu hỏi thị trường route advisor | POST /api/v1/ai/chat (giá vàng) | success=true, route advisor_chat |
| TC-E2E-001 | Dashboard/Analytics | Số dư dashboard khớp dữ liệu seed | UI Dashboard + seed summary | Số dư UI = expected.totalBalance |
| TC-E2E-002 | Analytics UI | Biểu đồ render ổn định theo năm | UI Analytics filter 2025/2026 | Chart render hợp lệ |
| TC-E2E-003 | AI Chat Internal | Tổng chi năm 2025 khớp seed | POST /api/v1/ai/chat | route analytics_chat + số liệu đúng |
| TC-E2E-004 | AI Chat + Analytics | Chi ăn uống tháng 4/2026 đúng | AI chat + analytics dashboard | value food = expected seed |
| TC-E2E-005 | AI Chat External | Grounding câu hỏi giá vàng | POST /api/v1/ai/chat | route advisor_chat + answer hợp lệ |
| TC-E2E-006 | AI Extract Text | Parse giao dịch mua cafe 50k | POST /api/v1/ai/extract-text | amount/category đúng hoặc 429 có cấu trúc |
