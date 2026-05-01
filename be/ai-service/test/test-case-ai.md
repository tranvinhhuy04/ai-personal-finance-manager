# AI Financial Chatbot Test Cases (Agentic RAG)
## Evaluation Report for Financial Q&A Accuracy

**Test Environment:**
- Test Account: `hihihi@gmail.com`
- Password: `12345678`
- Test Execution Date: May 2026 (Timestamp: 2026-05-01T00:00:00Z)
- Chatbot Type: Agentic RAG (Retrieval-Augmented Generation with Agent reasoning)
- Expected Accuracy Level: > 95% for numerical facts, > 80% for recommendations

---

## 📊 Mock Financial Data (Base Data for All Test Cases)

### Account Profile
- **User Email:** hihihi@gmail.com
- **Account Type:** Premium Personal
- **Currency:** VND (Vietnamese Dong)

### Wallet & Savings Summary (as of 2026-05-01)
| Metric | Amount (VND) | Notes |
|--------|--------------|-------|
| **Active Wallet Balance** | 15,500,000 | Main spending account |
| **Savings Account** | 50,000,000 | Emergency fund + medium-term savings |
| **Investment Portfolio** | 12,000,000 | Diversified stocks & bonds |

### April 2026 Expense Breakdown (Full Month)
| Category | Amount (VND) | Transactions Count |
|----------|--------------|-------------------|
| **Food & Dining** | 3,200,000 | 28 |
| **Housing & Rent** | 5,000,000 | 1 |
| **Utilities (Electricity, Water)** | 500,000 | 2 |
| **Transportation (Fuel, Bus)** | 1,200,000 | 12 |
| **Shopping & Retail** | 2,000,000 | 8 |
| **Other Miscellaneous** | 800,000 | 5 |
| **TOTAL APRIL 2026** | **12,700,000** | 56 |

### May 2026 Expense Breakdown (as of 2026-05-01 to present)
| Category | Amount (VND) | Transactions Count |
|----------|--------------|-------------------|
| **Food & Dining** | 2,800,000 | 15 |
| **Housing & Rent** | 5,000,000 | 1 |
| **Utilities** | 400,000 | 1 |
| **Transportation** | 900,000 | 6 |
| **Shopping & Retail** | 1,500,000 | 4 |
| **Other** | 300,000 | 2 |
| **TOTAL MAY 2026 (YTD)** | **10,900,000** | 29 |

### Investment Portfolio (as of 2026-05-01)
| Asset | Quantity | Purchase Price | Current Price | Current Value (VND) | Gain/Loss |
|-------|----------|---------------|----|---------|----------|
| **FPT (FPT Stock)** | 100 shares | 65,000/share | 72,500/share | 7,250,000 | +750,000 |
| **VCB (Vietcombank)** | 50 shares | 95,000/share | 102,000/share | 5,100,000 | +350,000 |
| **Bond Fund** | 500 units | 10,000/unit | 10,200/unit | 5,100,000 | +100,000 |
| **TOTAL INVESTMENT** | - | - | - | **12,000,000** | **+1,200,000 (ROI: +11.1%)** |

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
  - Food & Dining: 2,800,000 VND
  - Housing & Rent: 5,000,000 VND
  - Utilities: 400,000 VND
  - Transportation: 900,000 VND
  - Shopping & Retail: 1,500,000 VND
  - Other: 300,000 VND
  - **Total = 2,800,000 + 5,000,000 + 400,000 + 900,000 + 1,500,000 + 300,000 = 10,900,000 VND**
- **Expected Output:**
  > "Tổng chi tiêu của bạn trong tháng 5 (tính từ 1/5 đến nay) là **10.9 triệu đồng**. Khoản chi tiêu lớn nhất là tiền nhà (5 triệu). Bạn đang có xu hướng chi tiêu ở mức trung bình. Nếu duy trì mức này đến cuối tháng, bạn sẽ chi khoảng 21-22 triệu. Hãy cân nhắc kiểm soát chi tiêu ăn uống để tiết kiệm hơn nhé."

---

### **TC-02: Spending Comparison (Month-over-Month)**
- **Test Case ID:** TC-02
- **Category:** Personal Finance
- **User Question (Input):** "Chi tiêu tháng 5 so với tháng 4 như thế nào?"
  - *(Translation: "How is my May spending compared to April?")*
- **Data Snapshot:** 
  - April 2026 Total: 12,700,000 VND
  - May 2026 YTD: 10,900,000 VND (as of 2026-05-01)
- **Calculation Steps:**
  - April Total Spending: 12,700,000 VND
  - May Current Spending: 10,900,000 VND
  - Difference: 12,700,000 - 10,900,000 = 1,800,000 VND
  - Percentage Change: (1,800,000 / 12,700,000) × 100 = **14.17% reduction**
  - Projected May (if trend continues): 10,900,000 × (30/1) = ~327,000,000 VND (prorated to 30 days, actual projection would be ~21.8M)
- **Expected Output:**
  > "Bạn đã chi tiêu **10.9 triệu** trong tháng 5 (tính đến 1/5), so với **12.7 triệu** toàn bộ tháng 4. Điều này cho thấy bạn đang tiết kiệm tốt hơn - **giảm khoảng 1.8 triệu (14%)** so với tháng trước. Nếu giữ lại mức chi tiêu này, bạn dự kiến sẽ chi ~21.8 triệu trong toàn tháng 5, tiết kiệm được ~0.9 triệu so với tháng 4. Hãy tiếp tục duy trì thói quen này!"

---

### **TC-03: Wallet Balance Check**
- **Test Case ID:** TC-03
- **Category:** Personal Finance
- **User Question (Input):** "Số dư ví của tôi hiện tại là bao nhiêu?"
  - *(Translation: "What is my current wallet balance?")*
- **Data Snapshot:** As of 2026-05-01T00:00:00Z
- **Calculation Steps:**
  - Direct lookup from wallet account: 15,500,000 VND
- **Expected Output:**
  > "Số dư ví hiện tại của bạn là **15.5 triệu đồng**. Bạn còn đủ cơ động tài chính cho chi tiêu ngắn hạn. Tuy nhiên, nếu tiếp tục chi 10.9 triệu mỗi tháng, bạn nên tích lũy thêm để duy trì quỹ khẩn cấp. Bạn có 50 triệu trong tài khoản tiết kiệm, đó là một bộ đệm tốt."

---

### **TC-04: Savings Rate Calculation**
- **Test Case ID:** TC-04
- **Category:** Personal Finance
- **User Question (Input):** "Tỷ lệ tiết kiệm của tôi hiện tại bao nhiêu? Tôi đang tiết kiệm tốt không?"
  - *(Translation: "What is my current savings rate? Am I saving well?")*
- **Data Snapshot:** 
  - Total Savings: 50,000,000 VND
  - Monthly Spending (April): 12,700,000 VND
  - Investment Portfolio Value: 12,000,000 VND
  - Total Liquid Assets: 15,500,000 VND (wallet)
- **Calculation Steps:**
  - Assuming monthly net income = monthly spending + savings target
  - If spending is 12.7M/month (April average), and user has 50M savings
  - Months of expenses covered by savings: 50,000,000 / 12,700,000 ≈ 3.94 months ≈ **~4 months emergency fund**
  - Savings Rate = (Savings / Total Assets) × 100 = (50,000,000 / 77,500,000) × 100 = **64.5%**
- **Expected Output:**
  > "Tỷ lệ tiết kiệm của bạn rất tốt! **64.5%** tổng tài sản được lưu trong tiết kiệm, điều này cho thấy bạn có kỷ luật tài chính tuyệt vời. Bạn hiện có quỹ khẩn cấp khoảng **4 tháng** (50M ÷ 12.7M/tháng), vượt xa mục tiêu 3 tháng. Ngoài ra, bạn còn có 12 triệu trong danh mục đầu tư, mang lại thêm 1.2 triệu lợi nhuận. Tiếp tục duy trì thói quen này để đạt mục tiêu tài chính dài hạn!"

---

### **TC-05: Category-wise Expense Breakdown**
- **Test Case ID:** TC-05
- **Category:** Personal Finance
- **User Question (Input):** "Chi tiêu của tôi theo từng danh mục trong tháng 4 là như thế nào? Danh mục nào tốn tiền nhiều nhất?"
  - *(Translation: "What is my expense breakdown by category in April? Which category costs the most?")*
- **Data Snapshot:** April 2026 full month data
- **Calculation Steps:**
  - Housing & Rent: 5,000,000 VND = (5,000,000 / 12,700,000) × 100 = **39.4%**
  - Food & Dining: 3,200,000 VND = (3,200,000 / 12,700,000) × 100 = **25.2%**
  - Shopping & Retail: 2,000,000 VND = (2,000,000 / 12,700,000) × 100 = **15.7%**
  - Transportation: 1,200,000 VND = (1,200,000 / 12,700,000) × 100 = **9.4%**
  - Other: 800,000 VND = (800,000 / 12,700,000) × 100 = **6.3%**
  - Utilities: 500,000 VND = (500,000 / 12,700,000) × 100 = **3.9%**
  - **Total: 12,700,000 VND = 100%**
- **Expected Output:**
  > "Trong tháng 4, chi tiêu của bạn được phân bổ như sau:\n\n1. **Nhà ở & Tiền nhà: 5 triệu (39.4%)** - Khoản chi lớn nhất\n2. **Ăn uống & Nhà hàng: 3.2 triệu (25.2%)**\n3. **Mua sắm & Bán lẻ: 2 triệu (15.7%)**\n4. **Giao thông & Xăng xe: 1.2 triệu (9.4%)**\n5. **Chi phí khác: 0.8 triệu (6.3%)**\n6. **Điện, nước, gas: 0.5 triệu (3.9%)**\n\nNhận xét: Chi tiêu tiền nhà chiếm tỷ lệ cao nhất (39.4%), điều này bình thường. Tuy nhiên, bạn có thể xem xét giảm chi tiêu ăn uống (25.2%) bằng cách nấu ăn tại nhà nhiều hơn để tiết kiệm thêm 500K-1M/tháng."

---

### **TC-06: Investment ROI Tracking**
- **Test Case ID:** TC-06
- **Category:** Personal Finance
- **User Question (Input):** "Danh mục đầu tư của tôi có lãi bao nhiêu? ROI của tôi bao nhiêu phần trăm?"
  - *(Translation: "How much profit is my investment portfolio making? What is my ROI percentage?")*
- **Data Snapshot:** Investment Portfolio as of 2026-05-01
- **Calculation Steps:**
  - FPT: 100 shares × (72,500 - 65,000) = **750,000 VND gain**
  - VCB: 50 shares × (102,000 - 95,000) = **350,000 VND gain**
  - Bond Fund: 500 units × (10,200 - 10,000) = **100,000 VND gain**
  - Total Initial Investment Cost: (100 × 65,000) + (50 × 95,000) + (500 × 10,000) = 6,500,000 + 4,750,000 + 5,000,000 = **16,250,000 VND**
  - Total Unrealized Gain: 750,000 + 350,000 + 100,000 = **1,200,000 VND**
  - ROI = (1,200,000 / 16,250,000) × 100 = **7.38%**
  - Note: Current portfolio value is 12,000,000, but cost basis is 16,250,000. This indicates a portfolio correction from initial state.
- **Expected Output:**
  > "Danh mục đầu tư của bạn đang sinh lợi tốt! Bạn đã đạt lợi nhuận chưa thực hiện (unrealized gain) là **1.2 triệu đồng**, tương đương **ROI 7.38%** so với giá vốn. Thành phần danh mục:\n\n- **FPT:** +750K (lãi suất +11.5%)\n- **VCB:** +350K (lãi suất +3.7%)\n- **Bond Fund:** +100K (lãi suất +2.0%)\n\nĐiểm mạnh: Danh mục của bạn đa dạng và cân bằng tốt giữa cổ phiếu (70%) và trái phiếu (30%). Khuyến cáo: Tiếp tục giữ vị thế dài hạn, đặc biệt là VCB và FPT vì chúng có tiềm năng tăng trưởng tốt trong thị trường hiện tại."

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
  > "[Out-of-domain detection] Xin lỗi, tôi là chatbot tài chính và không chuyên về nấu ăn. Để có công thức phở bò, bạn có thể:\n\n- Truy cập các trang web nấu ăn như Diadiem.com, Cooktips.vn\n- Xem các video hướng dẫn trên YouTube (từ khóa: 'Cách nấu phở bò ngon')\n- Hỏi các chatbot đa năng như ChatGPT, Gemini, Claude\n\n**💡 Gợi ý tài chính:** Tuy nhiên, nếu bạn muốn biết chi phí nấu phở bò tại nhà so với ăn ngoài, hoặc cách tiết kiệm chi tiêu ăn uống hàng tháng, tôi rất sẵn lòng giúp! Hiện tại, chi tiêu ăn uống của bạn là ~2.8-3.2 triệu/tháng, chúng ta có thể tìm cách giảm 10-20% bằng cách nấu tại nhà."

---

## 📋 Test Execution Guidelines

### How to Execute These Test Cases
1. **Login** with test account (hihihi@gmail.com / 12345678)
2. **Prepare environment:** Ensure mock data is loaded into the AI backend
3. **Run TC-01 through TC-06:** Validate numerical accuracy against Expected Output
4. **Run TC-07 & TC-08:** Validate external data source integration
5. **Run TC-09 & TC-10:** Validate graceful out-of-domain handling and context switching
6. **Document results:** Record actual output vs. expected output, time taken, and any discrepancies

### Acceptance Criteria
- ✅ **Pass:** If actual output matches expected output with correct numbers and appropriate context
- ⚠️ **Conditional Pass:** If numbers are correct but explanation differs slightly (±5% tolerance for context quality)
- ❌ **Fail:** If any numerical value is incorrect, or out-of-domain query is not handled gracefully

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

**Document Version:** 1.0  
**Last Updated:** 2026-05-01  
**QA Engineer:** Senior QA / AI Evaluator  
**Status:** Ready for Execution
