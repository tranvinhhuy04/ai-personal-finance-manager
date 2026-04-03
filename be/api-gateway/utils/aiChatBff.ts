import type { Request, Response } from 'express';

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL ?? 'http://analytics-service:3004';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://ai-service:8000';
const AI_CONTEXT_TIMEOUT_MS = Number(process.env.AI_CONTEXT_TIMEOUT_MS ?? 8_000);
const AI_CONTEXT_CACHE_TTL_MS = Number(process.env.AI_CONTEXT_CACHE_TTL_MS ?? 30_000);
const AI_CHAT_UPSTREAM_TIMEOUT_MS = Number(process.env.AI_PROXY_TIMEOUT_MS ?? 60_000);

type TopExpense = {
  name: string;
  amount: number;
  transactionCount?: number;
};

type FinancialContext = {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  topExpenses: TopExpense[];
};

type DashboardResponse = {
  summary?: {
    totalIncome?: number;
    totalExpense?: number;
    net?: number;
    netCashFlow?: number;
  };
  breakdown?: Array<{
    name?: string;
    value?: number;
    transactionCount?: number;
  }>;
};

const financialContextCache = new Map<string, { expiresAt: number; value: FinancialContext }>();

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shouldUseLlm(message: string, explicit: unknown): boolean {
  if (typeof explicit === 'boolean') {
    return explicit;
  }

  return /lời khuyên|goi y|gợi ý|tiet kiem|tiết kiệm|toi uu|tối ưu|phân tích|phan tich|kế hoạch|ke hoach|nên/i.test(
    message
  );
}

function buildFinancialContext(dashboard: DashboardResponse): FinancialContext {
  const totalIncome = toNumber(dashboard.summary?.totalIncome);
  const totalExpense = toNumber(dashboard.summary?.totalExpense);
  const netCashFlow = toNumber(dashboard.summary?.netCashFlow ?? dashboard.summary?.net ?? totalIncome - totalExpense);
  const topExpenses = (dashboard.breakdown ?? []).slice(0, 3).map((item) => ({
    name: String(item.name ?? 'Khác'),
    amount: toNumber(item.value),
    transactionCount: toNumber(item.transactionCount),
  }));

  return {
    totalIncome,
    totalExpense,
    netCashFlow,
    topExpenses,
  };
}

async function fetchAnalyticsDashboard(req: Request): Promise<FinancialContext> {
  const userId = String((req as any).userId ?? 'anonymous');
  const body = (req.body ?? {}) as Record<string, unknown>;
  const month = typeof body.month === 'string' && body.month.trim() ? body.month.trim() : 'current';
  const walletId = typeof body.walletId === 'string' && body.walletId.trim() ? body.walletId.trim() : null;
  const cacheKey = `${userId}:${month}:${walletId ?? 'all'}`;
  const cached = financialContextCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const url = new URL('/api/v1/analytics/dashboard', ANALYTICS_SERVICE_URL);
  if (month && month !== 'current') {
    url.searchParams.set('month', month);
  }
  if (walletId) {
    url.searchParams.set('walletId', walletId);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: String(req.headers.authorization ?? ''),
    },
    signal: AbortSignal.timeout(AI_CONTEXT_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`analytics-service returned ${response.status}: ${text}`);
  }

  const dashboard = (await response.json()) as DashboardResponse;
  const financialContext = buildFinancialContext(dashboard);
  financialContextCache.set(cacheKey, {
    expiresAt: Date.now() + AI_CONTEXT_CACHE_TTL_MS,
    value: financialContext,
  });

  return financialContext;
}

export async function handleAiChat(req: Request, res: Response) {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const message = typeof body.message === 'string' && body.message.trim()
    ? body.message.trim()
    : typeof body.question === 'string' && body.question.trim()
      ? body.question.trim()
      : '';

  if (message.length < 2) {
    return res.status(400).json({ message: 'message hoặc question là bắt buộc.' });
  }

  let financialContext: FinancialContext = {
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    topExpenses: [],
  };
  let contextSource = 'fallback';

  try {
    financialContext = await fetchAnalyticsDashboard(req);
    contextSource = 'analytics-service';
  } catch (error) {
    console.warn('[api-gateway] failed to enrich AI chat context from analytics-service:', error);
  }

  const clientContext = typeof body.context === 'object' && body.context !== null
    ? (body.context as Record<string, unknown>)
    : {};

  const payload = {
    message,
    question: message,
    financialContext,
    context: {
      ...clientContext,
      financialContext,
      summary: {
        totalIncome: financialContext.totalIncome,
        totalExpense: financialContext.totalExpense,
        net: financialContext.netCashFlow,
        netCashFlow: financialContext.netCashFlow,
      },
      topExpenses: financialContext.topExpenses,
    },
    use_llm: shouldUseLlm(message, body.use_llm ?? body.useLlm),
  };

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(AI_CHAT_UPSTREAM_TIMEOUT_MS),
    });

    const rawText = await response.text();
    let data: Record<string, unknown>;

    try {
      data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch {
      data = { success: false, message: rawText || 'Invalid response from ai-service' };
    }

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json({
      ...data,
      meta: {
        ...(typeof data.meta === 'object' && data.meta !== null ? data.meta : {}),
        contextSource,
        financialContext,
      },
    });
  } catch (error) {
    console.error('[api-gateway] AI chat BFF error:', error);
    return res.status(504).json({
      success: false,
      message: 'AI chat service timed out while generating a response.',
    });
  }
}
