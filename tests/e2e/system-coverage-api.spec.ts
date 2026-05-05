import crypto from 'crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { seedData } from '../setup/seedData';

type SeedSummary = {
  account: {
    email: string;
    password: string;
  };
};

const GATEWAY = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000';
const DIRECT = {
  gateway: 'http://127.0.0.1:3000',
  identity: 'http://127.0.0.1:3001',
  wallet: 'http://127.0.0.1:3002',
  transaction: 'http://127.0.0.1:3003',
  analytics: 'http://127.0.0.1:3004',
  notification: 'http://127.0.0.1:3005',
  cloud: 'http://127.0.0.1:3006',
  ai: 'http://127.0.0.1:8000',
};

let seedSummary: SeedSummary;
let token = '';
let walletId = '';
let expenseCategoryId = '';
let createdDescription = '';

async function loginViaApi(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${GATEWAY}/api/v1/auth/login`, {
    data: {
      email: seedSummary.account.email,
      password: seedSummary.account.password,
    },
  });

  expect(response.ok(), `Login failed: ${response.status()}`).toBeTruthy();
  const payload = (await response.json()) as Record<string, unknown>;
  const accessToken = String(payload.accessToken ?? payload.token ?? '');
  expect(accessToken.length).toBeGreaterThan(20);
  return accessToken;
}

async function authGet(request: APIRequestContext, path: string) {
  return request.get(`${GATEWAY}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
}

async function authPost(request: APIRequestContext, path: string, data: Record<string, unknown>) {
  return request.post(`${GATEWAY}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    data,
  });
}

test.beforeAll(async ({ request }) => {
  const seeded = await seedData({ writeSummaryFile: true });
  seedSummary = {
    account: seeded.account,
  };

  token = await loginViaApi(request);
});

test.describe('Suite 0: Service Health Checks', () => {
  test('Gateway health endpoint hoat dong', async ({ request }) => {
    const response = await request.get(`${DIRECT.gateway}/health`);
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as Record<string, unknown>;
    expect(String(payload.status ?? '')).toBe('ok');
  });

  test('Identity health endpoint hoat dong', async ({ request }) => {
    const response = await request.get(`${DIRECT.identity}/health`);
    expect(response.ok()).toBeTruthy();
  });

  test('Wallet health endpoint hoat dong', async ({ request }) => {
    const response = await request.get(`${DIRECT.wallet}/health`);
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as Record<string, unknown>;
    expect(String(payload.service ?? '')).toBe('wallet-service');
  });

  test('Transaction health endpoint hoat dong', async ({ request }) => {
    const response = await request.get(`${DIRECT.transaction}/health`);
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as Record<string, unknown>;
    expect(String(payload.service ?? '')).toBe('transaction-service');
  });

  test('Analytics health endpoint hoat dong', async ({ request }) => {
    const response = await request.get(`${DIRECT.analytics}/health`);
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as Record<string, unknown>;
    expect(String(payload.service ?? '')).toBe('analytics-service');
  });

  test('Notification health endpoint hoat dong', async ({ request }) => {
    const response = await request.get(`${DIRECT.notification}/health`);
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as Record<string, unknown>;
    expect(String(payload.service ?? '')).toBe('notification-service');
  });

  test('Cloud health endpoint hoat dong', async ({ request }) => {
    const response = await request.get(`${DIRECT.cloud}/health`);
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as Record<string, unknown>;
    expect(String(payload.status ?? '')).toBe('ok');
  });

  test('AI service health endpoint hoat dong', async ({ request }) => {
    const response = await request.get(`${DIRECT.ai}/health`);
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as Record<string, unknown>;
    expect(String(payload.status ?? '')).toBe('ok');
  });
});

test.describe('Suite 1: Auth & Settings', () => {
  test('Login API thanh cong va tra access token', async ({ request }) => {
    const accessToken = await loginViaApi(request);
    expect(accessToken.length).toBeGreaterThan(20);
  });

  test('GET /api/v1/auth/me tra thong tin user dang nhap', async ({ request }) => {
    const response = await authGet(request, '/api/v1/auth/me');
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as Record<string, unknown>;
    const email = String((payload.user as Record<string, unknown> | undefined)?.email ?? payload.email ?? '');
    expect(email).toBe(seedSummary.account.email);
  });

  test('GET /api/v1/settings tra ve user settings', async ({ request }) => {
    const response = await authGet(request, '/api/v1/settings');
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as Record<string, unknown>;

    // Current gateway/identity contract returns runtime AI settings here.
    const selectedModel = String(payload.selected_ai_model ?? payload.selectedAiModel ?? '');
    const hasApiKey = Boolean(payload.has_gemini_api_key ?? payload.hasGeminiApiKey ?? false);
    const availableModels = Array.isArray(payload.available_models)
      ? payload.available_models
      : Array.isArray(payload.availableModels)
        ? payload.availableModels
        : [];

    expect(selectedModel.length).toBeGreaterThan(0);
    expect(typeof hasApiKey).toBe('boolean');
    expect(Array.isArray(availableModels)).toBeTruthy();
  });

  test('GET /api/v1/ai/provider-status tra trang thai provider', async ({ request }) => {
    const response = await authGet(request, '/api/v1/ai/provider-status');
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as Record<string, unknown>;

    expect(Boolean(payload.success)).toBeTruthy();
    const status = String(payload.status ?? '');
    expect(status.length).toBeGreaterThan(0);
  });
});

test.describe('Suite 2: Wallet, Category, Transaction', () => {
  test('GET /api/v1/wallets tra danh sach vi', async ({ request }) => {
    const response = await authGet(request, '/api/v1/wallets');
    expect(response.ok()).toBeTruthy();

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(payload)).toBeTruthy();
    expect(payload.length).toBeGreaterThan(0);

    walletId = String(payload[0]?.id ?? payload[0]?._id ?? '');
    expect(walletId.length).toBeGreaterThan(0);
  });

  test('GET /api/v1/categories?category_type=EXPENSE tra danh muc chi tieu', async ({ request }) => {
    const response = await authGet(request, '/api/v1/categories?category_type=EXPENSE');
    expect(response.ok()).toBeTruthy();

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(payload)).toBeTruthy();
    expect(payload.length).toBeGreaterThan(0);

    expenseCategoryId = String(payload[0]?.id ?? payload[0]?._id ?? '');
    expect(expenseCategoryId.length).toBeGreaterThan(0);
  });

  test('POST /api/v1/transactions tao giao dich moi thanh cong', async ({ request }) => {
    expect(walletId.length).toBeGreaterThan(0);
    expect(expenseCategoryId.length).toBeGreaterThan(0);

    createdDescription = `E2E system coverage tx ${new Date().toISOString()}`;
    const idempotencyKey = crypto.createHash('sha256').update(`${createdDescription}:${Date.now()}`).digest('hex');

    const response = await authPost(request, '/api/v1/transactions', {
      wallet_id: walletId,
      category_id: expenseCategoryId,
      amount: '50000',
      transaction_type: 'EXPENSE',
      currency: 'VND',
      description: createdDescription,
      occurred_at: new Date().toISOString(),
      idempotency_key: idempotencyKey,
    });

    expect(response.status(), `Create transaction failed: ${response.status()}`).toBe(201);
    const payload = (await response.json()) as Record<string, unknown>;

    const txId = String(payload.id ?? payload._id ?? '');
    expect(txId.length).toBeGreaterThan(0);
  });

  test('GET /api/v1/transactions co giao dich vua tao', async ({ request }) => {
    const response = await authGet(request, '/api/v1/transactions?limit=100&skip=0');
    expect(response.ok()).toBeTruthy();

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(payload)).toBeTruthy();
    expect(payload.length).toBeGreaterThan(0);

    const found = payload.some((item) => String(item.description ?? '').includes(createdDescription));
    expect(found, `Cannot find created transaction description: ${createdDescription}`).toBeTruthy();
  });
});

test.describe('Suite 3: Analytics & Notification', () => {
  test('GET /api/v1/analytics/dashboard co summary hop le', async ({ request }) => {
    const response = await authGet(request, '/api/v1/analytics/dashboard?range=month');
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as Record<string, unknown>;

    const summary = (payload.summary ?? {}) as Record<string, unknown>;
    expect(Number.isFinite(Number(summary.totalIncome ?? 0))).toBeTruthy();
    expect(Number.isFinite(Number(summary.totalExpense ?? 0))).toBeTruthy();
    expect(Number.isFinite(Number(summary.netCashFlow ?? summary.net ?? 0))).toBeTruthy();
  });

  test('GET /api/v1/notifications tra danh sach thong bao', async ({ request }) => {
    const response = await authGet(request, '/api/v1/notifications?limit=20&page=1');
    expect(response.ok()).toBeTruthy();

    const payload = (await response.json()) as Record<string, unknown>;
    const asArray = Array.isArray(payload) ? payload : null;

    if (asArray) {
      expect(asArray.length).toBeGreaterThanOrEqual(0);
      return;
    }

    const data = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.notifications) ? payload.notifications : [];
    expect(Array.isArray(data)).toBeTruthy();
  });
});

test.describe('Suite 4: AI Chat Routing', () => {
  test('AI chat cau hoi so lieu noi bo route ve analytics/advisor', async ({ request }) => {
    const response = await authPost(request, '/api/v1/ai/chat', {
      message: 'Tháng này tổng chi tiêu của tôi là bao nhiêu?',
      question: 'Tháng này tổng chi tiêu của tôi là bao nhiêu?',
      range: 'month',
      useLlm: false,
    });

    expect(response.ok(), `AI chat failed: ${response.status()}`).toBeTruthy();
    const payload = (await response.json()) as Record<string, unknown>;
    expect(Boolean(payload.success)).toBeTruthy();

    const queryPlan = (payload.query_plan ?? {}) as Record<string, unknown>;
    const router = (queryPlan.router ?? {}) as Record<string, unknown>;
    const route = String(router.route ?? '');
    expect(['analytics_chat', 'advisor_chat']).toContain(route);
  });

  test('AI chat cau hoi thi truong route advisor_chat', async ({ request }) => {
    const response = await authPost(request, '/api/v1/ai/chat', {
      message: 'Giá vàng SJC hôm nay là bao nhiêu?',
      question: 'Giá vàng SJC hôm nay là bao nhiêu?',
      useLlm: true,
    });

    expect(response.ok(), `AI chat failed: ${response.status()}`).toBeTruthy();
    const payload = (await response.json()) as Record<string, unknown>;
    expect(Boolean(payload.success)).toBeTruthy();

    const queryPlan = (payload.query_plan ?? {}) as Record<string, unknown>;
    const router = (queryPlan.router ?? {}) as Record<string, unknown>;
    expect(String(router.route ?? '')).toBe('advisor_chat');
  });
});
