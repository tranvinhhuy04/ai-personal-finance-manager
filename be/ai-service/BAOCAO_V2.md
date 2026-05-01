# BAOCAO_V2.md — Refactor: PaddleOCR thay thế Google Vision + Gemini

> **Ngày thực hiện:** 2026-05-01  
> **Phiên bản:** v2.1 (cập nhật sau Step 4 + Step 5)  
> **Trạng thái:** ✅ Backend build xong · ✅ Frontend URL đã chuyển sang `/api/v1/ai/ocr` · ✅ Node.js OCR service đã được đánh dấu deprecated

---

## 1. Lý do refactor

| Vấn đề cũ | Giải pháp mới |
|---|---|
| `POST /api/v1/ai/ocr` trả **410 Gone** — endpoint Python bị vô hiệu hoá | Kích hoạt lại endpoint, xử lý OCR ngay trong `ai-service` |
| Phụ thuộc Google Vision API + Gemini (tính phí theo lượt, cần credential cloud) | PaddleOCR chạy **hoàn toàn offline / local**, không phí vận hành |
| Invoice extraction nằm ở `service-transaction` (Node.js) — tách biệt khỏi Python service | Đưa OCR về đúng `ai-service` (Python/FastAPI) — đơn giản hoá kiến trúc |
| FE nhận JSON từ hai đường khác nhau (gateway → transaction / gateway → ai) | **Contract JSON giữ nguyên 100%** — FE không đổi gì |

---

## 2. Kiến trúc luồng mới (sau refactor)

```text
Frontend React (Vite)
   └─ Invoices.tsx  /  SmartAIPage.tsx
          │
          ▼ POST /api/v1/ai/ocr   (multipart/form-data, field: "file")
   api-gateway  (JWT verify + Redis rate-limit)
          │
          ▼
   ai-service  (FastAPI / Python)
          │
          ├─ app/api/endpoints/ai.py          ← nhận UploadFile
          │        └─ process_invoice_image() ← gọi pipeline
          │
          └─ app/services/ocr_service.py
                   ├─ _get_paddle_ocr()        ← Singleton, lazy-init
                   ├─ _run_ocr()               ← PaddleOCR (lang=vi, angle_cls=True)
                   ├─ _extract_merchant_name() ← heuristic top-10 lines
                   ├─ _extract_total_amount()  ← regex keyword + VND parse
                   └─ _extract_date()          ← regex DD/MM/YYYY, ISO, "ngày…tháng…năm"
```

---

## 3. Chi tiết thay đổi từng file

### 3.1 `requirements.txt` — Thêm dependencies

```diff
  redis==5.0.8
+ # PaddleOCR local invoice extraction
+ paddlepaddle==2.6.2
+ paddleocr==2.9.1
+ opencv-python-headless==4.10.0.84
+ numpy==1.26.4
```

**Lý do chọn các version này:**
- `paddlepaddle==2.6.2` — bản CPU ổn định mới nhất, tương thích Python 3.10
- `paddleocr==2.9.1` — hỗ trợ `lang='vi'`, có model nhận dạng tiếng Việt
- `opencv-python-headless` — không kéo theo GUI libraries (phù hợp Docker server)
- `numpy==1.26.4` — ghim version tránh conflict với paddlepaddle

---

### 3.2 `Dockerfile` — Thêm system dependencies

```diff
  RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      gcc \
      g++ \
+     libgomp1 \
+     libglib2.0-0 \
      && rm -rf /var/lib/apt/lists/* \
      && mkdir -p /opt/hf-cache
```

- `libgomp1` — OpenMP runtime, **bắt buộc** để PaddlePaddle chạy parallel inference
- `libglib2.0-0` — GLib runtime cho OpenCV headless trong môi trường Debian slim

---

### 3.3 `app/services/ocr_service.py` — Viết lại hoàn toàn

**Trước (placeholder cũ):**
```python
class OCRService:
    """Legacy placeholder..."""
    def process_document(self, *args, **kwargs):
        raise RuntimeError("Legacy OCR flow has been retired...")
```

**Sau (toàn bộ pipeline):**

#### A. PaddleOCR Singleton (thread-safe)

```python
_ocr_instance = None
_ocr_lock = threading.Lock()

def _get_paddle_ocr():
    """Double-checked locking — chỉ khởi tạo model đúng 1 lần."""
    global _ocr_instance
    if _ocr_instance is None:
        with _ocr_lock:
            if _ocr_instance is None:
                from paddleocr import PaddleOCR
                _ocr_instance = PaddleOCR(
                    use_angle_cls=True,   # xử lý hóa đơn xoay nghiêng
                    lang="vi",            # model tiếng Việt
                    show_log=False,
                )
    return _ocr_instance
```

> **Tại sao Singleton?**  
> PaddleOCR load ~200–400 MB model weights. Nếu khởi tạo mỗi request → OOM crash.  
> `workers=1` trong Uvicorn + Singleton đảm bảo chỉ 1 bản model trong RAM.

#### B. `_run_ocr(image_bytes)` — chạy OCR, trả list[str]

```python
def _run_ocr(image_bytes: bytes) -> list[str]:
    ocr  = _get_paddle_ocr()
    img  = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    result = ocr.ocr(img, cls=True)
    # Sort theo tọa độ Y (top → bottom) → đọc theo thứ tự thật trên hóa đơn
    page_sorted = sorted(page, key=lambda r: r[0][0][1])
    return [region[1][0].strip() for region in page_sorted if region[1][0].strip()]
```

#### C. Heuristic extraction — 3 trường

**`_extract_merchant_name(lines)`**
- Quét **10 dòng đầu** (merchant name luôn ở đầu hóa đơn)
- Loại các dòng chứa từ khoá `hóa đơn, tổng, thanh toán, mã, ngày, …`
- Loại dòng có `alpha_ratio < 0.4` (dòng chủ yếu là số/ký hiệu)
- Chọn **dòng dài nhất** trong số candidates (≤ 60 ký tự)

**`_extract_total_amount(lines)`**

Priority | Keyword khớp | Ví dụ
---|---|---
0 (cao nhất) | `tổng cộng`, `grand total`, `thanh toán` | `Tổng cộng: 58.000đ`
1 | `tổng tiền`, `thành tiền`, `total`, `amount due` | `Thành tiền 120,000`
Fallback | Số lớn nhất ≥ 1000 trên toàn bộ dòng | khi không tìm thấy keyword

Parser VND: `58.000` → `58000`, `1,250,000` → `1250000`

**`_extract_date(lines)`**

Pattern | Ví dụ trên hóa đơn | Kết quả ISO 8601
---|---|---
`DD/MM/YYYY` hoặc `DD-MM-YYYY` | `19/01/2026` | `2026-01-19T00:00:00.000Z`
`YYYY-MM-DD` | `2026-01-19` | `2026-01-19T00:00:00.000Z`
`ngày D tháng M năm YYYY` | `ngày 3 tháng 4 năm 2026` | `2026-04-03T00:00:00.000Z`
Không tìm thấy | — | ngày UTC hiện tại (fallback)

#### D. Public API

```python
def process_invoice_image(image_bytes: bytes) -> dict[str, Any]:
    lines = _run_ocr(image_bytes)
    return {
        "merchantName":    _extract_merchant_name(lines) or "Không rõ",
        "totalAmount":     _extract_total_amount(lines) or 0,
        "transactionDate": _extract_date(lines) or now_utc_iso(),
    }
```

---

### 3.4 `app/api/endpoints/ai.py` — Kích hoạt lại endpoint `/ocr`

**Trước (410 Gone stub):**
```python
@router.post("/ocr")
async def ocr_invoice() -> dict[str, Any]:
    raise HTTPException(
        status_code=410,
        detail="Invoice OCR has moved to POST /api/v1/invoices/extract...",
    )
```

**Sau (PaddleOCR endpoint đầy đủ):**
```python
@router.post("/ocr")
async def ocr_invoice(file: UploadFile = File(...)) -> dict[str, Any]:
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    extracted = process_invoice_image(image_bytes)
    return {"success": True, "data": extracted}
```

**Error handling:**

| Exception | HTTP Status | Khi nào xảy ra |
|---|---|---|
| `HTTPException` | passthrough | validation lỗi |
| `ValueError` | 422 | ảnh corrupt / format không hỗ trợ |
| `RuntimeError` | 503 | PaddleOCR không khởi tạo được |
| `Exception` | 500 | lỗi không mong đợi khác |

---

## 4. Contract JSON — Không thay đổi với Frontend

```http
POST /api/v1/ai/ocr
Authorization: Bearer <JWT>
Content-Type: multipart/form-data
  └─ field: file  (image/jpeg | image/png | image/webp | image/bmp)
```

**Response thành công:**
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

**Response lỗi:**
```json
{
  "detail": "OCR processing failed: ..."
}
```

> Frontend (`Invoices.tsx`, `SmartAIPage.tsx`) **không cần thay đổi bất kỳ dòng nào** — cùng field names, cùng kiểu dữ liệu, cùng cấu trúc JSON.

---

## 5. Toàn bộ endpoints hiện có trong `ai-service`

| Method | Path | Chức năng | File xử lý |
|---|---|---|---|
| `POST` | `/api/v1/ai/ocr` | **OCR hóa đơn** bằng PaddleOCR ← **mới** | `ocr_service.py` |
| `POST` | `/api/v1/ai/chat` | Chatbot tài chính (PhoBERT + Gemini tuỳ chọn) | `nlp_service.py` |
| `POST` | `/api/v1/ai/advisor/chat` | Agentic RAG Financial Advisor | `advisor/orchestrator.py` |
| `GET` | `/health` | Health check | `main.py` |
| `GET` | `/` | Root info | `main.py` |

---

## 6. Lưu ý vận hành

### 6.1 Lần đầu gọi `/ocr` — model download

PaddleOCR **tự tải model weights** khi gọi lần đầu (không phải lúc container boot):

```
~/.paddleocr/whl/
  ├─ det/  (text detection model, ~4 MB)
  ├─ rec/  (text recognition model vi, ~10 MB)
  └─ cls/  (angle classification model, ~1 MB)
```

- **Lần đầu:** ~15–30 giây (tải + khởi tạo)
- **Các lần sau:** < 1 giây (Singleton đã sẵn sàng trong RAM)

Nếu muốn **pre-bake model vào Docker image** (tránh delay lần đầu), thêm layer vào `Dockerfile`:
```dockerfile
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='vi', show_log=False)"
```

### 6.2 RAM usage

| Component | RAM ước tính |
|---|---|
| PaddleOCR models (vi) | ~300–500 MB |
| PhoBERT (NLP service) | ~500–700 MB |
| FastAPI + overhead | ~100 MB |
| **Tổng dự kiến** | **~900 MB – 1.3 GB** |

> Giữ `workers=1` trong Uvicorn (đã config sẵn trong `CMD`) để tránh mỗi worker load bản model riêng.

### 6.3 Rebuild container

```powershell
cd be
docker compose up -d --build ai-service
```

---

## 7. So sánh kiến trúc cũ vs mới

| Tiêu chí | Cũ (BAOCAO.md) | Mới (BAOCAO_V2.md) |
|---|---|---|
| OCR engine | Google Vision API (cloud) | PaddleOCR (local) |
| Parsing AI | Gemini 2.5 Flash | Regex/Heuristic (Python) |
| Chi phí / lượt OCR | ~$0.0015 / ảnh | **$0** |
| Cần credential | ✅ GCP service account | ❌ Không cần |
| Endpoint Python `/ocr` | 410 Gone | ✅ **Active** |
| Độ trễ lần đầu | ~2–3s (network latency GCP) | ~15–30s (model load 1 lần) |
| Độ trễ sau lần đầu | ~2–3s | **< 1s** |
| Độ chính xác | Rất cao (Vision + LLM) | Tốt với hóa đơn format chuẩn |
| Hoạt động offline | ❌ | ✅ |
| Docker image size | Nhẹ hơn | Nặng hơn (~+500 MB) |

---

## 8. Cách chạy lại toàn bộ hệ thống

```powershell
# Backend
cd be
docker compose up -d --build

# Frontend
cd fe
npm run dev -- --host 127.0.0.1
```

**Endpoints truy cập:**
- FE: `http://127.0.0.1:5173`
- Gateway: `http://127.0.0.1:3000`
- AI Service Swagger: `http://127.0.0.1:8000/docs`

---

## 9. Kết luận (v2.0 — Backend)

Refactor backend thành công với **4 file thay đổi**, ai-service build và khởi động sạch:

```
be/ai-service/
  ├─ requirements.txt               ← +4 packages PaddleOCR
  ├─ Dockerfile                     ← +2 system libs (libgomp1, libglib2.0-0)
  └─ app/
       ├─ services/ocr_service.py   ← viết lại hoàn toàn (Singleton + heuristic)
       └─ api/endpoints/ai.py       ← kích hoạt /ocr, thêm UploadFile handler
```

---

## 10. Cập nhật Step 4 + Step 5 (v2.1 — Frontend & Cleanup)

> **Thực hiện:** 2026-05-01T10:24 (ICT)

### 10.1 Step 4 — Cập nhật URL gọi API phía Frontend

#### `fe/src/lib/apiClient.ts` — hàm `ocrInvoice()`

```diff
- const response = await axiosClient.post('/api/v1/invoices/extract', formData, {
+ // Dùng aiAxiosClient (timeout 120s) vì lần đầu PaddleOCR load model mất ~15–30s.
+ const response = await aiAxiosClient.post('/api/v1/ai/ocr', formData, {
```

**Lý do đổi sang `aiAxiosClient`:** `axiosClient` có timeout **10s** — quá ngắn cho lần đầu PaddleOCR khởi tạo model (~15–30s). `aiAxiosClient` có timeout **120s**, cùng base URL với gateway nên JWT vẫn được gắn tự động.

---

#### `fe/src/pages/Invoices.tsx` — 3 vị trí cập nhật

| Vị trí | Trước | Sau |
|---|---|---|
| Upload phase text | `'Google Vision + Gemini đang phân tích hóa đơn...'` | `'PaddleOCR đang phân tích hóa đơn...'` |
| `extractedBy` field | `'google-vision-gemini'` | `'paddle-ocr'` |
| Badge label trong modal xác nhận | `Vision + Gemini` | `PaddleOCR` |
| Mô tả panel kết quả | `"...theo luồng Google Vision + Gemini..."` | `"...theo PaddleOCR (local)..."` |

---

#### `fe/src/pages/SmartAIPage.tsx` — 4 vị trí cập nhật

| Vị trí | Trước | Sau |
|---|---|---|
| Subtitle trang | `Google Vision + Gemini cho hóa đơn...` | `PaddleOCR (local) cho hóa đơn...` |
| Mô tả card OCR | `Google Vision đọc chữ, Gemini bóc tách...` | `PaddleOCR (chạy local, offline) đọc chữ và bóc tách...` |
| Badge kết quả | `Google Vision + Gemini` | `PaddleOCR` |
| `extractedBy` field | `'google-vision-gemini'` | `'paddle-ocr'` |

---

### 10.2 Step 5 — Đánh dấu deprecated Node.js OCR Service

#### `be/service-transaction/src/services/invoice-extraction.service.ts`

Thêm JSDoc `@deprecated` ở đầu file:

```typescript
/**
 * @deprecated KHÔNG CÒN ĐƯỢC GỌI TRONG LUỒNG ACTIVE (kể từ 2026-05-01)
 *
 * Module này implement luồng OCR cũ: Google Cloud Vision → Gemini 2.5 Flash.
 *
 * Luồng mới (hiện tại):
 *   Frontend → POST /api/v1/ai/ocr → Python ai-service → PaddleOCR (local, offline)
 *
 * File có thể giữ lại để tham khảo hoặc rollback khẩn cấp.
 * Để xoá hoàn toàn cần:
 *   1. Xoá file này
 *   2. Xoá route POST /api/v1/invoices/extract trong invoice.controller.ts
 *   3. Xoá @google-cloud/vision và @google/generative-ai khỏi package.json của service-transaction
 */
```

> File **không bị xoá** để có thể rollback nhanh nếu PaddleOCR gặp sự cố. Route `POST /api/v1/invoices/extract` ở Node.js vẫn còn tồn tại nhưng không được frontend gọi nữa.

---

### 10.3 Tổng hợp toàn bộ file đã thay đổi (v2.0 + v2.1)

```
be/
  ├─ ai-service/
  │    ├─ requirements.txt                              ← +4 packages PaddleOCR
  │    ├─ Dockerfile                                    ← +2 system libs
  │    └─ app/
  │         ├─ services/ocr_service.py                  ← viết lại hoàn toàn
  │         └─ api/endpoints/ai.py                      ← kích hoạt /ocr endpoint
  │
  └─ service-transaction/src/services/
       └─ invoice-extraction.service.ts                 ← @deprecated comment

fe/src/
  ├─ lib/apiClient.ts                                   ← đổi URL + client
  ├─ pages/Invoices.tsx                                 ← cập nhật 4 label/text
  └─ pages/SmartAIPage.tsx                              ← cập nhật 4 label/text
```

**Tổng cộng: 7 file thay đổi.** Frontend không thay đổi logic, chỉ cập nhật URL và text hiển thị. Contract JSON giữ nguyên 100%.

Hệ thống OCR giờ **hoàn toàn độc lập**, chạy local trong Docker, không phụ thuộc bất kỳ dịch vụ cloud nào.
