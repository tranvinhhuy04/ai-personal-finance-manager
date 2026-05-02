# AI Financial Chatbot Test Cases (Agentic RAG)
## Evaluation Report for Financial Q&A Accuracy

**Test Environment:**
- Test Account: `hihihi@gmail.com`
- Password: `12345678`
- Test Execution Date: May 2026 (Timestamp: 2026-05-01T00:00:00Z)
- Chatbot Type: Agentic RAG (Retrieval-Augmented Generation with Agent reasoning)
- Expected Accuracy Level: > 95% for numerical facts, > 80% for recommendations

---

## 📊 Live Financial Data Baseline (Must Use Real DB)

### Important Rule
- TC-01 to TC-06 must validate against live DB values of user `hihihi@gmail.com`, not fixed mock numbers.
- Run the DB snapshot query before each test run and use that result as the source of truth.

### Account Profile
- **User Email:** hihihi@gmail.com
- **Account Type:** Premium Personal
- **Currency:** VND (Vietnamese Dong)

### Mandatory DB Snapshot Query
Run from `be/seeds` with Node + mongodb package:

```powershell
node -e "/* query identity + wallet + transaction DB, then aggregate month expense, category breakdown, wallet balance, savings and investment totals for user hihihi@gmail.com */"
```

Minimum fields required in output JSON:
- `userId`
- `walletBalance`
- `savingsBalance`
- `investmentValue`
- `thisMonthExpense`
- `prevMonthExpense`
- `thisMonthByCategory[]`
- `prevMonthByCategory[]`

### Latest Verified Snapshot (queried on 2026-05-02T03:34:00Z)
| Metric | Amount (VND) |
|--------|---------------|
| **userId** | `69f0880dec2d16af414e2f09` |
| **Wallet Balance** | 40,591,265 |
| **Savings Balance (type=SAVING)** | 260,000,000 |
| **Investment Value (type=INVESTMENT)** | 78,000,000 |
| **May Expense MTD** | 6,284,800 |
| **April Expense Full Month** | 29,953,147 |

April top categories from DB:
- Mua sắm: 7,715,447 (5 tx)
- Đầu tư: 7,524,121 (1 tx)
- Hóa đơn: 5,563,981 (4 tx)
- Nhà ở: 4,500,000 (1 tx)
- Ăn uống: 3,751,636 (36 tx)

May MTD top categories from DB:
- Nhà ở: 4,500,000 (1 tx)
- Hóa đơn: 1,428,000 (1 tx)
- Giải trí: 298,000 (2 tx)
- Ăn uống: 58,800 (1 tx)

### Reference External Data (Market Prices as of 2026-05-01 09:00 AM)
| Asset | Price | Change (24h) |
|-------|-------|--------------|
| **Gold (SJC)** | 89,500,000 VND/tael | +1.2% |
| **FPT Stock** | 72,500 VND | +2.1% |
| **VCB Stock** | 102,000 VND | +0.8% |

---

## 🧪 Test Cases (10 Total)

---

### **TC-01: Monthly Personal Spending Summary**
- **Test Case ID:** TC-01
- **Category:** Personal Finance
- **User Question (Input):** "Tổng chi tiêu tháng này của tôi là bao nhiêu?"
  - *(Translation: "What is my total spending this month?")*
- **Data Snapshot:** As of 2026-05-01, accumulated expenses from 2026-05-01 to present
- **Calculation Steps:**
  - Lấy `thisMonthByCategory[]` từ DB snapshot mới nhất
  - Tính `thisMonthExpense = SUM(category.amount)`
  - Xác định category lớn nhất theo amount
- **Expected Output:**
  > Trả đúng tổng chi tiêu tháng hiện tại theo DB snapshot (không hardcode), nêu đúng danh mục chi lớn nhất và có nhận xét ngắn gọn phù hợp.

---

### **TC-02: Spending Comparison (Month-over-Month)**
- **Test Case ID:** TC-02
- **Category:** Personal Finance
- **User Question (Input):** "Chi tiêu tháng 5 so với tháng 4 như thế nào?"
  - *(Translation: "How is my May spending compared to April?")*
- **Data Snapshot:** 
  - April Total: lấy từ `prevMonthExpense` trong DB snapshot
  - May MTD: lấy từ `thisMonthExpense` trong DB snapshot
- **Calculation Steps:**
  - Difference = `prevMonthExpense - thisMonthExpense`
  - Percentage Change = `Difference / prevMonthExpense * 100`
  - Projection chỉ được nêu khi có logic rõ ràng theo số ngày đã trôi qua trong tháng
- **Expected Output:**
  > Trả đúng số so sánh tháng hiện tại với tháng trước theo DB snapshot, nêu rõ tăng/giảm bao nhiêu tiền và bao nhiêu phần trăm.

---

### **TC-03: Wallet Balance Check**
- **Test Case ID:** TC-03
- **Category:** Personal Finance
- **User Question (Input):** "Số dư ví của tôi hiện tại là bao nhiêu?"
  - *(Translation: "What is my current wallet balance?")*
- **Data Snapshot:** As of 2026-05-01T00:00:00Z
- **Calculation Steps:**
  - Direct lookup `walletBalance` từ wallet DB theo đúng `userId`
- **Expected Output:**
  > Trả đúng số dư ví theo DB snapshot, đơn vị tiền tệ đúng, không dùng số cứng từ tài liệu cũ.

---

### **TC-04: Savings Rate Calculation**
- **Test Case ID:** TC-04
- **Category:** Personal Finance
- **User Question (Input):** "Tỷ lệ tiết kiệm của tôi hiện tại bao nhiêu? Tôi đang tiết kiệm tốt không?"
  - *(Translation: "What is my current savings rate? Am I saving well?")*
- **Data Snapshot:** 
  - `savingsBalance` từ DB snapshot
  - `walletBalance` từ DB snapshot
  - `investmentValue` từ DB snapshot
  - `prevMonthExpense` từ DB snapshot
- **Calculation Steps:**
  - Emergency-months = `savingsBalance / prevMonthExpense`
  - Asset-based savings rate = `savingsBalance / (walletBalance + savingsBalance + investmentValue) * 100`
- **Expected Output:**
  > Trả đúng tỷ lệ tiết kiệm và số tháng quỹ khẩn cấp theo DB snapshot tại thời điểm test, có làm tròn hợp lý và giải thích ngắn gọn.

---

### **TC-05: Category-wise Expense Breakdown**
- **Test Case ID:** TC-05
- **Category:** Personal Finance
- **User Question (Input):** "Chi tiêu của tôi theo từng danh mục trong tháng 4 là như thế nào? Danh mục nào tốn tiền nhiều nhất?"
  - *(Translation: "What is my expense breakdown by category in April? Which category costs the most?")*
- **Data Snapshot:** April 2026 full month data
- **Calculation Steps:**
  - Lấy `prevMonthByCategory[]` từ DB snapshot
  - Tính tỷ trọng mỗi danh mục theo `category.amount / prevMonthExpense * 100`
  - Sắp xếp giảm dần theo số tiền
- **Expected Output:**
  > Trả đúng breakdown danh mục tháng trước theo DB snapshot và xác định đúng danh mục tốn nhiều nhất.

---

### **TC-06: Investment ROI Tracking**
- **Test Case ID:** TC-06
- **Category:** Personal Finance
- **User Question (Input):** "Danh mục đầu tư của tôi có lãi bao nhiêu? ROI của tôi bao nhiêu phần trăm?"
  - *(Translation: "How much profit is my investment portfolio making? What is my ROI percentage?")*
- **Data Snapshot:** Investment Portfolio as of 2026-05-01
- **Calculation Steps:**
  - `current = investmentValue` từ DB snapshot
  - `invested` lấy từ nguồn DB đáng tin cậy (ưu tiên collection `investments`, fallback `savings.target_amount` với type `INVESTMENT`)
  - ROI = `(current - invested) / invested * 100`
- **Expected Output:**
  > Trả đúng lãi/lỗ và ROI theo dữ liệu đầu tư thực tế trong DB tại thời điểm test; nếu thiếu giá vốn thì phải nói rõ thiếu dữ liệu thay vì bịa số.

---

### **TC-07: Gold Price Inquiry (SJC)**
- **Test Case ID:** TC-07
- **Category:** External Finance / Market Data
- **User Question (Input):** "Giá vàng SJC hôm nay là bao nhiêu? Nên mua hay bán?"
  - *(Translation: "What is the SJC gold price today? Should I buy or sell?")*
- **Data Snapshot:** Market data as of 2026-05-01 09:00 AM
- **Calculation Steps:**
  - Current SJC Gold Price: 89,500,000 VND/tael
  - 24-hour Change: +1.2%
  - Previous Day Price: 89,500,000 / 1.012 ≈ 88,430,000 VND/tael
  - Price gain in 24h: 89,500,000 - 88,430,000 ≈ 1,070,000 VND/tael
- **Expected Output:**
  > "Giá vàng SJC hôm nay (01/05/2026) là **89,500,000 VND/chỉ**. Vàng đang **tăng +1.2%** so với hôm qua (tăng khoảng 1.07 triệu/chỉ). Nhận xét:\n\n✓ **Xu hướng tăng:** Nếu bạn quan tâm đầu tư vàng dài hạn, đây là thời điểm vẫn còn hợp lý.\n✗ **Rủi ro ngắn hạn:** Vàng đã tăng 1.2%, có thể sẽ điều chỉnh. Khuyến cáo chờ mức hỗ trợ trước khi mua.\n💡 **Lời khuyên:** Nếu bạn không chắc chắn, hãy chờ hoặc chỉ mua một phần nhỏ. Vàng tốt nhất là để dài hạn (3-5 năm trở lên)."

---

### **TC-08: Stock Price Inquiry (FPT / VCB)**
- **Test Case ID:** TC-08
- **Category:** External Finance / Market Data
- **User Question (Input):** "Giá cổ phiếu FPT và VCB hiện tại là bao nhiêu? Công ty nào có triển vọng tốt hơn?"
  - *(Translation: "What are the current prices of FPT and VCB stocks? Which company has better prospects?")*
- **Data Snapshot:** Stock market data as of 2026-05-01 09:00 AM
- **Calculation Steps:**
  - FPT Current Price: 72,500 VND (24h change: +2.1%)
  - FPT Previous Close: 72,500 / 1.021 ≈ 70,970 VND
  - FPT Daily Gain: 72,500 - 70,970 ≈ 1,530 VND
  - VCB Current Price: 102,000 VND (24h change: +0.8%)
  - VCB Previous Close: 102,000 / 1.008 ≈ 101,186 VND
  - VCB Daily Gain: 102,000 - 101,186 ≈ 814 VND
- **Expected Output:**
  > "Giá cổ phiếu hiện tại (01/05/2026):\n\n**FPT (Công ty Cổ phần FPT):**\n- Giá: **72,500 VND/cổ phiếu**\n- Thay đổi 24h: **+2.1%** (tăng ~1,530 VND)\n- Nhận xét: FPT đang mạnh, ngành công nghệ/IT tiếp tục phát triển\n\n**VCB (Ngân hàng Thương mại Cổ phần Việt Nam):**\n- Giá: **102,000 VND/cổ phiếu**\n- Thay đổi 24h: **+0.8%** (tăng ~814 VND)\n- Nhận xét: VCB ổn định, lĩnh vực ngân hàng có sức mua vững chắc\n\n**So sánh triển vọng:**\n- **FPT:** Tăng trưởng cao hơn (+2.1%), ngành IT sôi động nhưng biến động hơn\n- **VCB:** Ổn định hơn, dividend yield cao, phù hợp nhà đầu tư bảo thủ\n\n💡 **Khuyến cáo:** Bạn đã nắm cả hai - rất đa dạng. Tiếp tục giữ vị thế, VCB để lấy thu nhập, FPT để tăng trưởng vốn."

---

### **TC-09: Out-of-Domain Query - Weather**
- **Test Case ID:** TC-09
- **Category:** Out-of-domain (Non-financial)
- **User Question (Input):** "Thời tiết hôm nay ở Hà Nội như thế nào? Có mưa không?"
  - *(Translation: "What is the weather like in Hanoi today? Will it rain?")*
- **Data Snapshot:** Not applicable (Out-of-domain query)
- **Calculation Steps:** N/A
- **Expected Output (Desired System Behavior - Out-of-Scope):**
  > "[Out-of-domain detection] Xin lỗi, tôi là chatbot chuyên hỗ trợ tài chính cá nhân và không có khả năng dự báo thời tiết. Để biết thông tin thời tiết, bạn có thể:\n\n- Xem trang web weather.gov.vn hoặc vnexpress.net\n- Sử dụng ứng dụng dự báo thời tiết chuyên dụng như OpenWeather hoặc Weather.com\n- Hỏi trợ lý ảo khác như Google Assistant, Siri, Alexa\n\nTôi có thể giúp bạn những gì liên quan đến tài chính, chi tiêu, tiết kiệm, đầu tư. Hãy hỏi thêm!"

---

### **TC-10: Out-of-Domain Query - Cooking Recipe**
- **Test Case ID:** TC-10
- **Category:** Out-of-domain (Non-financial)
- **User Question (Input):** "Làm thế nào để nấu món phở bò ngon? Cần những nguyên liệu gì?"
  - *(Translation: "How do I cook a delicious beef pho? What ingredients do I need?")*
- **Data Snapshot:** Not applicable (Out-of-domain query)
- **Calculation Steps:** N/A
- **Expected Output (Desired System Behavior - Out-of-Scope):**
  > "[Out-of-domain detection] Xin lỗi, tôi là chatbot tài chính và không chuyên về nấu ăn. Để có công thức phở bò, bạn có thể:\n\n- Truy cập các trang web nấu ăn như Diadiem.com, Cooktips.vn\n- Xem các video hướng dẫn trên YouTube (từ khóa: 'Cách nấu phở bò ngon')\n- Hỏi các chatbot đa năng như ChatGPT, Gemini, Claude\n\n**💡 Gợi ý tài chính:** Nếu bạn muốn, tôi có thể giúp so sánh chi phí nấu ăn tại nhà với ăn ngoài dựa trên dữ liệu chi tiêu thực tế mới nhất trong tài khoản của bạn."

---

## 📋 Test Execution Guidelines

### How to Execute These Test Cases
1. **Login** with test account (hihihi@gmail.com / 12345678)
2. **Prepare environment:** Query live DB snapshot for the same user and store JSON evidence with timestamp
3. **Run TC-01 through TC-06:** Validate numbers against the snapshot JSON (not against old fixed values)
4. **Run TC-07 & TC-08:** Validate external data source integration
5. **Run TC-09 & TC-10:** Validate graceful out-of-domain handling and context switching
6. **Document results:** Record actual output vs. DB snapshot, time taken, and any discrepancies

### Acceptance Criteria
- ✅ **Pass:** If all numerical values in TC-01..TC-06 match live DB snapshot (tolerance rounding <= 0.5%) and context is appropriate
- ⚠️ **Conditional Pass:** Number is correct but wording/recommendation quality differs slightly
- ❌ **Fail:** Any fabricated number, stale number from old mock data, or out-of-domain query not handled gracefully

### Known Limitations & Edge Cases
1. External market data (TC-07, TC-08) may lag by 15-30 minutes depending on API refresh rate
2. Out-of-domain responses (TC-09, TC-10) should politely redirect without attempting financial extrapolation
3. Multi-month comparisons assume consistent data integrity across all periods

---

## 🎯 Performance Metrics to Track

| Metric | Target | Threshold |
|--------|--------|-----------|
| **Numerical Accuracy Rate** | > 95% | Critical |
| **Response Latency** | < 3 seconds | Acceptable |
| **Context Retention** | Maintains user history | Important |
| **Out-of-Domain Deflection** | 100% graceful | Critical |
| **Recommendation Relevance** | > 80% relevant | Good-to-have |

---

**Document Version:** 1.1  
**Last Updated:** 2026-05-02  
**QA Engineer:** Senior QA / AI Evaluator  
**Status:** Ready for Execution (Live DB Verified)
