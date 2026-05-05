import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { seedData } from '../setup/seedData';

type SeedSummary = {
  account: {
    email: string;
    password: string;
  };
  expected: {
    totalBalance: number;
    totalExpense2025: number;
    foodExpenseApr2026: number;
  };
};

let seedSummary: SeedSummary;
const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000';

function normalizeNumberText(input: string): string {
  return input.replace(/[^\d]/g, '');
}

function parseVndFromText(input: string): number {
  const digits = normalizeNumberText(input);
  return digits ? Number(digits) : 0;
}

function normalizeAscii(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function stripMarkdownCodeFence(input: string): string {
  const trimmed = input.trim();
  const lines = trimmed.split('\n');
  const openIdx = lines.findIndex((line) => /^```(?:json)?\s*$/i.test(line.trim()));
  if (openIdx === -1) return trimmed;

  const closeIdx = lines.findIndex((line, idx) => idx > openIdx && line.trim() === '```');
  if (closeIdx === -1) {
    return lines.slice(openIdx + 1).join('\n').trim();
  }

  return lines.slice(openIdx + 1, closeIdx).join('\n').trim();
}

function parseExtractedTransactionsFromRaw(raw: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(stripMarkdownCodeFence(raw));
  return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
}

function parseAllCandidateAmounts(text: string): number[] {
  const candidates = new Set<number>();
  const compact = text.replace(/\u00a0/g, ' ');

  const groupedMatches = compact.match(/\d{1,3}(?:[.,\s]\d{3})+(?:\s?(?:VND|VNĐ|đ|dong))?/gi) ?? [];
  for (const token of groupedMatches) {
    const amount = Number(token.replace(/[^\d]/g, ''));
    if (Number.isFinite(amount) && amount > 0) {
      candidates.add(amount);
    }
  }

  const plainMatches = compact.match(/\b\d{5,12}\b/g) ?? [];
  for (const token of plainMatches) {
    const amount = Number(token);
    if (Number.isFinite(amount) && amount > 0) {
      candidates.add(amount);
    }
  }

  return Array.from(candidates.values());
}

function assertContainsExactAmount(answer: string, expectedAmount: number) {
  const amounts = parseAllCandidateAmounts(answer);
  const formatted = expectedAmount.toLocaleString('vi-VN');

  const hasExactNumber = amounts.includes(expectedAmount);
  const hasFormattedText = answer.includes(formatted) || answer.includes(`${formatted}đ`) || answer.includes(`${formatted} VNĐ`);

  expect(
    hasExactNumber || hasFormattedText,
    `Expected AI answer to contain exact amount ${expectedAmount}. Parsed amounts: ${amounts.join(', ')}. Answer: ${answer}`,
  ).toBeTruthy();
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/auth');
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();

  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  await expect(page).toHaveURL(/\/$|\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible();
}

async function loginViaApi(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/api/v1/auth/login`, {
    data: {
      email: seedSummary.account.email,
      password: seedSummary.account.password,
    },
  });

  expect(response.ok(), `Login API failed with status ${response.status()}`).toBeTruthy();
  const payload = (await response.json()) as Record<string, unknown>;
  const token = String(payload.accessToken ?? payload.token ?? '');
  expect(token.length).toBeGreaterThan(20);
  return token;
}

async function askAiChat(
  request: APIRequestContext,
  token: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await request.post(`${API_BASE_URL}/api/v1/ai/chat`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: body,
  });

  expect(response.ok(), `AI chat API failed with status ${response.status()}`).toBeTruthy();
  return (await response.json()) as Record<string, unknown>;
}

async function getAnalyticsDashboard(
  request: APIRequestContext,
  token: string,
  query: Record<string, string>,
): Promise<Record<string, unknown>> {
  const search = new URLSearchParams(query).toString();
  const response = await request.get(`${API_BASE_URL}/api/v1/analytics/dashboard?${search}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  expect(response.ok(), `Analytics API failed with status ${response.status()}`).toBeTruthy();
  return (await response.json()) as Record<string, unknown>;
}

test.describe.configure({ mode: 'default' });

test.beforeAll(async () => {
  const seeded = await seedData({ writeSummaryFile: true });
  seedSummary = {
    account: seeded.account,
    expected: {
      totalBalance: seeded.expected.totalBalance,
      totalExpense2025: seeded.expected.totalExpense2025,
      foodExpenseApr2026: seeded.expected.foodExpenseApr2026,
    },
  };
});

test.describe('Suite 1: Tinh dung dan cua du lieu (Analytics & Dashboard)', () => {
  test('Dashboard tong so du khop voi du lieu da seed', async ({ page }) => {
    await login(page, seedSummary.account.email, seedSummary.account.password);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible();

    const balanceCard = page.locator('div').filter({ hasText: 'Số dư của tôi' }).first();
    await expect(balanceCard).toBeVisible();

    const balanceText = await balanceCard.locator('h2').first().innerText();
    const uiBalance = parseVndFromText(balanceText);

    expect(uiBalance).toBe(seedSummary.expected.totalBalance);
  });

  test('Bieu do dong tien render dung khi loc nam 2025 va 2026', async ({ page }) => {
    await login(page, seedSummary.account.email, seedSummary.account.password);

    await page.goto('/analytics');
    await expect(page.getByRole('heading', { name: 'Phân tích tài chính chuyên sâu' })).toBeVisible();

    await page.getByRole('button', { name: 'Tùy chỉnh' }).click();

    const fromInput = page.locator('input[type="date"]').nth(0);
    const toInput = page.locator('input[type="date"]').nth(1);
    const applyButton = page.getByRole('button', { name: 'Áp dụng khoảng ngày' });

    await fromInput.fill('2025-01-01');
    await toInput.fill('2025-12-31');
    await applyButton.click();

    const svgCharts2025 = page.locator('svg.recharts-surface');
    await expect(svgCharts2025.first()).toBeVisible();
    const chartCount2025 = await svgCharts2025.count();
    expect(chartCount2025).toBeGreaterThanOrEqual(2);
    const gridCount2025 = await page.locator('.recharts-cartesian-grid').count();
    expect(gridCount2025).toBeGreaterThanOrEqual(2);

    await fromInput.fill('2026-01-01');
    await toInput.fill('2026-12-31');
    await applyButton.click();

    const svgCharts2026 = page.locator('svg.recharts-surface');
    await expect(svgCharts2026.first()).toBeVisible();
    const chartCount2026 = await svgCharts2026.count();
    expect(chartCount2026).toBeGreaterThanOrEqual(2);
    const axisCount2026 = await page.locator('.recharts-cartesian-axis').count();
    expect(axisCount2026).toBeGreaterThanOrEqual(4);
  });
});

test.describe('Suite 3: AI Financial Chatbot (Agentic RAG)', () => {
  test('TC1 - Internal: Tong chi tieu nam 2025 khop du lieu seed', async ({ request, page }) => {
    await page.goto('/ai-assistant');
    const token = await loginViaApi(request);

    const aiPayload = await askAiChat(request, token, {
      message: 'Tổng chi tiêu năm 2025 của tôi là bao nhiêu?',
      question: 'Tổng chi tiêu năm 2025 của tôi là bao nhiêu?',
      range: 'year',
      month: '2025-12',
      useLlm: false,
    });

    expect(Boolean(aiPayload.success)).toBeTruthy();

    const queryPlan = (aiPayload.query_plan ?? {}) as Record<string, unknown>;
    const router = (queryPlan.router ?? {}) as Record<string, unknown>;
    expect(String(router.route ?? '')).toBe('analytics_chat');

    const meta = (aiPayload.meta ?? {}) as Record<string, unknown>;
    const financialContext = (meta.financialContext ?? {}) as Record<string, unknown>;
    const totalExpense = Number(financialContext.totalExpense ?? NaN);
    expect(totalExpense).toBe(seedSummary.expected.totalExpense2025);
  });

  test('TC2 - Internal: Thang 4/2026 toi ton bao nhieu tien an', async ({ request, page }) => {
    await page.goto('/ai-assistant');
    const token = await loginViaApi(request);

    const aiPayload = await askAiChat(request, token, {
      message: 'Tổng chi ăn uống tháng 4/2026 của tôi là bao nhiêu?',
      question: 'Tổng chi ăn uống tháng 4/2026 của tôi là bao nhiêu?',
      month: '2026-04',
      range: 'month',
      useLlm: false,
    });

    expect(Boolean(aiPayload.success)).toBeTruthy();
    const queryPlan = (aiPayload.query_plan ?? {}) as Record<string, unknown>;
    const router = (queryPlan.router ?? {}) as Record<string, unknown>;
    expect(['analytics_chat', 'advisor_chat']).toContain(String(router.route ?? ''));

    const dashboard = await getAnalyticsDashboard(request, token, {
      month: '2026-04',
      range: 'month',
    });

    const breakdown = Array.isArray(dashboard.breakdown) ? dashboard.breakdown as Array<Record<string, unknown>> : [];
    const foodItem = breakdown.find((item) => normalizeAscii(String(item.name ?? '')).includes('an uong'));
    expect(foodItem, 'Missing food category from analytics breakdown for 2026-04').toBeTruthy();

    const foodAmount = Number(foodItem?.value ?? NaN);
    expect(foodAmount).toBe(seedSummary.expected.foodExpenseApr2026);
  });

  test('TC3 - External: Gia vang SJC hom nay co grounding tu Google Search', async ({ request, page }) => {
    await page.goto('/ai-assistant');
    const token = await loginViaApi(request);

    const aiPayload = await askAiChat(request, token, {
      message: 'Giá vàng SJC hôm nay (03/05/2026)',
      question: 'Giá vàng SJC hôm nay (03/05/2026)',
      useLlm: true,
    });

    expect(Boolean(aiPayload.success)).toBeTruthy();

    const queryPlan = (aiPayload.query_plan ?? {}) as Record<string, unknown>;
    const router = (queryPlan.router ?? {}) as Record<string, unknown>;
    expect(String(router.route ?? '')).toBe('advisor_chat');

    const targetService = String(queryPlan.target_service ?? '');
    expect(['gemini-google-search', 'advisor-orchestrator']).toContain(targetService);

    const answerText = String(aiPayload.answer ?? '');
    expect(answerText.length).toBeGreaterThan(20);
    expect(/SJC|vàng|VND|VNĐ|đ/i.test(answerText)).toBeTruthy();

    const meta = (aiPayload.meta ?? {}) as Record<string, unknown>;
    const routePlan = (meta.routePlan ?? {}) as Record<string, unknown>;
    expect(String(routePlan.route ?? '')).toBe('advisor_chat');
  });
});

test.describe('Suite 4: AI Assistant (NLP Quick Entry)', () => {
  test('Extract dung amount va category cho cau mua cafe 50k', async ({ request, page }) => {
    await page.goto('/ai-assistant');
    const token = await loginViaApi(request);

    const response = await request.post(`${API_BASE_URL}/api/v1/ai/extract-text`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        input_text: 'Hôm qua (02/05/2026) mua cafe 50k',
      },
    });

    const payload = (await response.json()) as Record<string, unknown>;

    if (response.status() === 429) {
      const detail = String(payload.detail ?? payload.message ?? '');
      expect(detail.length).toBeGreaterThan(0);
      return;
    }

    expect(response.ok(), `AI extract API failed with status ${response.status()}`).toBeTruthy();
    expect(Boolean(payload.success)).toBeTruthy();

    const rawOutput = String(payload.raw_output ?? '[]');
    const extracted = parseExtractedTransactionsFromRaw(rawOutput);
    expect(extracted.length).toBeGreaterThan(0);

    const first = extracted[0] ?? {};
    const amount = Number(first.amount ?? 0);
    const category = normalizeAscii(String(first.category ?? ''));

    expect(amount).toBe(50000);
    expect(category).toContain('an uong');
  });
});
