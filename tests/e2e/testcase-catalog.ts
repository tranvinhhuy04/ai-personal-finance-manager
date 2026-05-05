export type TestCaseMeta = {
  id: string;
  module: string;
  input: string;
  expected: string;
};

export const TESTCASE_CATALOG: Record<string, TestCaseMeta> = {
  'comprehensive-flow.spec.ts > Suite 1: Tinh dung dan cua du lieu (Analytics & Dashboard) > Dashboard tong so du khop voi du lieu da seed': {
    id: 'TC-E2E-001',
    module: 'Dashboard/Analytics',
    input: 'Seed data 2 nam, login user test, vao dashboard doc card so du',
    expected: 'So du UI bang expected.totalBalance tu seed summary',
  },
  'comprehensive-flow.spec.ts > Suite 1: Tinh dung dan cua du lieu (Analytics & Dashboard) > Bieu do dong tien render dung khi loc nam 2025 va 2026': {
    id: 'TC-E2E-002',
    module: 'Analytics UI',
    input: 'Loc khoang ngay 2025 va 2026 tren trang analytics',
    expected: 'Bieu do recharts render on dinh voi so luong chart/axis hop le',
  },
  'comprehensive-flow.spec.ts > Suite 3: AI Financial Chatbot (Agentic RAG) > TC1 - Internal: Tong chi tieu nam 2025 khop du lieu seed': {
    id: 'TC-E2E-003',
    module: 'AI Chat Internal',
    input: 'POST /api/v1/ai/chat voi cau hoi tong chi tieu nam 2025',
    expected: 'success=true, router analytics_chat, totalExpense khop seed',
  },
  'comprehensive-flow.spec.ts > Suite 3: AI Financial Chatbot (Agentic RAG) > TC2 - Internal: Thang 4/2026 toi ton bao nhieu tien an': {
    id: 'TC-E2E-004',
    module: 'AI Chat Internal + Analytics',
    input: 'POST /api/v1/ai/chat + GET /api/v1/analytics/dashboard?month=2026-04',
    expected: 'Gia tri an uong thang 4/2026 khop seedSummary.expected.foodExpenseApr2026',
  },
  'comprehensive-flow.spec.ts > Suite 3: AI Financial Chatbot (Agentic RAG) > TC3 - External: Gia vang SJC hom nay co grounding tu Google Search': {
    id: 'TC-E2E-005',
    module: 'AI Chat External',
    input: 'POST /api/v1/ai/chat voi cau hoi gia vang',
    expected: 'router advisor_chat, answer co thong tin vang/SJC',
  },
  'comprehensive-flow.spec.ts > Suite 4: AI Assistant (NLP Quick Entry) > Extract dung amount va category cho cau mua cafe 50k': {
    id: 'TC-E2E-006',
    module: 'AI Extract Text',
    input: 'POST /api/v1/ai/extract-text voi "mua cafe 50k"',
    expected: 'Neu 200 thi amount=50000 va category an uong; neu 429 thi loi co cau truc',
  },

  'system-coverage-api.spec.ts > Suite 0: Service Health Checks > Gateway health endpoint hoat dong': {
    id: 'TC-SYS-001',
    module: 'Gateway',
    input: 'GET http://127.0.0.1:3000/health',
    expected: 'HTTP 200, body.status=ok',
  },
  'system-coverage-api.spec.ts > Suite 0: Service Health Checks > Identity health endpoint hoat dong': {
    id: 'TC-SYS-002',
    module: 'Identity Service',
    input: 'GET http://127.0.0.1:3001/health',
    expected: 'HTTP 200',
  },
  'system-coverage-api.spec.ts > Suite 0: Service Health Checks > Wallet health endpoint hoat dong': {
    id: 'TC-SYS-003',
    module: 'Wallet Service',
    input: 'GET http://127.0.0.1:3002/health',
    expected: 'HTTP 200, service=wallet-service',
  },
  'system-coverage-api.spec.ts > Suite 0: Service Health Checks > Transaction health endpoint hoat dong': {
    id: 'TC-SYS-004',
    module: 'Transaction Service',
    input: 'GET http://127.0.0.1:3003/health',
    expected: 'HTTP 200, service=transaction-service',
  },
  'system-coverage-api.spec.ts > Suite 0: Service Health Checks > Analytics health endpoint hoat dong': {
    id: 'TC-SYS-005',
    module: 'Analytics Service',
    input: 'GET http://127.0.0.1:3004/health',
    expected: 'HTTP 200, service=analytics-service',
  },
  'system-coverage-api.spec.ts > Suite 0: Service Health Checks > Notification health endpoint hoat dong': {
    id: 'TC-SYS-006',
    module: 'Notification Service',
    input: 'GET http://127.0.0.1:3005/health',
    expected: 'HTTP 200, service=notification-service',
  },
  'system-coverage-api.spec.ts > Suite 0: Service Health Checks > Cloud health endpoint hoat dong': {
    id: 'TC-SYS-007',
    module: 'Cloud Service',
    input: 'GET http://127.0.0.1:3006/health',
    expected: 'HTTP 200, body.status=ok',
  },
  'system-coverage-api.spec.ts > Suite 0: Service Health Checks > AI service health endpoint hoat dong': {
    id: 'TC-SYS-008',
    module: 'AI Service',
    input: 'GET http://127.0.0.1:8000/health',
    expected: 'HTTP 200, body.status=ok',
  },

  'system-coverage-api.spec.ts > Suite 1: Auth & Settings > Login API thanh cong va tra access token': {
    id: 'TC-SYS-009',
    module: 'Auth',
    input: 'POST /api/v1/auth/login voi account seed',
    expected: 'HTTP 200, co accessToken hop le',
  },
  'system-coverage-api.spec.ts > Suite 1: Auth & Settings > GET /api/v1/auth/me tra thong tin user dang nhap': {
    id: 'TC-SYS-010',
    module: 'Auth',
    input: 'GET /api/v1/auth/me voi Bearer token',
    expected: 'HTTP 200, email khop account seed',
  },
  'system-coverage-api.spec.ts > Suite 1: Auth & Settings > GET /api/v1/settings tra ve user settings': {
    id: 'TC-SYS-011',
    module: 'Identity Settings',
    input: 'GET /api/v1/settings voi Bearer token',
    expected: 'HTTP 200, co selected_ai_model va available_models theo schema runtime AI',
  },
  'system-coverage-api.spec.ts > Suite 1: Auth & Settings > GET /api/v1/ai/provider-status tra trang thai provider': {
    id: 'TC-SYS-012',
    module: 'AI Provider',
    input: 'GET /api/v1/ai/provider-status voi Bearer token',
    expected: 'HTTP 200 va co truong status/model/provider theo schema',
  },

  'system-coverage-api.spec.ts > Suite 2: Wallet, Category, Transaction > GET /api/v1/wallets tra danh sach vi': {
    id: 'TC-SYS-013',
    module: 'Wallet',
    input: 'GET /api/v1/wallets',
    expected: 'HTTP 200, danh sach vi khong rong',
  },
  'system-coverage-api.spec.ts > Suite 2: Wallet, Category, Transaction > GET /api/v1/categories?category_type=EXPENSE tra danh muc chi tieu': {
    id: 'TC-SYS-014',
    module: 'Category',
    input: 'GET /api/v1/categories?category_type=EXPENSE',
    expected: 'HTTP 200, co danh muc expense',
  },
  'system-coverage-api.spec.ts > Suite 2: Wallet, Category, Transaction > POST /api/v1/transactions tao giao dich moi thanh cong': {
    id: 'TC-SYS-015',
    module: 'Transaction',
    input: 'POST /api/v1/transactions voi wallet_id/category_id/idempotency_key moi',
    expected: 'HTTP 201, tra ve giao dich moi',
  },
  'system-coverage-api.spec.ts > Suite 2: Wallet, Category, Transaction > GET /api/v1/transactions co giao dich vua tao': {
    id: 'TC-SYS-016',
    module: 'Transaction',
    input: 'GET /api/v1/transactions?limit=100',
    expected: 'Danh sach chua description vua tao',
  },

  'system-coverage-api.spec.ts > Suite 3: Analytics & Notification > GET /api/v1/analytics/dashboard co summary hop le': {
    id: 'TC-SYS-017',
    module: 'Analytics',
    input: 'GET /api/v1/analytics/dashboard',
    expected: 'HTTP 200, summary.totalIncome/totalExpense/net* hop le',
  },
  'system-coverage-api.spec.ts > Suite 3: Analytics & Notification > GET /api/v1/notifications tra danh sach thong bao': {
    id: 'TC-SYS-018',
    module: 'Notification',
    input: 'GET /api/v1/notifications?limit=20',
    expected: 'HTTP 200, tra object/list notifications theo schema service',
  },

  'system-coverage-api.spec.ts > Suite 4: AI Chat Routing > AI chat cau hoi so lieu noi bo route ve analytics/advisor': {
    id: 'TC-SYS-019',
    module: 'AI Chat Router',
    input: 'POST /api/v1/ai/chat voi cau hoi tong chi thang',
    expected: 'success=true, route analytics_chat hoac advisor_chat (guardrail tolerant)',
  },
  'system-coverage-api.spec.ts > Suite 4: AI Chat Routing > AI chat cau hoi thi truong route advisor_chat': {
    id: 'TC-SYS-020',
    module: 'AI Chat Router',
    input: 'POST /api/v1/ai/chat voi cau hoi gia vang',
    expected: 'success=true, router.route=advisor_chat',
  },
};
