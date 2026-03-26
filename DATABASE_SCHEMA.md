# Thiết kế Cơ sở dữ liệu Microservices - OripioFin

## 1. Nguyên tắc thiết kế dữ liệu

### 1.1 Database per Service
Mỗi microservice sở hữu cơ sở dữ liệu riêng, không truy cập trực tiếp dữ liệu vật lý của service khác. Tương tác liên dịch vụ thông qua API/Event để giảm coupling và tăng khả năng mở rộng độc lập.

### 1.2 Tách rõ mô hình giao dịch và phân tích
- Dữ liệu nghiệp vụ tài chính cốt lõi (Wallet, Transaction) ưu tiên tính toàn vẹn và ACID.
- Dữ liệu phân tích (Analytics) ưu tiên tốc độ truy vấn đọc, chấp nhận eventual consistency có kiểm soát.

### 1.3 Nguyên tắc toàn vẹn dữ liệu tài chính
- Mọi cập nhật số dư cần idempotency.
- Lưu vết đầy đủ trạng thái giao dịch.
- Có cơ chế đối soát định kỳ (reconciliation).

## 2. Identity Service (PostgreSQL/SQL Server)

## Bảng: Users
| Tên cột | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
|---|---|---|---|---|
| user_id | UUID | PK | NOT NULL | Định danh người dùng |
| email | VARCHAR(255) | UK | NOT NULL, UNIQUE | Email đăng nhập |
| password_hash | VARCHAR(255) |  | NOT NULL | Mật khẩu đã băm |
| full_name | VARCHAR(150) |  | NOT NULL | Họ tên người dùng |
| phone | VARCHAR(20) |  | NULL | Số điện thoại |
| status | SMALLINT |  | NOT NULL, DEFAULT 1 | Trạng thái tài khoản (1: Active, 0: Inactive) |
| created_at | TIMESTAMP |  | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |
| updated_at | TIMESTAMP |  | NOT NULL | Thời điểm cập nhật |

### Chỉ mục đề xuất
- INDEX trên email (nếu hệ quản trị không tự tạo qua UNIQUE).
- INDEX trên status để tối ưu lọc tài khoản.

## Bảng: UserSettings
| Tên cột | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
|---|---|---|---|---|
| setting_id | UUID | PK | NOT NULL | Định danh bản ghi cài đặt |
| user_id | UUID | FK | NOT NULL, UNIQUE | Tham chiếu Users.user_id (1-1) |
| two_factor_enabled | BOOLEAN |  | NOT NULL, DEFAULT FALSE | Bật/tắt 2FA |
| two_factor_method | VARCHAR(20) |  | NULL | TOTP/SMS/EMAIL |
| two_factor_secret | VARCHAR(255) |  | NULL | Secret cho 2FA, lưu ở dạng mã hóa |
| preferred_currency | VARCHAR(10) |  | NOT NULL, DEFAULT 'VND' | Tiền tệ mặc định |
| locale | VARCHAR(10) |  | NOT NULL, DEFAULT 'vi-VN' | Ngôn ngữ vùng |
| updated_at | TIMESTAMP |  | NOT NULL | Thời điểm cập nhật |

### Quan hệ
- `UserSettings.user_id` -> `Users.user_id` (1-1).

## 3. Wallet Service (PostgreSQL/SQL Server)

## Bảng: Wallets
| Tên cột | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
|---|---|---|---|---|
| wallet_id | UUID | PK | NOT NULL | Định danh ví |
| user_id | UUID | IDX | NOT NULL | Định danh chủ ví |
| wallet_type | VARCHAR(30) |  | NOT NULL | CARD/MOMO/ZALOPAY/CASH |
| wallet_name | VARCHAR(100) |  | NOT NULL | Tên hiển thị ví |
| balance | DECIMAL(18,2) |  | NOT NULL, DEFAULT 0 | Số dư hiện tại |
| spending_limit | DECIMAL(18,2) |  | NULL | Hạn mức chi tiêu |
| status | SMALLINT |  | NOT NULL, DEFAULT 1 | 1: Active, 0: Inactive, 2: Blocked |
| version | BIGINT |  | NOT NULL, DEFAULT 0 | Version để optimistic locking |
| created_at | TIMESTAMP |  | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |
| updated_at | TIMESTAMP |  | NOT NULL | Thời điểm cập nhật |

### Ràng buộc nghiệp vụ
- `balance >= 0` nếu không hỗ trợ thấu chi.
- `spending_limit` phải lớn hơn 0 nếu có giá trị.

### Chỉ mục đề xuất
- INDEX `(user_id, status)` cho truy vấn danh sách ví của người dùng.
- INDEX `(wallet_type)` phục vụ thống kê theo loại ví.

## 4. Transaction Service (PostgreSQL/SQL Server - ACID)

## Bảng: Categories
| Tên cột | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
|---|---|---|---|---|
| category_id | UUID | PK | NOT NULL | Định danh danh mục |
| user_id | UUID | IDX | NOT NULL | Chủ sở hữu danh mục |
| name | VARCHAR(100) |  | NOT NULL | Tên danh mục |
| category_type | VARCHAR(10) |  | NOT NULL | INCOME/EXPENSE |
| parent_id | UUID | FK | NULL | Danh mục cha (nếu có) |
| is_system | BOOLEAN |  | NOT NULL, DEFAULT FALSE | Danh mục hệ thống |
| status | SMALLINT |  | NOT NULL, DEFAULT 1 | Trạng thái danh mục |
| created_at | TIMESTAMP |  | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |

### Quan hệ
- `Categories.parent_id` -> `Categories.category_id` (self-reference).

## Bảng: Transactions
| Tên cột | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
|---|---|---|---|---|
| transaction_id | UUID | PK | NOT NULL | Mã giao dịch |
| wallet_id | UUID | IDX | NOT NULL | Định danh ví liên quan |
| user_id | UUID | IDX | NOT NULL | Định danh người dùng |
| category_id | UUID | FK | NOT NULL | Tham chiếu Categories.category_id |
| transaction_type | VARCHAR(10) |  | NOT NULL | INCOME/EXPENSE |
| amount | DECIMAL(18,2) |  | NOT NULL, CHECK (amount > 0) | Số tiền giao dịch |
| currency | VARCHAR(10) |  | NOT NULL, DEFAULT 'VND' | Loại tiền |
| status | VARCHAR(20) |  | NOT NULL | PENDING/COMPLETED/FAILED/REVERSED |
| description | VARCHAR(500) |  | NULL | Mô tả giao dịch |
| occurred_at | TIMESTAMP |  | NOT NULL | Thời điểm phát sinh |
| idempotency_key | VARCHAR(100) | UK | NOT NULL, UNIQUE | Chống ghi trùng do retry |
| created_at | TIMESTAMP |  | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |

### Ràng buộc và chỉ mục quan trọng
- FK: `Transactions.category_id` -> `Categories.category_id`.
- INDEX `(user_id, occurred_at DESC)` tối ưu lịch sử giao dịch.
- INDEX `(wallet_id, occurred_at DESC)` tối ưu tra cứu theo ví.
- INDEX `(status)` phục vụ đối soát và xử lý nền.

## 5. Analytics Service (MongoDB)

## Collection: MonthlyAggregates
| Trường | Kiểu dữ liệu | Khóa/Chỉ mục | Ràng buộc | Mô tả |
|---|---|---|---|---|
| _id | ObjectId | PK | NOT NULL | Định danh tài liệu |
| userId | String/UUID | IDX | NOT NULL | Định danh người dùng |
| month | String | Compound IDX | NOT NULL | Định dạng YYYY-MM |
| totalIncome | Decimal128 |  | NOT NULL, default 0 | Tổng thu theo tháng |
| totalExpense | Decimal128 |  | NOT NULL, default 0 | Tổng chi theo tháng |
| netCashFlow | Decimal128 |  | NOT NULL | Dòng tiền ròng (Income - Expense) |
| byCategory | Array<Object> |  | NOT NULL | Mảng tổng hợp theo danh mục |
| byWallet | Array<Object> |  | NOT NULL | Mảng tổng hợp theo ví |
| generatedAt | Date |  | NOT NULL | Thời điểm tạo aggregate |
| sourceVersion | NumberLong |  | NOT NULL | Version sự kiện đã xử lý |

### Cấu trúc phần tử gợi ý cho `byCategory`
- `categoryId`: String
- `categoryName`: String
- `totalAmount`: Decimal128
- `transactionCount`: NumberInt

### Chỉ mục đề xuất
- Unique index: `{ userId: 1, month: 1 }`.
- Index hỗ trợ lịch sử: `{ userId: 1, generatedAt: -1 }`.

## 6. Cơ chế giao tiếp liên dịch vụ (Inter-service Communication)

### 6.1 Bài toán
Transaction Service cần gọi Wallet Service để cập nhật số dư an toàn sau giao dịch, tránh lệch dữ liệu khi có retry, timeout hoặc lỗi mạng.

### 6.2 Phương án khuyến nghị
Kết hợp **SAGA pattern** và giao tiếp bất đồng bộ qua **RabbitMQ/Kafka**, với Outbox để đảm bảo phát sự kiện tin cậy.

### 6.3 Luồng xử lý đề xuất
1. Transaction Service mở transaction cục bộ, tạo bản ghi giao dịch trạng thái `PENDING`.
2. Trong cùng transaction DB, ghi thêm Outbox event `TransactionCreated`.
3. Outbox publisher đẩy event lên RabbitMQ/Kafka.
4. Wallet Service consume event, kiểm tra `idempotency_key`, thực hiện cập nhật số dư bằng optimistic locking (`version`).
5. Wallet Service phát event `WalletBalanceUpdated` hoặc `WalletBalanceUpdateFailed`.
6. Transaction Service nhận event phản hồi để chuyển trạng thái giao dịch sang `COMPLETED` hoặc `FAILED`.
7. Nếu thất bại, kích hoạt nhánh bù trừ theo SAGA (compensation) và ghi log đối soát.

### 6.4 Biện pháp tránh lỗi bất đồng bộ
- Bắt buộc idempotency cho mọi tác vụ ghi tài chính.
- Retry theo exponential backoff, có dead-letter queue cho message lỗi.
- Theo dõi `correlation_id` xuyên suốt luồng nghiệp vụ để truy vết.
- Không cho phép truy vấn/ghi chéo trực tiếp vào DB của service khác.

## 7. Ghi chú chuẩn hóa dữ liệu liên service
- Dùng chuẩn thời gian UTC cho toàn hệ thống.
- Quy ước mã tiền tệ theo ISO 4217 (ví dụ: VND, USD).
- Định danh UUID thống nhất để giảm xung đột giữa nhiều nguồn dữ liệu.
- Trường trạng thái nên dùng enum chuẩn hóa để dễ giám sát và báo cáo.
