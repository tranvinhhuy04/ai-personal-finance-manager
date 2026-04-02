# Thiết kế Cơ sở dữ liệu Microservices - Fintech (MongoDB Atlas)

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
| user_id            | ObjectId/UUID   | Unique Index | NOT NULL                  | Tham chiếu users._id (1-1)            |
| two_factor_enabled | Boolean         |              | NOT NULL, default false   | Bật/tắt 2FA                          |
| two_factor_method  | String          |              | NULL                      | TOTP/SMS/EMAIL                         |
| two_factor_secret  | String          |              | NULL                      | Secret cho 2FA, lưu ở dạng mã hóa |
| preferred_currency | String          |              | NOT NULL, default 'VND'   | Tiền tệ mặc định                  |
| locale             | String          |              | NOT NULL, default 'vi-VN' | Ngôn ngữ vùng                       |
| updated_at         | Date            |              | NOT NULL                  | Thời điểm cập nhật                |

#### Quan hệ

- user_settings.user_id tham chiếu users._id (1-1, enforced by application logic).

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

- Index (user_id, status) cho truy vấn danh sách ví của người dùng.
- Index (wallet_type) phục vụ thống kê theo loại ví.

## 4. Transaction Service (MongoDB Atlas)

### Collection: categories

| Trường      | Kiểu dữ liệu | Chỉ mục | Ràng buộc             | Mô tả                  |
| ------------- | --------------- | --------- | ----------------------- | ------------------------ |
| _id           | ObjectId/UUID   | PK        | NOT NULL                | Định danh danh mục    |
| user_id       | ObjectId/UUID   | Index     | NOT NULL                | Chủ sở hữu danh mục  |
| name          | String          |           | NOT NULL                | Tên danh mục           |
| category_type | String          |           | NOT NULL                | INCOME/EXPENSE           |
| parent_id     | ObjectId/UUID   |           | NULL                    | Danh mục cha (nếu có) |
| is_system     | Boolean         |           | NOT NULL, default false | Danh mục hệ thống     |
| status        | Number (1/0)    | Index     | NOT NULL, default 1     | Trạng thái danh mục   |
| created_at    | Date            |           | NOT NULL, default now   | Thời điểm tạo        |

#### Quan hệ

- categories.parent_id tham chiếu categories._id (self-reference, enforced by application logic).

### Collection: transactions

| Trường         | Kiểu dữ liệu | Chỉ mục    | Ràng buộc             | Mô tả                           |
| ---------------- | --------------- | ------------ | ----------------------- | --------------------------------- |
| _id              | ObjectId/UUID   | PK           | NOT NULL                | Mã giao dịch                    |
| wallet_id        | ObjectId/UUID   | Index        | NOT NULL                | Định danh ví liên quan        |
| user_id          | ObjectId/UUID   | Index        | NOT NULL                | Định danh người dùng         |
| category_id      | ObjectId/UUID   |              | NOT NULL                | Tham chiếu categories._id        |
| transaction_type | String          |              | NOT NULL                | INCOME/EXPENSE                    |
| amount           | Decimal128      |              | NOT NULL, amount > 0    | Số tiền giao dịch              |
| currency         | String          |              | NOT NULL, default 'VND' | Loại tiền                       |
| status           | String          | Index        | NOT NULL                | PENDING/COMPLETED/FAILED/REVERSED |
| description      | String          |              | NULL                    | Mô tả giao dịch                |
| occurred_at      | Date            |              | NOT NULL                | Thời điểm phát sinh           |
| idempotency_key  | String          | Unique Index | NOT NULL                | Chống ghi trùng do retry        |
| created_at       | Date            |              | NOT NULL, default now   | Thời điểm tạo                 |

#### Ràng buộc và chỉ mục quan trọng

- Unique index trên idempotency_key.
- Index (user_id, occurred_at DESC) tối ưu lịch sử giao dịch.
- Index (wallet_id, occurred_at DESC) tối ưu tra cứu theo ví.
- Index (status) phục vụ đối soát và xử lý nền.

## 5. Analytics Service (MongoDB Atlas)

### Collection: monthly_aggregates

| Trường      | Kiểu dữ liệu   | Chỉ mục      | Ràng buộc         | Mô tả                              |
| ------------- | ----------------- | -------------- | ------------------- | ------------------------------------ |
| _id           | ObjectId          | PK             | NOT NULL            | Định danh tài liệu               |
| userId        | ObjectId/UUID     | Index          | NOT NULL            | Định danh người dùng            |
| month         | String            | Compound Index | NOT NULL            | Định dạng YYYY-MM                 |
| totalIncome   | Decimal128        |                | NOT NULL, default 0 | Tổng thu theo tháng                |
| totalExpense  | Decimal128        |                | NOT NULL, default 0 | Tổng chi theo tháng                |
| netCashFlow   | Decimal128        |                | NOT NULL            | Dòng tiền ròng (Income - Expense) |
| byCategory    | Array`<Object>` |                | NOT NULL            | Mảng tổng hợp theo danh mục      |
| byWallet      | Array`<Object>` |                | NOT NULL            | Mảng tổng hợp theo ví            |
| generatedAt   | Date              |                | NOT NULL            | Thời điểm tạo aggregate          |
| sourceVersion | NumberLong        |                | NOT NULL            | Version sự kiện đã xử lý       |

#### Cấu trúc phần tử gợi ý cho byCategory

- categoryId: String/ObjectId
- categoryName: String
- totalAmount: Decimal128
- transactionCount: NumberInt

#### Chỉ mục đề xuất

- Unique index: { userId: 1, month: 1 }.
- Index hỗ trợ lịch sử: { userId: 1, generatedAt: -1 }.

## 6. Cơ chế giao tiếp liên dịch vụ (Inter-service Communication)

### 6.1 Bài toán

Transaction Service cần gọi Wallet Service để cập nhật số dư an toàn sau giao dịch, tránh lệch dữ liệu khi có retry, timeout hoặc lỗi mạng.

### 6.2 Phương án khuyến nghị

Kết hợp **SAGA pattern** và giao tiếp bất đồng bộ qua **RabbitMQ/Kafka**, với Outbox để đảm bảo phát sự kiện tin cậy.

### 6.3 Luồng xử lý đề xuất

1. Transaction Service tạo bản ghi giao dịch trạng thái PENDING và Outbox event TransactionCreated trong cùng document/transaction MongoDB (nếu cần).
2. Outbox publisher đẩy event lên RabbitMQ/Kafka.
3. Wallet Service consume event, kiểm tra idempotency_key, thực hiện cập nhật số dư bằng optimistic locking (trường version).
4. Wallet Service phát event WalletBalanceUpdated hoặc WalletBalanceUpdateFailed.
5. Transaction Service nhận event phản hồi để chuyển trạng thái giao dịch sang COMPLETED hoặc FAILED.
6. Nếu thất bại, kích hoạt nhánh bù trừ theo SAGA (compensation) và ghi log đối soát.

### 6.4 Biện pháp tránh lỗi bất đồng bộ

- Bắt buộc idempotency cho mọi tác vụ ghi tài chính.
- Retry theo exponential backoff, có dead-letter queue cho message lỗi.
- Theo dõi correlation_id xuyên suốt luồng nghiệp vụ để truy vết.
- Không cho phép truy vấn/ghi chéo trực tiếp vào DB của service khác.

## 7. Ghi chú chuẩn hóa dữ liệu liên service

- Dùng chuẩn thời gian UTC cho toàn hệ thống.
- Quy ước mã tiền tệ theo ISO 4217 (ví dụ: VND, USD).
- Định danh UUID thống nhất để giảm xung đột giữa nhiều nguồn dữ liệu.
- Trường trạng thái nên dùng enum chuẩn hóa để dễ giám sát và báo cáo.
