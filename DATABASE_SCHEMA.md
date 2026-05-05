# Thiết kế Cơ sở dữ liệu Microservices - Fintech (MongoDB Atlas)

> **Cập nhật lần cuối:** 03/05/2026 — đồng bộ với mã nguồn hiện tại

## 1. Nguyên tắc thiết kế dữ liệu

### 1.1 Database per Service

Mỗi microservice sở hữu database MongoDB riêng biệt trên MongoDB Atlas. Không truy cập trực tiếp dữ liệu vật lý của service khác. Tương tác liên dịch vụ thông qua API/Event để giảm coupling và tăng khả năng mở rộng độc lập.

### 1.2 Tách rõ mô hình giao dịch và phân tích

- Dữ liệu nghiệp vụ tài chính cốt lõi (Wallet, Transaction) ưu tiên tính toàn vẹn và idempotency ở tầng ứng dụng.
- Dữ liệu phân tích (Analytics) ưu tiên tốc độ truy vấn đọc, chấp nhận eventual consistency có kiểm soát.

### 1.3 Nguyên tắc toàn vẹn dữ liệu tài chính

- Mọi cập nhật số dư cần idempotency.
- Lưu vết đầy đủ trạng thái giao dịch.
- Có cơ chế đối soát định kỳ (reconciliation).

## 2. Identity Service (MongoDB Atlas)

### Collection: users

| Trường      | Kiểu dữ liệu | Chỉ mục    | Ràng buộc           | Mô tả                                           |
| ------------- | --------------- | ------------ | --------------------- | ------------------------------------------------- |
| _id           | ObjectId/UUID   | PK           | NOT NULL              | Định danh người dùng                         |
| email         | String          | Unique Index | NOT NULL              | Email đăng nhập                                |
| password_hash | String          |              | NOT NULL              | Mật khẩu đã băm                              |
| full_name     | String          |              | NOT NULL              | Họ tên người dùng                            |
| phone         | String          |              | NULL                  | Số điện thoại                                 |
| status        | Number (1/0)    | Index        | NOT NULL, default 1   | Trạng thái tài khoản (1: Active, 0: Inactive) |
| created_at    | Date            |              | NOT NULL, default now | Thời điểm tạo                                 |
| updated_at    | Date            |              | NOT NULL              | Thời điểm cập nhật                           |

#### Chỉ mục đề xuất

- Unique index trên email.
- Index trên status để tối ưu lọc tài khoản.

### Collection: user_settings

| Trường           | Kiểu dữ liệu | Chỉ mục    | Ràng buộc               | Mô tả                                |
| ------------------ | --------------- | ------------ | ------------------------- | -------------------------------------- |
| _id                | ObjectId/UUID   | PK           | NOT NULL                  | Định danh bản ghi cài đặt        |
| user_id             | ObjectId/UUID   | Unique Index | NOT NULL                           | Tham chiếu users._id (1-1)                          |
| two_factor_enabled  | Boolean         |              | NOT NULL, default false            | Bật/tắt 2FA                                        |
| two_factor_method   | String          |              | NULL                               | TOTP/SMS/EMAIL                                      |
| two_factor_secret   | String          |              | NULL                               | Secret cho 2FA, lưu ở dạng mã hóa              |
| preferred_currency  | String          |              | NOT NULL, default 'VND'            | Tiền tệ mặc định                               |
| locale              | String          |              | NOT NULL, default 'vi-VN'          | Ngôn ngữ vùng                                    |
| theme               | String          |              | NOT NULL, default 'dark'           | Giao diện: 'dark' hoặc 'light'                  |
| gemini_api_key      | String          |              | NULL                               | Gemini API key do người dùng cấu hình (runtime) |
| selected_ai_model   | String          |              | NOT NULL, default 'gemini-2.5-flash' | Model AI đang chọn                              |
| ai_usage_logs       | Array\<Object\> |              | NOT NULL, default []               | Lịch sử sử dụng AI (date, model, tokens_used, estimated_cost) |
| updated_at          | Date            |              | NOT NULL                           | Thời điểm cập nhật                             |

#### Quan hệ

- user_settings.user_id tham chiếu users._id (1-1, enforced by application logic).

#### Cấu trúc phần tử ai_usage_logs

- `date`: String (ISO date)
- `model`: String (tên model đã dùng)
- `tokens_used`: Number
- `estimated_cost`: Number (USD)

## 3. Wallet Service (MongoDB Atlas)

### Collection: wallets

| Trường       | Kiểu dữ liệu | Chỉ mục | Ràng buộc           | Mô tả                            |
| -------------- | --------------- | --------- | --------------------- | ---------------------------------- |
| _id            | ObjectId/UUID   | PK        | NOT NULL              | Định danh ví                    |
| user_id        | ObjectId/UUID   | Index     | NOT NULL              | Định danh chủ ví               |
| wallet_type    | String          | Index     | NOT NULL              | CARD/MOMO/ZALOPAY/CASH             |
| wallet_name    | String          |           | NOT NULL              | Tên hiển thị ví                |
| balance        | Decimal128      |           | NOT NULL, default 0   | Số dư hiện tại                 |
| status         | Number (1/0/2)  | Index     | NOT NULL, default 1   | 1: Active, 0: Inactive, 2: Blocked |
| version        | NumberLong      |           | NOT NULL, default 0   | Version để optimistic locking    |
| created_at     | Date            |           | NOT NULL, default now | Thời điểm tạo                  |
| updated_at     | Date            |           | NOT NULL              | Thời điểm cập nhật            |

#### Ràng buộc nghiệp vụ (application logic)

- balance >= 0 nếu không hỗ trợ thấu chi.

#### Chỉ mục đề xuất

- Compound index: `{ user_id: 1, status: 1 }` cho truy vấn danh sách ví của người dùng.
- Index `wallet_type` phục vụ thống kê theo loại ví.

#### Ghi chú về model nội bộ consumer (`wallet.model.ts`)

Wallet Consumer (RabbitMQ) sử dụng model nội bộ riêng với thêm trường:
- `processed_transaction_ids`: `[String]`, default `[]` — danh sách `transaction_id` đã xử lý, dùng để deduplication idempotency tại tầng consumer.
- Compound index: `{ user_id: 1, wallet_type: 1 }`.

## 4. Transaction Service (MongoDB Atlas)

### Collection: transactions

| Trường           | Kiểu dữ liệu | Chỉ mục      | Ràng buộc                | Mô tả                                                         |
| ------------------ | --------------- | -------------- | -------------------------- | --------------------------------------------------------------- |
| _id                | ObjectId/UUID   | PK             | NOT NULL                   | Mã giao dịch                                                  |
| wallet_id          | ObjectId/UUID   | Index          | NOT NULL                   | Định danh ví liên quan                                     |
| user_id            | ObjectId/UUID   | Index          | NOT NULL, default null     | Định danh người dùng                                      |
| category_id        | ObjectId/UUID   | Index          | NULL                       | Tham chiếu categories._id                                     |
| transaction_type   | String          |                | NOT NULL                   | INCOME/EXPENSE                                                 |
| amount             | Decimal128      |                | NOT NULL, amount > 0       | Số tiền giao dịch                                          |
| currency           | String          |                | NOT NULL, default 'VND'    | Loại tiền                                                    |
| status             | String          | Index          | NOT NULL, default 'PENDING' | PENDING/COMPLETED/FAILED/REVERSED                             |
| source             | String          |                | NOT NULL, default 'MANUAL' | Nguồn tạo: MANUAL/INVOICE_CONFIRMATION/RECURRING/SAVING      |
| description        | String          |                | NULL                       | Mô tả giao dịch                                            |
| occurred_at        | Date            | Index          | NOT NULL, default now      | Thời điểm phát sinh                                       |
| idempotency_key    | String          | Unique Index   | NOT NULL                   | Chống ghi trùng do retry                                    |
| created_at, updated_at | Date        |                | NOT NULL (timestamps)      | Thời điểm tạo và cập nhật (Mongoose timestamps)          |

#### Ràng buộc và chỉ mục quan trọng

- Unique index trên `idempotency_key` — format: `manual:<uuid>` / `recurring:<ruleId>:<YYYY-MM-DD>` / `invoice:<invoiceId>`.
- Compound index `{ user_id: 1, occurred_at: -1 }` tối ưu lịch sử giao dịch.
- Compound index `{ wallet_id: 1, occurred_at: -1 }` tối ưu tra cứu theo ví.
- Index `status` phục vụ đối soát và xử lý nền.

### Collection: categories

| Trường       | Kiểu dữ liệu | Chỉ mục | Ràng buộc             | Mô tả                  |
| -------------- | --------------- | --------- | ----------------------- | ------------------------ |
| _id            | ObjectId/UUID   | PK        | NOT NULL                | Định danh danh mục    |
| userId         | String          | Index     | NOT NULL                | Chủ sở hữu danh mục  |
| name           | String          |           | NOT NULL                | Tên danh mục           |
| categoryType   | String          | Index     | NOT NULL                | INCOME/EXPENSE           |
| parentId       | String          |           | NULL                    | Danh mục cha (nếu có) |
| isSystem       | Boolean         | Index     | NOT NULL, default false | Danh mục hệ thống     |
| status         | Number (1/0)    | Index     | NOT NULL, default 1     | Trạng thái danh mục   |
| created_at     | Date            |           | NOT NULL, default now   | Thời điểm tạo        |

#### Chỉ mục đề xuất

- Compound index: `{ userId: 1, categoryType: 1, status: 1, name: 1 }`.
- `categories.parentId` tham chiếu `categories._id` (self-reference, enforced by application logic).

### Collection: recurring_rules

| Trường         | Kiểu dữ liệu | Chỉ mục | Ràng buộc              | Mô tả                                      |
| ---------------- | --------------- | --------- | ------------------------ | -------------------------------------------- |
| _id              | ObjectId/UUID   | PK        | NOT NULL                 | Định danh quy tắc                        |
| user_id          | String          | Index     | NOT NULL                 | Định danh người dùng                    |
| wallet_id        | String          | Index     | NOT NULL                 | Ví áp dụng                               |
| category_id      | String          |           | NULL                     | Danh mục (tuỳ chọn)                    |
| transaction_type | String          |           | NOT NULL                 | INCOME/EXPENSE                               |
| amount           | Decimal128      |           | NOT NULL                 | Số tiền mỗi kỳ                         |
| currency         | String          |           | NOT NULL, default 'VND'  | Loại tiền                                |
| frequency        | String          | Index     | NOT NULL                 | WEEKLY/MONTHLY                               |
| day_of_week      | Number (0–6)    |           | NULL                     | Ngày trong tuần (0=CN, dùng cho WEEKLY) |
| day_of_month     | Number (1–31)   |           | NULL                     | Ngày trong tháng (dùng cho MONTHLY)       |
| note             | String          |           | NULL                     | Ghi chú                                    |
| status           | String          | Index     | NOT NULL, default 'ACTIVE' | ACTIVE/PAUSED                              |
| last_run_on      | String          |           | NULL                     | Ngày chạy lần cuối (YYYY-MM-DD)          |

#### Chỉ mục đề xuất

- Compound index: `{ status: 1, frequency: 1 }` — cron job dùng để lọc luật cần chạy hôm nay.
- Compound index: `{ user_id: 1, wallet_id: 1 }`.

### Collection: savings

| Trường        | Kiểu dữ liệu | Chỉ mục | Ràng buộc              | Mô tả                            |
| --------------- | --------------- | --------- | ------------------------ | ---------------------------------- |
| _id             | ObjectId/UUID   | PK        | NOT NULL                 | Định danh mục tiêu            |
| user_id         | String          | Index     | NOT NULL                 | Định danh người dùng          |
| name            | String          |           | NOT NULL                 | Tên mục tiêu                   |
| type            | String          | Index     | NOT NULL                 | SAVING/INVESTMENT                  |
| target_amount   | Decimal128      |           | NULL                     | Số tiền mục tiêu (có thể null) |
| current_amount  | Decimal128      |           | NOT NULL, default 0      | Số tiền đã tích luỹ           |
| start_date      | Date            |           | NOT NULL, default now    | Ngày bắt đầu                   |
| end_date        | Date            |           | NULL                     | Ngày kết thúc (tuỳ chọn)     |
| status          | String          | Index     | NOT NULL, default 'ACTIVE' | ACTIVE/SETTLED                   |

#### Chỉ mục đề xuất

- Compound index: `{ user_id: 1, type: 1, status: 1, end_date: 1 }`.

### Collection: invoices

| Trường         | Kiểu dữ liệu | Chỉ mục | Ràng buộc           | Mô tả                                         |
| ---------------- | --------------- | --------- | --------------------- | ----------------------------------------------- |
| _id              | ObjectId/UUID   | PK        | NOT NULL              | Định danh hoá đơn                          |
| user_id          | String          | Index     | NOT NULL              | Định danh người dùng                       |
| image_url        | String          |           | NOT NULL              | URL ảnh hoá đơn (Cloudinary)               |
| extracted_data   | Mixed           |           | NULL                  | Dữ liệu trích xuất (merchantName, totalAmount, transactionDate) |
| status           | String          | Index     | NOT NULL, default 'PENDING' | PENDING/CONFIRMED/REJECTED               |
| created_at       | Date            |           | NOT NULL, default now | Thời điểm tạo                             |
| updated_at       | Date            |           | NOT NULL              | Thời điểm cập nhật                       |

### Collection: outbox

| Trường       | Kiểu dữ liệu | Chỉ mục | Ràng buộc              | Mô tả                                       |
| -------------- | --------------- | --------- | ------------------------ | --------------------------------------------- |
| _id            | ObjectId        | PK        | NOT NULL                 | Định danh bản ghi outbox                 |
| event_type     | String          | Index     | NOT NULL                 | Loại sự kiện (TRANSACTION_CREATED, ...)    |
| payload        | Mixed           |           | NOT NULL                 | Dữ liệu sự kiện                           |
| published      | Boolean         | Index     | NOT NULL, default false  | Đã phát lên RabbitMQ chưa                |
| published_at   | Date            |           | NULL                     | Thời điểm phát thành công                |
| created_at     | Date            |           | NOT NULL, default now    | Thời điểm tạo                             |

## 5. Analytics Service (MongoDB Atlas)

### Collection: monthly_aggregates

| Trường        | Kiểu dữ liệu   | Chỉ mục      | Ràng buộc         | Mô tả                              |
| --------------- | ----------------- | -------------- | ------------------- | ------------------------------------ |
| _id             | ObjectId          | PK             | NOT NULL            | Định danh tài liệu               |
| user_id         | String            | Index          | NOT NULL            | Định danh người dùng            |
| month           | String            | Compound Index | NOT NULL            | Định dạng YYYY-MM                 |
| totalIncome     | Number            |                | NOT NULL, default 0 | Tổng thu theo tháng                |
| totalExpense    | Number            |                | NOT NULL, default 0 | Tổng chi theo tháng                |
| netCashFlow     | Number            |                | NOT NULL, default 0 | Dòng tiền ròng (Income - Expense) |
| byCategory      | Array\<Object\> |                | NOT NULL, default [] | Mảng tổng hợp theo danh mục     |
| byWallet        | Array\<Object\> |                | NOT NULL, default [] | Mảng tổng hợp theo ví           |
| generatedAt     | Date              |                | NOT NULL            | Thời điểm tạo aggregate          |
| sourceVersion   | Number            |                | NOT NULL, default 0 | Version sự kiện đã xử lý       |

#### Cấu trúc phần tử byCategory

- `category_id`: String
- `category_name`: String
- `total_amount`: Number
- `transaction_count`: Number

#### Cấu trúc phần tử byWallet

- `wallet_id`: String
- `wallet_name`: String
- `total_amount`: Number
- `transaction_count`: Number

#### Chỉ mục đề xuất

- Unique compound index: `{ user_id: 1, month: 1 }`.
- Index hỗ trợ lịch sử: `{ user_id: 1, generatedAt: -1 }`.

## 6. Notification Service (MongoDB Atlas)

### Collection: notifications

| Trường     | Kiểu dữ liệu | Chỉ mục | Ràng buộc              | Mô tả                                        |
| ------------ | --------------- | --------- | ------------------------ | ---------------------------------------------- |
| _id          | ObjectId        | PK        | NOT NULL                 | Định danh thông báo                       |
| user_id      | String          | Index     | NOT NULL                 | Định danh người dùng                      |
| title        | String          |           | NOT NULL                 | Tiêu đề thông báo                        |
| message      | String          |           | NOT NULL                 | Nội dung thông báo                        |
| type         | String          |           | NOT NULL, default 'INFO' | INFO/SUCCESS/WARNING/ALERT/REMINDER          |
| is_read      | Boolean         | Index     | NOT NULL, default false  | Đã đọc chưa                               |
| metadata     | Mixed           |           | NULL                     | Dữ liệu tuỳ chọn kèm theo (walletId, ...) |
| created_at   | Date            | Index     | NOT NULL, default now    | Thời điểm tạo                             |

#### Chỉ mục đề xuất

- Compound index: `{ user_id: 1, created_at: -1 }` cho lịch sử thông báo.
- Index `is_read` phục vụ đếm số chưa đọc.

## 7. Cơ chế giao tiếp liên dịch vụ (Inter-service Communication)

### 7.1 Bài toán

Transaction Service cần cập nhật số dư Wallet, thông báo Analytics và Notification Service một cách an toàn sau giao dịch, tránh lệch dữ liệu khi có retry, timeout hoặc lỗi mạng.

### 7.2 Phương án thực tế đã triển khai

Kết hợp **Transactional Outbox Pattern** và giao tiếp bất đồng bộ qua **RabbitMQ**, với Outbox polling mỗi 5 giây.

### 7.3 Luồng xử lý thực tế

1. Transaction Service tạo bản ghi giao dịch trạng thái `PENDING` và ghi `OutboxModel` record (`event_type: TRANSACTION_CREATED`) trong cùng một thao tác DB.
2. `OutboxPublisher` polling mỗi 5s (batch tối đa 20 records) → publish lên exchange `TRANSACTION_EVENTS` (routing key `TRANSACTION_CREATED`).
3. **Wallet Service** (`WalletConsumer`) consume queue `WALLET_BALANCE_UPDATES` → kiểm tra `processed_transaction_ids` (idempotency) → cập nhật số dư bằng optimistic locking (`version`) → phát `WalletBalanceUpdated` hoặc `WalletBalanceUpdateFailed` lên exchange `WALLET_EVENTS`.
4. **Analytics Service** (`AnalyticsConsumer`) consume queue `ANALYTICS_TRANSACTION_EVENTS` → upsert `MonthlyAggregate` theo `{ user_id, month }`.
5. **Notification Service** consume sự kiện cập nhật số dư → tạo bản ghi `notifications` → push SSE đến frontend.

### 7.4 Tên Exchange / Queue thực tế

| Exchange / Queue               | Loại     | Mô tả                                  |
| -------------------------------- | ---------- | ---------------------------------------- |
| `TRANSACTION_EVENTS` (exchange) | topic      | Nguồn phát của Transaction Service     |
| `WALLET_BALANCE_UPDATES` (queue) | durable   | Wallet Service consume                  |
| `WALLET_EVENTS` (exchange)      | topic      | Nguồn phát của Wallet Service           |
| `ANALYTICS_TRANSACTION_EVENTS` (queue) | durable | Analytics Service consume         |

### 7.5 Biện pháp tránh lỗi bất đồng bộ

- Bắt buộc `idempotency_key` cho mọi tác vụ ghi tài chính.
- Consumer wallet dùng `processed_transaction_ids` để dedup tại tầng message.
- Outbox guard `isPublishing` tránh concurrent polling.
- Mọi consumer đều ack message sau khi xử lý — kể cả trường hợp duplicate hoặc lỗi nghiệp vụ.
- Không cho phép truy vấn/ghi chéo trực tiếp vào DB của service khác.

## 8. Ghi chú chuẩn hóa dữ liệu liên service

- Dùng chuẩn thời gian UTC cho toàn hệ thống.
- Quy ước mã tiền tệ theo ISO 4217 (ví dụ: VND, USD).
- Trường trạng thái dùng enum chuẩn hóa để dễ giám sát và báo cáo.
- Cloud Service không có database riêng — lưu ảnh lên Cloudinary, trả về `imageUrl` và `publicId` cho service gọi lưu tham chiếu.
