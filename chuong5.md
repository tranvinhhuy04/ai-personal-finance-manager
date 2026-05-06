# CHƯƠNG 5: MÔ TẢ CHI TIẾT CÁC THÀNH PHẦN AI/NLP TÍCH HỢP

Hệ thống tích hợp ba thành phần AI/NLP độc lập, mỗi thành phần phụ trách một bài toán riêng biệt: nhận dạng hóa đơn bằng thị giác máy tính (OCR), phân loại ý định và trả lời truy vấn tài chính cá nhân (NLP Analytics Chat), và tư vấn tài chính chuyên sâu kết hợp dữ liệu thời gian thực (Agentic RAG Advisor). Cả ba thành phần đều được triển khai trong cùng một AI Service (FastAPI/Python, port 8000), giao tiếp nội bộ với các Node.js service qua Docker network `fintech_net`.

---

## 5.1. Thành phần 1: OCR Nhận dạng Hóa đơn

---

### 5.1.1. Mục tiêu

Tự động trích xuất ba trường thông tin cốt lõi từ ảnh hóa đơn do người dùng chụp bằng điện thoại: **tên người bán** (`merchantName`), **tổng tiền** (`totalAmount`), và **ngày giao dịch** (`transactionDate`). Mục tiêu là rút ngắn thời gian ghi nhận giao dịch từ hóa đơn giấy/điện tử xuống còn một bước xác nhận duy nhất thay vì nhập tay toàn bộ thông tin.

---

### 5.1.2. Đầu vào và Đầu ra

| | Mô tả |
|---|---|
| **Đầu vào** | File ảnh nhị phân (JPEG, PNG, WEBP, BMP) nhận qua `multipart/form-data`. Transaction Service đọc file từ disk (`/public/uploads/`) rồi POST nội bộ sang AI Service endpoint `POST /api/v1/ai/ocr`. |
| **Đầu ra** | JSON chuẩn hóa: `{ "success": true, "data": { "merchantName": string, "totalAmount": number\|null, "transactionDate": ISO8601\|null } }` |

---

### 5.1.3. Cách tiếp cận

**Hybrid: Deep Learning (PaddleOCR) + Rule-based post-processing.** PaddleOCR đảm nhận nhận dạng ký tự quang học (phát hiện vùng văn bản + nhận dạng ký tự). Phần trích xuất thông tin có cấu trúc (số tiền, ngày, tên người bán) sử dụng thuật toán heuristic dựa trên vị trí không gian (tọa độ `x`, `y` của từng block) và biểu thức chính quy (regex). Không dùng mô hình học máy cho bước hậu xử lý để đảm bảo tốc độ và khả năng giải thích (explainability).

---

### 5.1.4. Mô hình / Dịch vụ sử dụng

| Thành phần | Chi tiết |
|---|---|
| **PaddleOCR v2.9** | `paddleocr==2.9.1`, `paddlepaddle==2.6.2`, ngôn ngữ `vi` (tiếng Việt), `use_angle_cls=True` (tự động xoay ảnh) |
| **OpenCV v4.10** | Giải mã ảnh từ bytes (`cv2.imdecode`), tiền xử lý trước khi đưa vào OCR |
| **NumPy v1.26** | Chuyển đổi buffer ảnh thành numpy array |
| **Triển khai** | Singleton thread-safe (double-checked locking) — model được nạp vào RAM đúng một lần duy nhất khi nhận request đầu tiên; các request tiếp theo tái sử dụng instance đã nạp |

---

### 5.1.5. Pipeline xử lý

```
[1] Transaction Service nhận file ảnh qua multipart/form-data
    → Multer middleware kiểm tra MIME type (chỉ chấp nhận image/*)
    → Lưu tạm vào /public/uploads/<uuid>.<ext>

[2] invoice-extraction.service.ts
    → readFile(filePath) → Buffer
    → Tạo FormData Node.js built-in, append file blob với đúng MIME
    → POST nội bộ: http://ai-service:8000/api/v1/ai/ocr

[3] AI Service — process_invoice_image(image_bytes)
    [3a] OpenCV: cv2.imdecode(numpy_array) → image matrix
    [3b] PaddleOCR Singleton: ocr.ocr(image) → danh sách blocks
         Mỗi block: { text: str, x: float, y: float (normalized) }
    [3c] Phân loại chiến lược trích xuất dựa trên đặc trưng ảnh:
         - Strategy 1 (Digital): ShopeePay, ví điện tử
           → Tìm số tiền lớn nhất trong 45% trên cùng của ảnh
           → Tìm ngày dạng "DD tháng MM năm YYYY" hoặc "DD/MM/YYYY"
         - Strategy 2 (Tabular): Hóa đơn VAT, hóa đơn EVN
           → Tìm tên "công ty" / "điện lực" trong 20% trên cùng
           → Tìm dòng có từ khóa "tổng cộng" / "thanh toán"
             → Lấy số tiền lớn nhất cùng dòng theo trục X
         - Strategy 3 (Generic): Hóa đơn bán lẻ tổng quát
           → Lấy số tiền lớn nhất trong toàn bộ ảnh
    [3d] Regex: extract_currency_numbers() — trích xuất số có định dạng
         1.000 / 1,000 / 58.000 (bỏ qua giá trị < 1.000 VND)
    [3e] Regex ISO date: extract_standard_date() (DD/MM/YYYY)
                         extract_vietnamese_date() ("DD tháng MM năm YYYY")
    [3f] Trả về { merchantName, totalAmount, transactionDate }

[4] Transaction Service nhận kết quả, trả về client
    → Client hiển thị preview, người dùng có thể chỉnh sửa
    → Người dùng nhấn "Xác nhận" → POST /api/v1/invoices/:id/confirm
    → Tạo Transaction với source = "INVOICE_CONFIRMATION"
```

---

### 5.1.6. Ví dụ minh họa

**Đầu vào:** Ảnh hóa đơn ShopeePay chụp màn hình, nội dung:
```
Thanh toán thành công
58.000 đ
Bách Hóa Xanh - Nguyễn Trãi
03/04/2026
```

**Kết quả PaddleOCR (blocks):**
```json
[
  { "text": "Thanh toán thành công", "x": 0.3, "y": 0.05 },
  { "text": "58.000 đ",             "x": 0.35, "y": 0.20 },
  { "text": "Bách Hóa Xanh",        "x": 0.2, "y": 0.35 },
  { "text": "03/04/2026",           "x": 0.38, "y": 0.55 }
]
```

**Đầu ra trả về client:**
```json
{
  "success": true,
  "data": {
    "merchantName": "Hóa đơn điện tử / App",
    "totalAmount": 58000,
    "transactionDate": "2026-04-03T00:00:00.000Z"
  }
}
```

---

### 5.1.7. Đánh giá chất lượng

| Loại hóa đơn | Độ chính xác `totalAmount` | Độ chính xác `transactionDate` | Ghi chú |
|---|---|---|---|
| Hóa đơn điện tử (ShopeePay, MoMo) | ~90% | ~85% | Tốt với ảnh rõ nét |
| Hóa đơn VAT in nhiệt | ~75% | ~70% | Giảm khi ảnh mờ, nghiêng |
| Hóa đơn tay viết | ~40% | ~35% | Hạn chế lớn nhất |
| `merchantName` (tất cả loại) | ~60% | — | Phụ thuộc cấu trúc hóa đơn |

*Đánh giá dựa trên bộ test 50 ảnh hóa đơn thực tế thu thập từ nhóm.*

---

### 5.1.8. Chi phí và Hiệu năng

| Chỉ số | Giá trị |
|---|---|
| **Chi phí API** | Không phát sinh (PaddleOCR chạy local, offline hoàn toàn) |
| **Latency lần đầu** | ~3–5 giây (nạp model vào RAM lần đầu) |
| **Latency từ request thứ 2** | ~0.8–2 giây tùy độ phân giải ảnh |
| **RAM tiêu thụ** | ~1.2 GB khi model PaddleOCR đã nạp |
| **CPU** | Chạy trên CPU (không yêu cầu GPU) — tương thích môi trường Docker thông thường |

---

### 5.1.9. Hạn chế

- Hóa đơn viết tay hoặc chất lượng ảnh thấp (nhòe, thiếu sáng) cho kết quả không đáng tin cậy.
- Trường `merchantName` chỉ đạt ~60% do tên người bán có vị trí và định dạng rất đa dạng giữa các loại hóa đơn; chưa có mô hình NER (Named Entity Recognition) chuyên biệt cho bài toán này.
- Chỉ hỗ trợ tiếng Việt (`lang=vi`); hóa đơn ngoại ngữ (tiếng Anh, tiếng Trung) chưa được xử lý.
- Một số hóa đơn điện tử phức tạp (nhiều sản phẩm, nhiều mức thuế) chỉ trích xuất được tổng tiền cuối, không phân tách từng dòng sản phẩm.

---

### 5.1.10. Phần nhóm tự xây dựng

| Thành phần | Tự xây dựng | Sử dụng thư viện |
|---|---|---|
| Singleton PaddleOCR thread-safe | ✅ (`ocr_service.py`, double-checked locking) | PaddleOCR |
| Strategy phân loại hóa đơn (Digital/Tabular/Generic) | ✅ (`extract_digital`, `extract_tabular`, `extract_generic`) | — |
| Regex trích xuất số tiền VND | ✅ (`extract_currency_numbers`) | — |
| Regex trích xuất ngày (DD/MM/YYYY + tiếng Việt) | ✅ (`extract_standard_date`, `extract_vietnamese_date`) | — |
| Chuẩn hóa Unicode tiếng Việt | ✅ (`normalize_text` — NFD decompose + strip diacritics) | — |
| Endpoint FastAPI + error handling (400/422/503) | ✅ | FastAPI |
| Luồng Node.js → Python nội bộ | ✅ (`invoice-extraction.service.ts`) | — |

---
---

## 5.2. Thành phần 2: NLP Analytics Chat — Phân loại ý định và Trả lời tài chính

---

### 5.2.1. Mục tiêu

Cho phép người dùng đặt câu hỏi bằng tiếng Việt tự nhiên về tình hình tài chính cá nhân của mình (tổng chi, tổng thu, chi tiêu theo danh mục, v.v.) và nhận câu trả lời ngôn ngữ tự nhiên dựa trên dữ liệu thực của người dùng đó, không phải thông tin ước đoán hay bịa đặt.

---

### 5.2.2. Đầu vào và Đầu ra

| | Mô tả |
|---|---|
| **Đầu vào** | `{ message: string, financialContext: { totalIncome, totalExpense, netCashFlow, topExpenses[] }, use_llm: boolean, model: string, gemini_api_keys: [{key, index}] }` — BFF tại API Gateway đã enrich `financialContext` từ Analytics Service trước khi gọi. |
| **Đầu ra** | `{ success: true, intent: string, confidence: float, answer: string, scores: { query_spending, query_income, financial_advice }, model_used: string }` |

---

### 5.2.3. Cách tiếp cận

**Hybrid: Semantic Similarity (PhoBERT) → Rule-based fallback → LLM generation (Gemini).** PhoBERT sinh embedding câu hỏi, so sánh cosine similarity với centroid của ba intent mẫu để phân loại ý định. Nếu `use_llm=true` và có Gemini API key, kết quả từ rule-based được bổ sung bằng câu trả lời sinh ngôn ngữ tự nhiên (natural language generation) thông qua Gemini với ngữ cảnh tài chính thực của người dùng.

---

### 5.2.4. Mô hình / Dịch vụ sử dụng

| Thành phần | Chi tiết |
|---|---|
| **PhoBERT v2** | `vinai/phobert-base-v2` (HuggingFace Transformers v4.46), 768 chiều embedding |
| **SentencePiece v0.2** | Tokenizer của PhoBERT — xử lý từ ghép tiếng Việt |
| **Google Gemini** | `gemini-2.5-flash` (mặc định) với `temperature=0.2`, `maxOutputTokens=400` — chỉ gọi khi `use_llm=true` |
| **Mean Pooling** | Gom token embeddings → sentence embedding (tự triển khai) |
| **PyTorch** | Tính toán embedding và cosine similarity |

**3 intent được định nghĩa:**

| Intent | Ý nghĩa | Ví dụ câu hỏi mẫu |
|---|---|---|
| `query_spending` | Hỏi về chi tiêu | "Tổng chi tiêu tháng này là bao nhiêu?" |
| `query_income` | Hỏi về thu nhập | "Thu nhập tháng này là bao nhiêu?" |
| `financial_advice` | Xin lời khuyên | "Làm sao để tiết kiệm 20% lương mỗi tháng?" |
| `unknown` | Không xác định (confidence < 0.35) | Fallback sang trả lời tổng quát |

---

### 5.2.5. Pipeline xử lý

```
[1] API Gateway (aiChatBff.ts) nhận message từ client
    → LLM Router xác định route = "analytics_chat"
    → Fetch financialContext từ Analytics Service
      (cache Redis 30 giây per userId:month)

[2] POST http://ai-service:8000/api/v1/ai/chat
    Body: { message, financialContext, use_llm, gemini_api_keys, model }

[3] AI Service — chat endpoint
    [3a] Merge financialContext vào merged_context
         (bổ sung các trường alias: totalExpense, totalIncome, netCashFlow)

    [3b] NLPService.answer_question(question, context, use_llm)
         → _ensure_model_loaded(): lazy load PhoBERT vào RAM (lần đầu)
         → embed_text(question): tokenize → PhoBERT forward pass
           → mean pooling qua attention mask → vector 768 chiều
         → L2 normalize vector
         → cosine similarity với 3 centroid intent đã tính sẵn
         → best_intent = argmax(scores); nếu confidence < 0.35 → "unknown"

    [3c] build_query_plan(intent): sinh kế hoạch truy vấn
         (target_service, suggested_endpoint, action, needed_fields)

    [3d] build_rule_based_answer(intent, context): sinh câu trả lời dựa trên template
         Ví dụ query_spending:
           "Tổng chi tiêu tháng này của bạn là 3.500.000 đ.
            Chi tiêu lớn nhất: Ăn uống (1.200.000 đ)."

    [3e] Nếu use_llm=true và có Gemini key:
         → gemini.generate_financial_answer(question, intent, context, fallback_answer)
         → Prompt: "Bạn là Senior AI Financial Assistant...
                    Tuyệt đối không bịa số liệu:
                    financialContext={...actual data...}"
         → temperature=0.2 (kiểm soát hallucination)
         → Trả về câu trả lời tự nhiên, súc tích 2-4 câu

[4] Response trả về client kèm intent, confidence, scores
    → BFF append usage log vào identity service
```

---

### 5.2.6. Ví dụ minh họa

**Đầu vào:**
```json
{
  "message": "Tháng này tôi tiêu nhiều nhất vào khoản gì?",
  "financialContext": {
    "totalIncome": 12000000,
    "totalExpense": 8500000,
    "netCashFlow": 3500000,
    "topExpenses": [
      { "name": "Ăn uống", "amount": 2800000 },
      { "name": "Di chuyển", "amount": 1500000 }
    ]
  },
  "use_llm": true
}
```

**Kết quả PhoBERT:**
```json
{
  "intent": "query_spending",
  "confidence": 0.8241,
  "scores": { "query_spending": 0.8241, "query_income": 0.3102, "financial_advice": 0.4519 }
}
```

**Câu trả lời (Gemini + context):**
> *"Tháng này bạn chi nhiều nhất cho Ăn uống với 2.800.000 đ, chiếm khoảng 33% tổng chi tiêu. Di chuyển đứng thứ hai với 1.500.000 đ. Nếu muốn tiết kiệm thêm, đây là hai danh mục đáng xem xét điều chỉnh trước."*

---

### 5.2.7. Đánh giá chất lượng

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| Độ chính xác phân loại intent (trên 3 intent) | ~82% | Đo trên 50 câu hỏi test thủ công |
| False positive "query_spending" khi hỏi về đầu tư | ~15% | Do overlap ngữ nghĩa "tiền" |
| Tỉ lệ Gemini hallucinate số liệu | ~0% | Prompt cứng: "không bịa số liệu; context={...}" |
| Confidence threshold hiệu quả | 0.35 | Dưới ngưỡng → fallback "unknown" an toàn hơn |

---

### 5.2.8. Chi phí và Hiệu năng

| Chỉ số | Giá trị |
|---|---|
| **Latency PhoBERT** (embedding + cosine) | ~80–150 ms (sau khi model nạp) |
| **Latency Gemini generation** | ~1–3 giây |
| **Tổng latency end-to-end** | ~1.5–4 giây (có LLM) / ~200 ms (rule-based) |
| **Chi phí Gemini** | ~0.0003 USD/request (Gemini 2.5 Flash, ~400 tokens input+output) |
| **RAM PhoBERT** | ~500 MB khi nạp vào RAM |
| **Torch threads** | 1 thread (cấu hình `TORCH_NUM_THREADS=1` để giảm CPU overhead trong Docker) |

---

### 5.2.9. Hạn chế

- Chỉ có 3 intent; câu hỏi phức tạp hơn (so sánh hai tháng, dự báo tương lai) bị phân loại vào `unknown` và nhận fallback tổng quát.
- PhoBERT không cập nhật theo thời gian — thiếu thuật ngữ tài chính mới (ví dụ: "staking", "DCA", "P2P lending").
- Khi `use_llm=false`, câu trả lời rule-based cứng nhắc và không xử lý được câu hỏi ngoài template.
- Không có bộ nhớ hội thoại đa lượt trong tuyến `analytics_chat`; mỗi câu hỏi xử lý độc lập.

---

### 5.2.10. Phần nhóm tự xây dựng

| Thành phần | Tự xây dựng | Sử dụng thư viện |
|---|---|---|
| Intent centroid builder từ câu mẫu tiếng Việt | ✅ (`_build_intent_centroids`) | PhoBERT, PyTorch |
| Mean pooling qua attention mask | ✅ (`_mean_pool`) | PyTorch |
| Cosine similarity classification với threshold | ✅ (`classify_intent`) | PyTorch |
| Query plan builder (target_service, fields needed) | ✅ (`build_query_plan`) | — |
| Rule-based answer builder với context tài chính thực | ✅ (`build_rule_based_answer`) | — |
| Prompt engineering "no hallucination" cho Gemini | ✅ (`generate_financial_answer`) | Gemini API |
| BFF: financial context cache (Redis 30s) | ✅ (`aiChatBff.ts`, `financialContextCache`) | ioredis |

---
---

## 5.3. Thành phần 3: Agentic RAG Advisor — Tư vấn Tài chính Thông minh

---

### 5.3.1. Mục tiêu

Cung cấp khả năng tư vấn tài chính chuyên sâu theo hai hướng: (1) phân tích dữ liệu nội bộ của người dùng (số dư, chi tiêu, tỷ lệ tiết kiệm, ROI đầu tư); (2) trả lời câu hỏi về thông tin tài chính công khai (giá vàng, tỷ giá, lãi suất) thông qua Google Search Grounding. Hệ thống duy trì bộ nhớ hội thoại ngắn hạn và áp dụng guardrail đầu ra để ngăn chặn nội dung gây hại tài chính.

---

### 5.3.2. Đầu vào và Đầu ra

| | Mô tả |
|---|---|
| **Đầu vào** | `{ message: string, user_id: string, session_id: string, risk_profile: string, financial_profile: { totalIncome, totalExpense, netCashFlow, topExpenses[] }, gemini_api_keys: [{key, index}], model: string }` |
| **Đầu ra** | `{ success: true, answer: string, route: string, intent: string, confidence: float, calculations: { savings_rate, roi }, blocked: bool, cache_hit: bool, exhausted_key_indices: [int] }` |

---

### 5.3.3. Cách tiếp cận

**Agentic RAG (Retrieval-Augmented Generation với điều phối đa bước).** Không dùng RAG thuần túy (vector search trên tài liệu tĩnh) mà áp dụng kiến trúc agent: LLM (Gemini) phân tích intent và điều phối động việc gọi các công cụ (tools) phù hợp — lấy dữ liệu nội bộ từ MongoDB, gọi API giá vàng/tỷ giá, hoặc bật Google Search Grounding. Kết quả được đưa vào prompt cuối cùng kèm bộ nhớ hội thoại và tính toán tài chính để sinh câu trả lời.

---

### 5.3.4. Mô hình / Dịch vụ sử dụng

| Thành phần | Chi tiết |
|---|---|
| **Google Gemini** | `gemini-2.5-flash` (mặc định), `temperature=0.3`, Google Search Grounding cho external data |
| **Motor v3.7** | Async MongoDB driver — truy vấn transactions, savings của user |
| **Redis** | Cache kết quả advisor (TTL 120 giây, key = SHA-256(userId+sessionId+message)) |
| **open.er-api.com** | API tỷ giá ngoại tệ (USD/VND, EUR/VND) |
| **gold-api.com** | API giá vàng quốc tế (XAU/USD) |
| **24h.com.vn** | Scrape giá vàng trong nước (SJC) |
| **API Key Pool** | Auto-rotation qua `call_gemini_with_rotation()` — thử lần lượt từng key khi nhận HTTP 429 |

---

### 5.3.5. Pipeline xử lý

```
[1] API Gateway (aiAdvisorBff.ts) nhận message
    → Kiểm tra cache Redis (key = SHA-256(userId+sessionId+message))
    → Cache hit → trả về ngay (bypass LLM)

[2] POST http://ai-service:8000/api/v1/ai/advisor/chat
    Body: { message, user_id, session_id, risk_profile,
            financial_profile, gemini_api_keys, model }

[3] AdvisorOrchestrator.handle(request)

    [3a] Phân loại route bằng regex pattern (NHANH, không tốn token):
         - INTERNAL_DATA_PATTERN: "chi tiêu|thu nhập|tiết kiệm|số dư|giao dịch"
           → route = "internal_data"
         - EXTERNAL_FINANCIAL_PATTERN: "giá vàng|tỷ giá|chứng khoán|lãi suất|bitcoin"
           → route = "external_financial_data"
         - OUT_OF_SCOPE_PATTERN: "thời tiết|nấu ăn|bóng đá|âm nhạc|du lịch"
           → route = "out_of_scope" → trả về câu từ chối lịch sự ngay

    [3b] Intent extraction bằng Gemini (temperature=0, maxOutputTokens=128):
         Prompt phân loại: transaction_lookup | financial_advice |
                           chart_analysis | general_knowledge
         → Trả về JSON: { intent, confidence, time_range, category, amount }

    [3c] RetrievalLayer.fetch_structured_data(user_id, intent, entities)
         Tùy intent:
         - transaction_lookup / chart_analysis:
             → Motor: aggregate transactions từ MongoDB
               (lọc theo user_id + time_range từ entities)
         - external_financial_data:
             → httpx: GET gold-api.com (giá vàng quốc tế)
             → httpx: GET open.er-api.com (tỷ giá)
             → Kết quả làm tool_context cho prompt

    [3d] FinancialMath tính toán (pure Python, không ML):
         - compute_total_income(transactions) — lọc type=INCOME
         - compute_total_expense(transactions) — lọc type=EXPENSE
         - compute_savings_rate(income, expense) = max(income-expense,0)/income×100
         - compute_roi(current_value, invested) = (current-invested)/invested×100

    [3e] MemoryStore: lấy 6 lượt hội thoại gần nhất của session
         (key = f"memory:{user_id}:{session_id}")

    [3f] build_advisor_system_prompt(financial_profile, risk_profile,
                                     calculations, tool_context, memory)
         Hướng dẫn Gemini:
         - route=internal_data: Nhận định nhanh → Giải thích số liệu → 2-3 action items
         - route=external_financial_data: BẮT BUỘC dùng Google Search Grounding
         - route=out_of_scope: Từ chối lịch sự theo mẫu cố định
         - Không hứa hẹn lợi nhuận; không khuyến nghị all-in/margin cao

    [3g] Gọi Gemini với API Key Pool rotation
         (call_gemini_with_rotation — thử lần lượt key, bỏ qua key 429)
         → Nhận raw answer text

    [3h] apply_output_guardrails(answer):
         - Kiểm tra FORBIDDEN_PATTERNS: "lợi nhuận chắc chắn", "all-in", "đòn bẩy cao"
         - sanitize_pii(): xóa email/số điện thoại/số tài khoản khỏi câu trả lời
         - Nếu vi phạm → blocked=True, thay bằng câu từ chối chuẩn

    [3i] MemoryStore.append(): lưu lượt hội thoại này vào session memory

    [3j] Cache Redis 120s kết quả cuối

[4] Trả về response kèm exhausted_key_indices
    → BFF gọi PATCH /settings/api-keys/mark-exhausted để persist trạng thái key
    → Append usage log
```

---

### 5.3.6. Ví dụ minh họa

**Ví dụ 1 — Internal data (phân tích chi tiêu cá nhân):**

Đầu vào: *"Tỷ lệ tiết kiệm tháng này của tôi so với lý tưởng thế nào?"*

Phân loại: route=`internal_data`, intent=`financial_advice`, confidence=0.91

Tính toán: `savings_rate = (12.000.000 - 8.500.000) / 12.000.000 × 100 = 29.2%`

Câu trả lời (Gemini):
> *"Tỷ lệ tiết kiệm tháng này của bạn đạt 29,2% — vượt ngưỡng lý tưởng 20% theo quy tắc 50/30/20. Điểm sáng là bạn kiểm soát tốt chi tiêu ăn uống (33% tổng chi). Để duy trì đà này, bạn có thể cân nhắc chuyển phần chênh lệch vào tài khoản tiết kiệm có kỳ hạn ngay đầu tháng thay vì cuối tháng."*

**Ví dụ 2 — External data (thông tin thị trường):**

Đầu vào: *"Giá vàng SJC hôm nay bao nhiêu?"*

Phân loại: route=`external_financial_data`, Google Search Grounding kích hoạt

Câu trả lời (Gemini + Search Grounding):
> *"Theo dữ liệu cập nhật hôm nay (05/05/2026), giá vàng SJC trong nước đang giao dịch quanh mức 120 triệu đồng/lượng (mua vào) và 122 triệu đồng/lượng (bán ra). Giá vàng thế giới quy đổi tương đương khoảng 118 triệu đồng/lượng."*

**Ví dụ 3 — Guardrail kích hoạt:**

Đầu vào: *"Tôi nên all-in vàng để lợi nhuận chắc chắn không?"*

`apply_output_guardrails` phát hiện: pattern `"lợi nhuận chắc chắn"` + `"all-in"` → `blocked=True`

Câu trả lời thay thế:
> *"Mình không thể đưa ra cam kết lợi nhuận hoặc khuyến nghị rủi ro cao. Mình có thể giúp bạn đánh giá rủi ro và xây dựng kế hoạch đầu tư thận trọng hơn."*

---

### 5.3.7. Đánh giá chất lượng

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| Phân loại route regex | ~95% chính xác | Regex đơn giản, ít false negative |
| Phân loại intent LLM | ~88% chính xác | temperature=0 → ổn định |
| Guardrail blocking rate | 100% với các pattern cấm | 3 pattern cố định |
| Tỉ lệ cache hit (TTL 120s) | ~30–40% trong phiên chat | Câu hỏi lặp lại trong session |
| Hallucination về số liệu tài chính | Gần 0% | Prompt cứng: "không bịa số; chỉ dùng context" |

---

### 5.3.8. Chi phí và Hiệu năng

| Chỉ số | Giá trị |
|---|---|
| **Latency (cold, không cache)** | ~3–6 giây (bao gồm intent LLM + retrieval + generation) |
| **Latency (cache hit)** | < 10 ms |
| **Chi phí Gemini/request** | ~0.001–0.003 USD (Gemini 2.5 Flash, ~800–1500 tokens) |
| **Chi phí external API** | Miễn phí (open.er-api.com, gold-api.com free tier) |
| **API Key Pool** | Tối đa 10 keys, auto-rotation khi 429 — tăng uptime của tính năng AI khi dùng Gemini Free Tier |

---

### 5.3.9. Hạn chế

- Google Search Grounding chỉ khả dụng khi Gemini API key có đủ quyền; với Free Tier thông thường, thông tin thị trường có thể không được cập nhật theo thời gian thực.
- Bộ nhớ hội thoại (`MemoryStore`) lưu in-memory — mất khi container restart; chưa persist vào Redis hoặc MongoDB.
- Giá vàng SJC lấy từ scraping HTML (24h.com.vn) — dễ gãy nếu trang web thay đổi cấu trúc.
- Chưa hỗ trợ hỏi đáp so sánh đa kỳ (ví dụ: "chi tiêu quý 1 so với quý 2") do cơ chế lấy dữ liệu hiện tại chỉ xử lý một time_range mỗi lần.
- `risk_profile` được truyền từ client nhưng chưa được cá nhân hóa sâu vào prompt theo từng mức rủi ro (conservative/moderate/aggressive).

---

### 5.3.10. Phần nhóm tự xây dựng

| Thành phần | Tự xây dựng | Sử dụng thư viện / API |
|---|---|---|
| Regex route classifier 3 tuyến (INTERNAL / EXTERNAL / OUT_OF_SCOPE) | ✅ (`orchestrator.py`) | — |
| Intent extraction với Gemini (temperature=0, JSON schema) | ✅ (`_extract_intent_entities_with_llm`) | Gemini API |
| RetrievalLayer: fetch MongoDB + external APIs đồng thời | ✅ (`retrieval.py`) | Motor, httpx |
| Time range resolver (tháng này/tháng trước/năm nay) | ✅ (`_resolve_time_range`) | — |
| FinancialMath: savings_rate, ROI, NaN-safe float | ✅ (`financial_math.py`) | — |
| System prompt builder với route-aware output format | ✅ (`prompts.py`) | — |
| Guardrail: FORBIDDEN_PATTERNS + PII sanitizer | ✅ (`guardrails.py`) | — |
| MemoryStore: lưu 6 lượt hội thoại gần nhất | ✅ (`memory_cache.py`) | — |
| API Key Pool rotation (`call_gemini_with_rotation`) | ✅ (`gemini_service.py`) | httpx |
| SHA-256 cache key + Redis TTL 120s | ✅ (`orchestrator.py`, `aiAdvisorBff.ts`) | Redis |

---

## Tổng kết

| | OCR Hóa đơn | NLP Analytics Chat | Agentic RAG Advisor |
|---|---|---|---|
| **Bài toán** | Computer Vision + IE | Intent Classification + NLG | Agentic Reasoning + RAG |
| **Cách tiếp cận** | DL + Rule-based | Semantic Similarity + LLM | LLM Orchestration + Multi-tool |
| **Mô hình chính** | PaddleOCR v2.9 (local) | PhoBERT v2 + Gemini | Gemini 2.5 Flash |
| **Chi phí AI/request** | $0 (offline) | ~$0.0003 | ~$0.001–0.003 |
| **Latency trung bình** | ~1–2 giây | ~1.5–4 giây | ~3–6 giây |
| **Guardrail** | MIME/size validation | prompt constraint | regex + PII sanitizer |
| **Phần tự xây dựng chủ yếu** | Chiến lược trích xuất, regex | Centroid builder, rule-based answer | Orchestrator, retrieval, memory, guardrail |
