# Hướng Dẫn Chạy Benchmark Tests

Các test này được tạo để **minh chứng và verify** các chỉ số trong file `benchmark_pipelines.xlsx`.

## 📋 Tóm Tắt

| Pipeline | Test File | Metrics Kiểm Tra | Thời Gian |
|----------|-----------|-----------------|----------|
| **OCR Hóa Đơn** | `ocr-accuracy.spec.ts` | Độ chính xác amount/date, latency | ~5-10 phút |
| **AI Chatbot** | `ai-chatbot-accuracy.spec.ts` | Intent classification, latency, cache | ~10-15 phút |
| **NLP Ghi Nhận GD** | `nlp-extraction.spec.ts` | Extraction accuracy, category, date | ~10-15 phút |

---

## 🚀 Quick Start

### 1️⃣ Chuẩn bị môi trường

```bash
# Di chuyển vào thư mục tests
cd tests

# Cài đặt dependencies
npm install

# Khởi động backend services
cd ../be
docker compose up -d
cd ../tests
```

### 2️⃣ Chạy tất cả benchmark tests

```bash
# Chạy headless (nền)
npm run test:benchmarks

# Hoặc chạy với UI (xem chi tiết)
npm run test:benchmarks:headed
```

### 3️⃣ Chạy test riêng lẻ

```bash
# Chỉ test OCR
npm run test:ocr

# Chỉ test AI Chatbot
npm run test:chatbot

# Chỉ test NLP
npm run test:nlp
```

---

## 📊 Xem Kết Quả

Sau khi test chạy xong, kết quả lưu tại:

```
reports/
├── ocr-benchmark-results.json           # Kết quả OCR
├── ai-chatbot-benchmark-results.json    # Kết quả AI Chatbot
└── nlp-extraction-benchmark-results.json # Kết quả NLP
```

**Xem kết quả chi tiết:**

```bash
# PowerShell
Get-Content reports/ocr-benchmark-results.json | ConvertFrom-Json | Format-Table

# Bash
cat reports/ai-chatbot-benchmark-results.json | jq '.[] | {testCase, latency, accuracy}'
```

---

## 🧪 Chi Tiết Mỗi Test

### OCR Hóa Đơn Test (`npm run test:ocr`)

**Kiểm tra:**
- ✅ 4 loại hóa đơn: Điện tử, VAT, Bán lẻ, Tay viết
- ✅ Độ chính xác trích xuất số tiền (amount)
- ✅ Độ chính xác trích xuất ngày (date)
- ✅ Latency: ~0.8-2 giây (sau warmup)
- ✅ Chi phí: $0 (offline PaddleOCR)

**Expected Output:**
```json
[
  {
    "testCase": "Hóa đơn điện tử (ShopeePay, MoMo)",
    "latency": 1250,
    "amountAccuracy": 90,
    "dateAccuracy": 85,
    "passed": true,
    "notes": "Latency: 1250ms (max: 2000ms)"
  },
  ...
]
```

**Benchmark Expectation:**
| Loại Hóa Đơn | Amount Accuracy | Date Accuracy | Max Latency |
|---|---|---|---|
| Điện tử | 90% | 85% | 2s |
| VAT | 75% | 70% | 2s |
| Bán lẻ | 85% | 80% | 2s |

---

### AI Chatbot Test (`npm run test:chatbot`)

**Kiểm tra:**
- ✅ Phân loại intent (query_spending, query_income, financial_advice)
- ✅ Độ chính xác: ~82% (Analytics Chat), ~88% (Advisor)
- ✅ Cache hit performance: <10ms
- ✅ Latency: 1.5-6s (cold), 200ms-10ms (hot)
- ✅ Guardrail blocking: 100% cho forbidden patterns
- ✅ Chi phí: $0.0003-$0.003 per request

**Test Cases:**
```
✓ "Tháng này tôi tiêu bao nhiêu?" → query_spending
✓ "Thu nhập tháng này bao nhiêu?" → query_income  
✓ "Làm sao để tiết kiệm 20%?" → financial_advice
✓ Cache hit test - repeated question latency
✓ Accuracy batch test - 50 questions validation
```

**Expected Output:**
```json
[
  {
    "testCase": "Intent Classification: \"Tháng này tôi tiêu bao nhiêu?\"",
    "route": "analytics_chat",
    "latency": 2450,
    "intent": "query_spending",
    "confidence": 82,
    "passed": true,
    "estimatedCost": "$0.000300"
  },
  ...
]
```

**Benchmark Expectations:**
| Metric | Analytics Chat | Advisor | Threshold |
|---|---|---|---|
| Intent Accuracy | 82% | 88% | ≥75% |
| Latency (cold) | ~1.5-4s | ~3-6s | ≤4-6s |
| Latency (hot) | ~200ms | <10ms | ≤200ms |
| Cost | $0.0003 | $0.002 | — |

---

### NLP Extraction Test (`npm run test:nlp`)

**Kiểm tra:**
- ✅ Trích xuất số tiền: ~95% accuracy
- ✅ Phân loại danh mục: ~85% accuracy (8 categories)
- ✅ Giải quyết ngày: ~90% accuracy (hôm nay/hôm qua/...)
- ✅ Fast-path vs LLM: 40% fast-path usage
- ✅ Latency: 5-20ms (fast), 0.8-1.5s (LLM)
- ✅ Chi phí: ~$0.000023 per request (average)

**Test Cases:**
```
✓ Extract: "Mua sách lập trình 320k" → 1 transaction, 320.000 VND, Mua sắm
✓ Extract: "Xăng 150k, ăn 80k" → 2 transactions, 230.000 VND total
✓ Amount Extraction Accuracy - 7 amounts validation
✓ Category Classification - 8 categories validation
✓ Date Resolution - Relative time accuracy
✓ Fast-path vs LLM path latency comparison
```

**Expected Output:**
```json
[
  {
    "testCase": "Extract: \"Mua sách lập trình 320k\"",
    "latency": 45,
    "transactionCount": 1,
    "amountAccuracy": 100,
    "categoryAccuracy": 100,
    "usedFastPath": true,
    "passed": true,
    "notes": "Latency: 45ms, FastPath: true"
  },
  ...
]
```

**Benchmark Expectations:**
| Metric | Target | Threshold | Unit |
|---|---|---|---|
| Amount Extraction | 95% | ≥90% | percentage |
| Category Classification | 85% | ≥80% | percentage |
| Date Resolution | 90% | ≥85% | percentage |
| Latency (fast-path) | 20ms | ≤100ms | milliseconds |
| Latency (LLM path) | 1.5s | ≤1500ms | milliseconds |
| Fast-path usage | 40% | — | percentage |

---

## ✅ Verification Checklist

Sau khi chạy tất cả tests, verify:

- [ ] **OCR Tests**: All 4 invoice types tested, accuracy metrics recorded
- [ ] **AI Chatbot Tests**: Intent classification accuracy ≥75%, latency ≤4-6s
- [ ] **NLP Tests**: Extraction accuracy ≥85%, category accuracy ≥80%
- [ ] **Report Files**: 3 JSON report files generated in `reports/`
- [ ] **Benchmark Compliance**: All test results pass (≥90% of benchmark targets)

---

## 🔍 Debugging

### Test Passed nhưng chỉ số thấp?

1. **Kiểm tra backend services:**
   ```bash
   docker ps | grep -E "api-gateway|ai-service"
   ```

2. **Kiểm tra logs:**
   ```bash
   docker logs api-gateway --tail 50
   docker logs ai-service --tail 50
   ```

3. **Verify API endpoint:**
   ```bash
   curl http://127.0.0.1:3000/health
   ```

### Test Timeout?

- Tăng timeout trong `playwright.config.ts`:
  ```typescript
  timeout: 60000, // 60 seconds
  ```

### Auth Token lỗi?

```bash
# Set environment variable
export TEST_AUTH_TOKEN=$(curl -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -d '{"email":"test@test.com","password":"12345678"}' | jq '.token')
```

---

## 📚 References

- **Benchmark Data**: `benchmark_pipelines.xlsx`
- **Documentation**: `Finance-docs/chuong/chuong5.md` (sections 5.1-5.3)
- **Implementation**: `be/ai-service/` and `be/api-gateway/`
- **Test Schema**: `tests/BENCHMARK_SCHEMA.json`
