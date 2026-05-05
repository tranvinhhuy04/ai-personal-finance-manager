# Tài liệu Kỹ thuật: Các Luồng AI/NLP/LLM Cốt lõi

> **Ứng dụng Quản lý Tài chính Cá nhân — AI Service Technical Reference**
> Phiên bản tài liệu: 1.0.0 | Ngày cập nhật: 05/2026

---

## Tổng quan Kiến trúc AI

Hệ thống AI được triển khai dưới dạng một microservice độc lập (`ai-service`) viết bằng **Python 3.11 / FastAPI**, hoạt động phía sau **API Gateway** (Node.js/Express). Toàn bộ luồng xử lý ngôn ngữ tự nhiên đều quy về **một đầu mối duy nhất**, cho phép các service Node.js cốt lõi (`transaction-service`, `identity-service`) duy trì sự thuần túy về nghiệp vụ mà không nhúng logic AI.

```
Client (Next.js / React Native)
        │ HTTPS REST
        ▼
  API Gateway (Node.js)
  ├─ BFF: aiExtractBff.ts   ─────────────────────► /api/v1/ai/extract-text
  ├─ BFF: aiAdvisorBff.ts   ─────────────────────► /api/v1/ai/advisor/chat
  └─ BFF: aiChatBff.ts      ─────────────────────► /api/v1/ai/chat
                                                          │
                                               ai-service (Python/FastAPI)
                                               ├─ GeminiService
                                               ├─ NLPService (PhoBERT)
                                               ├─ AdvisorOrchestrator
                                               │   ├─ RetrievalLayer (MongoDB + Vector)
                                               │   ├─ MemoryStore (Redis + MongoDB)
                                               │   └─ Guardrails
                                               └─ Google Gemini API
                                                   └─ Search Grounding
```

Bộ ba luồng được phân tích trong tài liệu này bao gồm:

| # | Tên Luồng | Endpoint | Chiến lược |
|---|---|---|---|
| 1 | **NLP Quick Entry** | `POST /api/v1/ai/extract-text` | Pure LLM API (Gemini) |
| 2 | **Agentic RAG Advisor** | `POST /api/v1/ai/advisor/chat` | Agentic Workflow + Function Calling |
| 3 | **Market Search Grounding** | `POST /api/v1/ai/advisor/chat` | Google Search Grounding (Gemini native tool) |

---

## Luồng 1 — Trích xuất Giao dịch từ Ngôn ngữ Tự nhiên (NLP Quick Entry)

### Mô tả chung

Luồng này giải quyết bài toán nhập liệu giao dịch tài chính từ văn bản tự do hoặc đoạn hội thoại nhóm chia tiền, thay thế hoàn toàn cho form nhập liệu truyền thống.

---

#### Mục tiêu của tính năng

Người dùng thường không muốn nhập từng trường dữ liệu (số tiền, danh mục, loại giao dịch) vào form. Thay vào đó, họ có thể **dán thẳng đoạn chat nhóm chia tiền** hoặc **gõ câu lệnh tự nhiên** như:

> *"Hôm nay mình mua cà phê 45k, ăn trưa 85k, đổ xăng 200k"*
> *"Cuối tháng settle: Nam trả Hoa 150k tiền ăn, mình trả Nam 320k tiền Grab"*

Hệ thống tự động phân tích ngữ nghĩa, trích xuất cấu trúc giao dịch, và trả về danh sách JSON sẵn sàng để client render form xác nhận trước khi lưu vào cơ sở dữ liệu.

---

#### Đầu vào và Đầu ra

**Request (Client → API Gateway → ai-service):**

```json
POST /api/v1/ai/extract-text
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "input_text": "Tháng này mình chi: Tiền nhà 3.5tr, điện nước 450k, ăn uống 1.2tr, grab 380k",
  "model": "gemini-2.0-flash",
  "gemini_api_key": "<user_runtime_key_or_null>"
}
```

> **Lưu ý BFF:** Trước khi forward tới `ai-service`, `aiExtractBff.ts` gọi `identity-service /settings/runtime-ai` để lấy Gemini API key và model đã được người dùng cấu hình trong **Settings** của ứng dụng. Nếu user chưa cấu hình, hệ thống dùng key mặc định từ biến môi trường.

**Response (ai-service → API Gateway → Client):**

```json
{
  "success": true,
  "input": "Tháng này mình chi: Tiền nhà 3.5tr, điện nước 450k, ăn uống 1.2tr, grab 380k",
  "raw_output": "[{\"title\":\"Tiền nhà\",\"amount\":3500000,\"type\":\"expense\",\"category\":\"Nhà ở\"},{\"title\":\"Điện nước\",\"amount\":450000,\"type\":\"expense\",\"category\":\"Tiện ích\"},{\"title\":\"Ăn uống\",\"amount\":1200000,\"type\":\"expense\",\"category\":\"Ăn uống\"},{\"title\":\"Grab\",\"amount\":380000,\"type\":\"expense\",\"category\":\"Di chuyển\"}]",
  "model": "gemini-2.0-flash",
  "llm": {
    "provider": "gemini",
    "model": "gemini-2.0-flash",
    "usage": {
      "prompt_tokens": 312,
      "completion_tokens": 187,
      "total_tokens": 499
    }
  }
}
```

Sau khi trả về, `aiExtractBff.ts` ghi nhận `usage` (tokens tiêu thụ, chi phí ước tính) vào `identity-service /settings/usage/append` phục vụ dashboard quota management.

---

#### Cách tiếp cận

**Pure LLM API Call** — không sử dụng pipeline phức tạp. Toàn bộ logic hiểu ngữ nghĩa, cộng dồn số tiền, và phân loại danh mục đều được uỷ thác hoàn toàn cho mô hình ngôn ngữ lớn. Lựa chọn này phù hợp vì:

- Đầu vào có cấu trúc ngữ nghĩa đa dạng, không thể xử lý bằng regex thuần.
- Đầu ra là JSON có schema cố định — có thể kiểm soát chặt qua prompt instruction.
- Không yêu cầu trạng thái (stateless), dễ scale horizontal.

---

#### Mô hình hoặc Dịch vụ Sử dụng

| Thành phần | Chi tiết |
|---|---|
| **Mô hình LLM** | `gemini-2.0-flash` (mặc định) hoặc theo `selected_ai_model` của user |
| **API** | Google Generative Language API v1beta — `generateContent` |
| **Endpoint** | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| **Thư viện HTTP** | `httpx` (async, timeout 20s connect + 5s) |
| **Không dùng** | LangChain, PhoBERT, MongoDB cho luồng này |

---

#### Pipeline Xử lý

```
1. [Client]          Người dùng nhập/dán văn bản tự do → gọi API Gateway
                     
2. [API Gateway]     Xác thực JWT (verifyToken middleware)
                     → Gọi identity-service để lấy RuntimeAiConfig
                        (gemini_api_key, selected_ai_model)
                     → Forward request tới ai-service kèm key/model đã resolve
                     
3. [ai-service]      Nhận payload, validate (min_length=2)
                     → Khởi tạo GeminiService với API key runtime
                     
4. [GeminiService]   Xây dựng System Prompt:
                       - Role: "trợ lý tài chính thông minh"
                       - Instruction: trích xuất thu/chi CỦA NGƯỜI DÙNG
                       - Hướng dẫn đặc biệt cho đoạn chat nhóm chia tiền
                       - Output constraint: CHỈ trả về JSON array, không giải thích
                       - Schema: [{title, amount (number), type, category}]
                     
5. [Gemini API]      Gửi POST request với:
                       - temperature: 0.0  (deterministic, không sáng tạo)
                       - topP: 0.8
                       - maxOutputTokens: 1024
                     → Nhận response JSON
                     
6. [GeminiService]   Parse response: extract text từ candidates[0].content.parts
                     → Extract usage metadata (promptTokenCount, candidatesTokenCount)
                     → Trả về {text, model, usage}
                     
7. [ai-service]      Trả về HTTP 200 với raw_output (chuỗi JSON của Gemini)
                     
8. [API Gateway]     Parse usage metadata → appendUsageLog → identity-service
                     → Forward response về Client
                     
9. [Client]          Parse raw_output → render danh sách giao dịch trên form xác nhận
                     → User review/chỉnh sửa → Submit → transaction-service
```

---

#### Ví dụ Minh hoạ Cụ thể

**Input (đoạn chat nhóm chia tiền):**

```
Bạch: Tổng hoá đơn BBQ hôm qua 1.2tr, chia 4 người
Nam: Mình Grab về thêm 45k, chia đôi với Hà
Hà: Mình thanh toán hộ tiền nước cho cả bàn 160k
Nhóm settle: mỗi người trả Bạch 300k, Nam trả mình 22.5k, mình trả Hà 80k
```

**System Prompt thực tế gửi lên Gemini:**

```
Bạn là trợ lý tài chính thông minh. Hãy đọc đoạn văn bản hoặc hội thoại sau.
Nhiệm vụ của bạn là trích xuất các giao dịch tài chính thu/chi CỦA NGƯỜI DÙNG.
Nếu là đoạn chat nhóm chia tiền, hãy đọc kỹ ngữ cảnh, cộng dồn các khoản
mà người dùng phải trả/được nhận.
Chỉ trả về MỘT MẢNG JSON theo đúng schema sau, không kèm giải thích:
[{ "title": "...", "amount": <number>, "type": "expense"|"income", "category": "..." }]

Văn bản đầu vào:
<đoạn chat trên>
```

**Output Gemini trả về (raw_output):**

```json
[
  {
    "title": "Tiền BBQ chia 4",
    "amount": 300000,
    "type": "expense",
    "category": "Ăn uống"
  },
  {
    "title": "Tiền Grab chia đôi",
    "amount": 22500,
    "type": "expense",
    "category": "Di chuyển"
  },
  {
    "title": "Nhận lại tiền nước từ nhóm",
    "amount": 80000,
    "type": "income",
    "category": "Thu nhập khác"
  }
]
```

---

#### Đánh giá Chất lượng

| Tiêu chí | Phương pháp đo | Mục tiêu |
|---|---|---|
| **Độ chính xác số tiền** | So sánh `amount` với ground truth trong test set | ≥ 95% |
| **Phân loại `type` đúng** | `expense` / `income` classification accuracy | ≥ 98% |
| **Nhận diện `category`** | Top-1 accuracy so với danh mục chuẩn của app | ≥ 85% |
| **Cộng dồn đúng (chat nhóm)** | Số tiền cuối cùng user phải trả/nhận sau settle | ≥ 90% |
| **Output hợp lệ JSON** | Tỷ lệ output parse được không throw exception | ≥ 99% |
| **Không hallucinate giao dịch** | Số giao dịch trong output ≤ số giao dịch thực trong input | Kiểm tra thủ công |

> **Cơ chế kiểm soát hallucination:** `temperature: 0.0` buộc mô hình chọn token có xác suất cao nhất, giảm thiểu sáng tạo tự do. Prompt instruction "không kèm giải thích" loại bỏ văn bản ngoài JSON.

---

#### Chi phí và Hiệu năng

| Chỉ số | Giá trị ước tính |
|---|---|
| **Prompt tokens** | ~200–400 tokens (tuỳ độ dài input) |
| **Completion tokens** | ~100–300 tokens (JSON array) |
| **Tổng tokens / request** | ~300–700 tokens trung bình |
| **Chi phí / request** | ~$0.000090–$0.000210 (Gemini 2.0 Flash: $0.30/1M tokens) |
| **Latency P50** | 800ms – 1.5s (bao gồm network round-trip tới Google API) |
| **Latency P99** | 3–5s (đầu vào dài, cold start container) |
| **Timeout** | 20s (httpx) + 5s connect timeout |

---

#### Hạn chế

1. **Phụ thuộc mạng:** Latency và tính sẵn sàng hoàn toàn phụ thuộc vào Google API. Không có offline fallback.
2. **Ambiguous input:** Khi đoạn chat thiếu ngữ cảnh rõ ràng ("ai trả ai"), mô hình có thể tính sai người chịu chi.
3. **Đơn vị tiền tệ đa dạng:** "3.5tr", "3,500,000", "3500k" — Gemini thường hiểu đúng nhưng không đảm bảo 100% với format lạ.
4. **Giới hạn quota:** `429 Resource Exhausted` khi vượt RPM/TPM của Gemini API key; hệ thống trả về HTTP 429 có message rõ ràng cho client.
5. **Không có streaming:** Toàn bộ JSON trả về một lần; đối với input rất dài (>30 giao dịch), UX chờ đợi có thể cảm nhận được.

---

#### Phần Nhóm Tự Xây Dựng

| Thành phần | Nhóm tự xây | Google cung cấp |
|---|---|---|
| System prompt engineering (role, schema, instruction) | ✅ | — |
| JSON output schema definition (`title`, `amount`, `type`, `category`) | ✅ | — |
| `GeminiService.extract_transactions_from_text()` — HTTP client, parse logic | ✅ | — |
| `aiExtractBff.ts` — BFF layer: fetch runtime config, forward, parse usage, log | ✅ | — |
| Usage tracking & quota management pipeline (identity-service) | ✅ | — |
| Token/cost estimation logic ($0.30/1M) | ✅ | — |
| **LLM inference engine** (ngữ nghĩa, cộng dồn, phân loại) | — | ✅ Gemini API |

---
---

## Luồng 2 — Trợ lý Tư vấn Tài chính Cá nhân (Agentic RAG)

### Mô tả chung

Luồng này triển khai một **Agentic RAG (Retrieval-Augmented Generation) Workflow** hoàn chỉnh, trong đó hệ thống không chỉ trả lời câu hỏi mà còn **tự quyết định** nên truy xuất loại dữ liệu nào, từ nguồn nào, trước khi đưa ra câu trả lời.

---

#### Mục tiêu của tính năng

Người dùng có thể đặt câu hỏi bằng ngôn ngữ tự nhiên về tình hình tài chính của chính họ, ví dụ:

- *"Tháng này tôi tiêu bao nhiêu cho ăn uống so với tháng trước?"*
- *"Với thu nhập 25 triệu/tháng và chi tiêu hiện tại, tôi có thể tiết kiệm được không?"*
- *"Tôi nên điều chỉnh ngân sách như thế nào để đạt mục tiêu mua xe trong 2 năm?"*

Hệ thống tự động: (1) hiểu ý định, (2) truy xuất đúng dữ liệu từ MongoDB của user, (3) tính toán các chỉ số tài chính, và (4) tổng hợp câu trả lời có ngữ cảnh, không hallucinate số liệu.

---

#### Đầu vào và Đầu ra

**Request (Client → API Gateway → ai-service):**

```json
POST /api/v1/ai/advisor/chat
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "user_id": "usr_6712abc",
  "session_id": "sess_20260505_001",
  "message": "Tháng này tôi chi tiêu như thế nào so với thu nhập? Tôi có đang tiết kiệm không?",
  "locale": "vi-VN",
  "risk_profile": "moderate",
  "financial_profile": {
    "monthly_income": 25000000,
    "saving_goal": 5000000
  },
  "use_llm": true,
  "gemini_api_key": "<user_runtime_key>",
  "selected_ai_model": "gemini-2.0-flash"
}
```

**Response (ai-service → Client):**

```json
{
  "answer": "Tháng 5/2026, bạn đã chi tổng cộng 18.450.000 VND trên tổng thu nhập 25.000.000 VND — tỷ lệ tiết kiệm đạt 26,2%, cao hơn mục tiêu 20% đề ra. Danh mục chi lớn nhất là Ăn uống (4.2tr) và Di chuyển (2.8tr). Gợi ý: duy trì đà này và tự động chuyển khoản 5tr vào ví tiết kiệm vào ngày 1 hàng tháng để đảm bảo kỷ luật tài chính.",
  "intent": "internal_data",
  "confidence": 0.94,
  "entities": {
    "time_range": "thang_nay",
    "category": null,
    "amount": null
  },
  "calculations": {
    "total_income": 25000000,
    "total_expense": 18450000,
    "savings_rate": 26.2,
    "roi": 0.0
  },
  "tool_result": {
    "structured_data": { "transactions": [...], "summary": {...} },
    "unstructured_context": [...],
    "external_data": {}
  },
  "guardrails": {
    "blocked": false,
    "violations": [],
    "sanitized_answer": "..."
  },
  "llm": {
    "model": "gemini-2.0-flash",
    "usage": { "prompt_tokens": 1840, "completion_tokens": 124, "total_tokens": 1964 },
    "grounding_sources": []
  },
  "memory": {}
}
```

---

#### Cách tiếp cận

**Agentic Workflow + Function Calling** — Pipeline đa giai đoạn, trong đó mỗi bước có quyết định phân nhánh:

1. **Intent Extraction:** LLM phân loại ý định → fallback sang rule-based nếu LLM thất bại.
2. **Semantic Routing:** Regex + intent kết hợp quyết định nguồn dữ liệu (nội bộ / thị trường / ngoài phạm vi).
3. **Retrieval:** MongoDB Aggregation Pipeline + Vector Search (Atlas) để lấy đúng dữ liệu theo ngữ cảnh.
4. **Calculation:** Code tính toán thuần tuý (savings rate, ROI) — không dùng LLM cho số học.
5. **Generation:** LLM tổng hợp câu trả lời bằng ngôn ngữ tự nhiên dựa trên context đã có.
6. **Guardrails:** Lọc PII, chặn pattern bị cấm (cam kết lợi nhuận, all-in leverage).
7. **Memory:** Lưu conversation vào session memory (in-memory) + user preferences (MongoDB).

---

#### Mô hình hoặc Dịch vụ Sử dụng

| Thành phần | Mô hình / Dịch vụ | Mục đích |
|---|---|---|
| **Intent Extraction** | `gemini-2.0-flash` (temperature=0.0, JSON mode) | Phân loại intent + extract entities |
| **Intent Fallback** | Rule-based regex (Python) | Dự phòng khi Gemini lỗi/không key |
| **Vietnamese Embedding** | `vinai/phobert-base-v2` (HuggingFace, local) | Embed câu hỏi tiếng Việt cho intent classification |
| **Query Embedding** | `text-embedding-004` (Google API) | Embed câu hỏi để vector search trong MongoDB Atlas |
| **Retrieval** | MongoDB Atlas Aggregation + `$vectorSearch` | Truy xuất giao dịch + knowledge base |
| **Generation** | `gemini-2.0-flash` (temperature=0.2, maxTokens=384) | Sinh câu trả lời tự nhiên |
| **Cache** | Redis (TTL 120s) + In-memory Map | Cache response tránh gọi lại API |

---

#### Pipeline Xử lý

```
1. [API Gateway]     Xác thực JWT → Fetch RuntimeAiConfig từ identity-service
                     → Kiểm tra Redis cache (SHA256 hash của {userId+sessionId+message+riskProfile})
                     → Nếu cache HIT: trả về ngay (bỏ qua bước 2-10)
                     → Forward AdvisorChatRequest tới ai-service

2. [Orchestrator]    Nhận request → kiểm tra memory cache (bỏ qua nếu là external query)
                     → Ghi message vào SessionMemory (in-memory, max 20 messages)

3. [Intent Extract]  Gọi Gemini với:
                       - System: "Intent router for Fin"
                       - Valid intents: transaction_lookup | financial_advice |
                                        chart_analysis | general_knowledge
                       - Output: JSON {intent, confidence, time_range, category, amount}
                       - temperature: 0.0, maxTokens: 128, responseMimeType: application/json
                     → Fallback rule-based nếu Gemini lỗi hoặc thiếu API key

4. [Router]          Áp dụng pattern matching 3 lớp (ưu tiên từ trên xuống):
                       a. INTERNAL_DATA_PATTERN  → route = "internal_data"
                          (chi tiêu|thu nhập|tiết kiệm|số dư|ví tiền|giao dịch|ngân sách)
                       b. EXTERNAL_FINANCIAL_PATTERN → route = "external_financial_data"
                          (giá vàng|tỷ giá|lãi suất|chứng khoán|cổ phiếu|USD|EUR|BTC)
                       c. OUT_OF_SCOPE_PATTERN → route = "out_of_scope"
                          (thời tiết|nấu ăn|bóng đá|âm nhạc|phim|du lịch|game)

5. [Retrieval]       [Chỉ khi route = "internal_data"]
                     a. Gọi text-embedding-004 để embed câu hỏi → vector 768 chiều
                     b. MongoDB Aggregation Pipeline:
                          $match: {userId, transactionDate trong time_range}
                          $addFields: normalize type, date, category_id
                          $lookup: JOIN với collection "categories"
                          $group: tính totalIncome, totalExpense theo category
                          $sort, $limit: top 20 giao dịch
                     c. Atlas Vector Search trên collection "knowledge_base"
                          (tài liệu tư vấn tài chính, rule-of-thumb)
                     d. Fetch savings + investments balance

6. [Calculator]      Tính toán thuần code (không LLM):
                       - total_income = Σ(amount WHERE type=income)
                       - total_expense = Σ(amount WHERE type=expense)
                       - savings_rate = (income - expense) / income × 100
                       - roi = (current_value - invested) / invested × 100

7. [System Prompt]   Xây dựng prompt cho Gemini bao gồm:
                       - Role + persona (trợ lý Fin)
                       - route hiện tại
                       - financial_profile (từ request)
                       - risk_profile
                       - calculations (từ bước 6)
                       - tool_context (structured_data + unstructured_context từ bước 5)
                       - recent_messages (6 tin nhắn gần nhất từ SessionMemory)
                       - Output format instruction theo route

8. [Generation]      Gọi Gemini generate_advisor_answer:
                       - temperature: 0.2, topP: 0.8, maxOutputTokens: 384
                       - thinkingBudget: 0 (disable extended thinking, giảm latency)
                       - use_google_search: False (chỉ True với external route)

9. [Guardrails]      apply_output_guardrails(answer):
                       - Regex check FORBIDDEN_PATTERNS:
                         "lợi nhuận chắc chắn", "all-in", "dùng đòn bẩy cao"
                       - PII sanitize: email → [redacted-email]
                                       phone → [redacted-phone]
                                       account_number → [redacted-account]
                       - Nếu vi phạm: thay toàn bộ bằng câu từ chối chuẩn

10. [Memory]         Ghi assistant response vào SessionMemory
                     upsert user preferences vào MongoDB (long-term memory)
                     Cache response vào Redis (TTL 120s) cho các câu hỏi nội bộ

11. [Response]       Trả về AdvisorResponse đầy đủ:
                     {answer, intent, confidence, entities, calculations,
                      tool_result, guardrails, llm, memory}
```

---

#### Ví dụ Minh hoạ Cụ thể

**Câu hỏi người dùng:**
> *"Tôi đã tiêu bao nhiêu cho ăn uống tháng trước? Có vượt ngân sách không?"*

**Bước 3 — Intent Extraction (Gemini JSON output):**
```json
{
  "intent": "transaction_lookup",
  "confidence": 0.96,
  "time_range": "thang_truoc",
  "category": "ăn uống",
  "amount": null
}
```

**Bước 4 — Routing:** `"ăn uống"` → khớp `INTERNAL_DATA_PATTERN` → `route = "internal_data"`

**Bước 5 — MongoDB Aggregation kết quả:**
```json
{
  "transactions": [
    {"title": "Cơm văn phòng", "amount": 85000, "type": "expense", "category": "Ăn uống", "date": "2026-04-02"},
    {"title": "GrabFood", "amount": 120000, "type": "expense", "category": "Ăn uống", "date": "2026-04-05"},
    ...
  ],
  "summary": { "totalExpense_food": 1850000, "budget_food": 1500000 }
}
```

**Bước 6 — Calculations:**
```
total_expense_food = 1,850,000 VND
budget_food = 1,500,000 VND
overspent = 350,000 VND (23.3% vượt ngân sách)
```

**Bước 8 — Gemini final answer:**
> *"Tháng 4, bạn đã chi **1.850.000 VND** cho ăn uống — vượt ngân sách **350.000 VND** (23,3%). Khoản vượt chủ yếu đến từ GrabFood vào cuối tuần (chiếm ~40% tổng danh mục). Gợi ý: đặt giới hạn 150k/lần order delivery và ưu tiên nấu ăn hoặc cơm văn phòng vào ngày thường để kéo chi tiêu về dưới 1,5 triệu tháng sau."*

---

#### Đánh giá Chất lượng

| Tiêu chí | Phương pháp đo | Mục tiêu |
|---|---|---|
| **Intent Accuracy** | LLM intent vs. ground truth label | ≥ 92% |
| **Route Accuracy** | Route quyết định vs. expected route | ≥ 97% |
| **Data Fidelity** | Số liệu trong câu trả lời match với MongoDB | 100% (guardrail) |
| **Hallucination Rate** | % câu trả lời chứa số liệu không từ context | < 1% |
| **PII Leakage** | Số lần email/phone xuất hiện trong response | 0 |
| **Response Relevance** | Human eval: câu trả lời đúng câu hỏi | ≥ 88% |
| **Cache Hit Rate** | % request được serve từ Redis/local cache | ≥ 35% |

---

#### Chi phí và Hiệu năng

| Giai đoạn | Tokens (ước tính) | Latency |
|---|---|---|
| Intent Extraction (Gemini) | ~80–150 tokens | 400–800ms |
| Query Embedding (text-embedding-004) | ~50–100 tokens | 200–400ms |
| Advice Generation (Gemini) | ~1500–2500 total tokens | 1.5–3s |
| MongoDB Aggregation | — | 50–200ms |
| Redis Cache Lookup | — | 1–5ms |
| **Tổng (cache MISS)** | ~1700–2800 tokens | **2.5–4.5s** |
| **Tổng (cache HIT)** | 0 tokens | **< 10ms** |

**Chi phí ước tính per request (cache miss):** ~$0.00051–$0.00084 (Gemini 2.0 Flash).

---

#### Hạn chế

1. **Cold start PhoBERT:** Container khởi động lần đầu cần ~15–30s để tải model 135MB vào RAM. Giảm thiểu bằng biến môi trường `AI_SERVICE_PRELOAD_MODELS=true`.
2. **MongoDB schema heterogeneity:** Các collection dùng nhiều tên field khác nhau (`transactionDate` / `transaction_date` / `occurred_at`). Pipeline Aggregation phải xử lý `$ifNull` cho từng trường hợp — dễ gây lỗi khi schema thay đổi.
3. **Session memory không persist:** `SessionMemory` là in-memory Python dict, mất khi container restart. Chưa đồng bộ hoàn toàn sang Redis.
4. **Context window limit:** System prompt + financial data + conversation history có thể vượt 8k tokens với user nhiều giao dịch; cần giới hạn số transaction trả về.
5. **Latency cao với câu hỏi phức tạp:** Hai lần gọi Gemini (intent + generation) dẫn đến tổng latency 2.5–4.5s, có thể gây khó chịu trên mobile.

---

#### Phần Nhóm Tự Xây Dựng

| Thành phần | Nhóm tự xây | Google / Third-party cung cấp |
|---|---|---|
| `AdvisorOrchestrator` — toàn bộ agent loop | ✅ | — |
| Semantic routing engine (3-layer regex + intent) | ✅ | — |
| MongoDB Aggregation Pipeline (JOIN categories, normalize fields) | ✅ | — |
| `RetrievalLayer` — fetch structured + vector search logic | ✅ | — |
| `MemoryStore` — session memory + Redis cache + MongoDB preferences | ✅ | — |
| `financial_math.py` — savings_rate, ROI calculator | ✅ | — |
| `build_advisor_system_prompt()` — prompt engineering | ✅ | — |
| `guardrails.py` — PII sanitize + forbidden pattern blocking | ✅ | — |
| `IntentExtraction` Pydantic schema (JSON contract) | ✅ | — |
| `aiAdvisorBff.ts` — BFF: cache, runtime config, usage log | ✅ | — |
| **LLM inference** (intent classification + answer generation) | — | ✅ Gemini API |
| **Vietnamese embedding** (PhoBERT) | — | ✅ VinAI (HuggingFace) |
| **Query embedding** (text-embedding-004) | — | ✅ Google API |
| **Vector index** (Atlas Vector Search) | — | ✅ MongoDB Atlas |

---
---

## Luồng 3 — Tra cứu Thông tin Thị trường Thời gian thực (Google Search Grounding)

### Mô tả chung

Luồng này xử lý các câu hỏi về dữ liệu tài chính **công khai** và **thay đổi theo thời gian** — giá vàng, tỷ giá ngoại tệ, lãi suất ngân hàng, giá cổ phiếu — mà một LLM thông thường không thể trả lời chính xác do training data cutoff.

---

#### Mục tiêu của tính năng

Người dùng thường xuyên hỏi các câu như:

- *"Giá vàng SJC hôm nay bao nhiêu một lượng?"*
- *"Tỷ giá USD/VND hiện tại là bao nhiêu?"*
- *"Lãi suất tiết kiệm Vietcombank tháng này là mấy phần trăm?"*

Nếu dùng LLM thuần tuý, câu trả lời sẽ là số liệu cũ từ training data, gây sai lệch nghiêm trọng với quyết định tài chính của người dùng. Luồng này triển khai **hai lớp phòng thủ** để đảm bảo dữ liệu thời gian thực.

---

#### Đầu vào và Đầu ra

**Request:** Giống hệt Luồng 2 — cùng endpoint `POST /api/v1/ai/advisor/chat`, phân biệt bởi nội dung `message` kích hoạt `EXTERNAL_FINANCIAL_PATTERN`.

```json
{
  "user_id": "usr_6712abc",
  "session_id": "sess_20260505_002",
  "message": "Giá vàng SJC hôm nay mua vào bán ra bao nhiêu?",
  "use_llm": true,
  "gemini_api_key": "<user_key>"
}
```

**Response (khi dữ liệu lấy được từ domestic API):**

```json
{
  "answer": "Giá vàng SJC hiện tại mua vào 115.500.000 VND/lượng, bán ra 118.200.000 VND/lượng, cập nhật lúc 09:30 ngày 05/05/2026.",
  "intent": "external_financial_data",
  "confidence": 0.95,
  "entities": { "time_range": null, "category": null, "amount": null },
  "calculations": { "total_income": 0, "total_expense": 0, "savings_rate": 0, "roi": 0 },
  "tool_result": {
    "structured_data": {},
    "unstructured_context": [],
    "external_data": {
      "gold": { "price_usd_per_ounce": 3220.5, "updated_at": "2026-05-05T02:30:00Z" },
      "domestic_gold": {
        "buy_vnd_per_luong": 115500000,
        "sell_vnd_per_luong": 118200000,
        "updated_at": "2026-05-05T02:30:00+07:00"
      },
      "exchange": {
        "base_code": "USD",
        "rates": { "VND": 25430, "EUR": 0.918, "JPY": 153.2 },
        "updated_at": "2026-05-05T00:00:00Z"
      }
    }
  },
  "llm": { "model": "gemini-2.0-flash", "usage": {...}, "grounding_sources": [...] }
}
```

---

#### Cách tiếp cận

**Hybrid: Rule-based API Scraping + Google Search Grounding (Gemini Native Tool)**

Luồng áp dụng chiến lược **two-tier fallback**:

- **Tier 1 (ưu tiên):** Gọi trực tiếp các REST API mở (gold-api.com, open.er-api.com, 24h.com.vn scraping) để lấy dữ liệu có cấu trúc → format bằng code thuần tuý → không tốn token LLM.
- **Tier 2 (khi Tier 1 thiếu dữ liệu + có `use_llm=true`):** Kích hoạt Gemini với **Google Search Grounding tool** — Gemini tự động gọi Google Search trong quá trình generation để lấy thông tin cập nhật nhất, trả về kèm nguồn trích dẫn.

---

#### Mô hình hoặc Dịch vụ Sử dụng

| Thành phần | Dịch vụ | Mục đích |
|---|---|---|
| **Tier 1A — Giá vàng quốc tế** | `gold-api.com /price/XAU/USD` (REST, public) | Giá vàng thế giới USD/ounce |
| **Tier 1B — Giá vàng SJC trong nước** | `24h.com.vn/gia-vang-hom-nay` (HTTP scraping) | Giá vàng mua/bán VND/lượng |
| **Tier 1C — Tỷ giá ngoại tệ** | `open.er-api.com /v6/latest/USD` (REST, public) | Tỷ giá 30+ cặp tiền tệ |
| **Tier 2 — Search Grounding** | Gemini API với `tools: [{googleSearch: {}}]` | Tra cứu thời gian thực qua Google |
| **Generation** | `gemini-2.0-flash` (temperature=0.1) | Tổng hợp câu trả lời từ dữ liệu |

---

#### Pipeline Xử lý

```
1. [Orchestrator]    Nhận message
                     → Kiểm tra EXTERNAL_FINANCIAL_PATTERN (regex):
                       (giá vàng|vàng SJC|tỷ giá|lãi suất|chứng khoán|cổ phiếu|USD|EUR|BTC|giá xăng)
                     → Khớp → route = "external_financial_data"
                     → KHÔNG tra cache (dữ liệu thay đổi liên tục, cache bị skip)

2. [RetrievalLayer]  fetch_external_data() chạy đồng thời 3 requests async:
                     
                     a. Gold International (gold-api.com):
                          GET /price/XAU/USD
                          → {price_usd_per_ounce, timestamp}
                     
                     b. Domestic Gold (24h.com.vn):
                          HTTP GET + parse HTML/JSON response
                          → {buy_vnd_per_luong, sell_vnd_per_luong, updated_at}
                     
                     c. Exchange Rates (open.er-api.com):
                          GET /v6/latest/USD
                          → {base: "USD", rates: {VND:25430, EUR:0.918,...}, updated_at}
                     
                     → Kết hợp thành external_data dict

3. [Tier 1 Response] _build_external_financial_response(message, external_data):
                     
                     Nếu message chứa "vàng"/"vang"/"XAU":
                       a. Ưu tiên domestic_gold nếu có → format "mua vào X VND, bán ra Y VND"
                       b. Fallback: international gold + quy đổi VND/lượng
                          (price_usd_per_ounce × usd_vnd_rate × 37.5 / 31.1034768)
                     
                     Nếu message chứa "tỷ giá"/"ty gia"/mã tiền tệ:
                       a. _extract_exchange_pair(message):
                          Detect currency codes (usd, eur, jpy, cny, ...) từ text
                          → Trả về (source_code, target_code)
                       b. _resolve_exchange_rate(rates, base, source, target):
                          Cross-rate calculation nếu base ≠ source/target
                       c. Format: "1 USD = 25.430 VND, cập nhật lúc..."
                     
                     → Nếu format được → trả về ngay (không gọi LLM)

4. [Tier 2]          [Chỉ kích hoạt nếu use_llm=True VÀ có API key]
                     Gọi generate_advisor_answer với:
                       - system_prompt từ build_advisor_system_prompt (route=external)
                       - tool_context = external_data từ bước 2
                       - use_google_search = True
                     
                     → Gemini nhận:
                         "tools": [{"googleSearch": {}}]
                       (Google Search Grounding được BẬT trong request payload)
                     
                     → Gemini tự quyết định gọi Google Search nếu cần dữ liệu mới hơn
                     → Response kèm grounding_sources (danh sách URL nguồn)

5. [Guardrails]      apply_output_guardrails (giống Luồng 2)

6. [Response]        Trả về answer với grounding_sources (nếu Tier 2)
                     hoặc rule-based answer (nếu Tier 1 đủ dữ liệu)
```

---

#### Ví dụ Minh hoạ Cụ thể

**Câu hỏi người dùng:**
> *"Tỷ giá USD hôm nay và giá vàng SJC là bao nhiêu?"*

**Bước 2 — fetch_external_data() kết quả:**
```json
{
  "gold": { "price_usd_per_ounce": 3220.50, "updated_at": "2026-05-05T02:30:00Z" },
  "domestic_gold": {
    "buy_vnd_per_luong": 115500000,
    "sell_vnd_per_luong": 118200000,
    "updated_at": "2026-05-05T02:30:00+07:00"
  },
  "exchange": {
    "base_code": "USD",
    "rates": { "VND": 25430, "EUR": 0.918 },
    "updated_at": "2026-05-05T00:00:00Z"
  }
}
```

**Bước 3 — Tier 1 rule-based format (gold query):**
> *"Giá vàng SJC hiện tại mua vào **115.500.000 VND**/lượng, bán ra **118.200.000 VND**/lượng, cập nhật lúc 09:30 ngày 05/05/2026."*

**Bước 3 — Tier 1 rule-based format (exchange rate):**
> *"Tỷ giá tham chiếu hiện tại: 1 USD = 25.430 VND, cập nhật lúc 07:00 ngày 05/05/2026."*

**Bước 4 — Tier 2 (nếu use_llm=True), Gemini với Search Grounding:**
- Payload gửi lên Gemini bao gồm `"tools": [{"googleSearch": {}}]`
- Gemini tự tra Google Search: *"giá vàng SJC hôm nay 5/5/2026"*
- `grounding_sources`: `["https://sjc.com.vn/gia-vang", "https://24h.com.vn/gia-vang..."]`
- Câu trả lời cuối cùng được xác minh thêm bằng nguồn web thực tế

---

#### Đánh giá Chất lượng

| Tiêu chí | Phương pháp đo | Mục tiêu |
|---|---|---|
| **Data Freshness** | Độ lệch thời gian giữa `updated_at` và thời điểm query | < 30 phút |
| **Price Accuracy** | So sánh với dữ liệu gốc từ SJC.com.vn / Vietcombank | ≤ 0.5% sai số |
| **Exchange Rate Accuracy** | Cross-rate calculation error (USD→EUR→VND) | < 0.01% |
| **Source Attribution** | % response có `grounding_sources` khi Tier 2 được dùng | ≥ 95% |
| **Routing Precision** | % câu hỏi thị trường vào đúng `external_financial_data` route | ≥ 98% |
| **No Data Fallback** | Response coherent khi API ngoài thất bại | 100% (fallback message) |

---

#### Chi phí và Hiệu năng

| Giai đoạn | Latency ước tính |
|---|---|
| `fetch_external_data()` (3 requests parallel) | 500ms – 1.5s |
| Tier 1 rule-based format | < 5ms |
| Tier 2 Gemini + Search Grounding | 2–5s (Google search round-trip) |
| **Tổng (Tier 1 đủ dữ liệu)** | **500ms – 1.5s** |
| **Tổng (Tier 2 Search Grounding)** | **2.5–6.5s** |

**Token (Tier 2):** ~800–1500 tokens tổng. **Chi phí:** ~$0.00024–$0.00045/request.

> **Lưu ý:** Cache bị **vô hiệu hoá có chủ đích** cho `external_financial_data` route (xem dòng `cached = None if EXTERNAL_FINANCIAL_PATTERN.search(req.message) else ...` trong orchestrator) vì dữ liệu thị trường thay đổi theo phút.

---

#### Hạn chế

1. **Phụ thuộc API bên thứ ba:** `gold-api.com` và `open.er-api.com` là dịch vụ miễn phí có rate limit. Khi vượt limit hoặc downtime, Tier 1 thất bại, phải fallback sang Tier 2 hoặc báo lỗi.
2. **Scraping 24h.com.vn:** Giá vàng SJC trong nước được scrape từ website tin tức, dễ gãy khi HTML thay đổi cấu trúc.
3. **Search Grounding latency:** Tier 2 với Google Search Grounding thêm 2–4s vào tổng latency — không phù hợp cho realtime ticker.
4. **Không có giá cổ phiếu VN:** `EXTERNAL_FINANCIAL_PATTERN` nhận diện được từ khoá "chứng khoán/cổ phiếu" nhưng Tier 1 chưa tích hợp API thị trường chứng khoán Việt Nam (HoSE/HNX). Hiện tại rơi vào Tier 2 (Search Grounding) hoặc trả fallback message.
5. **Gemini Search Grounding không phải web scraping thực sự:** Kết quả search grounding phụ thuộc vào chỉ số Google — đôi khi ưu tiên nguồn SEO tốt hơn nguồn chính thức.

---

#### Phần Nhóm Tự Xây Dựng

| Thành phần | Nhóm tự xây | Google / External cung cấp |
|---|---|---|
| `EXTERNAL_FINANCIAL_PATTERN` regex routing | ✅ | — |
| `fetch_external_data()` — async parallel fetch 3 APIs | ✅ | — |
| `_build_external_financial_response()` — rule-based format | ✅ | — |
| `_extract_exchange_pair()` — currency code detection từ Vietnamese text | ✅ | — |
| `_resolve_exchange_rate()` — cross-rate calculation (base/source/target) | ✅ | — |
| VND/lượng conversion formula (XAU × USD/VND × 37.5 / 31.1034768) | ✅ | — |
| `_format_vi_datetime()` — format thời gian UTC→Asia/Ho_Chi_Minh | ✅ | — |
| Cache bypass logic cho external queries | ✅ | — |
| System prompt instruction: "PHẢI dùng Search Grounding" | ✅ | — |
| **LLM inference + Search Grounding execution** | — | ✅ Gemini API |
| **Google Search index** (dữ liệu web thực tế) | — | ✅ Google Search |
| **Gold price API** (giá quốc tế) | — | ✅ gold-api.com |
| **Exchange rate API** | — | ✅ open.er-api.com |

---

## Tổng kết So sánh 3 Luồng

| Tiêu chí | Luồng 1 (NLP Extract) | Luồng 2 (Agentic RAG) | Luồng 3 (Market Data) |
|---|---|---|---|
| **Chiến lược** | Pure LLM | Agentic Workflow | Hybrid API + Search Grounding |
| **Số lần gọi Gemini** | 1 | 2 (intent + generation) | 0–1 (Tier 1 hoặc 2) |
| **Sử dụng Database** | Không | Có (MongoDB Atlas) | Không |
| **Sử dụng Cache** | Không | Có (Redis 120s TTL) | Không (bypass) |
| **Tokens trung bình** | 300–700 | 1700–2800 | 0–1500 |
| **Latency P50** | 800ms–1.5s | 2.5–4.5s | 500ms–6.5s |
| **Fallback strategy** | HTTP 503 nếu Gemini lỗi | Rule-based fallback | Tier 1 → Tier 2 → message |
| **Rủi ro chính** | JSON parse error | Context window overflow | API rate limit / scraping break |
| **Guardrails** | Không | Có (PII + forbidden) | Có (PII + forbidden) |
| **Độ phức tạp cài đặt** | Thấp | Cao | Trung bình |

---

## Phụ lục: Cấu trúc File Source Code

```
be/ai-service/
├── app/
│   ├── main.py                          # FastAPI app, startup warm-up
│   ├── api/endpoints/ai.py              # Router: /extract-text, /advisor/chat, /chat, /ocr
│   └── services/
│       ├── gemini_service.py            # GeminiService: extract_transactions, generate_financial_answer
│       ├── nlp_service.py               # NLPService: PhoBERT embedding, intent classification
│       └── advisor/
│           ├── orchestrator.py          # AdvisorOrchestrator: toàn bộ agent loop
│           ├── retrieval.py             # RetrievalLayer: MongoDB + external APIs + vector search
│           ├── prompts.py               # build_advisor_system_prompt()
│           ├── schemas.py               # Pydantic models: AdvisorChatRequest, AdvisorResponse...
│           ├── guardrails.py            # PII sanitize + forbidden pattern blocking
│           ├── memory_cache.py          # SessionMemory + MemoryStore (Redis + MongoDB)
│           └── financial_math.py        # compute_savings_rate, compute_roi, ...
be/api-gateway/utils/
├── aiExtractBff.ts                      # BFF cho Luồng 1
├── aiAdvisorBff.ts                      # BFF cho Luồng 2 & 3
└── aiChatBff.ts                         # BFF cho /api/v1/ai/chat (legacy chatbot)
```

---

*Tài liệu được soạn thảo dựa trên phân tích trực tiếp source code tại commit hiện tại (05/2026). Mọi số liệu latency và token là ước tính dựa trên thực nghiệm với input trung bình trong môi trường Docker Compose local và Google Cloud region `us-central1`.*
