# Báo cáo Kiểm thử Tự động (03/05/2026)
- Account Test: `test030526@gmail.com`
- Tổng số TC: [6] | Pass: [6] | Fail: [0]
## Bảng Kết quả Test Case (Input/Expected/Actual)
| ID | Module | Test case | Input | Expected Result | Actual Output | Status |
|---|---|---|---|---|---|---|
| TC-E2E-001 | Dashboard/Analytics | comprehensive-flow.spec.ts > Suite 1: Tinh dung dan cua du lieu (Analytics & Dashboard) > Dashboard tong so du khop voi du lieu da seed | Seed data 2 nam, login user test, vao dashboard doc card so du | So du UI bang expected.totalBalance tu seed summary | Đạt đúng kỳ vọng. | PASS |
| TC-E2E-002 | Analytics UI | comprehensive-flow.spec.ts > Suite 1: Tinh dung dan cua du lieu (Analytics & Dashboard) > Bieu do dong tien render dung khi loc nam 2025 va 2026 | Loc khoang ngay 2025 va 2026 tren trang analytics | Bieu do recharts render on dinh voi so luong chart/axis hop le | Đạt đúng kỳ vọng. | PASS |
| TC-E2E-003 | AI Chat Internal | comprehensive-flow.spec.ts > Suite 3: AI Financial Chatbot (Agentic RAG) > TC1 - Internal: Tong chi tieu nam 2025 khop du lieu seed | POST /api/v1/ai/chat voi cau hoi tong chi tieu nam 2025 | success=true, router analytics_chat, totalExpense khop seed | Đạt đúng kỳ vọng. | PASS |
| TC-E2E-004 | AI Chat Internal + Analytics | comprehensive-flow.spec.ts > Suite 3: AI Financial Chatbot (Agentic RAG) > TC2 - Internal: Thang 4/2026 toi ton bao nhieu tien an | POST /api/v1/ai/chat + GET /api/v1/analytics/dashboard?month=2026-04 | Gia tri an uong thang 4/2026 khop seedSummary.expected.foodExpenseApr2026 | Đạt đúng kỳ vọng. | PASS |
| TC-E2E-005 | AI Chat External | comprehensive-flow.spec.ts > Suite 3: AI Financial Chatbot (Agentic RAG) > TC3 - External: Gia vang SJC hom nay co grounding tu Google Search | POST /api/v1/ai/chat voi cau hoi gia vang | router advisor_chat, answer co thong tin vang/SJC | Đạt đúng kỳ vọng. | PASS |
| TC-E2E-006 | AI Extract Text | comprehensive-flow.spec.ts > Suite 4: AI Assistant (NLP Quick Entry) > Extract dung amount va category cho cau mua cafe 50k | POST /api/v1/ai/extract-text voi "mua cafe 50k" | Neu 200 thi amount=50000 va category an uong; neu 429 thi loi co cau truc | Đạt đúng kỳ vọng. | PASS |
