# REFACTOR PLAN — Anti-AI-smell, Senior-engineered Production Platform

> Người lập kế hoạch: Principal Engineer (AI-assisted)  
> Ngày: 2026-05-11  
> Scope: `be/` (tất cả 7 microservices + ai-service)  
> **API contract / DB schema / ENV vars = FROZEN. Không đổi.**

---

## 0. TÓM TẮT AI-SMELLS ĐÃ PHÁT HIỆN

| Smell | Nơi xuất hiện | Mức độ |
|-------|--------------|--------|
| Horizontal slice (controllers/ services/ repos/ — tách theo layer, không theo feature) | Tất cả services | 🔴 High |
| Wrapper utils 1 dòng (`parsePositiveAmount`, `fetchUserWallets`, `requireOwnedWallet`) | service-transaction/src/utils/ | 🟡 Medium |
| Trùng type/interface cross-service (`TransactionCreatedPayload` khai báo 2 lần) | service-transaction/types, service-wallet/types | 🟡 Medium |
| Hardcoded system prompt dài trong file logic Python | ai-service/app/services/advisor/prompts.py | 🔴 High |
| Over-engineered `RetrievalLayer` class (dữ liệu luôn là Mongo của chính service) | ai-service/app/services/advisor/retrieval.py | 🟠 Medium |
| Thư mục `utils/` rỗng không dùng | analytics-service/src/utils/, notification-service/src/utils/, service-wallet/src/utils/ | 🟢 Low |
| `financial_math.py` — 4 hàm pure math 1 dòng, không cần file riêng | ai-service/app/services/advisor/financial_math.py | 🟡 Medium |
| BFF helper `normalizeMessage`, `getSessionId`, `buildCacheKey` tách thừa | api-gateway/utils/aiAdvisorBff.ts | 🟡 Medium |
| `REFACTOR_PLAN.md` kiểu robotize: `buildTransactionAnalyticsResponse`, `normalizeFinancialPayload` | analytics.service.ts (naming) | 🟡 Medium |
| Generic log không có context | Nhiều service | 🟢 Low |

---

## 1. FILE / THƯ MỤC SẼ BỊ XÓA (TRASH LIST)

### 1a. Thư mục `utils/` rỗng — xóa toàn bộ
```
be/analytics-service/src/utils/         ← trống
be/notification-service/src/utils/      ← trống  
be/service-wallet/src/utils/            ← trống
be/ai-service/config/                   ← trống
```

### 1b. File utils wrapper trivial — inline vào service gọi
```
be/service-transaction/src/utils/parsers.ts
  → parsePositiveAmount() inline vào transaction.service.ts (1 dòng, không cần file riêng)

be/service-transaction/src/utils/walletUtils.ts
  → fetchUserWallets() + requireOwnedWallet() inline vào transaction.service.ts
    (2 functions, chỉ dùng ở 1 chỗ)
```

### 1c. Duplicate event type files — gom về 1 file shared
```
be/service-transaction/src/types/events.ts  ← TransactionCreatedPayload (lần 1)
be/service-wallet/src/types/events.ts       ← TransactionCreatedPayload (lần 2)
```
> **Kế hoạch:** Giữ nguyên 2 file (vì chúng trong 2 Docker container khác nhau, không share node_modules). Nhưng BỎ JSDoc verbose và horizontal ruler comment. Hai file sẽ được làm nhỏ/sạch hơn.

### 1d. Python advisor: tách `financial_math.py` vào `orchestrator.py`
```
be/ai-service/app/services/advisor/financial_math.py  ← 4 pure functions
  → inline vào orchestrator.py, xóa file riêng
  → bỏ 4 import statement dài dòng
```

---

## 2. CẤU TRÚC THƯ MỤC MỚI (VERTICAL SLICES)

### Chiến lược: Chỉ áp dụng Vertical Slices cho service có nhiều features độc lập
> **service-transaction** là ứng viên duy nhất cần tái cấu trúc (5 controllers, 6 services).  
> Các service nhỏ (wallet, identity, notification) giữ nguyên — refactor cấu trúc thư mục trên service nhỏ = over-engineering.

#### TRƯỚC (Horizontal):
```
service-transaction/src/
  controllers/
    transaction.controller.ts
    invoice.controller.ts
    category.controller.ts
    recurring-rule.controller.ts
    saving.controller.ts
  services/
    transaction.service.ts
    invoice.service.ts
    invoice-extraction.service.ts
    category.service.ts
    recurring-rule.service.ts
    saving.service.ts
  repositories/
    transaction.repository.ts
  utils/
    parsers.ts          ← XÓA
    walletUtils.ts      ← XÓA
  types/
    events.ts
```

#### SAU (Vertical Slices):
```
service-transaction/src/
  features/
    transaction/
      transaction.controller.ts   (giữ nguyên)
      transaction.service.ts      (+ inline parsers.ts, walletUtils.ts)
      transaction.repository.ts   (move từ repositories/)
    invoice/
      invoice.controller.ts
      invoice.service.ts
      invoice-extraction.service.ts
    category/
      category.controller.ts
      category.service.ts
    recurring/
      recurring-rule.controller.ts
      recurring-rule.service.ts
    saving/
      saving.controller.ts
      saving.service.ts
  types/
    events.ts           (giữ nguyên — dùng cho SAGA messaging)
  errors/               (giữ nguyên)
  messaging/            (giữ nguyên — SAGA consumer)
  models/               (giữ nguyên — Mongoose models)
  routes/               (giữ nguyên — chỉ mount features, không đổi URL)
```

> **Routes không đổi** — routes/index.ts chỉ cần update import paths.

---

## 3. SYSTEM PROMPT — TÁCH RA FILE `.txt`

### Vấn đề:
`ai-service/app/services/advisor/prompts.py` đang hardcode ~400 ký tự prompt tiếng Việt trong source code Python.

### Kế hoạch:
```
be/ai-service/
  prompts/
    advisor_system.txt     ← nội dung prompt hiện tại (tiếng Việt, dễ edit)
    intent_router.txt      ← prompt LLM intent classification (từ orchestrator.py line ~80)
```

`prompts.py` sẽ được viết lại thành:
```python
from pathlib import Path

_PROMPT_DIR = Path(__file__).parent.parent.parent / "prompts"

def _load(name: str) -> str:
    return (_PROMPT_DIR / name).read_text(encoding="utf-8")

ADVISOR_SYSTEM = _load("advisor_system.txt")
INTENT_ROUTER  = _load("intent_router.txt")
```

`build_advisor_system_prompt()` inject context variables bằng `.format()` hoặc f-string thay vì concatenation chuỗi.

---

## 4. INLINE HELPER FUNCTIONS (Kill Unnecessary Abstraction)

### 4a. `parsers.ts` → inline vào `transaction.service.ts`
```typescript
// TRƯỚC — import từ utils/parsers.ts
import { parsePositiveAmount } from '../utils/parsers';

// SAU — inline trực tiếp
const amount = Number(input.amount)
if (!Number.isFinite(amount) || amount <= 0) throw new AppError('amount phải là số dương', 400)
```

### 4b. `walletUtils.ts` → inline vào `transaction.service.ts`
`fetchUserWallets` và `requireOwnedWallet` chỉ được gọi trong `transaction.service.ts`.  
Inline cả 2 methods thành private methods của `TransactionService` class.

### 4c. `financial_math.py` → inline vào `orchestrator.py`
4 functions thuần toán học, mỗi cái 2-3 dòng:
```python
# TRƯỚC
from app.services.advisor.financial_math import compute_roi, compute_savings_rate, ...

# SAU — 4 lambdas hoặc inline functions ngay trong orchestrator.py
def _savings_rate(income: float, expense: float) -> float:
    return round(max(income - expense, 0) / income * 100, 2) if income > 0 else 0.0
```

---

## 5. DE-ROBOTIZE NAMING (Đổi tên hàm — KHÔNG đổi tên API endpoint/biến/field)

> **Chỉ đổi tên internal functions, KHÔNG đổi exported API, route paths, DB fields.**

| File | Hàm cũ (AI-smell) | Hàm mới (pragmatic) |
|------|------------------|---------------------|
| `aiAdvisorBff.ts` | `normalizeMessage(body)` | `getMsg(body)` |
| `aiAdvisorBff.ts` | `getSessionId(body, userId)` | `getSession(body, userId)` |
| `aiAdvisorBff.ts` | `buildCacheKey(...)` | `cacheKey(...)` |
| `aiAdvisorBff.ts` | `parseAdvisorUsageMeta(data)` | `parseUsage(data)` |
| `aiAdvisorBff.ts` | `fetchRuntimeAiConfig(req)` | `getAiConfig(req)` |
| `aiAdvisorBff.ts` | `appendUsageLog(req, usage)` | `logUsage(req, usage)` |
| `orchestrator.py` | `_extract_intent_entities_with_llm()` | `_llm_intent()` |
| `orchestrator.py` | `build_advisor_system_prompt()` call | `_system_prompt()` |
| `analytics.service.ts` | `buildTransactionPipeline(filters)` | `txPipeline(filters)` |
| `analytics.service.ts` | `buildForecastData(...)` | `forecastData(...)` |

---

## 6. CACHE POLICY — Giữ gì, Bỏ gì

| Cache | Giữ hay Bỏ | Lý do |
|-------|-----------|-------|
| `aiAdvisorBff.ts` — `localCache` Map + Redis (advisor responses) | **GIỮ** | AI inference tốn tiền, cache 2 phút hợp lý |
| `aiChatBff.ts` — `financialContextCache` Map (financial context) | **GIỮ** | Analytics aggregation nặng, TTL 30s OK |
| `analytics.service.ts` — không có cache hiện tại | **KHÔNG THÊM** | Mongo aggregation đủ nhanh ở scale hiện tại |
| `memory_cache.py` — `MemoryStore` (advisor session + Redis) | **GIỮ** nhưng refactor tên | Session memory cần thiết cho conversational AI |

---

## 7. LOGGING — Structured Logging

Thay thế generic log patterns sau đây:

```typescript
// TRƯỚC
console.log(`[api-gateway] proxyReq ${req.method} ${req.url}`)
console.error('[api-gateway] proxy lỗi:', err.message)

// SAU  
console.log({ event: 'proxy_req', method: req.method, url: req.url })
console.error({ event: 'proxy_error', msg: err.message, url: req.url })
```

```python
# TRƯỚC
logger.info("Đang khởi tạo PaddleOCR (lang=vi), chỉ chạy lần đầu...")
logger.error("Khởi tạo PaddleOCR thất bại: %s", exc)

# SAU
logger.info({ "event": "ocr_init", "lang": "vi" })
logger.error({ "event": "ocr_init_failed", "err": str(exc) })
```

---

## 8. THỰC THI THEO PHASE (Tránh Big-Bang Refactor)

### Phase A — Zero-risk cleanup (không đổi logic)
1. Xóa 4 thư mục `utils/` rỗng
2. Xóa JSDoc verbose + horizontal rulers trong `events.ts` 2 service
3. Tách prompt ra `prompts/advisor_system.txt` + `prompts/intent_router.txt`
4. Inline `financial_math.py` → `orchestrator.py`, xóa file

### Phase B — Naming refactor (internal only, không đổi API)
5. Đổi tên internal functions trong `aiAdvisorBff.ts` (6 functions)
6. Đổi tên internal functions trong `analytics.service.ts` + `orchestrator.py`
7. Structured logging thay thế generic `console.log/error`

### Phase C — Vertical slice (riskiest — đổi import paths)
8. Move `service-transaction/src/` sang `features/` structure
9. Inline `parsers.ts` + `walletUtils.ts` → xóa 2 files
10. Update import paths trong `routes/index.ts`
11. Verify: `npm run build` trong service-transaction không lỗi

---

## 9. FILES KHÔNG THAY ĐỔI (FROZEN)

```
be/docker-compose.yml                    ← env, ports, network
be/*/Dockerfile                          ← build steps
be/ai-service/app/api/endpoints/ai.py   ← API contract  
be/*/src/routes/                         ← URL paths
be/*/src/models/                         ← DB schema
be/*/.env                                ← ENV vars
be/ai-service/app/services/advisor/schemas.py  ← Pydantic models (API contract)
```

---

## 10. RISK ASSESSMENT

| Phase | Breaking Risk | Mitigation |
|-------|-------------|-----------|
| A | 🟢 Rất thấp | Không đổi logic, chỉ xóa file trống + move string |
| B | 🟡 Thấp | Chỉ đổi tên internal functions, không export ra ngoài |
| C | 🔴 Trung bình | Phải update tất cả import paths, cần verify build |

---

Kế hoạch này đã ổn chưa sếp? Hãy gõ **"Duyệt"** (hoặc **"Duyệt Phase A"** / **"Duyệt Phase B"** / **"Duyệt Phase C"** nếu muốn chạy từng phase) để tôi bắt đầu đập code.
