# BAOCAO.md — AI & Invoice Extraction Migration Report

## 1. Mục tiêu sau khi đổi kiến trúc

Luồng AI hiện tại đã được tách rõ thành **2 phần độc lập**:

1. **Trích xuất dữ liệu hóa đơn**: chuyển sang `service-transaction` (Node.js) với **Google Vision OCR + Gemini `gemini-2.5-flash`**.
2. **Chatbot tài chính**: giữ ở `ai-service` (Python/FastAPI) với **PhoBERT + Gemini tùy chọn**.

Các màn hình đã nối thẳng vào luồng mới:
- `fe/src/pages/Invoices.tsx`
- `fe/src/pages/SmartAIPage.tsx`
- `fe/src/components/layout/AIChatbotPopover.tsx`

> Báo cáo này **không còn dùng PaddleOCR trong luồng active**. Endpoint OCR cũ của Python chỉ được giữ lại để trả thông báo migration.

---

## 2. Kiến trúc tổng quan mới

```text
Frontend React (Vite)
   ├─ Invoices.tsx
   ├─ SmartAIPage.tsx
   └─ AIChatbotPopover.tsx
            │
            ▼
api-gateway (JWT verify + Redis rate limit)
   ├─ /api/v1/invoices/*  ---> service-transaction (Node.js)
   │                          └─ Google Vision OCR -> Gemini 2.5 Flash -> JSON chuẩn hóa
   │
   └─ /api/v1/ai/* --------> ai-service (FastAPI)
                              └─ PhoBERT intent classification + Gemini chat (optional)
```

---

## 3. Thành phần AI đang dùng

### 3.1 Invoice Extraction — Google Vision + Gemini
File chính: `be/service-transaction/src/services/invoice-extraction.service.ts`

Luồng xử lý:
1. ảnh hóa đơn được upload qua `POST /api/v1/invoices/extract`
2. Google Vision đọc toàn bộ text từ ảnh
3. Gemini `gemini-2.5-flash` nhận raw OCR text và ép về đúng 3 field:
   - `merchantName`
   - `totalAmount`
   - `transactionDate`
4. Backend chuẩn hóa lại amount/date trước khi trả về cho FE

### 3.2 Chatbot tài chính — PhoBERT + Gemini tùy chọn
File chính: `be/ai-service/app/services/nlp_service.py`

Vai trò:
- phân loại intent câu hỏi tiếng Việt
- dựng câu trả lời rule-based nhanh
- nếu bật `use_llm` hoặc cấu hình Gemini, có thể diễn đạt câu trả lời tự nhiên hơn

### 3.3 Endpoint OCR cũ của Python
- `POST /api/v1/ai/ocr` hiện trả `410 Gone`
- mục đích: báo cho client cũ chuyển sang `POST /api/v1/invoices/extract`

---

## 4. API đang dùng ở frontend

### 4.1 Trích xuất hóa đơn
```http
POST http://127.0.0.1:3000/api/v1/invoices/extract
Authorization: Bearer <JWT>
Content-Type: multipart/form-data
```

**Response chuẩn hóa:**
```json
{
  "success": true,
  "data": {
    "merchantName": "Bông Trà Milk Tea",
    "totalAmount": 58000,
    "transactionDate": "2026-04-03T13:45:00.000Z"
  }
}
```

### 4.2 Chatbot tài chính
```http
POST http://127.0.0.1:3000/api/v1/ai/chat
Authorization: Bearer <JWT>
Content-Type: application/json
```

**Payload mẫu:**
```json
{
  "question": "Tổng chi tiêu tháng này là bao nhiêu?",
  "context": {
    "summary": {
      "totalExpense": 3200000,
      "totalIncome": 12000000
    }
  },
  "use_llm": false
}
```

---

## 5. Luồng trải nghiệm mới trên frontend

### `Invoices.tsx`
- user chọn ảnh hóa đơn
- FE gọi `apiClient.ocrInvoice(file)` qua gateway
- UI hiển thị trạng thái: **“Google Vision + Gemini đang phân tích hóa đơn...”**
- kết quả được đổ vào form thân thiện để user chỉnh lại nếu cần
- nút chính: **`Xác nhận & Lưu giao dịch`**

### `SmartAIPage.tsx`
- không còn hiển thị raw JSON kỹ thuật
- thay bằng form pre-fill gồm:
  - tên cửa hàng
  - số tiền
  - ngày giao dịch
- user có thể rà soát rồi lưu luôn vào hệ thống

### `AIChatbotPopover.tsx`
- tiếp tục dùng `POST /api/v1/ai/chat`
- tận dụng JWT + rate limit chung từ gateway

---

## 6. Cấu hình bắt buộc

### 6.1 `service-transaction/.env`
Các biến cần có để invoice extraction hoạt động đầy đủ:

```env
GEMINI_API_KEY=your_google_ai_api_key_here
GEMINI_INVOICE_MODEL=gemini-2.5-flash
GOOGLE_APPLICATION_CREDENTIALS=
GCP_VISION_CREDENTIALS_JSON=
GOOGLE_CLOUD_PROJECT=
```

Có thể dùng **một trong hai** cách cấu hình Google Vision:
1. `GOOGLE_APPLICATION_CREDENTIALS` = đường dẫn tới service-account JSON
2. `GCP_VISION_CREDENTIALS_JSON` = copy nguyên JSON credentials vào env

Trong cấu hình hiện tại, file service account đã được đặt tại:
`be/ai-service/config/gen-lang-client-0231948223-845422dd2868.json`
và được mount read-only vào `service-transaction` dưới đường dẫn `/app/config/...` khi chạy `docker compose`.

### 6.2 `ai-service/.env`
Nếu muốn chatbot dùng Gemini để trả lời tự nhiên hơn:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
AI_AUTO_USE_GEMINI=false
```

---

## 7. Chi phí và tài nguyên vận hành

### 7.1 Invoice extraction
- **Google Vision**: tính phí theo số lần OCR / số trang ảnh
- **Gemini**: tính phí theo token input/output
- ưu điểm: độ chính xác cao hơn nhiều so với regex/OCR local trên hóa đơn thực tế

### 7.2 Chatbot
- PhoBERT vẫn chạy local trong `ai-service`
- chỉ tốn thêm phí nếu bật Gemini cho phần sinh câu trả lời

### 7.3 So với kiến trúc cũ
- không còn gánh nặng `PaddleOCR` / `paddlepaddle`
- Docker của `ai-service` nhẹ hơn
- tập trung cloud OCR cho invoice và giữ Python service cho NLP/chat

---

## 8. Kết quả verify thực tế sau migration

### 8.1 Docker deploy
Đã chạy:

```powershell
cd be
docker compose up -d --build service-transaction api-gateway ai-service
```

**Kết quả đã xác minh:**
- image build xong cho `be-service-transaction`, `be-api-gateway`, `be-ai-service`
- container `service-transaction`, `api-gateway`, `ai-service` đều ở trạng thái **Up**

### 8.2 Gateway auth
Đã đăng ký user mới qua gateway thành công và nhận được `accessToken` + `refreshToken`.

### 8.3 Invoice extraction endpoint
Đã gọi thực tế bằng ảnh mẫu `be/ai-service/test/hoadon_bt.png`:

```powershell
POST http://127.0.0.1:3000/api/v1/invoices/extract
Authorization: Bearer <JWT>
```

**Phản hồi thực tế đã xác minh:**
```json
{
  "success": true,
  "data": {
    "merchantName": "ĐÔNG TRÀ - CN PHẠM VIẾT CHÁNH",
    "totalAmount": 58800,
    "transactionDate": "2026-01-19T00:00:00.000Z"
  }
}
```

**Kết luận:**
- route FE -> gateway -> transaction-service hoạt động ổn định
- JWT auth hoạt động đúng
- Google Vision OCR đọc được hóa đơn thật
- Gemini + fallback heuristic đã chuẩn hóa dữ liệu thành công để pre-fill form trên FE

---

## 9. Cách chạy lại hệ thống

### Backend
```powershell
cd be
docker compose up -d --build service-transaction api-gateway ai-service
```

### Frontend
```powershell
cd fe
npm install
npm run dev -- --host 127.0.0.1
```

Mở:
- FE: `http://127.0.0.1:5173`
- Gateway: `http://127.0.0.1:3000`
- AI docs: `http://127.0.0.1:8000/docs`

---

## 10. Kết luận

Migration đã hoàn thành theo hướng mới:
- **bỏ luồng PaddleOCR khỏi active flow**
- **đưa invoice extraction sang Node.js + Google Vision + Gemini**
- **giữ Python `ai-service` cho chatbot/NLP**
- **nâng UI FE từ raw JSON sang form thân thiện, editable trước khi lưu giao dịch**

Bước cuối để chạy extraction thật trên hóa đơn thực tế là bổ sung credential Google Vision trong `service-transaction/.env`.
