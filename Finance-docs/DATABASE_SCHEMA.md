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

| Trường           | Kiểu dữ liệu | Chỉ mục    | Ràng buộc                          | Mô tả                                                           |
| ------------------ | --------------- | ------------ | ------------------------------------ | ----------------------------------------------------------------- |
| _id                | ObjectId/UUID   | PK           | NOT NULL                             | Định danh bản ghi cài đặt                                   |
| user_id            | ObjectId/UUID   | Unique Index | NOT NULL                             | Tham chiếu users._id (1-1)                                       |
| two_factor_enabled | Boolean         |              | NOT NULL, default false              | Bật/tắt 2FA                                                     |
| two_factor_method  | String          |              | NULL                                 | TOTP/SMS/EMAIL                                                    |
| two_factor_secret  | String          |              | NULL                                 | Secret cho 2FA, lưu ở dạng mã hóa                            |
| preferred_currency | String          |              | NOT NULL, default 'VND'              | Tiền tệ mặc định                                             |
| locale             | String          |              | NOT NULL, default 'vi-VN'            | Ngôn ngữ vùng                                                  |
| theme              | String          |              | NOT NULL, default 'dark'             | Giao diện: 'dark' hoặc 'light'                                  |
| gemini_api_key     | String          |              | NULL                                 | Gemini API key do người dùng cấu hình (runtime)              |
| selected_ai_model  | String          |              | NOT NULL, default 'gemini-2.5-flash' | Model AI đang chọn                                              |
| ai_usage_logs      | Array\<Object\> |              | NOT NULL, default []                 | Lịch sử sử dụng AI (date, model, tokens_used, estimated_cost) |
| updated_at         | Date            |              | NOT NULL                             | Thời điểm cập nhật                                           |

#### Quan hệ

- user_settings.user_id tham chiếu users._id (1-1, enforced by application logic).

#### Cấu trúc phần tử ai_usage_logs

- `date`: String (ISO date)
- `model`: String (tên model đã dùng)
- `tokens_used`: Number
- `estimated_cost`: Number (USD)

## 3. Wallet Service (MongoDB Atlas)

### Collection: wallets

| Trường    | Kiểu dữ liệu | Chỉ mục | Ràng buộc           | Mô tả                            |
| ----------- | --------------- | --------- | --------------------- | ---------------------------------- |
| _id         | ObjectId/UUID   | PK        | NOT NULL              | Định danh ví                    |
| user_id     | ObjectId/UUID   | Index     | NOT NULL              | Định danh chủ ví               |
| wallet_type | String          | Index     | NOT NULL              | CARD/MOMO/ZALOPAY/CASH             |
| wallet_name | String          |           | NOT NULL              | Tên hiển thị ví                |
| balance     | Decimal128      |           | NOT NULL, default 0   | Số dư hiện tại                 |
| status      | Number (1/0/2)  | Index     | NOT NULL, default 1   | 1: Active, 0: Inactive, 2: Blocked |
| version     | NumberLong      |           | NOT NULL, default 0   | Version để optimistic locking    |
| created_at  | Date            |           | NOT NULL, default now | Thời điểm tạo                  |
| updated_at  | Date            |           | NOT NULL              | Thời điểm cập nhật            |

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

| Trường               | Kiểu dữ liệu | Chỉ mục    | Ràng buộc                 | Mô tả                                                   |
| ---------------------- | --------------- | ------------ | --------------------------- | --------------------------------------------------------- |
| _id                    | ObjectId/UUID   | PK           | NOT NULL                    | Mã giao dịch                                            |
| wallet_id              | ObjectId/UUID   | Index        | NOT NULL                    | Định danh ví liên quan                                |
| user_id                | ObjectId/UUID   | Index        | NOT NULL, default null      | Định danh người dùng                                 |
| category_id            | ObjectId/UUID   | Index        | NULL                        | Tham chiếu categories._id                                |
| transaction_type       | String          |              | NOT NULL                    | INCOME/EXPENSE                                            |
| amount                 | Decimal128      |              | NOT NULL, amount > 0        | Số tiền giao dịch                                      |
| currency               | String          |              | NOT NULL, default 'VND'     | Loại tiền                                               |
| status                 | String          | Index        | NOT NULL, default 'PENDING' | PENDING/COMPLETED/FAILED/REVERSED                         |
| source                 | String          |              | NOT NULL, default 'MANUAL'  | Nguồn tạo: MANUAL/INVOICE_CONFIRMATION/RECURRING/SAVING |
| description            | String          |              | NULL                        | Mô tả giao dịch                                        |
| occurred_at            | Date            | Index        | NOT NULL, default now       | Thời điểm phát sinh                                   |
| idempotency_key        | String          | Unique Index | NOT NULL                    | Chống ghi trùng do retry                                |
| created_at, updated_at | Date            |              | NOT NULL (timestamps)       | Thời điểm tạo và cập nhật (Mongoose timestamps)    |

#### Ràng buộc và chỉ mục quan trọng

- Unique index trên `idempotency_key` — format: `manual:<uuid>` / `recurring:<ruleId>:<YYYY-MM-DD>` / `invoice:<invoiceId>`.
- Compound index `{ user_id: 1, occurred_at: -1 }` tối ưu lịch sử giao dịch.
- Compound index `{ wallet_id: 1, occurred_at: -1 }` tối ưu tra cứu theo ví.
- Index `status` phục vụ đối soát và xử lý nền.

### Collection: categories

| Trường     | Kiểu dữ liệu | Chỉ mục | Ràng buộc             | Mô tả                  |
| ------------ | --------------- | --------- | ----------------------- | ------------------------ |
| _id          | ObjectId/UUID   | PK        | NOT NULL                | Định danh danh mục    |
| userId       | String          | Index     | NOT NULL                | Chủ sở hữu danh mục  |
| name         | String          |           | NOT NULL                | Tên danh mục           |
| categoryType | String          | Index     | NOT NULL                | INCOME/EXPENSE           |
| parentId     | String          |           | NULL                    | Danh mục cha (nếu có) |
| isSystem     | Boolean         | Index     | NOT NULL, default false | Danh mục hệ thống     |
| status       | Number (1/0)    | Index     | NOT NULL, default 1     | Trạng thái danh mục   |
| created_at   | Date            |           | NOT NULL, default now   | Thời điểm tạo        |

#### Chỉ mục đề xuất

- Compound index: `{ userId: 1, categoryType: 1, status: 1, name: 1 }`.
- `categories.parentId` tham chiếu `categories._id` (self-reference, enforced by application logic).

### Collection: recurring_rules

| Trường         | Kiểu dữ liệu | Chỉ mục | Ràng buộc                | Mô tả                                    |
| ---------------- | --------------- | --------- | -------------------------- | ------------------------------------------ |
| _id              | ObjectId/UUID   | PK        | NOT NULL                   | Định danh quy tắc                       |
| user_id          | String          | Index     | NOT NULL                   | Định danh người dùng                  |
| wallet_id        | String          | Index     | NOT NULL                   | Ví áp dụng                              |
| category_id      | String          |           | NULL                       | Danh mục (tuỳ chọn)                     |
| transaction_type | String          |           | NOT NULL                   | INCOME/EXPENSE                             |
| amount           | Decimal128      |           | NOT NULL                   | Số tiền mỗi kỳ                         |
| currency         | String          |           | NOT NULL, default 'VND'    | Loại tiền                                |
| frequency        | String          | Index     | NOT NULL                   | WEEKLY/MONTHLY                             |
| day_of_week      | Number (0–6)   |           | NULL                       | Ngày trong tuần (0=CN, dùng cho WEEKLY) |
| day_of_month     | Number (1–31)  |           | NULL                       | Ngày trong tháng (dùng cho MONTHLY)     |
| note             | String          |           | NULL                       | Ghi chú                                   |
| status           | String          | Index     | NOT NULL, default 'ACTIVE' | ACTIVE/PAUSED                              |
| last_run_on      | String          |           | NULL                       | Ngày chạy lần cuối (YYYY-MM-DD)        |

#### Chỉ mục đề xuất

- Compound index: `{ status: 1, frequency: 1 }` — cron job dùng để lọc luật cần chạy hôm nay.
- Compound index: `{ user_id: 1, wallet_id: 1 }`.

### Collection: savings

| Trường       | Kiểu dữ liệu | Chỉ mục | Ràng buộc                | Mô tả                              |
| -------------- | --------------- | --------- | -------------------------- | ------------------------------------ |
| _id            | ObjectId/UUID   | PK        | NOT NULL                   | Định danh mục tiêu               |
| user_id        | String          | Index     | NOT NULL                   | Định danh người dùng            |
| name           | String          |           | NOT NULL                   | Tên mục tiêu                      |
| type           | String          | Index     | NOT NULL                   | SAVING/INVESTMENT                    |
| target_amount  | Decimal128      |           | NULL                       | Số tiền mục tiêu (có thể null) |
| current_amount | Decimal128      |           | NOT NULL, default 0        | Số tiền đã tích luỹ            |
| start_date     | Date            |           | NOT NULL, default now      | Ngày bắt đầu                     |
| end_date       | Date            |           | NULL                       | Ngày kết thúc (tuỳ chọn)        |
| status         | String          | Index     | NOT NULL, default 'ACTIVE' | ACTIVE/SETTLED                       |

#### Chỉ mục đề xuất

- Compound index: `{ user_id: 1, type: 1, status: 1, end_date: 1 }`.

### Collection: invoices

| Trường       | Kiểu dữ liệu | Chỉ mục | Ràng buộc                 | Mô tả                                                             |
| -------------- | --------------- | --------- | --------------------------- | ------------------------------------------------------------------- |
| _id            | ObjectId/UUID   | PK        | NOT NULL                    | Định danh hoá đơn                                              |
| user_id        | String          | Index     | NOT NULL                    | Định danh người dùng                                           |
| image_url      | String          |           | NOT NULL                    | URL ảnh hoá đơn (Cloudinary)                                    |
| extracted_data | Mixed           |           | NULL                        | Dữ liệu trích xuất (merchantName, totalAmount, transactionDate) |
| status         | String          | Index     | NOT NULL, default 'PENDING' | PENDING/CONFIRMED/REJECTED                                          |
| created_at     | Date            |           | NOT NULL, default now       | Thời điểm tạo                                                   |
| updated_at     | Date            |           | NOT NULL                    | Thời điểm cập nhật                                             |

### Collection: outbox

| Trường     | Kiểu dữ liệu | Chỉ mục | Ràng buộc             | Mô tả                                    |
| ------------ | --------------- | --------- | ----------------------- | ------------------------------------------ |
| _id          | ObjectId        | PK        | NOT NULL                | Định danh bản ghi outbox                |
| event_type   | String          | Index     | NOT NULL                | Loại sự kiện (TRANSACTION_CREATED, ...) |
| payload      | Mixed           |           | NOT NULL                | Dữ liệu sự kiện                        |
| published    | Boolean         | Index     | NOT NULL, default false | Đã phát lên RabbitMQ chưa             |
| published_at | Date            |           | NULL                    | Thời điểm phát thành công            |
| created_at   | Date            |           | NOT NULL, default now   | Thời điểm tạo                          |

## 5. Analytics Service (MongoDB Atlas)

### Collection: monthly_aggregates

| Trường      | Kiểu dữ liệu | Chỉ mục      | Ràng buộc          | Mô tả                              |
| ------------- | --------------- | -------------- | -------------------- | ------------------------------------ |
| _id           | ObjectId        | PK             | NOT NULL             | Định danh tài liệu               |
| user_id       | String          | Index          | NOT NULL             | Định danh người dùng            |
| month         | String          | Compound Index | NOT NULL             | Định dạng YYYY-MM                 |
| totalIncome   | Number          |                | NOT NULL, default 0  | Tổng thu theo tháng                |
| totalExpense  | Number          |                | NOT NULL, default 0  | Tổng chi theo tháng                |
| netCashFlow   | Number          |                | NOT NULL, default 0  | Dòng tiền ròng (Income - Expense) |
| byCategory    | Array\<Object\> |                | NOT NULL, default [] | Mảng tổng hợp theo danh mục      |
| byWallet      | Array\<Object\> |                | NOT NULL, default [] | Mảng tổng hợp theo ví            |
| generatedAt   | Date            |                | NOT NULL             | Thời điểm tạo aggregate          |
| sourceVersion | Number          |                | NOT NULL, default 0  | Version sự kiện đã xử lý       |

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

| Trường   | Kiểu dữ liệu | Chỉ mục | Ràng buộc              | Mô tả                                        |
| ---------- | --------------- | --------- | ------------------------ | ---------------------------------------------- |
| _id        | ObjectId        | PK        | NOT NULL                 | Định danh thông báo                        |
| user_id    | String          | Index     | NOT NULL                 | Định danh người dùng                      |
| title      | String          |           | NOT NULL                 | Tiêu đề thông báo                         |
| message    | String          |           | NOT NULL                 | Nội dung thông báo                          |
| type       | String          |           | NOT NULL, default 'INFO' | INFO/SUCCESS/WARNING/ALERT/REMINDER            |
| is_read    | Boolean         | Index     | NOT NULL, default false  | Đã đọc chưa                               |
| metadata   | Mixed           |           | NULL                     | Dữ liệu tuỳ chọn kèm theo (walletId, ...) |
| created_at | Date            | Index     | NOT NULL, default now    | Thời điểm tạo                              |

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

| Exchange / Queue                         | Loại   | Mô tả                               |
| ---------------------------------------- | ------- | ------------------------------------- |
| `TRANSACTION_EVENTS` (exchange)        | topic   | Nguồn phát của Transaction Service |
| `WALLET_BALANCE_UPDATES` (queue)       | durable | Wallet Service consume                |
| `WALLET_EVENTS` (exchange)             | topic   | Nguồn phát của Wallet Service      |
| `ANALYTICS_TRANSACTION_EVENTS` (queue) | durable | Analytics Service consume             |

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

---

## 9. DBML — Dùng trực tiếp trên dbdiagram.io

Paste khối code bên dưới vào [https://dbdiagram.io](https://dbdiagram.io) để visualize toàn bộ schema và quan hệ.

```dbml
// ============================================================
// SERVICE-IDENTITY  (MongoDB: identity-db)
// ============================================================

Table users {
  id           ObjectId [pk, note: "_id"]
  email        string   [unique, not null]
  passwordHash string   [not null, note: "bcrypt hash — ẩn khi toJSON"]
  fullName     string   [default: ""]
  phone        string   [default: null]  status       int      [default: 1, note: "1=active 0=inactive"]
  createdAt    datetime
  updatedAt    datetime
}

Table user_settings {
  id                ObjectId [pk]
  userId            ObjectId [not null, unique, note: "1-1 với users"]
  twoFactorEnabled  boolean  [default: false]
  twoFactorMethod   string   [default: null]
  twoFactorSecret   string   [default: null, note: "TOTP secret (encrypted)"]
  theme             string   [default: "dark"]
  preferredCurrency string   [default: "VND"]
  locale            string   [default: "vi-VN"]
  selected_ai_model string   [default: "gemini-2.5-flash"]
  updatedAt         datetime

  note: "Embedded arrays: gemini_api_keys[] (pool ≤10, AES-256-CBC), ai_usage_logs[]"
}

// ============================================================
// SERVICE-WALLET  (MongoDB: wallet-db)
// ============================================================

Table wallets {
  id           ObjectId   [pk]
  user_id      string     [not null, note: "Logical FK → users._id"]
  wallet_type  string     [not null, note: "CARD | MOMO | ZALOPAY | CASH"]
  wallet_name  string     [not null]
  balance      Decimal128 [default: 0]
  status       int        [default: 1, note: "1=active 0=inactive 2=blocked"]
  version      int        [default: 0, note: "Optimistic locking counter"]
  createdAt    datetime
  updatedAt    datetime

  note: "processed_transaction_ids[] — idempotency buffer cho consumer"
}

// ============================================================
// SERVICE-TRANSACTION  (MongoDB: transaction-db)
// ============================================================

Table transactions {
  id               ObjectId   [pk]
  user_id          string     [note: "Logical FK → users._id"]
  wallet_id        string     [not null, note: "Logical FK → wallets._id"]
  category_id      string     [default: null, note: "Logical FK → categories._id"]
  amount           Decimal128 [not null]
  transaction_type string     [not null, note: "INCOME | EXPENSE"]
  currency         string     [default: "VND"]
  description      string     [default: null]
  occurred_at      datetime
  source           string     [default: "MANUAL", note: "MANUAL | INVOICE_CONFIRMATION | RECURRING | SAVING"]
  status           string     [default: "PENDING", note: "PENDING | COMPLETED | FAILED | REVERSED"]
  idempotency_key  string     [unique, not null]
  createdAt        datetime
  updatedAt        datetime
}

Table categories {
  id           ObjectId [pk]
  userId       string   [not null, note: "Logical FK → users._id"]
  name         string   [not null]
  categoryType string   [not null, note: "INCOME | EXPENSE"]
  parentId     string   [default: null, note: "Self-ref → categories._id"]
  isSystem     boolean  [default: false]
  status       int      [default: 1, note: "1=active 0=inactive"]
  createdAt    datetime
  updatedAt    datetime
}

Table savings {
  id             ObjectId   [pk]
  user_id        string     [not null, note: "Logical FK → users._id"]
  name           string     [not null]
  type           string     [not null, note: "SAVING | INVESTMENT"]
  target_amount  Decimal128 [default: null]
  current_amount Decimal128 [default: 0]
  start_date     datetime
  end_date       datetime   [default: null]
  status         string     [default: "ACTIVE", note: "ACTIVE | SETTLED"]
  createdAt      datetime
  updatedAt      datetime
}

Table recurring_rules {
  id               ObjectId   [pk]
  user_id          string     [not null, note: "Logical FK → users._id"]
  wallet_id        string     [not null, note: "Logical FK → wallets._id"]
  category_id      string     [default: null, note: "Logical FK → categories._id"]
  transaction_type string     [not null, note: "INCOME | EXPENSE"]
  amount           Decimal128 [not null]
  currency         string     [default: "VND"]
  frequency        string     [not null, note: "WEEKLY | MONTHLY"]
  day_of_week      int        [default: null, note: "0=Sun…6=Sat (WEEKLY)"]
  day_of_month     int        [default: null, note: "1–31 (MONTHLY)"]
  note             string     [default: null]
  status           string     [default: "ACTIVE", note: "ACTIVE | PAUSED"]
  last_run_on      string     [default: null, note: "YYYY-MM-DD"]
  createdAt        datetime
  updatedAt        datetime
}

Table invoices {
  id             ObjectId [pk]
  user_id        ObjectId [not null, note: "Logical FK → users._id"]
  image_url      string   [not null]
  extracted_data json     [default: "{}", note: "Kết quả OCR/Gemini"]
  status         string   [default: "PENDING", note: "PENDING | PROCESSED | REJECTED | DELETED"]
  transaction_id ObjectId [default: null, note: "FK → transactions._id sau xác nhận"]
  deleted_at     datetime [default: null, note: "Soft delete"]
  createdAt      datetime
  updatedAt      datetime

  note: "audit_trail[] embedded — lịch sử mọi thay đổi"
}

Table outbox_events {
  id           ObjectId [pk]
  event_type   string   [not null, note: "e.g. wallet.balance.update"]
  aggregate_id string   [not null, note: "ID của aggregate liên quan"]
  payload      json     [not null]
  published    boolean  [default: false]
  published_at datetime [default: null]
  createdAt    datetime
  updatedAt    datetime
}

// ============================================================
// ANALYTICS-SERVICE  (MongoDB: analytics-db)
// ============================================================

Table monthly_aggregates {
  id            ObjectId [pk]
  user_id       string   [not null, note: "Logical FK → users._id"]
  month         string   [not null, note: "YYYY-MM — unique với user_id"]
  totalIncome   float    [default: 0]
  totalExpense  float    [default: 0]
  netCashFlow   float    [default: 0]
  generatedAt   datetime
  sourceVersion int      [default: 0, note: "Version raw data để detect stale"]
  createdAt     datetime
  updatedAt     datetime

  note: "byCategory[] và byWallet[] embedded — aggregate data"
}

// ============================================================
// NOTIFICATION-SERVICE  (MongoDB: notification-db)
// ============================================================

Table notifications {
  id         ObjectId [pk]
  user_id    string   [not null, note: "Logical FK → users._id"]
  title      string   [not null]
  message    string   [not null]
  type       string   [default: "INFO", note: "INFO | SUCCESS | WARNING | ALERT | REMINDER"]
  is_read    boolean  [default: false]
  created_at datetime
  metadata   json     [default: null]
}

// ============================================================
// RELATIONSHIPS (Ref)
// Lưu ý: microservice — mỗi service có DB riêng.
// Ref cross-service là Logical FK (không enforce ở DB level).
// ============================================================

// 1-1
Ref: user_settings.userId - users.id

// n-1  (nhiều wallet → 1 user)
Ref: wallets.user_id > users.id

// n-1  (nhiều transaction → 1 user / wallet / category)
Ref: transactions.user_id > users.id
Ref: transactions.wallet_id > wallets.id
Ref: transactions.category_id > categories.id

// n-1  (category tự tham chiếu → sub-category)
Ref: categories.parentId > categories.id
Ref: categories.userId > users.id

// n-1  (nhiều saving/investment → 1 user)
Ref: savings.user_id > users.id

// n-1  (nhiều recurring rule → 1 user / wallet / category)
Ref: recurring_rules.user_id > users.id
Ref: recurring_rules.wallet_id > wallets.id
Ref: recurring_rules.category_id > categories.id

// n-1 + 1-1 optional  (hóa đơn → user ; hóa đơn đã xác nhận → transaction)
Ref: invoices.user_id > users.id
Ref: invoices.transaction_id - transactions.id

// n-1  (monthly aggregate → user)
Ref: monthly_aggregates.user_id > users.id

// n-1  (notification → user)
Ref: notifications.user_id > users.id
```
