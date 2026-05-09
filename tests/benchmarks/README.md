# Benchmark Tests - AI Pipelines Verification

Tập hợp các test cases để verify và minh chứng các chỉ số benchmark trong file `benchmark_pipelines.xlsx`.

## Cấu trúc

```
tests/benchmarks/
├── ocr-accuracy.spec.ts              # OCR Hóa Đơn - 4 loại hóa đơn
├── ai-chatbot-accuracy.spec.ts       # AI Chatbot - Intent classification & latency
├── nlp-extraction.spec.ts            # NLP Ghi Nhận GD - Extraction accuracy
└── README.md                         # Hướng dẫn này
```

## Benchmark Specs

### 1. OCR Hóa Đơn (`ocr-accuracy.spec.ts`)

**Test Coverage:**
- ✅ 4 loại hóa đơn: Điện tử, VAT, Bán lẻ
- ✅ Amount accuracy: 40-90% (theo loại)
- ✅ Date accuracy: 35-85% (theo loại)
- ✅ Latency: ~0.8-2s per request
- ✅ Cost: $0 (offline PaddleOCR)

**Test Cases:**
```
✓ Hóa đơn điện tử (ShopeePay, MoMo) - 90% amount accuracy
✓ Hóa đơn VAT in nhiệt - 75% amount accuracy
✓ Hóa đơn bán lẻ - 85% amount accuracy
```

**Expected Results:**
- Latency: 0.8-2s (cold), <100ms (warm)
- Amount extraction: ~90% for digital receipts
- Date extraction: ~85% for digital receipts

---

### 2. AI Chatbot (`ai-chatbot-accuracy.spec.ts`)

**Test Coverage:**
- ✅ Intent classification: ~82% (Analytics Chat), ~88% (Advisor)
- ✅ False positive rate: ~15% for `query_spending`
- ✅ Route classification: ~95% accuracy
- ✅ Guardrail blocking: 100% for forbidden patterns
- ✅ Cache hit latency: <10ms for Advisor
- ✅ Cost: $0.0003-$0.003 per request (Gemini)

**Test Cases:**
```
✓ Intent Classification: "Tháng này tôi tiêu bao nhiêu?"
  → Expected: query_spending (82% accuracy expected)

✓ Intent Classification: "Làm sao để tiết kiệm 20%?"
  → Expected: financial_advice (88% accuracy expected)

✓ Cache Hit Performance - Repeated questions
  → Latency improvement: ~90-99%

✓ Accuracy Batch Test - 50 questions
  → Expected accuracy: 82-88%
```

**Expected Results:**
- Intent accuracy: 82-88% on 50-question batch
- Response latency (cold): 1.5-6s depending on route
- Cache hit latency: <10ms for advisor route
- Gemini cost: ~$0.0003-$0.003 per request

---

### 3. NLP Ghi Nhận GD (`nlp-extraction.spec.ts`)

**Test Coverage:**
- ✅ Amount extraction accuracy: ~95%
- ✅ Category classification: ~85%
- ✅ Date resolution: ~90%
- ✅ Fast-path usage: ~40%
- ✅ Confirmation rate: ~75%
- ✅ Latency: 5-20ms (fast-path), 0.8-1.5s (LLM)

**Test Cases:**
```
✓ Extract: "Mua sách lập trình 320k"
  → Expected: 1 transaction, 320.000 VND, Mua sắm category

✓ Extract: "Xăng xe 150k, ăn trưa 80k"
  → Expected: 2 transactions, 230.000 VND total

✓ Amount Extraction Accuracy - 7 amounts
  → Expected accuracy: 95%

✓ Category Classification - 8 categories
  → Expected accuracy: 85%

✓ Date Resolution - Relative time (hôm nay/hôm qua)
  → Expected accuracy: 90%

✓ Fast Path vs LLM Path - Latency comparison
  → Fast-path usage: ~40%
```

**Expected Results:**
- Amount accuracy: ~95% across various formats (k, nghìn, triệu)
- Category accuracy: ~85% across 8 predefined categories
- Date resolution: ~90% for relative dates
- Fast-path latency: 5-20ms
- LLM-path latency: 0.8-1.5s

---

## Chạy Tests

### Prerequisites

```bash
cd tests
npm install

# Set environment variables
export E2E_API_BASE_URL=http://127.0.0.1:3000
export TEST_AUTH_TOKEN=<your-auth-token>  # Optional for authenticated endpoints
```

### Chạy Tất Cả Benchmark Tests

```bash
# Chạy headless
npm run test:benchmarks

# Chạy với UI (dễ debug)
npm run test:benchmarks:headed

# Chạy test riêng lẻ
npx playwright test benchmarks/ocr-accuracy.spec.ts
npx playwright test benchmarks/ai-chatbot-accuracy.spec.ts
npx playwright test benchmarks/nlp-extraction.spec.ts
```

### Xem Kết Quả

Kết quả benchmark được lưu vào `reports/`:

```
reports/
├── ocr-benchmark-results.json
├── ai-chatbot-benchmark-results.json
└── nlp-extraction-benchmark-results.json
```

**Ví dụ kết quả:**

```json
[
  {
    "testCase": "Hóa đơn điện tử (ShopeePay, MoMo) - Amount & Date Extraction",
    "latency": 1250,
    "amountAccuracy": 92,
    "dateAccuracy": 88,
    "passed": true,
    "notes": "Latency: 1250ms (max: 2000ms)"
  }
]
```

---

## Mapping to benchmark_pipelines.xlsx

| Sheet | Test File | Metrics |
|-------|-----------|---------|
| **OCR Hóa Đơn** | `ocr-accuracy.spec.ts` | Accuracy (%), Latency (ms), Cost ($) |
| **AI Chatbot** | `ai-chatbot-accuracy.spec.ts` | Intent accuracy (%), Route accuracy (%), Latency (ms), Cost ($) |
| **NLP Ghi Nhận GD** | `nlp-extraction.spec.ts` | Extraction accuracy (%), Category accuracy (%), Latency (ms), Cost ($) |

---

## Benchmark Thresholds

| Pipeline | Metric | Target | Margin | Test Threshold |
|----------|--------|--------|--------|-----------------|
| OCR | Amount Accuracy | 90% | -10% | ≥81% |
| OCR | Date Accuracy | 85% | -10% | ≥76.5% |
| OCR | Latency | 2s | — | ≤2000ms |
| AI Chat | Intent Accuracy | 82% | -10% | ≥73.8% |
| AI Chat | Latency (cold) | 4s | — | ≤4000ms |
| AI Chat | Latency (cache) | 200ms | — | ≤200ms |
| NLP | Amount Accuracy | 95% | -10% | ≥85.5% |
| NLP | Category Accuracy | 85% | -10% | ≥76.5% |
| NLP | Latency (fast) | 20ms | — | ≤100ms |
| NLP | Latency (LLM) | 1.5s | — | ≤1500ms |

---

## Notes

1. **Test Data**: Some tests require actual test images for OCR. Place them in `test-data/` directory:
   - `receipt-digital.jpg` - Digital receipt (ShopeePay/MoMo)
   - `receipt-vat.jpg` - VAT invoice
   - `receipt-retail.jpg` - Retail receipt

2. **Auth Token**: For authenticated endpoints, set `TEST_AUTH_TOKEN` environment variable.

3. **API Gateway**: Ensure API Gateway and AI Service are running:
   ```bash
   cd be
   docker compose up -d
   ```

4. **Performance**: Some tests measure latency; ensure consistent network conditions for reliable results.

5. **Cache Tests**: Cache hit tests assume Redis is configured and running.

---

## References

- **Benchmark Data**: `benchmark_pipelines.xlsx`
- **Documentation**: `Finance-docs/chuong/chuong5.md` (sections 5.1-5.3)
- **Implementation**: `be/ai-service/app/` and `be/api-gateway/`
