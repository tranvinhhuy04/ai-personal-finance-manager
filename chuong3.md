# CHƯƠNG 3: THIẾT KẾ HỆ THỐNG

## 3.1. Sơ đồ kiến trúc tổng thể (System Architecture)

### 3.1.1. Tổng quan kiến trúc

Hệ thống Quản lý Tài chính Cá nhân tích hợp AI được xây dựng theo mô hình kiến trúc **Client–Server phân tầng kết hợp AI Service riêng biệt** (Layered Client-Server with Dedicated AI Microservice). Mô hình này tách biệt rõ ràng ba mặt phẳng trách nhiệm: trình diễn dữ liệu (presentation), xử lý nghiệp vụ (business logic) và xử lý trí tuệ nhân tạo (AI inference), từ đó đảm bảo khả năng mở rộng độc lập từng tầng mà không ảnh hưởng đến tính ổn định tổng thể.

Hệ thống bao gồm 8 microservice hoạt động song song, được điều phối bởi một **API Gateway** đóng vai trò điểm vào duy nhất (single entry point) cho toàn bộ yêu cầu từ phía client. Các service giao tiếp nội bộ qua HTTP/REST và hàng đợi tin nhắn bất đồng bộ RabbitMQ theo mẫu Transactional Outbox Pattern nhằm đảm bảo tính nhất quán dữ liệu phân tán.

Bảng sau tóm tắt vai trò của từng thành phần cốt lõi trong kiến trúc:

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Web Frontend | Next.js + Tailwind CSS | Giao diện người dùng web, SSR/CSR hybrid |
| Mobile Frontend | React Native + Tailwind | Ứng dụng di động đa nền tảng iOS/Android |
| API Gateway | Node.js/Express (port 3000) | Xác thực JWT, định tuyến, BFF cho AI |
| Identity Service | Node.js/Express (port 3001) | Đăng ký, đăng nhập, quản lý phiên, cấu hình AI |
| Wallet Service | Node.js/Express (port 3002) | Quản lý ví, tính toán số dư |
| Transaction Service | Node.js/Express (port 3003) | CRUD giao dịch, phân loại danh mục |
| Analytics Service | Node.js/Express (port 3004) | Tổng hợp báo cáo, dashboard tài chính |
| Notification Service | Node.js/Express (port 3005) | Thông báo đẩy, email qua RabbitMQ |
| Cloud Service | Node.js/Express (port 3006) | Upload ảnh lên Cloudinary, trả secure_url |
| AI Service | FastAPI/Python (port 8000) | OCR hóa đơn, NLP chatbot, Agentic RAG |
| MongoDB Atlas | NoSQL Cloud Database | Lưu trữ toàn bộ dữ liệu nghiệp vụ |
| Redis | In-memory Cache | Cache phiên, kết quả AI, context hội thoại |
| RabbitMQ | Message Broker | Hàng đợi sự kiện bất đồng bộ giữa service |

### 3.1.2. Sơ đồ kiến trúc tổng thể

Để hình dung rõ ràng các tầng và hướng luồng dữ liệu, hình dưới đây trình bày sơ đồ kiến trúc đầy đủ của hệ thống, bao gồm tất cả các thành phần và kênh giao tiếp giữa chúng.

![Hình 3.1: Sơ đồ kiến trúc tổng thể hệ thống quản lý tài chính cá nhân tích hợp AI](link_hinh_anh)

**Phân tích kiến trúc theo từng tầng:**

**Tầng Client (Presentation Layer):** Gồm hai nền tảng phân biệt — ứng dụng web xây dựng trên Next.js với khả năng render phía server (SSR) giúp tối ưu SEO và thời gian tải trang, và ứng dụng di động React Native chia sẻ logic nghiệp vụ tối đa qua các custom hook dùng chung. Cả hai đều sử dụng Tailwind CSS để đảm bảo tính nhất quán về giao diện. Toàn bộ yêu cầu HTTP từ client đều mang JWT Bearer Token trong header `Authorization` và được gửi đến **API Gateway** thay vì trực tiếp đến từng service.

**Tầng API Gateway (Orchestration Layer):** API Gateway đảm nhận ba trách nhiệm chính: (1) xác minh tính hợp lệ của JWT token trước khi chuyển tiếp yêu cầu; (2) định tuyến yêu cầu đến đúng microservice backend theo path prefix (`/api/v1/wallets` → wallet-service, `/api/v1/transactions` → transaction-service...); (3) thực thi logic BFF (Backend-for-Frontend) cho luồng AI, cụ thể là module `aiChatBff.ts` và `aiAdvisorBff.ts` tích hợp LLM router, guardrail đầu ra và cơ chế cache kết quả.

**Tầng Business Logic (Service Layer):** Mỗi microservice hoạt động độc lập, sở hữu collection MongoDB riêng, và chỉ expose HTTP REST API. Giao tiếp liên service được thực hiện qua HTTP nội bộ (synchronous) cho các tác vụ cần phản hồi ngay, và qua RabbitMQ (asynchronous) cho các tác vụ cho phép xử lý trễ như gửi thông báo sau khi tạo giao dịch.

**Tầng AI Service (Inference Layer):** AI Service là service Python duy nhất, được tách hoàn toàn khỏi stack Node.js để tận dụng hệ sinh thái machine learning của Python. Service này phụ trách ba năng lực chính: nhận dạng ký tự quang học hóa đơn (OCR) bằng PaddleOCR, phân loại ý định người dùng bằng PhoBERT, và tạo sinh ngôn ngữ tự nhiên cùng Agentic RAG thông qua Google Gemini API.

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

**Collection `users`**

```json
{
  "_id": ObjectId,
  "email": String,            // unique, indexed
  "passwordHash": String,     // bcrypt hash, KHÔNG lưu plaintext
  "fullName": String,
  "avatarUrl": String,        // secure_url từ Cloudinary
  "settings": {
    "currency": String,       // "VND", "USD"
    "language": String,       // "vi", "en"
    "theme": String           // "dark", "light"
  },
  "aiConfig": {
    "gemini_api_key": String, // mã hóa AES-256 trước khi lưu
    "selected_ai_model": String, // "gemini-2.5-flash", "gemini-2.0-flash"
    "available_models": [String]
  },
  "usageLog": [{
    "model": String,
    "tokens_used": Number,
    "estimated_cost": Number,
    "timestamp": Date
  }],
  "createdAt": Date,
  "updatedAt": Date
}
```

**Collection `wallets`**

```json
{
  "_id": ObjectId,
  "userId": ObjectId,         // Reference → users._id, indexed
  "walletName": String,
  "walletType": String,       // "CASH", "BANK", "EWALLET", "INVESTMENT"
  "balance": Decimal128,      // Sử dụng Decimal128 để tránh float precision error
  "currency": String,
  "status": Number,           // 1: active, 0: archived
  "createdAt": Date,
  "updatedAt": Date
}
```

**Collection `transactions`**

```json
{
  "_id": ObjectId,
  "walletId": ObjectId,       // Reference → wallets._id, indexed
  "userId": ObjectId,         // Denormalized để tối ưu truy vấn theo user
  "categoryId": ObjectId,     // Reference → categories._id
  "amount": Decimal128,
  "transaction_type": String, // "INCOME" | "EXPENSE"
  "description": String,
  "occurred_at": Date,        // indexed (time-series query)
  "idempotency_key": String,  // SHA-256 hash, unique index (chống ghi trùng)
  "source": String,           // "manual" | "ocr" | "nlp_chat"
  "ocrData": {                // optional, chỉ tồn tại khi source = "ocr"
    "merchantName": String,
    "totalAmount": Number,
    "invoiceImageUrl": String,
    "extractedAt": Date
  },
  "tags": [String],
  "createdAt": Date,
  "updatedAt": Date
}
```

**Collection `categories`**

```json
{
  "_id": ObjectId,
  "userId": ObjectId,         // null nếu là category hệ thống
  "name": String,
  "categoryType": String,     // "INCOME" | "EXPENSE"
  "icon": String,
  "color": String,
  "status": Number,
  "isSystem": Boolean
}
```

### 3.2.3. Sơ đồ ERD / Schema Database

Hình dưới đây trình bày sơ đồ quan hệ giữa các collection trong MongoDB, biểu diễn theo ký pháp ERD có điều chỉnh cho mô hình tài liệu NoSQL, trong đó đường liên kết thể hiện quan hệ Reference (khóa ngoại dạng ObjectId) thay vì JOIN truyền thống.

![Hình 3.2: Sơ đồ ERD - Schema cơ sở dữ liệu MongoDB](link_hinh_anh)

**Phân tích mối quan hệ giữa các collection:**

Mô hình dữ liệu áp dụng chiến lược **Reference** (thay vì Embed) cho các quan hệ một-nhiều có khả năng phát triển không giới hạn. Cụ thể, một `user` có thể sở hữu nhiều `wallet`, mỗi `wallet` chứa nhiều `transaction` — đây là chuỗi quan hệ 1:N liên tiếp. Nếu nhúng (embed) giao dịch vào ví, kích thước document sẽ vượt giới hạn 16MB của MongoDB khi người dùng có lịch sử dài.

Trường `userId` được denormalize (nhân bản) trong collection `transactions` — mặc dù có thể tra cứu gián tiếp qua `walletId` — nhằm tránh lookup hai cấp khi thực hiện aggregation theo người dùng trong Analytics Service.

Trường `idempotency_key` có unique index trên collection `transactions` là cơ chế cốt lõi đảm bảo tính An toàn khi thực hiện lại (Idempotent Write): khi AI Service gọi Transaction Service để lưu giao dịch đã trích xuất từ tin nhắn NLP, hash SHA-256 được tính từ `message + index + title + amount`, do đó dù request được gửi lại nhiều lần (do timeout hoặc retry), cơ sở dữ liệu chỉ ghi một bản ghi duy nhất.

---

## 3.3. Thiết kế các Module và API chính (Module Design)

### 3.3.1. Module Quản lý Giao dịch và Ví (Transaction & Wallet Module)

**Mô tả nghiệp vụ:** Module này là lõi của toàn bộ ứng dụng, xử lý các thao tác tạo, đọc, cập nhật, xóa giao dịch tài chính và đồng thời duy trì số dư ví luôn nhất quán.

**Thiết kế API:**

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/v1/transactions` | Tạo giao dịch mới (hỗ trợ idempotency_key) |
| `GET` | `/api/v1/transactions` | Lấy danh sách giao dịch (phân trang, lọc theo tháng/ví/danh mục) |
| `GET` | `/api/v1/transactions/:id` | Lấy chi tiết một giao dịch |
| `PUT` | `/api/v1/transactions/:id` | Cập nhật giao dịch |
| `DELETE` | `/api/v1/transactions/:id` | Xóa giao dịch |
| `GET` | `/api/v1/wallets` | Lấy danh sách ví của người dùng |
| `POST` | `/api/v1/wallets` | Tạo ví mới |
| `PUT` | `/api/v1/wallets/:id` | Cập nhật thông tin ví |

**Cơ chế cập nhật số dư tự động:**

Khi một giao dịch được tạo hoặc xóa, Transaction Service phát một sự kiện qua RabbitMQ đến Wallet Service để cập nhật số dư, thay vì gọi trực tiếp (synchronous). Cách tiếp cận này áp dụng mẫu **Transactional Outbox Pattern**: trước khi publish message, service ghi sự kiện vào bảng `outbox` trong cùng transaction MongoDB, một process riêng sẽ đọc và publish — đảm bảo không mất sự kiện dù service restart giữa chừng.

Công thức cập nhật số dư:

$$\text{balance}_{new} = \text{balance}_{old} + \begin{cases} +\text{amount} & \text{nếu } transaction\_type = \text{INCOME} \\ -\text{amount} & \text{nếu } transaction\_type = \text{EXPENSE} \end{cases}$$

**Cơ chế xác thực dữ liệu đầu vào:**

Tất cả dữ liệu đầu vào tại lớp controller đều được kiểm tra nghiêm ngặt: `amount` phải là số dương hữu hạn, `transaction_type` phải thuộc tập `{INCOME, EXPENSE}`, `occurred_at` phải là ISO 8601 hợp lệ. Điều này ngăn chặn dữ liệu bẩn được lưu vào MongoDB, đặc biệt quan trọng khi giao dịch được tạo tự động từ pipeline AI.

### 3.3.2. Module Cloudinary Upload (Cloud Storage Module)

**Mô tả nghiệp vụ:** Module này xử lý việc tải lên ảnh hóa đơn từ thiết bị người dùng, thực hiện nén và tối ưu hóa hình ảnh trước khi lưu lên Cloudinary, và trả về `secure_url` HTTPS để lưu vào collection `transactions`.

**Thiết kế API:**

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/v1/cloud/upload` | Upload ảnh hóa đơn, trả về `secure_url` |
| `DELETE` | `/api/v1/cloud/delete` | Xóa ảnh theo `public_id` |

**Luồng xử lý upload:**

```
Client gửi multipart/form-data (file ảnh)
    → Cloud Service nhận file buffer vào RAM (không ghi disk)
    → Multer middleware kiểm tra MIME type (chỉ chấp nhận image/*)
    → Kiểm tra kích thước file (tối đa 10MB)
    → Cloudinary SDK upload với transformation:
        - width: 1200 (resize giữ tỉ lệ)
        - quality: auto (nén tự động)
        - format: auto (chọn WebP nếu browser hỗ trợ)
    → Nhận lại { secure_url, public_id, width, height }
    → Trả về JSON response cho client
```

**Lý do không lưu file trực tiếp trên server:**

Việc lưu file trực tiếp trên server gây ra hai vấn đề nghiêm trọng trong môi trường microservice: (1) file bị mất khi container restart hoặc được triển khai lại (stateless containers); (2) trong môi trường multi-instance, các instance không chia sẻ filesystem. Cloudinary với CDN toàn cầu giải quyết cả hai vấn đề đồng thời cung cấp tốc độ tải ảnh tối ưu cho người dùng ở mọi vị trí địa lý.

**Bảo mật:**

Tất cả ảnh được upload với tag `userId` và lưu trong folder riêng theo `userId` trên Cloudinary. Biến môi trường `CLOUDINARY_API_SECRET` không bao giờ được expose ra client — toàn bộ việc ký URL và xác thực với Cloudinary diễn ra hoàn toàn trên server.

### 3.3.3. Module AI Financial Chatbot (Agentic RAG Module)

**Mô tả nghiệp vụ:** Đây là module phức tạp nhất trong hệ thống, triển khai kiến trúc **Agentic RAG** (Retrieval-Augmented Generation với khả năng tự lập kế hoạch hành động). Module cho phép người dùng tương tác bằng tiếng Việt tự nhiên để truy vấn số liệu tài chính, nhận lời khuyên đầu tư, và ghi nhận giao dịch mới mà không cần điền form thủ công.

**Kiến trúc 3 tuyến xử lý:**

Module AI được thiết kế với ba tuyến (route) xử lý riêng biệt, được lựa chọn bởi **LLM Router** (Gemini với temperature=0):

1. **`record_transactions`:** Kích hoạt khi người dùng mô tả một hành động thu/chi trong quá khứ. Ví dụ: *"sáng nay tôi uống cà phê 45k và đổ xăng 100k"*. Tuyến này gọi AI Service để trích xuất JSON danh sách giao dịch, sau đó tự động lưu vào cơ sở dữ liệu.

2. **`analytics_chat`:** Kích hoạt khi người dùng hỏi về số liệu tài chính cá nhân. Ví dụ: *"tháng này tôi tiêu bao nhiêu tiền ăn?"*. Tuyến này lấy dữ liệu thực từ Analytics Service, sau đó dùng PhoBERT + Gemini để trả lời dựa trên dữ liệu cụ thể.

3. **`advisor_chat`:** Kích hoạt khi người dùng cần tư vấn chuyên sâu hoặc thông tin thị trường. Ví dụ: *"giá vàng hôm nay bao nhiêu?"* hoặc *"làm thế nào để tiết kiệm hiệu quả hơn?"*. Tuyến này sử dụng AdvisorOrchestrator với bộ nhớ hội thoại và khả năng tìm kiếm web.

**Thiết kế chi tiết luồng xử lý Function Calling:**

Hình sau mô tả sơ đồ luồng (flowchart) của toàn bộ quá trình xử lý một yêu cầu người dùng qua module AI, từ điểm nhận tin nhắn đến khi trả về phản hồi cuối cùng.

![Hình 3.3: Sơ đồ luồng xử lý Agentic RAG - AI Financial Chatbot](link_hinh_anh)

**Diễn giải chi tiết luồng:**

```
[1] Người dùng gửi tin nhắn văn bản
    → API Gateway nhận, xác thực JWT

[2] BFF Layer (aiChatBff.ts) khởi động:
    → Đọc cấu hình AI của user từ Identity Service
      (gemini_api_key, selected_model)
    → Gọi LLM Router: POST Gemini API với routerPrompt
      (temperature=0, maxOutputTokens=180)
    → Nhận JSON: { route, confidence, tools, rationale }

[3] Guardrail kiểm tra kết quả router:
    → Nếu route=record_transactions nhưng tin nhắn chứa từ khóa
      tổng chi/tổng thu → override sang analytics_chat
    → Nếu route=analytics_chat nhưng tin nhắn chứa giá vàng/tỷ giá
      → override sang advisor_chat

[4a] Nếu route = record_transactions:
    → Gọi AI Service /api/v1/ai/extract-text
      (Gemini trích xuất JSON mảng giao dịch)
    → Parse JSON: [{ title, amount, type, category }]
    → Parallel fetch: wallets + categories (expense + income)
    → Với mỗi giao dịch, tính category_id bằng fuzzy matching
    → Parallel POST tất cả giao dịch vào Transaction Service
      (kèm idempotency_key = SHA-256(message+index+title+amount))
    → Trả về xác nhận + danh sách đã lưu

[4b] Nếu route = analytics_chat:
    → Fetch financial context từ Analytics Service
      (cache Redis 30s per userId:month)
    → Gọi AI Service /api/v1/ai/chat với context tài chính
      (PhoBERT phân loại intent → Gemini sinh câu trả lời)
    → Trả về câu trả lời có ngữ cảnh số liệu thực

[4c] Nếu route = advisor_chat:
    → Fetch financial context (tương tự 4b)
    → Gọi AI Service /api/v1/ai/advisor/chat
      → AdvisorOrchestrator:
          - Gemini trích xuất intent + entities
          - Phân nhánh: query_spending / query_income /
            financial_advice / general_knowledge
          - Nếu general_knowledge: Gemini với Google Search grounding
          - Nếu financial_advice: RAG từ financial_math + memory
          - apply_output_guardrails() lọc nội dung
    → Cache kết quả Redis 120s (key: SHA-256(userId+sessionId+msg))
    → Append usage log (model, tokens, estimated_cost)
    → Trả về câu trả lời + metadata
```

**Cơ chế Guardrail (An toàn đầu ra):**

Module áp dụng hai lớp guardrail: (1) **Input Guardrail** tại `applyRouteGuardrail()` trong BFF — kiểm tra lại quyết định của LLM router bằng heuristic rule trước khi thực thi; (2) **Output Guardrail** tại `apply_output_guardrails()` trong AdvisorOrchestrator — lọc bỏ câu trả lời có thể gây hại tài chính hoặc vượt phạm vi chuyên môn. Thiết kế này đảm bảo rằng ngay cả khi LLM tạo ra output không mong muốn, hệ thống vẫn có cơ chế kiểm soát độc lập.

---

## 3.4. Thiết kế giao diện và luồng người dùng (UI/UX Design & User Flow)

### 3.4.1. Triết lý thiết kế UI/UX

Giao diện ứng dụng được thiết kế theo phong cách **Modern SaaS Dashboard**, tối ưu hóa hoàn toàn cho **Dark Mode** như phương thức trình bày mặc định. Quyết định thiết kế này xuất phát từ ba lý do:

**1. Tính rõ nét dữ liệu tài chính:** Nền tối (`bg-slate-900`, `#0f172a`) tạo độ tương phản cao với văn bản và số liệu màu trắng/xanh lá (`text-slate-200`, `text-emerald-400`), giúp người dùng đọc nhanh các con số tài chính trong mọi điều kiện ánh sáng mà không mỏi mắt. Biểu đồ Recharts trên nền tối có màu sắc nổi bật hơn đáng kể so với nền trắng.

**2. Chuẩn mực ngành FinTech:** Các ứng dụng tài chính chuyên nghiệp (Bloomberg Terminal, Robinhood, Binance) đều ưu tiên dark theme để tạo cảm giác chuyên nghiệp và đáng tin cậy.

**3. Hiệu suất màn hình OLED:** Trên thiết bị di động với màn hình OLED, dark mode tiêu thụ ít điện năng hơn đáng kể so với light mode, cải thiện thời lượng pin cho ứng dụng React Native.

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

**Nguyên tắc bố cục:** Sidebar cố định bên trái với navigation icons, khu vực nội dung chính chiếm phần lớn viewport với grid layout 12-cột. Cards thông tin sử dụng border `border-slate-700` để phân tách vùng thị giác mà không dùng shadow (vì shadow không hiệu quả trên nền tối). Spacing tuân theo thang 4px (Tailwind default: 4 = 1rem = 16px).

### 3.4.2. Luồng 1: Onboarding & Dashboard

**Mô tả luồng:** Luồng này bao gồm toàn bộ hành trình từ khi người dùng đăng ký tài khoản mới đến khi tiếp cận dashboard tổng quan tài chính với biểu đồ Recharts trực quan.

Hình dưới đây trình bày wireframe giao diện trang Dashboard chính với các thành phần tóm tắt số dư, biểu đồ cashflow và danh sách giao dịch gần đây.

![Hình 3.4: Wireframe / Mockup giao diện Dashboard tổng quan tài chính](link_hinh_anh)

**Diễn giải chi tiết luồng Onboarding → Dashboard:**

```
[Bước 1] Đăng ký tài khoản
    → Người dùng nhập email + mật khẩu
    → Identity Service: validate + bcrypt hash + lưu MongoDB
    → Tự động tạo ví mặc định "Ví tiền mặt"
    → Gửi email xác thực (Notification Service qua RabbitMQ)
    → Redirect → /dashboard

[Bước 2] Cấu hình ban đầu (Optional Onboarding Wizard)
    → Người dùng nhập số dư ban đầu cho ví
    → Người dùng chọn currency (VND mặc định)
    → Người dùng nhập Gemini API Key (tùy chọn, để mở khóa AI)
    → Identity Service mã hóa AES-256 và lưu gemini_api_key

[Bước 3] Dashboard Tổng quan
    → Analytics Service: aggregate MongoDB → tổng thu, tổng chi, số dư ròng
    → Phần trên: 3 Card tóm tắt
        - "Tổng thu tháng này" (text-emerald-400)
        - "Tổng chi tháng này" (text-rose-400)
        - "Số dư ròng" (text-amber-400 nếu dương, text-rose-400 nếu âm)
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

Hệ thống giao diện được thiết kế với nguyên tắc **Progressive Disclosure** — người dùng mới chỉ thấy các chức năng cốt lõi (xem số dư, thêm giao dịch); tính năng nâng cao (AI advisor, phân tích chuyên sâu, cài đặt Gemini API key) được đặt ở lớp thứ hai. Điều này giảm cognitive load cho người dùng mới trong khi vẫn cung cấp đầy đủ tính năng cho người dùng có kinh nghiệm.

Responsive design tuân thủ breakpoint của Tailwind: mobile-first với layout single-column trên `sm` (< 640px), chuyển sang 2-column trên `md` (≥ 768px), và full dashboard 3-column trên `lg` (≥ 1024px). Ứng dụng React Native tái sử dụng toàn bộ logic xử lý dữ liệu qua custom hooks, chỉ thay thế lớp rendering component (React Native components thay vì HTML elements).

---

*Chương 3 đã trình bày đầy đủ bốn khía cạnh thiết kế cốt lõi của hệ thống: kiến trúc tổng thể và luồng dữ liệu (3.1), mô hình dữ liệu NoSQL và lý do lựa chọn (3.2), thiết kế chi tiết ba module nghiệp vụ trọng tâm bao gồm Agentic RAG (3.3), và thiết kế giao diện người dùng cùng hai luồng UX chính (3.4). Chương tiếp theo sẽ trình bày quá trình triển khai (implementation) và kết quả kiểm thử hệ thống.*
