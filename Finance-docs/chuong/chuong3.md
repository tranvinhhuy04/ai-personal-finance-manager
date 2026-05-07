# CHƯƠNG 3: THIẾT KẾ HỆ THỐNG

## 3.1. Sơ đồ kiến trúc tổng thể (System Architecture)

### 3.1.1. Tổng quan kiến trúc

Hệ thống Quản lý Tài chính Cá nhân tích hợp AI được xây dựng theo mô hình kiến trúc **Client–Server phân tầng kết hợp AI Service riêng biệt** (Layered Client-Server with Dedicated AI Microservice). Mô hình này tách biệt rõ ràng ba mặt phẳng trách nhiệm: trình diễn dữ liệu (presentation), xử lý nghiệp vụ (business logic) và xử lý trí tuệ nhân tạo (AI inference), từ đó đảm bảo khả năng mở rộng độc lập từng tầng mà không ảnh hưởng đến tính ổn định tổng thể.

Hệ thống bao gồm 8 microservice hoạt động song song, được điều phối bởi một **API Gateway** đóng vai trò điểm vào duy nhất (single entry point) cho toàn bộ yêu cầu từ phía client. Các service giao tiếp nội bộ qua HTTP/REST và hàng đợi tin nhắn bất đồng bộ RabbitMQ theo mẫu Transactional Outbox Pattern nhằm đảm bảo tính nhất quán dữ liệu phân tán.

Bảng sau tóm tắt vai trò của từng thành phần cốt lõi trong kiến trúc:

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Web Frontend | React 18 + Vite + Tailwind CSS (port 5173) | Giao diện SPA người dùng web |
| Mobile Frontend | React Native (Expo) | Ứng dụng di động đa nền tảng iOS/Android |
| API Gateway | Node.js/Express (port 3000) | Xác thực JWT, định tuyến reverse-proxy, BFF cho AI |
| Identity Service | Node.js/Express (port 3001) | Đăng ký, đăng nhập, 2FA, quản lý API Key Pool Gemini |
| Wallet Service | Node.js/Express (port 3002) | Quản lý ví, cập nhật số dư với optimistic locking |
| Transaction Service | Node.js/Express (port 3003) | CRUD giao dịch, danh mục, tiết kiệm/đầu tư, hóa đơn OCR, recurring |
| Analytics Service | Node.js/Express (port 3004) | Tổng hợp báo cáo tháng, dashboard tài chính |
| Notification Service | Node.js/Express (port 3005) | Thông báo in-app qua RabbitMQ |
| Cloud Service | Node.js/Express (port 3006) | Upload ảnh lên Cloudinary, trả `secure_url` |
| AI Service | FastAPI/Python (port 8000) | PaddleOCR hóa đơn, PhoBERT NLP, Agentic RAG Gemini |
| MongoDB Atlas | NoSQL Cloud Database | Lưu trữ toàn bộ dữ liệu nghiệp vụ (database-per-service) |
| Redis | In-memory Cache | Cache context tài chính (TTL 30s), session chatbot advisor (TTL 120s) |
| RabbitMQ | Message Broker | Hàng đợi sự kiện bất đồng bộ (Outbox Pattern) |

### 3.1.2. Sơ đồ kiến trúc tổng thể

Để hình dung rõ ràng các tầng và hướng luồng dữ liệu, hình dưới đây trình bày sơ đồ kiến trúc đầy đủ của hệ thống, bao gồm tất cả các thành phần và kênh giao tiếp giữa chúng.

![Hình 3.1: Sơ đồ kiến trúc tổng thể hệ thống quản lý tài chính cá nhân tích hợp AI](link_hinh_anh)

**Phân tích kiến trúc theo từng tầng:**

**Tầng Client (Presentation Layer):** Gồm hai nền tảng phân biệt — ứng dụng web SPA (Single Page Application) xây dựng trên **React 18 + Vite** với Tailwind CSS v4, bundle bởi Vite và phục vụ dưới dạng static assets (không dùng SSR). State management theo mô hình phân tầng: React Query (`@tanstack/react-query`) cho server state, Zustand cho global client state. Ứng dụng di động React Native (Expo) chia sẻ logic nghiệp vụ tối đa qua custom hook. Toàn bộ yêu cầu HTTP từ client đều mang JWT Bearer Token trong header `Authorization` và được gửi đến **API Gateway** thay vì trực tiếp đến từng service.

**Tầng API Gateway (Orchestration Layer):** API Gateway đảm nhận ba trách nhiệm chính: (1) xác minh tính hợp lệ của JWT token (`verifyToken` middleware) trước khi chuyển tiếp yêu cầu; (2) định tuyến reverse-proxy đến đúng microservice backend theo path prefix — `/api/v1/auth/*` → identity-service, `/api/v1/wallets/*` → wallet-service, `/api/v1/transactions/*` → transaction-service, `/api/v1/analytics/*` → analytics-service, `/api/v1/notifications/*` → notification-service, `/api/v1/cloud/*` → cloud-service; (3) thực thi logic BFF (Backend-for-Frontend) cho toàn bộ luồng AI qua ba module chuyên biệt: `aiChatBff.ts` (điều phối LLM router + record/analytics/advisor routing), `aiAdvisorBff.ts` (tư vấn tài chính chuyên sâu), và `aiExtractBff.ts` (trích xuất text + kiểm tra trạng thái provider). Gateway còn tường lửa một số internal endpoint (`/settings/runtime-ai`, `/settings/usage/append`, `/settings/api-keys/mark-exhausted`) không cho phép client gọi trực tiếp.

**Tầng Business Logic (Service Layer):** Mỗi microservice hoạt động độc lập, sở hữu database MongoDB riêng, và chỉ expose HTTP REST API. **Transaction Service** là service lớn nhất, quản lý 6 collection: transactions, categories, savings, recurring_rules, invoices, outbox_events. Service này còn đảm nhận luồng OCR hóa đơn: nhận file ảnh từ client qua multipart, lưu tạm vào `/public/uploads/`, sau đó gọi nội bộ AI Service (`/api/v1/ai/ocr`) để PaddleOCR xử lý. **Wallet Service** áp dụng optimistic locking (trường `version`) và lưu `processed_transaction_ids` làm buffer idempotency khi nhận sự kiện cập nhật số dư từ RabbitMQ. Giao tiếp liên service thực hiện qua HTTP nội bộ (synchronous) cho tác vụ cần phản hồi ngay, và qua RabbitMQ + Transactional Outbox Pattern (asynchronous) cho tác vụ cho phép xử lý trễ như gửi thông báo sau khi tạo giao dịch.

**Tầng AI Service (Inference Layer):** AI Service là service Python duy nhất, được tách hoàn toàn khỏi stack Node.js để tận dụng hệ sinh thái machine learning của Python. Service này phụ trách ba năng lực chính: (1) **OCR hóa đơn** — nhận file ảnh qua `POST /api/v1/ai/ocr`, xử lý bằng PaddleOCR (lang=vi, singleton thread-safe), chuẩn hóa kết quả thành `{ merchantName, totalAmount, transactionDate }`; (2) **Phân loại ý định** bằng PhoBERT kết hợp Gemini để trả lời truy vấn analytics; (3) **Agentic RAG** qua AdvisorOrchestrator — tư vấn tài chính chuyên sâu với bộ nhớ hội thoại và Google Search grounding. Gemini API được gọi với cơ chế **API Key Pool** — người dùng cấu hình tối đa 10 keys mã hóa AES-256-CBC, Gateway luân chuyển tự động khi key bị giới hạn quota.

**Tầng Dữ liệu (Data Layer):** MongoDB Atlas được chọn là cơ sở dữ liệu duy nhất, vận hành trên cloud với tính năng replica set tự động đảm bảo tính sẵn sàng cao. Redis đảm nhận cache nhiều lớp: cache context tài chính người dùng (TTL 30 giây) phục vụ truy vấn lặp lại từ AI, và cache phiên chatbot advisor (TTL 120 giây) để tránh gọi lại Gemini API không cần thiết.

### 3.1.3. Luồng dữ liệu đặc trưng

**Luồng tác vụ nghiệp vụ thông thường (CRUD):**

```
Client → [HTTPS] → API Gateway (xác thực JWT)
       → [HTTP nội bộ] → Service tương ứng (Wallet/Transaction/Analytics)
       → [Query] → MongoDB Atlas
       → [Response] → API Gateway → Client
```

**Luồng tác vụ AI Chat (Agentic RAG):**

```
Client → API Gateway → aiChatBff.ts
       → [LLM Router] → Gemini API (phân loại intent: record/analytics/advisor)
       → [Nếu record_transactions]
           → AI Service /extract-text → Gemini (trích xuất JSON giao dịch)
           → Transaction Service (lưu DB, idempotency SHA-256)
       → [Nếu analytics_chat]
           → Analytics Service (lấy số liệu thực) → AI Service /chat (PhoBERT + Gemini)
       → [Nếu advisor_chat]
           → AI Service /advisor/chat → AdvisorOrchestrator (RAG + Memory + Guardrail)
       → Response → Client
```

Thiết kế này đảm bảo rằng mô hình AI không bao giờ trực tiếp ghi vào cơ sở dữ liệu — mọi thao tác ghi đều phải đi qua transaction-service với cơ chế xác thực và idempotency, từ đó ngăn ngừa dữ liệu trùng lặp do retry hoặc lỗi mạng.

---

## 3.2. Thiết kế cơ sở dữ liệu (Database Design)

### 3.2.1. Lý do chọn MongoDB (NoSQL)

Hệ thống lựa chọn **MongoDB Atlas** thay vì cơ sở dữ liệu quan hệ truyền thống dựa trên các lập luận kỹ thuật sau:

**Tính linh hoạt schema (Schema Flexibility):** Đây là yếu tố quyết định chính. Kết quả trích xuất OCR từ hóa đơn thực tế có cấu trúc không đồng nhất — hóa đơn điện tử có trường `invoiceNumber` và `taxCode`, hóa đơn bán lẻ có `merchantName` và `items[]`, hóa đơn ngân hàng có `transactionCode` và `bankName`. MongoDB cho phép lưu trữ tất cả các biến thể này trong một collection `transactions` duy nhất mà không cần ALTER TABLE hay migration phức tạp.

**Mô hình tài liệu lồng nhau (Embedded Documents):** Các thông tin phụ như `metadata` của hóa đơn, `tags` do người dùng thêm vào, hoặc `aiSuggestions` từ quá trình phân loại NLP được nhúng trực tiếp vào document giao dịch. Điều này cho phép truy vấn một giao dịch kèm toàn bộ thông tin bổ sung bằng một lần I/O duy nhất.

**Khả năng mở rộng ngang (Horizontal Scaling):** MongoDB Atlas hỗ trợ sharding tự động. Khi lượng giao dịch tăng trưởng, hệ thống có thể phân tán dữ liệu theo `userId` làm shard key mà không cần thay đổi logic ứng dụng.

**Aggregation Pipeline:** MongoDB cung cấp framework tổng hợp dữ liệu mạnh mẽ cho phép tính tổng thu nhập, tổng chi tiêu, và nhóm theo danh mục trong một pipeline duy nhất — đây là nền tảng của Analytics Service.

### 3.2.2. Thiết kế Schema các Collection chính

**Collection `users`** — service-identity (identity-db)

```json
{
  "_id": ObjectId,
  "email": String,         // unique, indexed, lowercase, trimmed
  "passwordHash": String,  // bcrypt hash, bị xóa khi toJSON
  "fullName": String,      // default: ""
  "phone": String,         // default: null
  "status": Number,        // 1=active, 0=inactive
  "createdAt": Date,
  "updatedAt": Date
}
```

**Collection `user_settings`** — service-identity (identity-db)

Tách riêng khỏi `users` để tránh document phình to khi log AI usage tích lũy theo thời gian. Quan hệ 1-1 qua `userId`.

```json
{
  "_id": ObjectId,
  "userId": ObjectId,           // unique, ref: users._id
  "twoFactorEnabled": Boolean,  // default: false
  "twoFactorMethod": String,    // "totp" | null
  "twoFactorSecret": String,    // TOTP secret (encrypted), null nếu chưa setup
  "theme": String,              // "dark" | "light"
  "preferredCurrency": String,  // "VND"
  "locale": String,             // "vi-VN"
  "selected_ai_model": String,  // "gemini-2.5-flash"
  "gemini_api_keys": [{         // Pool tối đa 10 keys, embedded array
    "key": String,              // AES-256-CBC encrypted
    "status": String,           // "active" | "exhausted"
    "added_at": Date
  }],
  "ai_usage_logs": [{           // Log token usage cho từng lần gọi AI
    "date": Date,
    "model": String,
    "tokens_used": Number,
    "estimated_cost": Number
  }],
  "updatedAt": Date
}
```

**Collection `wallets`** — service-wallet (wallet-db)

```json
{
  "_id": ObjectId,
  "user_id": String,         // logical FK → users._id, indexed
  "wallet_type": String,     // "CARD" | "MOMO" | "ZALOPAY" | "CASH"
  "wallet_name": String,
  "balance": Decimal128,     // Decimal128 tránh float precision error
  "processed_transaction_ids": [String], // idempotency buffer khi consume event
  "status": Number,          // 1=active, 0=inactive, 2=blocked
  "version": Number,         // optimistic locking counter
  "createdAt": Date,
  "updatedAt": Date
}
```

**Collection `transactions`** — service-transaction (transaction-db)

```json
{
  "_id": ObjectId,
  "user_id": String,         // logical FK → users._id, indexed
  "wallet_id": String,       // logical FK → wallets._id, indexed
  "category_id": String,     // logical FK → categories._id, null nếu chưa phân loại
  "amount": Decimal128,
  "transaction_type": String, // "INCOME" | "EXPENSE"
  "currency": String,         // "VND"
  "description": String,      // null nếu không có
  "occurred_at": Date,        // indexed
  "source": String,           // "MANUAL" | "INVOICE_CONFIRMATION" | "RECURRING" | "SAVING"
  "status": String,           // "PENDING" | "COMPLETED" | "FAILED" | "REVERSED"
  "idempotency_key": String,  // unique index — SHA-256 chống ghi trùng
  "createdAt": Date,
  "updatedAt": Date
}
```

**Collection `categories`** — service-transaction (transaction-db)

```json
{
  "_id": ObjectId,
  "userId": String,          // logical FK → users._id; indexed
  "name": String,
  "categoryType": String,    // "INCOME" | "EXPENSE"
  "parentId": String,        // self-ref → categories._id (sub-category), null nếu root
  "isSystem": Boolean,       // true = danh mục hệ thống (seed)
  "status": Number,          // 1=active, 0=inactive
  "createdAt": Date,
  "updatedAt": Date
}
```

**Collection `savings`** — service-transaction (transaction-db)

Dùng chung cho cả mục tiêu tiết kiệm (`SAVING`) và danh mục đầu tư (`INVESTMENT`), phân biệt qua trường `type`.

```json
{
  "_id": ObjectId,
  "user_id": String,         // logical FK → users._id, indexed
  "name": String,
  "type": String,            // "SAVING" | "INVESTMENT"
  "target_amount": Decimal128, // null nếu không đặt mục tiêu
  "current_amount": Decimal128, // số dư tích lũy / giá trị hiện tại
  "start_date": Date,
  "end_date": Date,          // null nếu open-ended
  "status": String,          // "ACTIVE" | "SETTLED"
  "createdAt": Date,
  "updatedAt": Date
}
```

**Collection `recurring_rules`** — service-transaction (transaction-db)

```json
{
  "_id": ObjectId,
  "user_id": String,         // logical FK → users._id, indexed
  "wallet_id": String,       // logical FK → wallets._id, indexed
  "category_id": String,     // logical FK → categories._id, null nếu chưa chọn
  "transaction_type": String, // "INCOME" | "EXPENSE"
  "amount": Decimal128,
  "currency": String,        // "VND"
  "frequency": String,       // "WEEKLY" | "MONTHLY"
  "day_of_week": Number,     // 0=Sun…6=Sat, dùng khi WEEKLY
  "day_of_month": Number,    // 1–31, dùng khi MONTHLY
  "note": String,            // null nếu không có ghi chú
  "status": String,          // "ACTIVE" | "PAUSED"
  "last_run_on": String,     // "YYYY-MM-DD", null nếu chưa chạy lần nào
  "createdAt": Date,
  "updatedAt": Date
}
```

**Collection `invoices`** — service-transaction (transaction-db)

```json
{
  "_id": ObjectId,
  "user_id": ObjectId,       // logical FK → users._id, indexed
  "image_url": String,       // secure_url Cloudinary
  "extracted_data": Mixed,   // JSON kết quả PaddleOCR: { merchantName, totalAmount, transactionDate }
  "status": String,          // "PENDING" | "PROCESSED" | "REJECTED" | "DELETED"
  "transaction_id": ObjectId, // FK → transactions._id sau khi user xác nhận; null mặc định
  "audit_trail": [{          // embedded — lịch sử mọi thay đổi trạng thái
    "action": String,        // "CREATED" | "UPDATED" | "SOFT_DELETED" | "CONFIRMED_AS_TRANSACTION"
    "changed_by": String,
    "timestamp": Date,
    "previous_state": Mixed,
    "next_state": Mixed,
    "note": String
  }],
  "deleted_at": Date,        // soft delete, null nếu chưa xóa
  "createdAt": Date,
  "updatedAt": Date
}
```

**Collection `outbox_events`** — service-transaction (transaction-db)

```json
{
  "_id": ObjectId,
  "event_type": String,      // "wallet.balance.update", indexed
  "aggregate_id": String,    // wallet_id hoặc transaction_id tùy event_type
  "payload": Mixed,          // dữ liệu sự kiện đầy đủ
  "published": Boolean,      // false = chờ publish, indexed
  "published_at": Date,      // null nếu chưa publish
  "createdAt": Date,
  "updatedAt": Date
}
```

**Collection `monthly_aggregates`** — analytics-service (analytics-db)

```json
{
  "_id": ObjectId,
  "user_id": String,         // logical FK → users._id, indexed
  "month": String,           // "YYYY-MM", unique compound với user_id
  "totalIncome": Number,
  "totalExpense": Number,
  "netCashFlow": Number,
  "byCategory": [{           // embedded aggregate theo danh mục
    "category_id": String,
    "category_name": String,
    "total_amount": Number,
    "transaction_count": Number
  }],
  "byWallet": [{             // embedded aggregate theo ví
    "wallet_id": String,
    "wallet_name": String,
    "total_amount": Number,
    "transaction_count": Number
  }],
  "generatedAt": Date,
  "sourceVersion": Number,   // phát hiện stale aggregate
  "createdAt": Date,
  "updatedAt": Date
}
```

**Collection `notifications`** — notification-service (notification-db)

```json
{
  "_id": ObjectId,
  "user_id": String,         // logical FK → users._id, indexed
  "title": String,
  "message": String,
  "type": String,            // "INFO" | "SUCCESS" | "WARNING" | "ALERT" | "REMINDER"
  "is_read": Boolean,        // default: false, indexed
  "created_at": Date,        // indexed
  "metadata": Mixed          // dữ liệu bổ sung tùy loại thông báo
}
```

### 3.2.3. Sơ đồ ERD / Schema Database

Hình dưới đây trình bày sơ đồ quan hệ giữa các collection trong MongoDB, biểu diễn theo ký pháp ERD có điều chỉnh cho mô hình tài liệu NoSQL, trong đó đường liên kết thể hiện quan hệ Reference (khóa ngoại dạng ObjectId) thay vì JOIN truyền thống.

![Hình 3.2: Sơ đồ ERD - Schema cơ sở dữ liệu MongoDB](link_hinh_anh)

**Phân tích mối quan hệ giữa các collection:**

Hệ thống áp dụng mô hình **database-per-service** — mỗi service sở hữu database MongoDB Atlas riêng biệt. Do đó, mọi tham chiếu xuyên service đều là **logical FK** (khóa ngoại logic): lưu dạng `String` hoặc `ObjectId` nhưng không có foreign-key constraint ở tầng DB; tính nhất quán được đảm bảo ở tầng ứng dụng và qua event-driven message (RabbitMQ).

Bên trong **transaction-db**, collection `transactions` lưu `user_id` (String) và `wallet_id` (String) dưới dạng denormalized — mặc dù `wallet_id` đã đủ để trace về user gián tiếp, việc lưu thêm `user_id` trực tiếp tránh được lookup hai cấp trong Analytics Service khi aggregate theo người dùng.

Collection `categories` hỗ trợ cấu trúc cây thông qua self-reference: `parentId` trỏ về `_id` của chính collection, cho phép tổ chức danh mục phân cấp (ví dụ: "Ăn uống" → "Ăn ngoài", "Tạp hóa"). `isSystem = true` đánh dấu danh mục do hệ thống seed, người dùng không thể xóa.

Collection `invoices` kết nối với `transactions` qua `transaction_id` theo quan hệ 1-1 optional: `null` khi hóa đơn chưa được xác nhận, được gán sau khi người dùng xác nhận chuyển thành giao dịch. `audit_trail` là mảng embedded ghi lại toàn bộ lifecycle của hóa đơn (CREATED → PROCESSED → CONFIRMED_AS_TRANSACTION hoặc REJECTED/DELETED) với `previous_state` và `next_state` phục vụ forensic audit.

Trường `idempotency_key` có unique index trên `transactions` là cơ chế cốt lõi đảm bảo tính **Idempotent Write**: khi AI Service trích xuất giao dịch từ tin nhắn NLP và BFF gọi Transaction Service để lưu, `idempotency_key` được tính bằng SHA-256 từ `(message + index + title + amount)`, do đó dù request được retry nhiều lần (timeout/mạng chậm), cơ sở dữ liệu chỉ ghi một bản ghi duy nhất.

Collection `outbox_events` triển khai **Transactional Outbox Pattern**: Transaction Service ghi sự kiện `wallet.balance.update` vào `outbox_events` trong cùng session MongoDB với thao tác tạo transaction, sau đó một Outbox Poller riêng đọc các event có `published = false` và publish lên RabbitMQ. Cách này đảm bảo không bao giờ mất sự kiện dù service restart giữa chừng.

---

## 3.3. Thiết kế các Module và API chính (Module Design)

### 3.3.1. Module Quản lý Giao dịch, Ví và Tiết kiệm (Transaction, Wallet & Saving Module)

**Mô tả nghiệp vụ:** Module này là lõi của toàn bộ ứng dụng, xử lý các thao tác tạo, đọc, cập nhật, xóa giao dịch tài chính và đồng thời duy trì số dư ví luôn nhất quán. Ngoài giao dịch đơn thuần, module còn quản lý danh mục chi tiêu phân cấp, quy tắc giao dịch định kỳ (recurring rules), mục tiêu tiết kiệm và danh mục đầu tư.

**Thiết kế API — Wallet Service (port 3002):**

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/v1/wallets` | Lấy danh sách ví của người dùng |
| `POST` | `/api/v1/wallets` | Tạo ví mới |
| `PUT` | `/api/v1/wallets/:id` | Cập nhật tên/loại ví |
| `PUT` | `/api/v1/wallets/:id/status` | Thay đổi trạng thái ví (active/blocked) |
| `DELETE` | `/api/v1/wallets/:id` | Xóa ví |

**Thiết kế API — Transaction Service (port 3003):**

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/v1/transactions` | Tạo giao dịch mới (hỗ trợ `idempotency_key`) |
| `GET` | `/api/v1/transactions` | Lấy danh sách giao dịch (phân trang, lọc tháng/ví/danh mục) |
| `GET` | `/api/v1/categories` | Lấy danh sách danh mục |
| `POST` | `/api/v1/categories` | Tạo danh mục mới |
| `PUT` | `/api/v1/categories/:id` | Cập nhật danh mục |
| `DELETE` | `/api/v1/categories/:id` | Xóa danh mục |
| `GET` | `/api/v1/transactions/recurring-rules` | Lấy danh sách quy tắc định kỳ |
| `POST` | `/api/v1/transactions/recurring-rules` | Tạo quy tắc định kỳ mới |
| `PUT` | `/api/v1/transactions/recurring-rules/:id` | Cập nhật quy tắc định kỳ |
| `DELETE` | `/api/v1/transactions/recurring-rules/:id` | Xóa quy tắc định kỳ |
| `GET` | `/api/v1/savings` | Lấy danh sách gói tiết kiệm / đầu tư |
| `POST` | `/api/v1/savings` | Tạo gói tiết kiệm / đầu tư mới |
| `POST` | `/api/v1/savings/:id/deposit` | Nạp tiền vào gói tiết kiệm |
| `POST` | `/api/v1/savings/:id/settle` | Tất toán gói (tính P&L thực tế cho đầu tư) |
| `POST` | `/api/v1/invoices/extract` | Upload ảnh + trích xuất OCR ngay (multipart) |
| `POST` | `/api/v1/invoices/upload` | Upload ảnh để xử lý OCR bất đồng bộ |
| `GET` | `/api/v1/invoices` | Lấy danh sách hóa đơn |
| `PUT` | `/api/v1/invoices/:id` | Cập nhật thông tin hóa đơn |
| `DELETE` | `/api/v1/invoices/:id` | Soft-delete hóa đơn |
| `POST` | `/api/v1/invoices/:id/confirm` | Xác nhận hóa đơn → tạo giao dịch |

**Thiết kế API — Identity Service (port 3001):**

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản mới |
| `POST` | `/api/v1/auth/login` | Đăng nhập, nhận access + refresh token |
| `POST` | `/api/v1/auth/login/2fa` | Hoàn tất đăng nhập khi tài khoản bật 2FA |
| `POST` | `/api/v1/auth/refresh` | Làm mới access token bằng refresh token |
| `POST` | `/api/v1/auth/logout` | Đăng xuất, thu hồi refresh token |
| `GET` | `/api/v1/auth/me` | Lấy thông tin người dùng hiện tại |
| `GET` | `/api/v1/settings` | Lấy cài đặt người dùng (theme, locale, AI config) |
| `PATCH` | `/api/v1/settings` | Cập nhật cài đặt |
| `POST` | `/api/v1/settings/api-keys` | Thêm Gemini API Key vào pool |
| `DELETE` | `/api/v1/settings/api-keys/:index` | Xóa API Key theo vị trí trong pool |

**Cơ chế cập nhật số dư tự động:**

Khi một giao dịch được tạo, Transaction Service không gọi trực tiếp Wallet Service. Thay vào đó, service ghi đồng thời bản ghi `transaction` và sự kiện `outbox_events` (event_type: `wallet.balance.update`) trong cùng một phiên MongoDB. Outbox Poller (job định kỳ) đọc các sự kiện chưa publish (`published = false`), gửi lên RabbitMQ, rồi cập nhật `published = true`. Wallet Service consume message, kiểm tra `processed_transaction_ids` để dedup, sau đó cập nhật số dư với optimistic locking:

$$\text{balance}_{new} = \text{balance}_{old} + \begin{cases} +\text{amount} & \text{nếu } transaction\_type = \text{INCOME} \\ -\text{amount} & \text{nếu } transaction\_type = \text{EXPENSE} \end{cases}$$

Nếu `version` đã thay đổi (conflict), Wallet Service retry thao tác findOneAndUpdate cho đến khi thành công, đảm bảo không mất cập nhật số dư trong môi trường concurrent.

### 3.3.2. Module Upload Ảnh và OCR Hóa Đơn

**Mô tả nghiệp vụ:** Module này bao gồm hai luồng phân tách: (1) **Cloud Service** chuyên upload ảnh lên Cloudinary và trả về `secure_url`; (2) **Invoice Extraction** trong Transaction Service thực hiện OCR bằng PaddleOCR qua AI Service.

**Thiết kế API — Cloud Service (port 3006):**

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/v1/cloud/upload` | Upload ảnh hóa đơn, trả về `{ secure_url, public_id }` |
| `DELETE` | `/api/v1/cloud/delete` | Xóa ảnh theo `public_id` |

**Luồng xử lý OCR hóa đơn (`POST /api/v1/invoices/extract`):**

```
Client gửi multipart/form-data (file ảnh)
    → Transaction Service nhận file
    → Multer middleware: kiểm tra MIME type (chỉ chấp nhận image/*)
      lưu tạm vào /public/uploads/ trên disk
    → invoice-extraction.service.ts:
        readFile(filePath) → Buffer
        Tạo FormData, append file với đúng MIME type
        POST internal → http://ai-service:8000/api/v1/ai/ocr
    → AI Service (Python / PaddleOCR):
        Singleton PaddleOCR (lang=vi, thread-safe)
        Xử lý ảnh → trích xuất text
        Normalize + regex extract số tiền (≥1000 VND)
        Trả về { merchantName, totalAmount, transactionDate }
    → Transaction Service trả về kết quả chuẩn hóa cho client
    → Client hiển thị preview, cho phép chỉnh sửa trước khi xác nhận
```

**Luồng xác nhận hóa đơn thành giao dịch (`POST /api/v1/invoices/:id/confirm`):**

```
Client xác nhận hóa đơn (sau khi review OCR result)
    → Transaction Service:
        Cập nhật invoice.status = "PROCESSED"
        Tạo Transaction với source = "INVOICE_CONFIRMATION"
        Gán invoice.transaction_id = transaction._id
        Ghi audit_trail entry: action = "CONFIRMED_AS_TRANSACTION"
    → Outbox event → RabbitMQ → Wallet Service cập nhật số dư
```

**Lý do không lưu file trực tiếp trên server:**

Việc lưu file trực tiếp trên server gây ra hai vấn đề nghiêm trọng trong môi trường microservice: (1) file bị mất khi container restart hoặc được triển khai lại (stateless containers); (2) trong môi trường multi-instance, các instance không chia sẻ filesystem. Cloudinary với CDN toàn cầu giải quyết cả hai vấn đề đồng thời cung cấp tốc độ tải ảnh tối ưu. Mọi ảnh được upload vào folder riêng theo `userId` và mang tag định danh — `CLOUDINARY_API_SECRET` không bao giờ được expose ra client.

### 3.3.3. Module AI Financial Chatbot (Agentic RAG Module)

**Mô tả nghiệp vụ:** Đây là module phức tạp nhất trong hệ thống, triển khai kiến trúc **Agentic RAG** (Retrieval-Augmented Generation với khả năng tự lập kế hoạch hành động). Module cho phép người dùng tương tác bằng tiếng Việt tự nhiên để truy vấn số liệu tài chính, nhận lời khuyên đầu tư, và ghi nhận giao dịch mới mà không cần điền form thủ công. Toàn bộ logic điều phối nằm trong API Gateway (BFF layer), AI Service chỉ đảm nhận tầng inference.

**Kiến trúc 3 tuyến xử lý:**

Module AI được thiết kế với ba tuyến (route) xử lý riêng biệt, được lựa chọn bởi **LLM Router** (Gemini với temperature=0):

1. **`record_transactions`:** Kích hoạt khi người dùng mô tả một hành động thu/chi trong quá khứ. Ví dụ: *"sáng nay tôi uống cà phê 45k và đổ xăng 100k"*. Tuyến này gọi `handleAiExtractText` → AI Service `/api/v1/ai/extract-text` → Gemini trích xuất JSON danh sách giao dịch, sau đó tự động lưu vào cơ sở dữ liệu.

2. **`analytics_chat`:** Kích hoạt khi người dùng hỏi về số liệu tài chính cá nhân. Ví dụ: *"tháng này tôi tiêu bao nhiêu tiền ăn?"*. Tuyến này lấy dữ liệu thực từ Analytics Service (cache Redis 30s per `userId:month`), sau đó gọi AI Service `/api/v1/ai/chat` với PhoBERT + Gemini để trả lời dựa trên dữ liệu cụ thể.

3. **`advisor_chat`:** Kích hoạt khi người dùng cần tư vấn chuyên sâu hoặc thông tin thị trường. Ví dụ: *"giá vàng hôm nay bao nhiêu?"* hoặc *"làm thế nào để tiết kiệm hiệu quả hơn?"*. Tuyến này gọi `handleAiAdvisorChat` → AI Service `/api/v1/ai/advisor/chat` với AdvisorOrchestrator có bộ nhớ hội thoại và Google Search grounding.

**Cơ chế API Key Pool:**

Người dùng cấu hình tối đa 10 Gemini API Keys qua trang Settings. Mỗi key được mã hóa AES-256-CBC trước khi lưu vào `user_settings.gemini_api_keys`. Trước mỗi lần gọi AI, Gateway lấy runtime config (`GET /settings/runtime-ai` — internal, bị tường lửa với client), truyền toàn bộ pool keys về AI Service dưới dạng `gemini_api_keys: [{ key, index }]`. Khi key bị giới hạn quota (HTTP 429), AI Service gửi index của key đó về; Gateway gọi nội bộ `PATCH /settings/api-keys/mark-exhausted` để đánh dấu `status = "exhausted"` và tự động chuyển sang key tiếp theo trong pool.

**Diễn giải chi tiết luồng xử lý (aiChatBff.ts):**

```
[1] Người dùng gửi tin nhắn văn bản
    → API Gateway nhận, xác thực JWT (verifyToken middleware)

[2] aiChatBff.ts khởi động:
    → Gọi nội bộ GET /settings/runtime-ai (bị block với client bên ngoài)
      Nhận: { gemini_api_keys[], selected_ai_model }
    → Fetch financial context từ Analytics Service
      (cache Redis 30s per userId:month — tránh gọi DB lặp lại)
    → Gọi LLM Router: Gemini API với routerPrompt (temperature=0, maxOutputTokens=180)
    → Nhận JSON: { route, confidence, tools, rationale }

[3] applyRouteGuardrail() kiểm tra kết quả router:
    → Nếu route=record_transactions nhưng tin nhắn chứa từ khóa
      "tổng chi/tổng thu/bao nhiêu/tháng này" → override sang analytics_chat
    → Nếu route=analytics_chat nhưng tin nhắn chứa "giá vàng/tỷ giá/thị trường"
      → override sang advisor_chat

[4a] Nếu route = record_transactions:
    → Gọi AI Service POST /api/v1/ai/extract-text
      (Gemini với gemini_api_keys pool, trích xuất JSON mảng giao dịch)
    → Parse JSON: [{ title, amount, type, category }]
    → Parallel fetch: wallets (active) + categories (EXPENSE + INCOME)
    → Với mỗi giao dịch, tính category_id bằng fuzzy matching tên danh mục
    → Parallel POST tất cả giao dịch vào Transaction Service
      (kèm idempotency_key = SHA-256(message + index + title + amount))
    → Append usage log: POST /settings/usage/append (internal)
    → Trả về xác nhận + danh sách giao dịch đã lưu

[4b] Nếu route = analytics_chat:
    → Financial context đã có từ bước [2] (có thể từ cache)
    → Gọi AI Service POST /api/v1/ai/chat
      { message, financialContext, use_llm: true, gemini_api_keys, model }
      (PhoBERT phân loại intent → Gemini sinh câu trả lời có số liệu thực)
    → Trả về câu trả lời kèm context tài chính

[4c] Nếu route = advisor_chat:
    → Gọi AI Service POST /api/v1/ai/advisor/chat
      → AdvisorOrchestrator:
          - Gemini trích xuất intent + entities
          - Phân nhánh: query_spending / query_income /
            financial_advice / general_knowledge
          - Nếu general_knowledge: Gemini với Google Search grounding
          - Nếu financial_advice: RAG từ financial knowledge + bộ nhớ hội thoại
          - apply_output_guardrails() lọc nội dung không phù hợp
    → Cache kết quả Redis 120s (key: SHA-256(userId + sessionId + msg))
    → Append usage log
    → Trả về câu trả lời + metadata (model, tokens, estimated_cost)
```

**Cơ chế Guardrail (An toàn đầu ra):**

Module áp dụng hai lớp guardrail độc lập: (1) **Input Guardrail** tại `applyRouteGuardrail()` trong BFF — kiểm tra lại quyết định của LLM router bằng heuristic rule trước khi thực thi, tránh trường hợp LLM nhầm lẫn giữa "ghi giao dịch" và "hỏi số liệu"; (2) **Output Guardrail** tại `apply_output_guardrails()` trong AdvisorOrchestrator Python — lọc bỏ câu trả lời có thể gây hại tài chính (cam kết lợi nhuận, lời khuyên đầu tư cụ thể không có cơ sở) hoặc vượt phạm vi ứng dụng. Thiết kế hai lớp này đảm bảo ngay cả khi LLM tạo ra output không mong muốn, hệ thống vẫn có cơ chế kiểm soát độc lập ở tầng ứng dụng.

---

## 3.4. Thiết kế giao diện và luồng người dùng (UI/UX Design & User Flow)

### 3.4.1. Triết lý thiết kế UI/UX

Giao diện ứng dụng được xây dựng bằng **React 18 + Vite**, tổ chức theo kiến trúc SPA với React Router v6. Routing phân tầng: `/auth` render độc lập `Auth` page, mọi route còn lại được bọc trong `DashboardLayout` có sidebar navigation. Giao diện áp dụng phong cách **Modern SaaS Dashboard**, tối ưu hóa hoàn toàn cho **Dark Mode** như phương thức trình bày mặc định. Quyết định thiết kế này xuất phát từ ba lý do:

**1. Tính rõ nét dữ liệu tài chính:** Nền tối (`bg-slate-900`, `#0f172a`) tạo độ tương phản cao với văn bản và số liệu màu trắng/xanh lá (`text-slate-200`, `text-emerald-400`), giúp người dùng đọc nhanh các con số tài chính trong mọi điều kiện ánh sáng mà không mỏi mắt. Biểu đồ Recharts trên nền tối có màu sắc nổi bật hơn đáng kể so với nền trắng.

**2. Chuẩn mực ngành FinTech:** Các ứng dụng tài chính chuyên nghiệp (Bloomberg Terminal, Robinhood, Binance) đều ưu tiên dark theme để tạo cảm giác chuyên nghiệp và đáng tin cậy.

**3. Hiệu suất màn hình OLED:** Trên thiết bị di động với màn hình OLED, dark mode tiêu thụ ít điện năng hơn đáng kể so với light mode, cải thiện thời lượng pin cho ứng dụng React Native.

**Cấu trúc trang (Routes):**

Ứng dụng bao gồm các trang chính: `/` (Dashboard), `/wallets` (Wallets), `/transactions` (Transactions), `/invoices` (Invoices OCR), `/savings` (SavingInvestment), `/analytics` (Analytics), `/recurring` (Recurring Rules), `/ai-assistant` (SmartAI Chat), `/settings` (Settings), `/profile` (Profile), `/feedback`, `/help`.

**Bảng màu chính:**

| Token | Giá trị Hex | Mục đích sử dụng |
|---|---|---|
| `bg-slate-900` | `#0f172a` | Màu nền trang chính |
| `bg-slate-800` | `#1e293b` | Màu nền card/panel |
| `bg-slate-700` | `#334155` | Màu nền input, hover state |
| `text-slate-200` | `#e2e8f0` | Văn bản chính |
| `text-slate-400` | `#94a3b8` | Văn bản phụ, label |
| `text-emerald-400` | `#34d399` | Số dương (thu nhập), trạng thái tốt |
| `text-rose-400` | `#fb7185` | Số âm (chi tiêu), cảnh báo |
| `text-amber-400` | `#fbbf24` | Highlight, số liệu quan trọng |

**Nguyên tắc bố cục:** Sidebar cố định bên trái với navigation icons và labels, khu vực nội dung chính chiếm phần lớn viewport với grid layout responsive. Cards thông tin sử dụng border `border-slate-700` để phân tách vùng thị giác mà không dùng shadow (shadow không hiệu quả trên nền tối). Spacing tuân theo thang 4px (Tailwind default: 4 = 1rem = 16px). State management: React Query xử lý toàn bộ server state (fetch, cache, invalidation), Zustand lưu UI state toàn cục (sidebar collapse, theme).

### 3.4.2. Luồng 1: Onboarding & Dashboard

**Mô tả luồng:** Luồng này bao gồm toàn bộ hành trình từ khi người dùng đăng ký tài khoản mới đến khi tiếp cận dashboard tổng quan tài chính với biểu đồ Recharts trực quan.

Hình dưới đây trình bày wireframe giao diện trang Dashboard chính với các thành phần tóm tắt số dư, biểu đồ cashflow và danh sách giao dịch gần đây.

![Hình 3.4: Wireframe / Mockup giao diện Dashboard tổng quan tài chính](link_hinh_anh)

**Diễn giải chi tiết luồng Onboarding → Dashboard:**

```
[Bước 1] Đăng ký tài khoản
    → Người dùng nhập email + mật khẩu
    → Identity Service: validate + bcrypt hash + lưu MongoDB (users)
    → Tự động khởi tạo user_settings với default values
    → Redirect → /dashboard

[Bước 2] Cấu hình API Key Pool Gemini (Optional, trang /settings)
    → Người dùng nhập một hoặc nhiều Gemini API Keys (tối đa 10)
    → POST /api/v1/settings/api-keys (mỗi key một request)
    → Identity Service mã hóa AES-256-CBC và lưu vào user_settings.gemini_api_keys[]
    → Giao diện Settings hiển thị danh sách keys (mặc định ẩn sau 3 keys đầu,
      có nút expand khi pool > 3 keys), badge trạng thái active/exhausted

[Bước 3] Dashboard Tổng quan (/dashboard)
    → React Query fetch song song:
        - Analytics Service: aggregate tổng thu, tổng chi, số dư ròng tháng hiện tại
        - Transaction Service: 10 giao dịch gần nhất
        - Wallet Service: danh sách ví và tổng số dư
    → Phần trên: 4 Card tóm tắt
        - "Tổng thu tháng này" (text-emerald-400)
        - "Tổng chi tháng này" (text-rose-400)
        - "Tiết kiệm đang chạy" (activeCount gói + tổng mục tiêu, text-amber-400)
        - "Số dư các ví" (tổng balance)
    → Phần giữa: Biểu đồ Recharts
        - AreaChart: Cashflow 30 ngày gần nhất
        - PieChart/DonutChart: Phân bổ chi tiêu theo danh mục
    → Phần dưới: Bảng 10 giao dịch gần nhất (kèm filter tháng)
```

**Phân tích UX:**

Việc sử dụng AreaChart của Recharts thay vì BarChart cho cashflow theo ngày tạo ra đường xu hướng mượt mà hơn, giúp người dùng nhận diện pattern chi tiêu trực quan. DonutChart hiển thị tỷ lệ phần trăm phân bổ chi tiêu theo danh mục, với mỗi segment được tô màu riêng biệt và tooltip hiển thị số tiền cụ thể khi hover. Dữ liệu được fetch song song (parallel) cho ba thành phần Card, AreaChart và DonutChart để tối thiểu thời gian tải trang.

### 3.4.3. Luồng 2: Nhập giao dịch bằng ngôn ngữ tự nhiên (NLP Quick Entry)

**Mô tả luồng:** Luồng này thể hiện tính năng differentiating (khác biệt) của ứng dụng — thay vì điền form thủ công với 5-7 trường, người dùng chỉ cần nhắn tin tự nhiên bằng tiếng Việt và hệ thống AI tự động trích xuất, phân loại và lưu giao dịch.

Hình dưới đây trình bày wireframe giao diện trang AI Assistant, bao gồm khung hội thoại và luồng xác nhận giao dịch được trích xuất.

![Hình 3.5: Wireframe / Mockup giao diện AI Assistant - Nhập giao dịch bằng ngôn ngữ tự nhiên](link_hinh_anh)

**Diễn giải chi tiết luồng NLP Quick Entry:**

```
[Bước 1] Người dùng mở màn hình AI Chat
    → Giao diện: Khung chat full-height, input box cố định dưới
    → Placeholder: "Nhập giao dịch hoặc đặt câu hỏi tài chính..."
    → Nút micro icon (tùy chọn: nhập bằng giọng nói)

[Bước 2] Người dùng nhắn tin
    Ví dụ: "sáng ăn phở 60k, chiều cà phê 45k, tối đổ xăng 150k"
    → Frontend hiển thị message bubble (bg-slate-700, text-slate-200)
    → Hiệu ứng "đang gõ..." (typing indicator)

[Bước 3] API Gateway nhận và xử lý (aiChatBff.ts)
    → LLM Router phân loại: route = "record_transactions"
    → Gemini extract-text trả về JSON:
      [
        { "title": "Ăn phở", "amount": 60000, "type": "expense", "category": "Ăn uống" },
        { "title": "Cà phê", "amount": 45000, "type": "expense", "category": "Ăn uống" },
        { "title": "Đổ xăng", "amount": 150000, "type": "expense", "category": "Di chuyển" }
      ]
    → Hệ thống tự động match category_id + tìm active wallet

[Bước 4] Frontend hiển thị Preview Cards
    → 3 card xanh dương với thông tin từng giao dịch
    → Mỗi card: [Icon danh mục] [Tên giao dịch] [Số tiền] [Danh mục]
    → Nút "Xác nhận lưu tất cả" (bg-emerald-600)
    → Nút "Chỉnh sửa" (mở form edit inline)

[Bước 5] Lưu và phản hồi
    → Transaction Service lưu 3 giao dịch (parallel, idempotency_key)
    → Wallet Service cập nhật số dư (RabbitMQ event)
    → AI trả lời: "Đã ghi 3 khoản vào ví Tiền mặt:
       Ăn phở (60.000đ), Cà phê (45.000đ), Đổ xăng (150.000đ).
       Tổng chi: 255.000đ"
    → Bubble phản hồi (bg-slate-800, border-l-4 border-emerald-500)
    → Confetti animation nhẹ (UX delight)
```

**Phân tích UX của luồng NLP:**

Thiết kế luồng này đặt **tốc độ** là ưu tiên hàng đầu. Thay vì yêu cầu xác nhận từng giao dịch, hệ thống nhóm tất cả giao dịch được trích xuất vào một màn hình xác nhận duy nhất. Người dùng có thể lưu tất cả bằng một tap, hoặc chỉnh sửa inline nếu có trường không chính xác. Cơ chế `idempotency_key` đảm bảo rằng dù người dùng tap nút "Xác nhận" nhiều lần (do mạng chậm), cơ sở dữ liệu vẫn chỉ ghi một lần — tránh tình trạng trùng lặp giao dịch gây nhầm lẫn.

**So sánh trải nghiệm người dùng:**

| Phương thức | Số thao tác | Thời gian ước tính |
|---|---|---|
| Nhập form thủ công (3 giao dịch) | ~21 thao tác (7 field × 3) | ~90 giây |
| Nhập bằng ngôn ngữ tự nhiên | 2 thao tác (gõ + xác nhận) | ~15 giây |

Sự khác biệt 6× về thời gian là yếu tố cốt lõi tạo nên giá trị sản phẩm và thúc đẩy người dùng duy trì thói quen ghi chép tài chính đều đặn.

### 3.4.4. Tổng kết thiết kế giao diện

Hệ thống giao diện được thiết kế với nguyên tắc **Progressive Disclosure** — người dùng mới chỉ thấy các chức năng cốt lõi (xem số dư, thêm giao dịch, dashboard); tính năng nâng cao (AI advisor, tiết kiệm/đầu tư, hóa đơn OCR, giao dịch định kỳ, cấu hình Gemini API Key Pool) được đặt ở lớp thứ hai trong sidebar. Điều này giảm cognitive load cho người dùng mới trong khi vẫn cung cấp đầy đủ tính năng cho người dùng có kinh nghiệm.

Responsive design tuân thủ breakpoint của Tailwind: mobile-first với layout single-column trên `sm` (< 640px), chuyển sang 2-column trên `md` (≥ 768px), và full dashboard trên `lg` (≥ 1024px). Toàn bộ data fetching sử dụng React Query với stale-time và cache-time phù hợp cho từng loại dữ liệu — dữ liệu analytics được refresh theo thời gian thực khi user điều hướng sang trang Analytics, trong khi dữ liệu danh mục được cache dài hơn do ít thay đổi.

---

*Chương 3 đã trình bày đầy đủ bốn khía cạnh thiết kế cốt lõi của hệ thống: kiến trúc tổng thể 8 microservice và luồng dữ liệu (3.1), mô hình dữ liệu NoSQL với 10 collection trải trên 5 database riêng biệt và lý do lựa chọn MongoDB (3.2), thiết kế chi tiết API và ba module nghiệp vụ trọng tâm bao gồm Agentic RAG với API Key Pool rotation (3.3), và thiết kế giao diện React SPA với hai luồng UX chính (3.4). Chương tiếp theo sẽ trình bày quá trình triển khai (implementation) và kết quả kiểm thử hệ thống.*
