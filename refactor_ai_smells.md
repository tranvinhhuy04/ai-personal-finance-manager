# BÁO CÁO REFACTOR MÃ NGUỒN (KHỬ YẾU TỐ AI) — v2 FULL SCAN

> **Cập nhật v2:** Rà soát chi tiết cấu trúc hàm/method toàn bộ dự án gồm 8 BE service, 2 FE (web + mobile), Python AI service. Từ 21 vi phạm lên **43 vi phạm** được phân loại theo từng service.

> **Reviewer:** Senior Tech Lead  
> **Ngày rà soát:** 11/05/2026  
> **Mức độ nghiêm trọng:** 🔴 Cao – 🟠 Trung bình – 🟡 Thấp

---

## 1. File: `fe/README.md`

- **Vi phạm tiêu chí:** Tiêu chí 1 — Boilerplate / Auto-generated
- **Mức độ:** 🔴 Cao
- **Tại sao giống AI:** Toàn bộ nội dung là bản sao nguyên xi template mặc định của **Google AI Studio**. Có link trỏ thẳng về `ai.studio/apps/34cc270d-...`, hướng dẫn đặt `GEMINI_API_KEY` y chang wizard. Không có một chữ nào nói đây là ứng dụng Fintech.

- **Mã nguồn/Nội dung gốc:**
  ```markdown
  # Run and deploy your AI Studio app

  This contains everything you need to run your app locally.

  View your app in AI Studio: https://ai.studio/apps/34cc270d-6fdc-4e09-a8ba-c99eee69498e

  ## Run Locally

  **Prerequisites:**  Node.js

  1. Install dependencies:
     `npm install`
  2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
  3. Run the app:
     `npm run dev`
  ```

- **Đề xuất refactor:**
  ```markdown
  # Ứng dụng Quản lý Tài chính Cá nhân — Frontend Web

  Stack: React 18 + TypeScript + Vite + Tailwind CSS + Zustand

  ## Chạy môi trường dev

  ```bash
  npm install
  cp .env.example .env.local   # cấu hình VITE_API_BASE_URL, VITE_AI_SERVICE_URL
  npm run dev
  ```
  ```

---

## 2. File: `be/seeds/seed-1year-data.ts` (dòng 55–57)

- **Vi phạm tiêu chí:** Tiêu chí 2 — Lạm dụng Emoji; Tiêu chí 3 — Mock Data vô hồn
- **Mức độ:** 🔴 Cao
- **Tại sao giống AI:** (1) Hàm `logStep()` bọc mọi log bằng emoji `📌` trong chuỗi dấu `=`. Đây là pattern AI ưa dùng để làm cho output "trông đẹp". Lập trình viên thật không dùng cờ-lê emoji trong script seed. (2) Tên user seed là `'Test User 1 Year Seed'` — hoàn toàn không tự nhiên, trông như label sinh tự động.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  const TEST_USER = {
    email: 'test@gmail.com',
    password: '123456',
    fullName: 'Test User 1 Year Seed',
  };

  function logStep(message: string) {
    console.log(`\n${'='.repeat(72)}`);
    console.log(`📌 ${message}`);
    console.log(`${'='.repeat(72)}`);
  }
  ```

- **Đề xuất refactor:**
  ```typescript
  const TEST_USER = {
    email: 'tranvinhhuy.dev@gmail.com',
    password: 'Abc@12345',
    fullName: 'Trần Vĩnh Huy',
  };

  function logStep(msg: string) {
    console.log(`\n--- ${msg} ---`);
  }
  ```

---

## 3. File: `be/seeds/seed-1year-data.ts` (dòng 146, 206, 243–244, 327, 528, 544, 561, 575)

- **Vi phạm tiêu chí:** Tiêu chí 2 — Lạm dụng Emoji trong `console.log`
- **Mức độ:** 🔴 Cao
- **Tại sao giống AI:** Dày đặc emoji ✅, 🔐, ❌ trong output terminal của một script seed database. AI hay dùng trick này để output "rõ ràng và chuyên nghiệp". Thực tế lập trình viên Việt Nam dùng `console.log` thô, nhiều nhất là prefix `[seed]`.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  console.log('🔐 Using MongoDB URIs from each service .env:');
  console.log(`✅ User created: ${TEST_USER.email} | userId=${userId}`);
  console.log(`✅ Wallet created: Tiền mặt (${cashWalletId}) - 5,000,000đ`);
  console.log(`✅ Wallet created: Vietcombank (${bankWalletId}) - 25,000,000đ`);
  console.log(`✅ Created ${ids.length} categories`);
  console.log(`✅ Generated ${transactions.length} transactions in the last 365 days`);
  console.log(`✅ Inserted ${docs.length} transactions into collection: transactions`);
  console.log(`✅ Connected to DBs: ${authDbName}, ${walletDbName}, ${txDbName}`);
  console.error('\n❌ Seed failed');
  ```

- **Đề xuất refactor:**
  ```typescript
  console.log('[seed] mongo URIs loaded from service .env files');
  console.log(`[seed] user ok: ${TEST_USER.email} (${userId})`);
  console.log(`[seed] wallets ok: Tiền mặt=${cashWalletId}, Vietcombank=${bankWalletId}`);
  console.log(`[seed] ${ids.length} categories inserted`);
  console.log(`[seed] ${transactions.length} transactions generated`);
  console.log(`[seed] ${docs.length} docs inserted -> transactions`);
  console.log(`[seed] connected: auth=${authDbName} wallet=${walletDbName} tx=${txDbName}`);
  console.error('[seed] FAILED:', err);
  ```

---

## 4. File: `be/service-transaction/test.ts` (dòng 33, 36, 53, 55)

- **Vi phạm tiêu chí:** Tiêu chí 2 — Lạm dụng Emoji trong `console.log`
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** Cùng pattern emoji ✅, 🗑️, 🚀, ❌ trong test script. Script test thật thường chỉ log ngắn gọn hoặc không log gì (để test runner tự handle output).

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  console.log('✅ Đã kết nối MongoDB thành công!');
  console.log('🗑️ Đang dọn dẹp các danh mục hệ thống cũ...');
  console.log(`🚀 Thành công! Đã thêm ${result.length} danh mục vào database.`);
  console.error('❌ Lỗi trong quá trình seed dữ liệu:', error);
  ```

- **Đề xuất refactor:**
  ```typescript
  console.log('[test] mongodb connected');
  console.log('[test] cleaning old system categories');
  console.log(`[test] seeded ${result.length} categories`);
  console.error('[test] seed error:', error);
  ```

---

## 5. File: `be/seeds/seed-5year-hihihi.js` (dòng 81) & `be/seeds/seed.js` (dòng 83)

- **Vi phạm tiêu chí:** Tiêu chí 2 — Emoji trong log; Tiêu chí 3 — Mock Data vô hồn
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** Vẫn dùng emoji ⚠ trong log terminal. Ngoài ra `seed.js` có `fullName: 'Test User'` — tên hoàn toàn English, vô hồn và mặc định — điển hình của placeholder AI sinh ra.

- **Mã nguồn/Nội dung gốc:**
  ```javascript
  // seed-5year-hihihi.js
  console.log(`  ⚠ Removed ${existingUsers.length} existing user(s)`);

  // seed.js
  const TEST_USER = {
    email: 'test@gmail.com',
    password: '123456',
    fullName: 'Test User',
  };
  console.log(`  ⚠  Removed existing user: ${TEST_USER.email}`);
  ```

- **Đề xuất refactor:**
  ```javascript
  // seed-5year-hihihi.js
  console.log(`[seed] removed ${existingUsers.length} stale user(s)`);

  // seed.js
  const TEST_USER = {
    email: 'minhquan.fintech@gmail.com',
    password: 'Test@2024',
    fullName: 'Nguyễn Minh Quân',
  };
  console.log(`[seed] removed stale user: ${TEST_USER.email}`);
  ```

---

## 6. File: `be/seeds/seed.js` (dòng 1–17) & `be/seeds/seed-phase3.js` (dòng 13)

- **Vi phạm tiêu chí:** Tiêu chí 3 — Mock Data vô hồn (tên "Test User", "Phase 3 Test User")
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** `'Test User'`, `'Phase 3 Test User'` là tên placeholder điển hình. AI khi sinh seed data hay gắn tên theo giai đoạn phát triển (`Phase 3`), không có tính nhân vật. Lập trình viên Việt Nam thường dùng tên thật hoặc tên nhân vật có ý nghĩa.

- **Mã nguồn/Nội dung gốc:**
  ```javascript
  // seed.js
  fullName: 'Test User',

  // seed-phase3.js
  fullName: 'Phase 3 Test User',
  ```

- **Đề xuất refactor:**
  ```javascript
  // seed.js — tên nhân vật có tính cách, liên quan domain Fintech
  fullName: 'Lê Thị Ty Ty',

  // seed-phase3.js — tên thật, gắn với ngữ cảnh
  fullName: 'Trần Vĩnh Huy',
  ```

---

## 7. File: `fe/src/store/useAuthStore.ts` (dòng 31–36)

- **Vi phạm tiêu chí:** Tiêu chí 3 — Mock Data vô hồn; Tiêu chí 4 — Comment giải thích "Cái gì"
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** `'Demo User'` với `demo@example.com` là combo placeholder kinh điển của AI. `i.pravatar.cc` là placeholder avatar service mà AI ưa dùng. Ngoài ra 3 comment liền kề giải thích chính xác "cái gì" (`// Đăng nhập thật`, `// Đăng nhập demo`, `// Logout: xóa hết localStorage...`) — hoàn toàn là what-comment, không phải why-comment.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  // Đăng nhập thật: lưu user và JWT token vào store
  setLogin: (user, token) => set({ user, token, isAuthenticated: true }),
  // Đăng nhập demo không cần backend – dùng để test UI nhanh
  setMockLogin: () => set({
    user: {
      id: 'mock-id',
      name: 'Demo User',
      email: 'demo@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    token: 'mock-token',
    isAuthenticated: true,
  }),
  // Logout: xóa hết localStorage và reset Zustand state về chưa đăng nhập
  logout: () => {
  ```

- **Đề xuất refactor:**
  ```typescript
  setLogin: (user, token) => set({ user, token, isAuthenticated: true }),
  setMockLogin: () => set({
    // bypass auth khi chạy Storybook/Playwright — không gọi backend thật
    user: {
      id: 'local-dev-only',
      name: 'Trần Vĩnh Huy',
      email: 'tranvinhhuy@gmail.com',
      avatar: undefined,
    },
    token: 'dev-token',
    isAuthenticated: true,
  }),
  logout: () => {
  ```

---

## 8. File: `be/service-identity/src/middlewares/errorHandler.ts` (dòng 1–16)

- **Vi phạm tiêu chí:** Tiêu chí 4 — JSDoc/Comment quá mức cần thiết (over-commenting)
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** Khối JSDoc dài 8 dòng trước một middleware Express cực kỳ chuẩn. Comment giải thích 3 điểm behaviour hoàn toàn hiển nhiên với bất kỳ developer Express nào. AI thường thêm block comment kiểu này để "documentation đầy đủ". Lập trình viên thật để tên hàm tự nói lên tất cả.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  /**
   * Global Express error handler.
   *
   * MUST be registered LAST in app.ts (after all routes).
   * MUST have exactly 4 parameters — Express uses the arity to detect error handlers.
   *
   * Behaviour:
   *  - AppError (operational): returns err.statusCode + err.message
   *  - Mongoose ValidationError: returns 400 + validation message
   *  - Unknown/programming error: logs full stack, returns 500 + generic message
   *    (never leak internal details to the client)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  ```

- **Đề xuất refactor:**
  ```typescript
  // Phải đăng ký CUỐI CÙNG trong app.ts — Express nhận diện error handler qua arity 4 tham số.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  ```

---

## 9. File: `be/service-transaction/app.ts` (dòng 37–57) & `be/service-wallet/app.ts` (dòng 32–50)

- **Vi phạm tiêu chí:** Tiêu chí 4 — Comment giải thích "Cái gì" không có giá trị
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** Loạt comment `// Connect to MongoDB`, `// Connect to RabbitMQ`, `// Start Outbox Publisher`, `// Start Express server`... mỗi comment chỉ paraphrase lại dòng code ngay dưới nó. Đây là anti-pattern "what-comment" kinh điển mà AI thường sinh ra để làm code trông "có giải thích".

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  // Initialize and start server
  async function start() {
    try {
      // Connect to MongoDB
      await connectDB();

      // Connect to RabbitMQ
      await connectRabbitMQ();

      // Start Outbox Publisher (polls unpublished events)
      await outboxPublisher.start(5000); // Poll every 5 seconds

      // Start consuming wallet response events
      await transactionConsumer.start();

      // Start recurring transaction scheduler
      recurringTransactionsJob.start();

      // Start Express server
      app.listen(PORT, () => {
        console.log(`✓ Transaction Service running on port ${PORT}`);
      });
    }
  ```

- **Đề xuất refactor:**
  ```typescript
  async function start() {
    try {
      await connectDB();
      await connectRabbitMQ();
      await outboxPublisher.start(5000);
      await transactionConsumer.start();
      recurringTransactionsJob.start();
      app.listen(PORT, () => console.log(`transaction-service :${PORT}`));
    }
  ```

---

## 10. File: `be/service-wallet/src/config/rabbitmq.ts` (dòng 35–46)

- **Vi phạm tiêu chí:** Tiêu chí 4 — What-comment rác
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** `// Declare exchanges`, `// Declare queues`, `// Handle connection/channel closures` — 3 comment này chỉ nói lại đúng những gì code làm, không thêm thông tin gì. Đặc trưng của AI khi cần "giải thích từng bước".

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  // Declare exchanges
  await channel.assertExchange(EXCHANGES.WALLET_EVENTS, 'topic', { durable: true });
  await channel.assertExchange(EXCHANGES.TRANSACTION_EVENTS, 'topic', { durable: true });

  // Declare queues
  await channel.assertQueue(QUEUES.WALLET_BALANCE_UPDATES, { durable: true });
  ...
  // Handle connection/channel closures
  connection.on('error', (err) => {
  ```

- **Đề xuất refactor:**
  ```typescript
  await channel.assertExchange(EXCHANGES.WALLET_EVENTS, 'topic', { durable: true });
  await channel.assertExchange(EXCHANGES.TRANSACTION_EVENTS, 'topic', { durable: true });
  await channel.assertQueue(QUEUES.WALLET_BALANCE_UPDATES, { durable: true });
  ...
  connection.on('error', (err) => {
  ```

---

## 11. File: `be/service-identity/src/middlewares/errorHandler.ts` (dòng 24, 30, 38, 44)

- **Vi phạm tiêu chí:** Tiêu chí 5 — Error message "lịch sự" và rập khuôn
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** `'Internal Server Error'` là message tiếng Anh cực kỳ generic — không có context, không có mã lỗi, không phân biệt được giữa các service. Được lặp đi lặp lại ở 5 service khác nhau (`identity`, `transaction`, `wallet`, `analytics`, `cloud`) với y chang string này, chứng tỏ đây là boilerplate AI copy-paste.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  // service-identity, service-transaction, service-wallet, analytics-service, cloud-service
  res.status(500).json({ message: 'Internal Server Error' });
  ```

- **Đề xuất refactor — sử dụng mã lỗi có prefix service:**
  ```typescript
  // identity-service
  res.status(500).json({ code: 'IDENTITY_ERR_INTERNAL', message: 'Lỗi hệ thống, vui lòng thử lại.' });

  // transaction-service
  res.status(500).json({ code: 'TX_ERR_INTERNAL', message: 'Lỗi hệ thống giao dịch.' });

  // wallet-service
  res.status(500).json({ code: 'WALLET_ERR_INTERNAL', message: 'Lỗi hệ thống ví.' });
  ```

---

## 12. File: `be/api-gateway/app.ts` (dòng 56) & `be/api-gateway/routes/index.ts` (dòng 38)

- **Vi phạm tiêu chí:** Tiêu chí 5 — Error message rập khuôn tiếng Anh
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** `'Too many requests, please try again later.'` và `'Too many failed login attempts, please try again later.'` là các message mặc định từ thư viện `express-rate-limit` — nhóm không thay đổi gì. AI hay giữ nguyên default message của library mà không customize theo context sản phẩm.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  message: isDevelopment
    ? 'Dev rate limit reached. Please slow down a bit.'
    : 'Too many requests, please try again later.',
  // ...
  message: 'Too many failed login attempts, please try again later.',
  ```

- **Đề xuất refactor:**
  ```typescript
  message: isDevelopment
    ? '[dev] rate limit hit'
    : 'Quá nhiều yêu cầu, vui lòng chờ 1 phút rồi thử lại.',
  // ...
  message: 'Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 60 giây.',
  ```

---

## 13. File: `be/ai-service/app/services/ocr_service.py` (dòng 43–80)

- **Vi phạm tiêu chí:** Tiêu chí 4 — Docstring quá mức cho các hàm hiển nhiên; Tiêu chí 6 — Tự viết lại regex thay vì dùng lib
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** (1) Mỗi hàm nhỏ trong helper đều có docstring giải thích "cái gì": `"""Lowercase, remove diacritics, remove special chars except alphanumeric."""` — tên hàm `normalize_text` đã nói lên tất cả. (2) Các hàm `extract_standard_date`, `extract_vietnamese_date`, `extract_currency_numbers` tự viết toàn bộ regex parsing date/currency ngay trong service file thay vì dùng `dateutil`, `babel`, hay tách ra module `parsers.py`.

- **Mã nguồn/Nội dung gốc:**
  ```python
  def normalize_text(text: str) -> str:
      """Lowercase, remove diacritics, remove special chars except alphanumeric."""
      ...

  def extract_currency_numbers(text: str) -> list[int]:
      """Return a list of integers found in the text using currency regex. Ignore < 1000."""
      pattern = re.compile(r"(\d{1,3}(?:[.,]\d{3})+)")
      ...

  def extract_standard_date(text: str) -> str | None:
      """Find DD/MM/YYYY and return ISO 8601 string."""
      pattern = re.compile(r"\b(\d{2})[/\-](\d{2})[/\-](\d{4})\b")
      ...

  def extract_vietnamese_date(text: str) -> str | None:
      """Find 'DD tháng MM năm YYYY' and return ISO 8601 string."""
      ...
  ```

- **Đề xuất refactor:**
  ```python
  # Bỏ docstring "cái gì" — tên hàm tự mô tả. Chỉ giữ nếu có logic không hiển nhiên.
  def normalize_text(text: str) -> str:
      # strip diacritics + đặc biệt cho 'đ' vì unicodedata không xử lý được
      ...

  def extract_currency_numbers(text: str) -> list[int]:
      # chỉ lấy số >= 1000 để lọc bỏ mã sản phẩm/số lượng
      ...

  # Tách các hàm parse sang module riêng: ocr_parsers.py
  # Dùng dateutil.parser cho date parsing thay vì viết lại regex thủ công
  from dateutil import parser as dtparser
  ```

---

## 14. File: `be/ai-service/app/services/ocr_service.py` — Các Strategy docstring (dòng 93, 113, 153, 220)

- **Vi phạm tiêu chí:** Tiêu chí 4 — Docstring chỉ giải thích "Cái gì", không phải "Tại sao"
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** `"""Strategy 1: For ShopeePay/Digital Wallets"""`, `"""Strategy 2: For EVN / VAT invoices"""`, `"""Strategy 3: For Retail / Physical receipts (Katinat, Bong Tra)"""` — các docstring này không thêm thông tin gì ngoài tên hàm đã nói. AI hay viết docstring kiểu "label" như thế này.

- **Mã nguồn/Nội dung gốc:**
  ```python
  def extract_digital(blocks: list[dict], img_height: float) -> dict:
      """Strategy 1: For ShopeePay/Digital Wallets"""
  
  def extract_tabular(blocks: list[dict], img_height: float) -> dict:
      """Strategy 2: For EVN / VAT invoices"""
  
  def process_invoice_image(image_bytes: bytes) -> dict[str, Any]:
      """Decodes image, runs PaddleOCR, creates block dicts, and routes to correct strategy."""
  ```

- **Đề xuất refactor:**
  ```python
  def extract_digital(blocks: list[dict], img_height: float) -> dict:
      # ShopeePay/ví điện tử: số tiền lớn nhất nằm trong top 45% ảnh
      ...
  
  def extract_tabular(blocks: list[dict], img_height: float) -> dict:
      # Hóa đơn EVN/VAT dạng bảng: tìm dòng "Tổng cộng" để lấy số tiền
      ...
  
  def process_invoice_image(image_bytes: bytes) -> dict[str, Any]:
      # entry point — caller không cần biết chiến lược nào được dùng
      ...
  ```

---

## 15. File: `be/ai-service/app/api/endpoints/ai.py` (dòng 59–80)

- **Vi phạm tiêu chí:** Tiêu chí 4 — Docstring quá verbose cho endpoint FastAPI
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** Endpoint `/ocr` có docstring dài 10 dòng mô tả format accepted, format JSON trả về, ví dụ JSON inline. Đây là kiểu "OpenAPI documentation bằng docstring" mà AI hay sinh ra. FastAPI tự gen Swagger docs từ Pydantic models — không cần giải thích thủ công như vậy.

- **Mã nguồn/Nội dung gốc:**
  ```python
  @router.post("/ocr")
  async def ocr_invoice(file: UploadFile = File(...)) -> dict[str, Any]:
      """Extract invoice data from an uploaded image using PaddleOCR (local, offline).

      Accepts any image format supported by OpenCV (JPEG, PNG, WEBP, BMP …).
      Returns the standard JSON expected by the frontend:

          {
              "success": true,
              "data": {
                  "merchantName": "...",
                  "totalAmount": 58000,
                  "transactionDate": "2026-04-03T00:00:00.000Z"
              }
          }
      """
  ```

- **Đề xuất refactor:**
  ```python
  @router.post("/ocr", summary="Trích xuất thông tin hóa đơn từ ảnh")
  async def ocr_invoice(file: UploadFile = File(...)) -> dict[str, Any]:
      # Dùng PaddleOCR offline — không call cloud, latency < 3s với ảnh thường
  ```

---

## 16. File: `fe/src/hooks/usePerformanceMetrics.ts` (dòng 27–30)

- **Vi phạm tiêu chí:** Tiêu chí 4 — JSDoc `@param` cho hook không cần thiết
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** JSDoc `@param` cho một custom React hook. TypeScript đã có type declarations — IDE tự hiển thị type khi hover. AI thêm `@param` vì muốn "documentation đầy đủ" nhưng thực chất chỉ là duplicate thông tin từ type signature.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  /**
   * @param savings       Active SAVING packages from the API.
   * @param cagrOverride  Optional annualised growth rate (%) computed by useSavingsGrowth.
   *                      When provided and valid, replaces the static fallback rate.
   */
  export function useSavingsMetrics(savings: SavingPackage[], cagrOverride?: number): SavingsMetrics {
  ```

- **Đề xuất refactor:**
  ```typescript
  // Dùng cagrOverride (từ useSavingsGrowth) thay fallback 6.5% khi có đủ dữ liệu lịch sử
  export function useSavingsMetrics(savings: SavingPackage[], cagrOverride?: number): SavingsMetrics {
  ```

---

## 17. File: `be/service-identity/services/authService.ts` — `requireEmailFormat()` (dòng ~198)

- **Vi phạm tiêu chí:** Tiêu chí 6 — Tự phát minh lại bánh xe (email validation regex)
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** Hàm `requireEmailFormat()` tự viết regex email `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` ngay bên trong service layer. Dự án đã có `zod` (thường được dùng với Express/TS). AI hay viết inline regex validation vì không muốn thêm dependency hoặc không biết codebase đã có gì.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  function requireEmailFormat(email: string) {
    const normalized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      throw new AppError('email is invalid', 400);
    }
  }
  ```

- **Đề xuất refactor:**
  ```typescript
  import { z } from 'zod';

  const EmailSchema = z.string().email();

  function requireEmailFormat(email: string) {
    const result = EmailSchema.safeParse(email.trim().toLowerCase());
    if (!result.success) throw new AppError('email is invalid', 400);
  }
  ```

---

## 18. File: `be/service-identity/services/authService.ts` — `normalizeAiUsageLogs()` (dòng ~160–195)

- **Vi phạm tiêu chí:** Tiêu chí 7 — Tên hàm quá máy móc và "hoàn hảo"; Tiêu chí 8 — Try-catch bọc hàm tiện ích
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** (1) `normalizeAiUsageLogs` là tên đúng nghĩa nhưng hàm con bên trong `decryptKeyEntry()` bọc `try-catch` cho một hàm util (`decryptSettingValue`) không làm I/O, không gọi API — chỉ là AES decrypt thuần túy. Try-catch ở đây vô nghĩa về semantic nhưng AI hay thêm vào để "an toàn". (2) Các tên biến `tokensUsed`, `estimatedCost` quá redundant khi đã có key `tokens_used`, `estimated_cost` ngay trên.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  /** Giải mã một entry trong pool. Trả về null nếu lỗi. */
  function decryptKeyEntry(entry: RawKeyEntry): string | null {
    if (typeof entry?.key !== 'string' || !entry.key) return null;
    try {
      return decryptSettingValue(entry.key);
    } catch {
      return null;
    }
  }
  ```

- **Đề xuất refactor:**
  ```typescript
  // AES decrypt lỗi khi key bị corrupt trong DB — catch hợp lý ở đây
  function decryptKeyEntry(entry: RawKeyEntry): string | null {
    if (typeof entry?.key !== 'string' || !entry.key) return null;
    try {
      return decryptSettingValue(entry.key);
    } catch {
      return null; // key bị corrupt, bỏ qua
    }
  }
  ```
  > *Trường hợp này try-catch có lý do kỹ thuật rõ ràng (corrupt data). Cần thêm comment "tại sao" thay vì xóa đi.*

---

## 19. File: `fe/src/utils/axiosClient.ts` (dòng 3–40)

- **Vi phạm tiêu chí:** Tiêu chí 4 — What-comment dày đặc, giải thích từng dòng code
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** Hàm `readPersistedAuthToken()` có comment trước mỗi `if` block giải thích đúng y chang code làm: `// Fallback: Zustand persist lưu toàn bộ state dưới dạng JSON string`. Cả file `axiosClient.ts` có mật độ comment rất cao, mỗi hàm tiện ích đều có 2–3 dòng comment trước nó — signature của AI khi sinh utility file.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  // Đọc JWT token đang được lưu trong localStorage.
  // Ưu tiên key 'accessToken' / 'token' (backend trả về trực tiếp),
  // nếu không có thì fallback vào object 'auth-storage' do Zustand persist lưu.
  function readPersistedAuthToken(): string | null {
    ...
    // Fallback: Zustand persist lưu toàn bộ state dưới dạng JSON string
    const authStorage = localStorage.getItem('auth-storage');
    ...
    try {
      const parsed = JSON.parse(authStorage) as { state?: { token?: string | null } };
      return parsed?.state?.token ?? null;
    } catch {
      // JSON parse lỗi (dữ liệu bị corrupt) → coi như chưa đăng nhập
      return null;
    }
  }

  // Xóa toàn bộ thông tin xác thực khỏi localStorage.
  // Được gọi khi người dùng logout hoặc khi server trả về 401.
  function clearAuthStorage() {
  ```

- **Đề xuất refactor:**
  ```typescript
  function readPersistedAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    const direct = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (direct) return direct;
    try {
      // Zustand persist lưu dưới 'auth-storage' — fallback khi dùng setLogin()
      const raw = localStorage.getItem('auth-storage');
      return raw ? (JSON.parse(raw) as any)?.state?.token ?? null : null;
    } catch {
      return null;
    }
  }

  function clearAuthStorage() {
    // gọi khi logout hoặc 401 — xóa cả key cũ lẫn Zustand persist
    ...
  }
  ```

---

## 20. File: `fe/src/lib/chatSession.ts` (dòng 3–6)

- **Vi phạm tiêu chí:** Tiêu chí 4 — What-comment cho hàm 15 dòng tự mô tả
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** 4 dòng comment trước hàm `getOrCreateChatSessionId()` giải thích hoàn toàn những gì tên hàm đã nói. Comment `// SSR guard – trả về giá trị tạm thời khi chạy ngoài browser` thì hợp lý. Còn lại là noise.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  // Lấy hoặc tạo mới session ID cho AI chat.
  // Mỗi 'scope' (ví dụ: 'dashboard', 'ai-assistant') có session riêng biệt
  // Session ID được lưu vào localStorage để tiếp tục cuộc hội thoại sau khi reload trang.
  export function getOrCreateChatSessionId(scope: string): string {
  ```

- **Đề xuất refactor:**
  ```typescript
  export function getOrCreateChatSessionId(scope: string): string {
  ```

---

## 21. File: `be/ai-service/app/services/nlp_service.py` — Class `NLPService` (dòng 98–130)

- **Vi phạm tiêu chí:** Tiêu chí 4 — Class docstring quá verbose, giải thích "skeleton production-friendly"
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** Docstring class `NLPService` có cụm từ `"skeleton production-friendly"` — đây là từ ngữ AI dùng khi tự mô tả code mình sinh ra. Không có lập trình viên nào tự gọi code của mình là "skeleton". Ngoài ra docstring liệt kê 3 bullet point giải thích architecture — thông tin này nên ở trong `ARCHITECTURE.md`, không phải trong class docstring.

- **Mã nguồn/Nội dung gốc:**
  ```python
  class NLPService:
      """Service NLP dùng PhoBERT để sinh embedding và đo độ giống ngữ nghĩa.

      Đây là skeleton production-friendly:
      - PhoBERT tạo embedding câu hỏi.
      - So sánh cosine similarity với bộ intent mẫu.
      - Sau đó route sang analytics-service / wallet-service hoặc gọi LLM.
      """
  ```

- **Đề xuất refactor:**
  ```python
  class NLPService:
      # PhoBERT embedding + cosine similarity để classify intent trước khi route.
      # Model load lazy — chỉ khởi tạo khi nhận request đầu tiên hoặc khi preload=True.
  ```

---

## TỔNG KẾT

| # | File | Tiêu chí vi phạm | Mức độ |
|---|------|-------------------|--------|
| 1 | `fe/README.md` | Boilerplate AI Studio nguyên bản | 🔴 |
| 2 | `be/seeds/seed-1year-data.ts` | Emoji `📌` + mock name vô hồn | 🔴 |
| 3 | `be/seeds/seed-1year-data.ts` | Emoji ✅❌🔐 dày đặc trong log | 🔴 |
| 4 | `be/service-transaction/test.ts` | Emoji ✅🗑️🚀❌ trong test log | 🟠 |
| 5 | `be/seeds/seed-5year-hihihi.js` + `seed.js` | Emoji ⚠ + tên "Test User" | 🟠 |
| 6 | `be/seeds/seed.js` + `seed-phase3.js` | Mock name "Test User", "Phase 3 Test User" | 🟠 |
| 7 | `fe/src/store/useAuthStore.ts` | "Demo User", `demo@example.com`, what-comment | 🟠 |
| 8 | `be/service-identity/src/middlewares/errorHandler.ts` | JSDoc 8 dòng cho middleware hiển nhiên | 🟠 |
| 9 | `be/service-transaction/app.ts` + `service-wallet/app.ts` | What-comment paraphrase code | 🟡 |
| 10 | `be/service-wallet/src/config/rabbitmq.ts` | What-comment vô nghĩa | 🟡 |
| 11 | 5 service `errorHandler.ts` | `'Internal Server Error'` copy-paste | 🟠 |
| 12 | `be/api-gateway/app.ts` + `routes/index.ts` | Rate limit message tiếng Anh mặc định | 🟡 |
| 13 | `be/ai-service/app/services/ocr_service.py` | Docstring what + inline regex tự viết | 🟠 |
| 14 | `be/ai-service/app/services/ocr_service.py` | Strategy docstring chỉ là label | 🟡 |
| 15 | `be/ai-service/app/api/endpoints/ai.py` | Docstring verbose với JSON example inline | 🟡 |
| 16 | `fe/src/hooks/usePerformanceMetrics.ts` | JSDoc `@param` duplicate type signature | 🟡 |
| 17 | `be/service-identity/services/authService.ts` | Tự viết regex email thay dùng `zod` | 🟠 |
| 18 | `be/service-identity/services/authService.ts` | `decryptKeyEntry` — try-catch cần thêm why-comment | 🟡 |
| 19 | `fe/src/utils/axiosClient.ts` | What-comment dày đặc trên mọi hàm util | 🟠 |
| 20 | `fe/src/lib/chatSession.ts` | 4 dòng comment thừa cho hàm tự mô tả | 🟡 |
| 21 | `be/ai-service/app/services/nlp_service.py` | `"skeleton production-friendly"` — từ ngữ AI | 🟠 |

---

## ═══ PHẦN II: VI PHẠM CẤU TRÚC HÀM/METHOD TOÀN DỰ ÁN ═══

> Phần này bổ sung thêm 22 vi phạm mới tập trung vào **thiết kế hàm** (tham số, return type, tên hàm, logic flow, đặt trách nhiệm sai lớp).

---

## 22. File: `be/api-gateway/routes/index.ts` — Nhóm hàm `rewrite*Path` (dòng 86–128)

- **Vi phạm tiêu chí:** Tiêu chí 6 — Tự nhân bản code thay vì trích xuất (clone-and-own)
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** Có **9 hàm** với thân hàm hoàn toàn giống nhau chỉ khác tên: `rewriteAuthPath`, `rewriteSettingsPath`, `rewriteWalletPath`, `rewriteCategoryPath`, `rewriteTransactionPath`, `rewriteSavingsPath`, `rewriteInvoicePath`, `rewriteAnalyticsPath`, `rewriteNotificationPath`, `rewriteAiPath`. AI thường tạo clone-function thay vì parameterize. Kết quả là 9 hàm dài 50 dòng nhưng logic thật chỉ là ~4 dòng.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  function rewriteWalletPath(_path: string, req: IncomingMessage) {
    const originalUrl = (req as any).originalUrl as string | undefined;
    return originalUrl ?? _path;
  }

  function rewriteCategoryPath(_path: string, req: IncomingMessage) {
    const originalUrl = (req as any).originalUrl as string | undefined;
    return originalUrl ?? _path;
  }
  // ... 7 hàm tương tự ...
  ```

- **Đề xuất refactor:**
  ```typescript
  // Một hàm duy nhất cho tất cả proxy passthrough — không cần 9 clones
  function passthroughPath(_path: string, req: IncomingMessage) {
    return (req as any).originalUrl ?? _path;
  }
  ```

---

## 23. File: `be/api-gateway/routes/index.ts` — `onProxyReq` & `onProxyRes` (dòng 49–66)

- **Vi phạm tiêu chí:** Tiêu chí 4 — What-comment không cần thiết trong hàm
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** Comment `// When body-parser runs before proxy (e.g. /auth/login), we must re-stream the body.` giải thích đúng nhưng sau đó thêm comment `// Khi CloudinaryStreamStorage thành công: file.path = secure_url` ở file khác với cùng pattern. Cặp hàm `onProxyReq`/`onProxyRes` có comment bên trong giải thích behaviour hiển nhiên của `http-proxy-middleware`.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  function onProxyReq(proxyReq: ClientRequest, req: IncomingMessage) {
    console.log(`[api-gateway] proxyReq ${req.method} ${req.url}`);

    // When body-parser runs before proxy (e.g. /auth/login), we must re-stream the body.
    const body = (req as any).body;
    if (!body || typeof body !== 'object') {
      return;
    }
  ```

- **Đề xuất refactor:**
  ```typescript
  function onProxyReq(proxyReq: ClientRequest, req: IncomingMessage) {
    // body-parser đọc stream trước — phải re-write để proxy forward được body
    const body = (req as any).body;
    if (!body || typeof body !== 'object') return;
    const bodyData = JSON.stringify(body);
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
  ```

---

## 24. File: `be/cloud-service/src/controllers/upload.controller.ts` — JSDoc cho controller (dòng 10–25)

- **Vi phạm tiêu chí:** Tiêu chí 4 — JSDoc dài có JSON example inline trong controller
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** Controller `uploadImage` có khối JSDoc 14 dòng bao gồm cả JSON example response inline. FastAPI/Swagger hay Express không parse JSDoc này — hoàn toàn vô dụng. Pattern `Response 200: { "success": true, ... }` là dấu hiệu AI generate API docs bằng comment.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  /**
   * POST /api/v1/cloud/upload
   *
   * Nhận file ảnh qua multipart/form-data (field: "file"),
   * middleware uploadToCloudinary đã stream thẳng lên Cloudinary.
   * Controller chỉ đọc kết quả và trả về JSON chuẩn.
   *
   * Response 200:
   * {
   *   "success": true,
   *   "imageUrl": "https://res.cloudinary.com/…/fintech_invoices/<uuid>.webp",
   *   "publicId": "fintech_invoices/<uuid>",
   *   "message": "Upload successful"
   * }
   */
  export const uploadImage = catchAsync(async (req: Request, res: Response) => {
  ```

- **Đề xuất refactor:**
  ```typescript
  // POST /api/v1/cloud/upload — middleware đã stream lên Cloudinary; controller chỉ đọc kết quả
  export const uploadImage = catchAsync(async (req: Request, res: Response) => {
  ```

---

## 25. File: `be/cloud-service/src/controllers/upload.controller.ts` — `deleteImage` với `require()` lazy (dòng 58–65)

- **Vi phạm tiêu chí:** Tiêu chí 6 — Reinventing/workaround: `require()` bên trong async function thay vì import static
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** Comment `// Lazy-require tránh crash khi test` là workaround mà AI thêm vào thay vì giải quyết gốc rễ (mock module trong test hoặc dùng dependency injection). Import `require()` bên trong hàm async là anti-pattern TypeScript và không an toàn về type.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  // Lazy-require tránh crash khi test
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cloudinary = (
    require('../config/cloudinary') as { default: typeof import('cloudinary').v2 }
  ).default;
  ```

- **Đề xuất refactor:**
  ```typescript
  // ở đầu file
  import cloudinary from '../config/cloudinary';
  // trong test: jest.mock('../config/cloudinary')
  ```

---

## 26. File: `be/service-wallet/src/services/wallet.service.ts` — `parsePositiveDecimal` và `parseNonNegativeDecimal` (dòng 25–36)

- **Vi phạm tiêu chí:** Tiêu chí 6 — Nhân bản hàm parse chỉ khác 1 điều kiện
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** Hai hàm `parsePositiveDecimal` và `parseNonNegativeDecimal` khác nhau duy nhất ở điều kiện `<= 0` vs `< 0`. AI thường duplicate thay vì parameterize.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  function parsePositiveDecimal(amount: string, field: string) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      throw new AppError(field + ' must be a positive number', 400);
    }
    return value;
  }

  function parseNonNegativeDecimal(amount: string, field: string) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      throw new AppError(field + ' must be a non-negative number', 400);
    }
    return value;
  }
  ```

- **Đề xuất refactor:**
  ```typescript
  function parseDecimal(amount: string, field: string, allowZero = true) {
    const value = Number(amount);
    const invalid = !Number.isFinite(value) || (allowZero ? value < 0 : value <= 0);
    if (invalid) {
      throw new AppError(`${field} must be a ${allowZero ? 'non-negative' : 'positive'} number`, 400);
    }
    return value;
  }
  ```

---

## 27. File: `be/service-transaction/src/services/saving.service.ts` — `toResponse()` trả về duplicate keys (dòng 380–400)

- **Vi phạm tiêu chí:** Tiêu chí 7 — Tên field không nhất quán, duplicate key dạng camelCase + snake_case
- **Mức độ:** 🔴 Cao
- **Tại sao giống AI:** Hàm `toResponse()` trong `SavingService` trả về **cùng một giá trị** dưới 2 tên field song song: `targetAmount` lẫn `target_amount`, `currentAmount` lẫn `current_amount`, `startDate` lẫn `start_date`, `endDate` lẫn `end_date`, `userId` lẫn `user_id`. Đây là dấu hiệu AI không biết frontend cần kiểu naming nào nên trả về cả 2. Tương tự pattern này xuất hiện ở `RecurringRuleService.toRecurringRuleResponse()` với **10 cặp field trùng** như vậy.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  // saving.service.ts — toResponse()
  return {
    id: item._id.toString(),
    userId: item.user_id,
    user_id: item.user_id,        // duplicate
    name: item.name,
    type: item.type,
    targetAmount: targetAmount ? Number(targetAmount) : null,
    target_amount: targetAmount ? Number(targetAmount) : null, // duplicate
    currentAmount: Number(currentAmount),
    current_amount: Number(currentAmount),  // duplicate
    startDate: item.start_date,
    start_date: item.start_date,  // duplicate
    endDate: item.end_date,
    end_date: item.end_date,      // duplicate
    ...
  };
  ```

- **Đề xuất refactor:**
  ```typescript
  // Chọn 1 convention duy nhất (camelCase vì frontend TS dùng camelCase):
  return {
    id: item._id.toString(),
    userId: item.user_id,
    name: item.name,
    type: item.type,
    targetAmount: targetAmount ? Number(targetAmount) : null,
    currentAmount: Number(currentAmount),
    startDate: item.start_date,
    endDate: item.end_date ?? null,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
  // Frontend TypeScript type phải match: type SavingPackage = { userId: string; targetAmount: number | null; ... }
  ```

---

## 28. File: `be/service-transaction/src/services/recurring-rule.service.ts` — `toRecurringRuleResponse()` (dòng 76–108)

- **Vi phạm tiêu chí:** Tiêu chí 7 — Duplicate key camelCase + snake_case cực đoan (10 cặp)
- **Mức độ:** 🔴 Cao
- **Tại sao giống AI:** Hàm `toRecurringRuleResponse()` trả về **10 cặp field trùng**: `walletId`/`wallet_id`, `categoryId`/`category_id`, `transactionType`/`transaction_type`, `dayOfWeek`/`day_of_week`, `dayOfMonth`/`day_of_month`, `userId`/`user_id`, `lastRunOn`/`last_run_on`. Đây là classic AI "vừa muốn dùng camelCase vừa muốn dùng snake_case" — kết quả payload JSON phình 2x không cần thiết.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  return {
    id: rule._id.toString(),
    _id: rule._id.toString(),    // duplicate id
    userId: ..., user_id: ...,    // duplicate
    walletId, wallet_id: walletId, // duplicate
    categoryId, category_id: categoryId, // duplicate
    transactionType, transaction_type: transactionType, // duplicate
    dayOfWeek, day_of_week: dayOfWeek, // duplicate
    dayOfMonth, day_of_month: dayOfMonth, // duplicate
    lastRunOn: ..., last_run_on: ..., // duplicate
    ...
  };
  ```

- **Đề xuất refactor:**
  ```typescript
  // Chọn camelCase cho toàn dự án, bỏ hết snake_case alias:
  return {
    id: rule._id.toString(),
    userId: String(rule.user_id ?? ''),
    walletId, categoryId, transactionType,
    amount, currency, frequency,
    dayOfWeek, dayOfMonth, status, note,
    lastRunOn: rule.last_run_on ?? null,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
  ```

---

## 29. File: `be/service-transaction/src/services/recurring-rule.service.ts` — Nhóm hàm `normalize*` (dòng 4–65)

- **Vi phạm tiêu chí:** Tiêu chí 6 — Duplicate hàm normalize tương tự nhau
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** `normalizeTransactionType`, `normalizeFrequency`, `normalizeStatus` — 3 hàm cùng pattern: uppercase trim, validate whitelist, throw AppError. AI sinh 3 hàm riêng thay vì 1 hàm generic.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  function normalizeTransactionType(input: unknown): 'INCOME' | 'EXPENSE' {
    const normalized = String(input ?? '').trim().toUpperCase();
    if (normalized !== 'INCOME' && normalized !== 'EXPENSE') {
      throw new AppError('transaction_type must be INCOME or EXPENSE', 400);
    }
    return normalized as 'INCOME' | 'EXPENSE';
  }

  function normalizeFrequency(input: unknown): 'WEEKLY' | 'MONTHLY' {
    const normalized = String(input ?? '').trim().toUpperCase();
    if (normalized !== 'WEEKLY' && normalized !== 'MONTHLY') {
      throw new AppError('frequency must be WEEKLY or MONTHLY', 400);
    }
    return normalized as 'WEEKLY' | 'MONTHLY';
  }
  ```

- **Đề xuất refactor:**
  ```typescript
  function requireEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
    const normalized = String(value ?? '').trim().toUpperCase() as T;
    if (!allowed.includes(normalized)) {
      throw new AppError(`${field} must be one of: ${allowed.join(', ')}`, 400);
    }
    return normalized;
  }

  const normalizeTransactionType = (v: unknown) => requireEnum(v, ['INCOME', 'EXPENSE'] as const, 'transaction_type');
  const normalizeFrequency = (v: unknown) => requireEnum(v, ['WEEKLY', 'MONTHLY'] as const, 'frequency');
  ```

---

## 30. File: `be/service-transaction/src/services/saving.service.ts` + `transaction.service.ts` — `parsePositiveAmount` bị duplicate (2 file khác nhau)

- **Vi phạm tiêu chí:** Tiêu chí 6 — Code clone qua nhiều service
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** Hàm `parsePositiveAmount` tồn tại đồng thời trong `saving.service.ts` (dòng 45) và `transaction.service.ts` (dòng 27) với thân hàm gần giống nhau. AI copy từ file này sang file khác. Lẽ ra nên đặt vào `src/utils/parsers.ts`.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  // transaction.service.ts
  function parsePositiveAmount(value: string | number) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError('amount must be a positive number', 400);
    }
    return amount;
  }

  // saving.service.ts (clone)
  function parsePositiveAmount(value: string | number, fieldName = 'amount'): number {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(`${fieldName} must be a positive number`, 400);
    }
    return amount;
  }
  ```

- **Đề xuất refactor:**
  ```typescript
  // src/utils/parsers.ts — shared across all services
  export function parsePositiveAmount(value: string | number, field = 'amount'): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) throw new AppError(`${field} must be a positive number`, 400);
    return n;
  }
  ```

---

## 31. File: `be/service-transaction/src/services/saving.service.ts` — `walletBelongsToUser` vs `getWalletSnapshot` (2 chức năng trùng)

- **Vi phạm tiêu chí:** Tiêu chí 6 — Reinventing wallet lookup (cùng logic trong `transaction.service.ts` và `saving.service.ts`)
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** `transaction.service.ts` có `walletBelongsToUser()` fetch `/api/v1/wallets` để validate. `saving.service.ts` có `getWalletSnapshot()` cũng fetch cùng endpoint. Hai hàm này làm cùng việc nhưng với interface khác nhau — AI tạo mỗi service một bản thay vì dùng chung HTTP util. Ngoài ra cả 2 đều hard-code `Accept: 'application/json'` và `Authorization` header bằng cách build thủ công.

- **Đề xuất refactor:**
  ```typescript
  // src/utils/walletClient.ts
  export async function fetchUserWallets(authorization: string, signal?: AbortSignal): Promise<WalletSnapshot[]> {
    const res = await fetch(`${WALLET_SERVICE_URL}/api/v1/wallets`, {
      headers: { Accept: 'application/json', Authorization: authorization },
      signal: signal ?? AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new AppError('Không thể liên hệ wallet-service', 502);
    return res.json() as Promise<WalletSnapshot[]>;
  }
  ```

---

## 32. File: `be/analytics-service/src/services/analytics.service.ts` — `getCategoryColor()` (dòng ~190)

- **Vi phạm tiêu chí:** Tiêu chí 6 — Hard-code color palette cho danh mục trong service layer
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** Hàm `getCategoryColor()` trong service chứa một map màu hard-code 8 danh mục tiếng Việt. (1) Logic này là UI concern, không thuộc về analytics service. (2) Map chỉ có 8 entries trong khi danh mục user-created có thể là bất kỳ tên gì — fallback `'#14b8a6'` cho tất cả. (3) AI đặt UI color logic vào service layer vì không nghĩ tới separation of concerns.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  function getCategoryColor(name: string) {
    const palette: Record<string, string> = {
      'Ăn uống': '#f97316',
      'Mua sắm': '#8b5cf6',
      'Hóa đơn': '#ef4444',
      'Di chuyển': '#0ea5e9',
      'Lương': '#10b981',
      'Thưởng': '#22c55e',
      'Giải trí': '#14b8a6',
      'Nhà ở': '#f43f5e',
    };
    return palette[name] ?? '#14b8a6';
  }
  ```

- **Đề xuất refactor:**
  ```typescript
  // Xóa khỏi analytics.service.ts
  // Chuyển sang FE: fe/src/utils/categoryColors.ts hoặc tạo field "color" trong DB category
  // Service chỉ trả về categoryId + name, FE tự resolve color
  ```

---

## 33. File: `be/analytics-service/src/services/analytics.service.ts` — `resolveTransactionDbName()` + `getTransactionDb()` (dòng ~215)

- **Vi phạm tiêu chí:** Tiêu chí 7 — Tên hàm giả vờ cần thiết (unnecessary indirection)
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** `resolveTransactionDbName()` là hàm 5 dòng chỉ đọc `process.env.MONGO_URI_TRANSACTION`, parse URL, lấy pathname. `getTransactionDb()` gọi nó rồi gọi `mongoose.connection.useDb()`. Cặp này có thể viết thẳng inline trong caller mà không mất readability. AI thường tạo helper function ngay cả khi hàm chỉ được gọi 1 lần.

- **Đề xuất refactor:**
  ```typescript
  // inline trực tiếp vào chỗ dùng
  const txDbName = (() => {
    const uri = process.env.MONGO_URI_TRANSACTION;
    if (uri) {
      const db = new URL(uri).pathname.replace(/^\//, '').trim();
      if (db) return db;
    }
    return process.env.TRANSACTION_DB_NAME ?? 'fintech_transaction-service';
  })();
  // sau đó: mongoose.connection.useDb(txDbName, { useCache: true })
  ```

---

## 34. File: `be/analytics-service/src/services/analytics.service.ts` — `buildInsights()` (dòng ~550)

- **Vi phạm tiêu chí:** Tiêu chí 7 — Hàm quá nhiều tham số dạng `input` object (god-parameter)
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** `buildInsights()` nhận 1 object input với 7 field (`summary`, `previousSummary`, `budgetProgress`, `recurringSpend`, `transactionCount`, `periodDays`, `savingsMetrics`). Đây là pattern AI dùng khi không biết tách hàm: thay vì nhiều tham số, gom thành 1 object khổng lồ không có TypeScript type định nghĩa ở scope top-level. Kết quả là caller phải build object mới mỗi lần gọi dù đã có tất cả dữ liệu sẵn.

- **Đề xuất refactor:**
  ```typescript
  // Định nghĩa type rõ ràng
  type InsightsInput = {
    summary: SummaryResult;
    previousSummary: SummaryResult;
    budgetProgress: Array<{ category: string; percent: number }>;
    recurringSpend: number;
    transactionCount: number;
    periodDays: number;
    savingsMetrics: SavingsMetrics;
  };

  function buildInsights(input: InsightsInput): InsightsResult { ... }
  // Hoặc tách thành 2 hàm: buildSeverity() và buildInsightMessages()
  ```

---

## 35. File: `be/service-identity/services/authService.ts` — `normalizeAiUsageLogs()` (dòng 148–181)

- **Vi phạm tiêu chí:** Tiêu chí 8 — Logic validate quá phòng thủ (defensive over-validation)
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** `normalizeAiUsageLogs()` kiểm tra từng field của mỗi log entry một cách cực kỳ phòng thủ: check `typeof row.model !== 'string'`, check `parsedDate.getTime()`, check `Number.isFinite(tokensUsed)`, check `tokensUsed < 0`, check `Number.isFinite(estimatedCost)`, check `estimatedCost < 0`. Dữ liệu này được gọi từ `updateSettings` — caller đã validate trước, và DB là trusted source. AI thêm validation ở mọi tầng vì không phân biệt được boundary (system boundary vs internal).

- **Đề xuất refactor:**
  ```typescript
  // Chỉ validate tại API boundary (controller/route) bằng zod schema.
  // normalizeAiUsageLogs chỉ cần normalize, không validate lại:
  function normalizeAiUsageLogs(rawLogs: AIUsageLogInput[]): NormalizedLog[] {
    return rawLogs.map((row) => ({
      date: new Date(row.date).toISOString(),
      model: row.model.trim(),
      tokens_used: Math.round(row.tokens_used),
      estimated_cost: Number(row.estimated_cost.toFixed(6)),
    }));
  }
  // Validation bằng zod ở controller trước khi gọi service
  ```

---

## 36. File: `be/service-identity/services/authService.ts` — `toSafeUser()` (dòng 237–248)

- **Vi phạm tiêu chí:** Tiêu chí 7 — Hàm trả về `updatedAt: row.updatedAt ?? row.createdAt` — fallback che giấu data absence
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** `toSafeUser()` có `updatedAt: row.updatedAt ?? row.createdAt` — nếu `updatedAt` không tồn tại, nó silently fallback sang `createdAt`. Caller không biết field đó thực sự null. AI thêm fallback như thế này để "an toàn" nhưng thực ra che giấu data quality issue. Nên return `updatedAt: row.updatedAt ?? null` và để consumer xử lý.

---

## 37. File: `fe/src/pages/Dashboard.tsx` — `fetchOverview`, `fetchWallets`, `fetchCashflow` (dòng 78–147)

- **Vi phạm tiêu chí:** Tiêu chí 7 — Đặt business logic trong page-level module thay vì hook/service
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** 3 hàm `async function fetchOverview()`, `fetchWallets()`, `fetchCashflow()` là free functions trong file page `Dashboard.tsx`. Chúng call API trực tiếp, xử lý data transformation và được dùng bởi React Query bên dưới. Đây là business logic thuộc về custom hook (`useDashboardData`). AI hay đặt hàm ở nơi "gần chỗ dùng nhất" thay vì ở lớp đúng.

- **Đề xuất refactor:**
  ```typescript
  // Chuyển sang fe/src/hooks/useDashboardData.ts (đã có file này nhưng dùng mock)
  // Bỏ mock data, thay bằng các queryFn thật gọi API
  export function useDashboardData() {
    const walletsQ = useQuery({ queryKey: ['wallets'], queryFn: apiClient.getWallets });
    const overviewQ = useQuery({ queryKey: ['dashboard-overview'], queryFn: fetchOverview });
    ...
  }
  ```

---

## 38. File: `fe/src/pages/Dashboard.tsx` — `mapWalletType()` (dòng 55–73)

- **Vi phạm tiêu chí:** Tiêu chí 6 — Tự viết string matching thay vì dùng type-safe enum map
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** `mapWalletType()` dùng `.includes('momo')`, `.includes('zalo')`, `.includes('tiền mặt')` trên cả `walletType` lẫn `walletName` — 2 nguồn dữ liệu khác nhau. Fallback cuối cùng là `'techcombank'` kể cả khi ví là Vietcombank, MB Bank... AI viết heuristic string matching thay vì map enum từ `WalletType` backend.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  function mapWalletType(wallet: Wallet): WalletCurrency['type'] {
    const walletType = String(wallet.walletType ?? '').toLowerCase();
    const walletName = String(wallet.walletName ?? '').toLowerCase();
    if (walletType.includes('momo') || walletName.includes('momo')) return 'momo';
    if (walletType.includes('zalo') || ...) return 'zalopay';
    if (walletType.includes('cash') || walletName.includes('tiền mặt') || ...) return 'cash';
    return 'techcombank'; // BUG: fallback sai
  }
  ```

- **Đề xuất refactor:**
  ```typescript
  const WALLET_TYPE_MAP: Record<string, WalletCurrency['type']> = {
    MOMO: 'momo', ZALOPAY: 'zalopay', CASH: 'cash', CARD: 'card',
  };
  function mapWalletType(wallet: Wallet): WalletCurrency['type'] {
    return WALLET_TYPE_MAP[wallet.walletType?.toUpperCase() ?? ''] ?? 'card';
  }
  ```

---

## 39. File: `fe/src/hooks/useDashboardData.ts` — hook trả về hardcode mock (dòng 42–88)

- **Vi phạm tiêu chí:** Tiêu chí 3 — Mock data vô hồn tồn tại trong production hook; Tiêu chí 1 — Boilerplate comment không action
- **Mức độ:** 🔴 Cao
- **Tại sao giống AI:** `useDashboardData` hook có comment `// Dữ liệu này hiện không gọi API – dùng để fallback hoặc hiển thị UI mẫu. Nếu muốn dữ liệu thật, thay bằng useQuery gọi /api/v1/wallets...` — nhưng không ai làm việc này. Amount hardcode `513008000`, `395011250`, `1253019500` là số đẹp tròn AI tự chọn. Comment `// Nếu muốn dữ liệu thật...` là TODO mà AI để lại khi không implement xong.

- **Mã nguồn/Nội dung gốc:**
  ```typescript
  // Hook trả về dữ liệu tĩnh (mock) cho Dashboard.
  // Dữ liệu này hiện không gọi API – dùng để fallback hoặc hiển thị UI mẫu.
  // Nếu muốn dữ liệu thật, thay bằng useQuery gọi /api/v1/wallets + /api/v1/analytics.
  export const useDashboardData = () => {
    const data: DashboardData = {
      overview: {
        balance: { ..., amount: 513008000, ... },
        savings: { ..., amount: 395011250, ... },
        investment: { ..., amount: 1253019500, ... },
      },
      ...
    };
    return { data, isLoading: false, error: null };
  };
  ```

- **Đề xuất refactor:**
  ```typescript
  // Xóa hook này — logic thật đã có trong Dashboard.tsx.
  // Merge vào useDashboardData sử dụng React Query thật thay vì mock.
  export const useDashboardData = () => {
    const walletsQ = useQuery({ queryKey: ['wallets'], queryFn: apiClient.getWallets });
    // ...
  };
  ```

---

## 40. File: `fe-mobile/src/utils/demoData.ts` — `DEMO_WALLETS` và `getDemoAnalytics()` (toàn bộ file)

- **Vi phạm tiêu chí:** Tiêu chí 3 — Demo data lẫn lộn vào production code; `userId: 'demo-user'`
- **Mức độ:** 🟠 Trung bình
- **Tại sao giống AI:** File `demoData.ts` export `DEMO_WALLETS` với `userId: 'demo-user'` và `getDemoAnalytics()` trả về data hardcode với số liệu giả (`32500000`, `18450000`...). File này được import trong production hook `useDashboardOverview`. Biến `isDemoMode = false` hardcode nhưng demo data vẫn là fallback. AI hay để demo data lẫn vào production path như thế này.

- **Đề xuất refactor:**
  ```typescript
  // Chuyển file vào fe-mobile/__mocks__/demoData.ts hoặc xóa hoàn toàn.
  // useDashboardOverview không import demoData — dùng React Query loading state + error state.
  // Nếu cần demo mode, guard bằng ENV: if (import.meta.env.VITE_DEMO_MODE !== 'true') return null;
  ```

---

## 41. File: `fe-mobile/src/hooks/useWallets.ts` — comment what-pattern (dòng 21, 31, 44, 50)

- **Vi phạm tiêu chí:** Tiêu chí 4 — What-comment trong hook mobile
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** Cùng pattern what-comment như phía web: `// filter local: 'all' | 'active' | 'locked' – lọc phía client, không gọi lại API`, `// Cache 60 giây`, `// Sau khi tạo ví thành công, invalidate cache để refetch danh sách mới`, `// useMemo: chỉ lọc lại khi filter hoặc danh sách gốc thay đổi`. Các comment này giải thích đúng cái gì nhưng không phải tại sao.

- **Đề xuất refactor:** Xóa các comment what, chỉ giữ comment giải thích **quyết định kỹ thuật** (ví dụ: `// staleTime 60s — balance data hiếm thay đổi real-time, tránh over-fetch`).

---

## 42. File: `fe-mobile/src/hooks/useDashboardOverview.ts` — `isDemoMode = false` hardcode (dòng 82)

- **Vi phạm tiêu chí:** Tiêu chí 3 — Dead constant giả vờ có chức năng
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** `const isDemoMode = false;` được export ra ngoài nhưng không bao giờ thay đổi và không có logic toggle. AI thêm vào để "hook trông đầy đủ" — cung cấp flag mà không implement logic thật. Caller nhận `isDemoMode: false` nhưng không biết nó vô nghĩa.

- **Đề xuất refactor:**
  ```typescript
  // Xóa isDemoMode khỏi return value nếu không dùng.
  // Nếu cần: const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  ```

---

## 43. File: `be/ai-service/app/services/nlp_service.py` — `embed_text()` docstring (dòng ~165)

- **Vi phạm tiêu chí:** Tiêu chí 4 — Docstring giải thích thêm "Cái gì" và "Đây là cách nhanh..."
- **Mức độ:** 🟡 Thấp
- **Tại sao giống AI:** Docstring của `embed_text()`: `"Mean pooling được dùng để gom thông tin token-level thành sentence embedding. Đây là cách nhanh và đủ tốt cho intent classification rule-based."` — câu `"Đây là cách nhanh và đủ tốt"` là self-justification language đặc trưng của AI khi chọn approach (thay vì chỉ ghi kỹ thuật dùng và lý do constraint thật).

- **Đề xuất refactor:**
  ```python
  def embed_text(self, text: str) -> torch.Tensor:
      # mean pooling — đủ cho cosine similarity intent matching, không cần CLS token
      ...
  ```

---

## TỔNG KẾT v2

| # | File/Module | Vi phạm chính | Mức |
|---|---|---|---|
| 1 | `fe/README.md` | Boilerplate Google AI Studio | 🔴 |
| 2–3 | `be/seeds/seed-1year-data.ts` | Emoji dày đặc + mock name | 🔴 |
| 4 | `be/service-transaction/test.ts` | Emoji trong test log | 🟠 |
| 5–6 | `be/seeds/seed*.js` | Emoji + English mock names | 🟠 |
| 7 | `fe/src/store/useAuthStore.ts` | Demo User, demo@example.com | 🟠 |
| 8 | `be/service-identity/src/middlewares/errorHandler.ts` | JSDoc 8 dòng không cần thiết | 🟠 |
| 9 | `be/service-transaction/app.ts` + `wallet/app.ts` | What-comment paraphrase | 🟡 |
| 10 | `be/service-wallet/src/config/rabbitmq.ts` | What-comment rác | 🟡 |
| 11 | 5 service `errorHandler.ts` | `'Internal Server Error'` clone | 🟠 |
| 12 | `be/api-gateway/app.ts` + `routes/index.ts` | Rate limit message tiếng Anh | 🟡 |
| 13 | `be/ai-service/app/services/ocr_service.py` | Docstring what + inline regex | 🟠 |
| 14 | `be/ai-service/ocr_service.py` (strategy docstrings) | Label docstring | 🟡 |
| 15 | `be/ai-service/app/api/endpoints/ai.py` | Docstring verbose JSON inline | 🟡 |
| 16 | `fe/src/hooks/usePerformanceMetrics.ts` | JSDoc @param duplicate types | 🟡 |
| 17 | `be/service-identity/services/authService.ts` | Tự viết email regex | 🟠 |
| 18 | `be/service-identity/services/authService.ts` | try-catch thiếu why-comment | 🟡 |
| 19 | `fe/src/utils/axiosClient.ts` | What-comment dày đặc | 🟠 |
| 20 | `fe/src/lib/chatSession.ts` | 4 dòng comment thừa | 🟡 |
| 21 | `be/ai-service/nlp_service.py` | "skeleton production-friendly" | 🟠 |
| 22 | `be/api-gateway/routes/index.ts` | 9 hàm clone rewrite*Path | 🟠 |
| 23 | `be/api-gateway/routes/index.ts` | What-comment trong onProxyReq | 🟡 |
| 24 | `be/cloud-service/upload.controller.ts` | JSDoc với JSON response inline | 🟡 |
| 25 | `be/cloud-service/upload.controller.ts` | `require()` lazy trong async fn | 🟠 |
| 26 | `be/service-wallet/src/services/wallet.service.ts` | parsePositive/parseNonNegative duplicate | 🟡 |
| 27 | `be/service-transaction/saving.service.ts` | `toResponse()` double camelCase+snake_case | 🔴 |
| 28 | `be/service-transaction/recurring-rule.service.ts` | 10 cặp field duplicate trong response | 🔴 |
| 29 | `be/service-transaction/recurring-rule.service.ts` | 3 hàm normalize clone nhau | 🟡 |
| 30 | `saving.service.ts` + `transaction.service.ts` | `parsePositiveAmount` clone qua 2 file | 🟠 |
| 31 | `saving.service.ts` + `transaction.service.ts` | wallet lookup logic clone | 🟠 |
| 32 | `be/analytics-service/analytics.service.ts` | `getCategoryColor()` UI logic trong service | 🟠 |
| 33 | `be/analytics-service/analytics.service.ts` | `resolveTransactionDbName()` unnecessary indirection | 🟡 |
| 34 | `be/analytics-service/analytics.service.ts` | `buildInsights()` god-parameter object | 🟠 |
| 35 | `be/service-identity/services/authService.ts` | Over-validation trong `normalizeAiUsageLogs()` | 🟠 |
| 36 | `be/service-identity/services/authService.ts` | `toSafeUser()` silent fallback updatedAt | 🟡 |
| 37 | `fe/src/pages/Dashboard.tsx` | Business logic trong page-level free functions | 🟠 |
| 38 | `fe/src/pages/Dashboard.tsx` | `mapWalletType()` heuristic string matching | 🟡 |
| 39 | `fe/src/hooks/useDashboardData.ts` | Hook trả về hardcode mock + TODO comment | 🔴 |
| 40 | `fe-mobile/src/utils/demoData.ts` | Demo data lẫn vào production path | 🟠 |
| 41 | `fe-mobile/src/hooks/useWallets.ts` | What-comment trong hook | 🟡 |
| 42 | `fe-mobile/src/hooks/useDashboardOverview.ts` | `isDemoMode = false` dead constant | 🟡 |
| 43 | `be/ai-service/nlp_service.py` | `embed_text()` self-justification docstring | 🟡 |

**Tổng v2: 43 vi phạm — 6×🔴 Cao, 18×🟠 Trung bình, 19×🟡 Thấp**

### Ưu tiên xử lý (P0 — ảnh hưởng runtime hoặc data integrity):
1. **Vi phạm #27 + #28:** `toResponse()` trả về duplicate field camelCase + snake_case — payload phình 2x, dễ break khi FE dùng sai key.
2. **Vi phạm #39:** `useDashboardData` hook trả về hardcode mock trong production — user thấy số giả.
3. **Vi phạm #1:** `fe/README.md` expose Google AI Studio account link.
4. **Vi phạm #40:** `demoData.ts` được import trong production hook mobile — có thể render số giả khi API lỗi.

### Ưu tiên P1 — Technical debt cần xử lý trước release:
5. **Vi phạm #22:** 9 hàm `rewrite*Path` clone nhau — refactor về 1 hàm.
6. **Vi phạm #30 + #31:** `parsePositiveAmount` và wallet lookup clone qua 2 service — tạo shared util.
7. **Vi phạm #25:** `require()` lazy trong controller — thay bằng static import + jest.mock.
8. **Vi phạm #32:** `getCategoryColor()` trong analytics service — chuyển về FE.
