import crypto from 'crypto';
import type { Request, Response } from 'express';

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL ?? 'http://analytics-service:3004';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://ai-service:8000';
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL ?? 'http://service-identity:3001';
const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL ?? 'http://service-wallet:3002';
const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL ?? 'http://service-transaction:3003';
const AI_CONTEXT_TIMEOUT_MS = Number(process.env.AI_CONTEXT_TIMEOUT_MS ?? 8_000);
const AI_CONTEXT_CACHE_TTL_MS = Number(process.env.AI_CONTEXT_CACHE_TTL_MS ?? 30_000);
const AI_CHAT_UPSTREAM_TIMEOUT_MS = Number(process.env.AI_PROXY_TIMEOUT_MS ?? 60_000);
const AI_TOOL_TIMEOUT_MS = Number(process.env.AI_TOOL_TIMEOUT_MS ?? 12_000);

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

type RuntimeAiConfig = {
  has_gemini_api_key: boolean;
  gemini_api_key: string | null;
  gemini_api_keys?: Array<{ key: string; index: number }>;
  selected_ai_model: string;
  available_models: string[];
};

type WalletSummary = {
  id: string;
  walletName: string;
  walletType: string;
  balance: number;
  status: number;
};

type CategorySummary = {
  id: string;
  name: string;
  categoryType: 'EXPENSE' | 'INCOME';
  status: number;
};

type ExtractedTransactionDraft = {
  title: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
};

type ChatRequestBody = {
  message?: string;
  question?: string;
  context?: Record<string, unknown>;
  use_llm?: boolean;
  useLlm?: boolean;
  month?: string;
  walletId?: string;
  range?: string;
  from?: string;
  to?: string;
  sessionId?: string;
  riskProfile?: string;
  financialProfile?: Record<string, unknown>;
};

type ChatRoutePlan = {
  route: 'record_transactions' | 'analytics_chat' | 'advisor_chat';
  confidence: number;
  tools: string[];
  rationale: string;
};

const financialContextCache = new Map<string, { expiresAt: number; value: FinancialContext }>();

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeType(value: unknown): 'expense' | 'income' {
  return String(value ?? '').trim().toLowerCase() === 'income' ? 'income' : 'expense';
}

function isRecordIntent(message: string): boolean {
  const normalized = normalizeText(message);

  if (!normalized || /\?|bao nhieu|tong chi|tong thu|thang truoc|thang nay|gia vang|ty gia|co phieu|chung khoan/.test(normalized)) {
    return false;
  }

  const hasAmount = /\b\d+(?:[\.,]\d+)?\s*(k|nghin|ngan|tr|trieu|m|ty|vnd|d|dong)?\b/i.test(normalized);
  const hasActionCue = /(an|uong|mua|do xang|xang|tra|thanh toan|chi|tieu|nhan|luong|ban|gui xe|ca phe|pho|di an|nap|chuyen khoan|chuyen tien)/.test(normalized);
  return hasAmount && hasActionCue;
}

function isAnalyticsQuery(message: string): boolean {
  const normalized = normalizeText(message);
  if (/(thu nhap|chi tieu|tong chi|tong thu|so du|vi tien|thang nay|thang truoc|giao dich gan nhat|giao dich)/.test(normalized)) {
    return true;
  }

  // Savings amount queries ('tiet kiem duoc bao nhieu') need analytics context
  const hasSavingsAmountQuery = /tiet kiem/.test(normalized) && /(bao nhieu|so tien|duoc|con lai|de danh)/.test(normalized);
  if (hasSavingsAmountQuery) {
    return true;
  }

  // Be tolerant to mojibake/encoding issues coming from some terminals/clients.
  const coarse = normalized.replace(/[^a-z0-9\\s]/g, ' ').replace(/\\s+/g, ' ').trim();
  const hasMetricCue = /(\\bthu\\b|\\bchi\\b|\\btong\\b|\\bso du\\b|\\bgiao dich\\b|\\bincome\\b|\\bexpense\\b)/.test(coarse);
  const hasTimeCue = /(\\bthang\\b|\\bth\\b|\\bnay\\b|\\btruoc\\b|\\bquy\\b|\\bnam\\b|\\bmonth\\b|\\brecent\\b)/.test(coarse);
  return hasMetricCue && hasTimeCue;
}
function isMarketQuery(message: string): boolean {
  const normalized = normalizeText(message);
  return /(gia vang|ty gia|usd|chung khoan|co phieu|crypto|bitcoin|eth|lai suat|lai suat ngan hang)/.test(normalized);
}

function fixRoute(message: string, routePlan: ChatRoutePlan): ChatRoutePlan {
  if (routePlan.route === 'record_transactions') {
    return routePlan;
  }

  if (isMarketQuery(message)) {
    if (routePlan.route === 'advisor_chat') {
      return routePlan;
    }
    return {
      route: 'advisor_chat',
      confidence: Math.max(routePlan.confidence, 0.75),
      tools: ['advisor-orchestrator'],
      rationale: `${routePlan.rationale} Guardrail switched to advisor_chat for market/public knowledge query.`,
    };
  }

  if (isAnalyticsQuery(message) && routePlan.route === 'advisor_chat') {
    return {
      route: 'analytics_chat',
      confidence: Math.max(routePlan.confidence, 0.76),
      tools: ['analytics-service', 'nlp-service'],
      rationale: `${routePlan.rationale} Guardrail switched to analytics_chat for personal finance metrics lookup.`,
    };
  }

  return routePlan;
}

function getFallbackRoute(message: string): ChatRoutePlan {
  if (isRecordIntent(message)) {
    return {
      route: 'record_transactions',
      confidence: 0.72,
      tools: ['extract-text', 'get-wallets', 'get-categories', 'create-transactions'],
      rationale: 'Fallback heuristic detected transaction recording intent from amount and action cues.',
    };
  }

  if (isAnalyticsQuery(message)) {
    return {
      route: 'analytics_chat',
      confidence: 0.7,
      tools: ['analytics-service', 'nlp-service'],
      rationale: 'Fallback heuristic detected personal finance lookup that should use trusted analytics context.',
    };
  }

  return {
    route: 'advisor_chat',
    confidence: 0.6,
    tools: ['advisor-orchestrator'],
    rationale: 'Fallback route uses advisor pipeline for queries and analysis requests.',
  };
}

function shouldUseLlm(message: string, explicit: unknown): boolean {
  if (typeof explicit === 'boolean') {
    return explicit;
  }

  return /lời khuyên|goi y|gợi ý|tiet kiem|tiết kiệm|toi uu|tối ưu|phân tích|phan tich|kế hoạch|ke hoach|nên|giá vàng|gia vang|tỷ giá|ty gia|lãi suất|lai suat|chứng khoán|chung khoan|bitcoin|crypto/i.test(
    message
  );
}

function stripMarkdownCodeFence(input: string): string {
  const trimmed = input.trim();
  const lines = trimmed.split('\n');
  const openIdx = lines.findIndex((line) => /^```(?:json)?\s*$/i.test(line.trim()));

  if (openIdx === -1) {
    return trimmed;
  }

  const closeIdx = lines.findIndex((line, index) => index > openIdx && line.trim() === '```');
  if (closeIdx === -1) {
    return lines.slice(openIdx + 1).join('\n').trim();
  }

  return lines.slice(openIdx + 1, closeIdx).join('\n').trim();
}

function parseExtractedTransactions(raw: string): ExtractedTransactionDraft[] {
  const clean = stripMarkdownCodeFence(raw);
  const parsed = JSON.parse(clean);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const record = item as Record<string, unknown>;
      return {
        title: String(record.title ?? '').trim(),
        amount: Number(record.amount ?? 0),
        type: normalizeType(record.type),
        category: String(record.category ?? '').trim(),
      } satisfies ExtractedTransactionDraft;
    })
    .filter((item) => item.title && Number.isFinite(item.amount) && item.amount > 0);
}

function parseRawText(rawText: string): Record<string, unknown> {
  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return { success: false, message: rawText || 'Invalid response' };
  }
}

async function getRoute(
  message: string,
  runtimeAiConfig: RuntimeAiConfig | null,
): Promise<ChatRoutePlan> {
  const apiKey = String(runtimeAiConfig?.gemini_api_key ?? '').trim();
  const model = String(runtimeAiConfig?.selected_ai_model ?? 'gemini-2.0-flash').trim() || 'gemini-2.0-flash';

  if (!apiKey) {
    return getFallbackRoute(message);
  }

  const routerPrompt = [
    'Bạn là LLM router cho hệ thống Agentic RAG tài chính cá nhân.',
    'Nhiệm vụ: chọn DUY NHẤT một route xử lý tiếp theo cho tin nhắn người dùng.',
    'Route hợp lệ:',
    '1. record_transactions -> khi người dùng đang muốn ghi nhận một hoặc nhiều giao dịch thu/chi mới.',
    '2. analytics_chat -> khi người dùng đang hỏi số liệu tài chính cá nhân nội bộ như tổng chi, tổng thu, số dư, giao dịch gần đây, so sánh tháng.',
    '3. advisor_chat -> khi người dùng đang hỏi lời khuyên chuyên sâu, phân tích rộng hơn, hoặc hỏi dữ liệu thị trường công khai như giá vàng/tỷ giá/chứng khoán.',
    'Nếu tin nhắn có số tiền + mô tả hành động chi/thu và không phải câu hỏi tổng hợp, ưu tiên record_transactions.',
    'Nếu tin nhắn hỏi tổng chi tiêu, tổng thu nhập, số dư, dữ liệu cá nhân theo tháng/quý/năm, chọn analytics_chat.',
    'Nếu tin nhắn hỏi giá vàng, tỷ giá, chứng khoán hoặc lời khuyên tài chính sâu hơn, chọn advisor_chat.',
    'Trả về JSON DUY NHẤT theo schema:',
    '{"route":"record_transactions|analytics_chat|advisor_chat","confidence":0.0,"tools":["..."],"rationale":"..."}',
    `User message: ${message}`,
  ].join('\n');

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: routerPrompt }] }],
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 180,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
    signal: AbortSignal.timeout(Math.min(AI_CHAT_UPSTREAM_TIMEOUT_MS, 12_000)),
  });

  if (!response.ok) {
    return getFallbackRoute(message);
  }

  const rawData = (await response.json()) as Record<string, unknown>;
  const candidates = Array.isArray(rawData.candidates) ? rawData.candidates : [];
  const parts = candidates[0] && typeof candidates[0] === 'object'
    ? ((((candidates[0] as Record<string, unknown>).content as Record<string, unknown> | undefined)?.parts as Array<Record<string, unknown>> | undefined) ?? [])
    : [];
  const text = parts
    .map((part) => String(part.text ?? ''))
    .join('')
    .trim();

  if (!text) {
    return getFallbackRoute(message);
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const rawRoute = String(parsed.route ?? '').trim();
    const route = rawRoute === 'record_transactions'
      ? 'record_transactions'
      : rawRoute === 'analytics_chat'
        ? 'analytics_chat'
        : 'advisor_chat';
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.75) || 0.75));
    const tools = Array.isArray(parsed.tools) ? parsed.tools.map((item) => String(item)) : [];
    const rationale = String(parsed.rationale ?? '').trim() || 'LLM router selected the execution path.';

    return {
      route,
      confidence,
      tools: tools.length ? tools : route === 'record_transactions'
        ? ['extract-text', 'get-wallets', 'get-categories', 'create-transactions']
        : route === 'analytics_chat'
          ? ['analytics-service', 'nlp-service']
          : ['advisor-orchestrator'],
      rationale,
    };
  } catch {
    return getFallbackRoute(message);
  }
}

async function doAnalyticsChat(
  message: string,
  runtimeAiConfig: RuntimeAiConfig | null,
  financialContext: FinancialContext,
  body: ChatRequestBody,
): Promise<Record<string, unknown>> {
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
        ...((typeof clientContext.summary === 'object' && clientContext.summary !== null) ? clientContext.summary as Record<string, unknown> : {}),
        totalIncome: financialContext.totalIncome,
        totalExpense: financialContext.totalExpense,
        net: financialContext.netCashFlow,
        netCashFlow: financialContext.netCashFlow,
      },
      topExpenses: financialContext.topExpenses,
    },
    use_llm: shouldUseLlm(message, body.use_llm ?? body.useLlm),
    model: runtimeAiConfig?.selected_ai_model,
    gemini_api_key: runtimeAiConfig?.gemini_api_key,
  };

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
  const data = parseRawText(rawText);

  if (!response.ok) {
    throw new Error(String(data.detail ?? data.message ?? 'Analytics chat pipeline failed'));
  }

  return {
    ...data,
    meta: {
      ...(typeof data.meta === 'object' && data.meta !== null ? data.meta as Record<string, unknown> : {}),
      contextSource: 'analytics-chat',
      financialContext,
    },
  };
}

function guessCategoryId(
  type: 'expense' | 'income',
  categoryName: string,
  expenseCategories: CategorySummary[],
  incomeCategories: CategorySummary[],
): string {
  const source = type === 'income' ? incomeCategories : expenseCategories;
  const normalized = normalizeText(categoryName);

  if (!source.length) {
    return '';
  }

  const exact = source.find((item) => normalizeText(item.name) === normalized);
  if (exact) {
    return exact.id;
  }

  const partial = source.find((item) => {
    const current = normalizeText(item.name);
    return normalized.includes(current) || current.includes(normalized);
  });

  if (partial) {
    return partial.id;
  }

  const fallbackByAlias = source.find((item) => {
    const name = normalizeText(item.name);
    if (/an|uong|do an|nha hang|ca phe/.test(normalized)) {
      return /an|uong|food|do an|nha hang|cafe/.test(name);
    }
    if (/xang|di chuyen|gui xe|grab/.test(normalized)) {
      return /xang|di chuyen|transport|xe/.test(name);
    }
    if (/luong|thuong|thu nhap|ban hang/.test(normalized)) {
      return /luong|thu nhap|income|doanh thu/.test(name);
    }
    return false;
  });

  return fallbackByAlias?.id ?? source[0].id;
}

function buildTransactionAnswer(transactions: ExtractedTransactionDraft[], wallet: WalletSummary | null): string {
  const summary = transactions
    .map((item) => `${item.title} (${Math.round(item.amount).toLocaleString('vi-VN')}đ)`)
    .join(', ');

  if (!transactions.length) {
    return 'Mình chưa ghi được giao dịch nào từ nội dung bạn vừa gửi.';
  }

  if (!wallet) {
    return `Mình đã hiểu đây là yêu cầu ghi giao dịch và trích xuất được ${transactions.length} khoản: ${summary}, nhưng hiện chưa tìm thấy ví đang hoạt động để lưu.`;
  }

  return `Mình đã ghi nhận ${transactions.length} khoản vào ví ${wallet.walletName}: ${summary}.`;
}

function mapAdvisorIntent(intent: string, message: string): string {
  const normalizedIntent = String(intent ?? '').trim().toLowerCase();

  if (normalizedIntent === 'general_knowledge') {
    return 'general_knowledge';
  }

  if (normalizedIntent === 'external_financial_data') {
    return 'general_knowledge';
  }

  if ((normalizedIntent === 'out_of_scope' || normalizedIntent === 'unknown') && isMarketQuery(message)) {
    return 'general_knowledge';
  }

  if (normalizedIntent === 'financial_advice') {
    return 'financial_advice';
  }

  if (normalizedIntent === 'transaction_lookup') {
    return /thu nhap|thu nhập|luong|lương|income/i.test(message) ? 'query_income' : 'query_spending';
  }

  if (normalizedIntent === 'chart_analysis') {
    return 'financial_advice';
  }

  return 'unknown';
}

async function fetchWallets(req: Request): Promise<WalletSummary[]> {
  const response = await fetch(`${WALLET_SERVICE_URL}/api/v1/wallets`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: String(req.headers.authorization ?? ''),
    },
    signal: AbortSignal.timeout(AI_TOOL_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`wallet-service returned ${response.status}`);
  }

  const data = (await response.json()) as Array<Record<string, unknown>>;
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: String(item.id ?? ''),
    walletName: String(item.walletName ?? item.wallet_name ?? item.walletType ?? 'Wallet'),
    walletType: String(item.walletType ?? item.wallet_type ?? 'WALLET'),
    balance: toNumber(item.balance),
    status: toNumber(item.status ?? 1),
  }));
}

async function fetchCategories(req: Request, categoryType: 'EXPENSE' | 'INCOME'): Promise<CategorySummary[]> {
  const url = new URL('/api/v1/categories', TRANSACTION_SERVICE_URL);
  url.searchParams.set('category_type', categoryType);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: String(req.headers.authorization ?? ''),
    },
    signal: AbortSignal.timeout(AI_TOOL_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`transaction-service categories returned ${response.status}`);
  }

  const data = (await response.json()) as Array<Record<string, unknown>>;
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: String(item.id ?? item._id ?? ''),
    name: String(item.name ?? ''),
    categoryType: String(item.categoryType ?? item.category_type ?? categoryType).toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE',
    status: toNumber(item.status ?? 1),
  }));
}

async function createTransactionRecord(
  req: Request,
  payload: {
    wallet_id: string;
    category_id: string;
    amount: string;
    transaction_type: 'EXPENSE' | 'INCOME';
    description: string;
    occurred_at: string;
    idempotency_key: string;
  },
): Promise<Record<string, unknown>> {
  const response = await fetch(`${TRANSACTION_SERVICE_URL}/api/v1/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: String(req.headers.authorization ?? ''),
    },
    body: JSON.stringify({
      ...payload,
      currency: 'VND',
    }),
    signal: AbortSignal.timeout(AI_TOOL_TIMEOUT_MS),
  });

  const rawText = await response.text();
  const data = parseRawText(rawText);
  if (!response.ok) {
    throw new Error(String(data.message ?? `transaction-service returned ${response.status}`));
  }

  return data;
}

async function tryRecord(
  req: Request,
  message: string,
  runtimeAiConfig: RuntimeAiConfig | null,
): Promise<Record<string, unknown> | null> {
  const keyPool = runtimeAiConfig?.gemini_api_keys?.length ? runtimeAiConfig.gemini_api_keys : undefined;

  const response = await fetch(`${AI_SERVICE_URL}/api/v1/ai/extract-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      input_text: message,
      model: runtimeAiConfig?.selected_ai_model,
      // Pool rotation (preferred) — fallback to legacy single key
      gemini_api_keys: keyPool,
      gemini_api_key: !keyPool ? runtimeAiConfig?.gemini_api_key : undefined,
    }),
    signal: AbortSignal.timeout(AI_CHAT_UPSTREAM_TIMEOUT_MS),
  });

  const rawText = await response.text();
  const extractData = parseRawText(rawText);

  if (!response.ok) {
    throw new Error(String(extractData.detail ?? extractData.message ?? 'Không thể trích xuất giao dịch từ nội dung tự nhiên.'));
  }

  // Persist exhausted key indices (fire & forget)
  const exhaustedIndices = Array.isArray(extractData.exhausted_key_indices)
    ? (extractData.exhausted_key_indices as number[])
    : [];
  if (exhaustedIndices.length > 0) {
    void markKeysExhausted(req, exhaustedIndices);
  }

  if (!response.ok) {
    throw new Error(String(extractData.detail ?? extractData.message ?? 'Không thể trích xuất giao dịch từ nội dung tự nhiên.'));
  }

  const extracted = parseExtractedTransactions(String(extractData.raw_output ?? ''));
  if (!extracted.length) {
    return null;
  }

  const [wallets, expenseCategories, incomeCategories] = await Promise.all([
    fetchWallets(req),
    fetchCategories(req, 'EXPENSE'),
    fetchCategories(req, 'INCOME'),
  ]);

  const activeWallet = wallets.find((item) => item.status === 1) ?? wallets[0] ?? null;
  if (!activeWallet) {
    return {
      success: true,
      question: message,
      intent: 'record_transaction',
      confidence: 0.98,
      scores: { record_transaction: 0.98 },
      answer: buildTransactionAnswer(extracted, null),
      llm_used: true,
      query_plan: {
        action: 'record_multiple_transactions',
        target_service: 'service-transaction',
        tool_calls: ['extract-text', 'get-wallets'],
      },
      meta: {
        saved: false,
        extractionCount: extracted.length,
        reason: 'missing_active_wallet',
      },
    };
  }

  const created = await Promise.all(
    extracted.map((item, index) =>
      createTransactionRecord(req, {
        wallet_id: activeWallet.id,
        category_id: guessCategoryId(item.type, item.category, expenseCategories, incomeCategories),
        amount: String(Math.round(item.amount)),
        transaction_type: item.type === 'income' ? 'INCOME' : 'EXPENSE',
        description: item.title,
        occurred_at: new Date().toISOString(),
        idempotency_key: crypto.createHash('sha256').update(`${message}:${index}:${item.title}:${item.amount}`).digest('hex'),
      }),
    ),
  );

  return {
    success: true,
    question: message,
    intent: 'record_transaction',
    confidence: 0.99,
    scores: { record_transaction: 0.99 },
    answer: buildTransactionAnswer(extracted, activeWallet),
    llm_used: true,
    query_plan: {
      action: 'record_multiple_transactions',
      target_service: 'service-transaction',
      tool_calls: ['extract-text', 'get-wallets', 'get-categories', 'create-transactions'],
    },
    meta: {
      saved: true,
      extractionCount: extracted.length,
      wallet: activeWallet,
      createdTransactions: created,
      model: String(extractData.model ?? runtimeAiConfig?.selected_ai_model ?? ''),
    },
  };
}

async function doAdvisorChat(
  req: Request,
  message: string,
  runtimeAiConfig: RuntimeAiConfig | null,
  financialContext: FinancialContext,
  body: ChatRequestBody,
): Promise<Record<string, unknown>> {
  const clientContext = typeof body.context === 'object' && body.context !== null
    ? (body.context as Record<string, unknown>)
    : {};
  const userId = String((req as any).userId ?? 'anonymous');
  const sessionId = typeof body.sessionId === 'string' && body.sessionId.trim()
    ? body.sessionId.trim()
    : typeof clientContext.sessionId === 'string' && clientContext.sessionId.trim()
      ? String(clientContext.sessionId).trim()
      : `${userId}-default`;

  const payload = {
    user_id: userId,
    session_id: sessionId,
    message,
    risk_profile: body.riskProfile ?? null,
    financial_profile: {
      ...(typeof body.financialProfile === 'object' && body.financialProfile !== null ? body.financialProfile : {}),
      summary: {
        totalIncome: financialContext.totalIncome,
        totalExpense: financialContext.totalExpense,
        netCashFlow: financialContext.netCashFlow,
      },
      topExpenses: financialContext.topExpenses,
    },
    use_llm: shouldUseLlm(message, body.use_llm ?? body.useLlm),
    gemini_api_key: runtimeAiConfig?.gemini_api_key ?? null,
    selected_ai_model: runtimeAiConfig?.selected_ai_model ?? null,
  };

  const response = await fetch(`${AI_SERVICE_URL}/api/v1/ai/advisor/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(AI_CHAT_UPSTREAM_TIMEOUT_MS),
  });

  const rawText = await response.text();
  const data = parseRawText(rawText);

  if (!response.ok) {
    throw new Error(String(data.detail ?? data.message ?? 'Advisor pipeline failed'));
  }

  const advisorData = typeof data.data === 'object' && data.data !== null
    ? (data.data as Record<string, unknown>)
    : {};
  const advisorIntent = String(advisorData.intent ?? 'unknown');
  const llmMeta = typeof advisorData.llm === 'object' && advisorData.llm !== null
    ? (advisorData.llm as Record<string, unknown>)
    : {};
  const toolResult = typeof advisorData.tool_result === 'object' && advisorData.tool_result !== null
    ? (advisorData.tool_result as Record<string, unknown>)
    : {};

  return {
    success: true,
    question: message,
    intent: mapAdvisorIntent(advisorIntent, message),
    confidence: Number(advisorData.confidence ?? 0),
    scores: {},
    answer: String(data.message ?? advisorData.answer ?? ''),
    llm_used: Boolean(llmMeta.model),
    query_plan: {
      action: advisorIntent,
      target_service: advisorIntent === 'general_knowledge' ? 'gemini-google-search' : 'advisor-orchestrator',
      route: advisorIntent,
      entities: advisorData.entities ?? {},
    },
    meta: {
      contextSource: 'agentic-rag',
      financialContext,
      tool_result: toolResult,
      calculations: advisorData.calculations ?? {},
      memory: advisorData.memory ?? {},
      guardrails: advisorData.guardrails ?? {},
      llm: llmMeta,
    },
  };
}

function toFinCtx(dashboard: DashboardResponse): FinancialContext {
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

async function getFinCtx(req: Request): Promise<FinancialContext> {
  const userId = String((req as any).userId ?? 'anonymous');
  const body = (req.body ?? {}) as Record<string, unknown>;
  const month = typeof body.month === 'string' && body.month.trim() ? body.month.trim() : 'current';
  const walletId = typeof body.walletId === 'string' && body.walletId.trim() ? body.walletId.trim() : null;
  const range = typeof body.range === 'string' && body.range.trim() ? body.range.trim() : null;
  const from = typeof body.from === 'string' && body.from.trim() ? body.from.trim() : null;
  const to = typeof body.to === 'string' && body.to.trim() ? body.to.trim() : null;
  const cacheKey = `${userId}:${month}:${walletId ?? 'all'}:${range ?? 'default'}:${from ?? 'na'}:${to ?? 'na'}`;
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
  if (range) {
    url.searchParams.set('range', range);
  }
  if (from) {
    url.searchParams.set('from', from);
  }
  if (to) {
    url.searchParams.set('to', to);
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
  const financialContext = toFinCtx(dashboard);
  financialContextCache.set(cacheKey, {
    expiresAt: Date.now() + AI_CONTEXT_CACHE_TTL_MS,
    value: financialContext,
  });

  return financialContext;
}

function parseUsageMeta(payload: Record<string, unknown>) {
  const llm = typeof payload.llm === 'object' && payload.llm !== null
    ? (payload.llm as Record<string, unknown>)
    : {};

  const meta = typeof payload.meta === 'object' && payload.meta !== null
    ? (payload.meta as Record<string, unknown>)
    : {};
  const model = String(llm.model ?? meta.model ?? '').trim();
  const usage = typeof llm.usage === 'object' && llm.usage !== null
    ? (llm.usage as Record<string, unknown>)
    : {};

  const promptTokens = Number(usage.prompt_tokens ?? 0);
  const completionTokens = Number(usage.completion_tokens ?? 0);
  const totalTokens = Number(usage.total_tokens ?? promptTokens + completionTokens);

  if (!model || !Number.isFinite(totalTokens) || totalTokens <= 0) {
    return null;
  }

  const estimatedCost = Number((totalTokens / 1_000_000 * 0.3).toFixed(6));
  return {
    model,
    tokens_used: Math.round(totalTokens),
    estimated_cost: estimatedCost,
  };
}

async function fetchRuntimeAiConfig(req: Request): Promise<RuntimeAiConfig | null> {
  try {
    const response = await fetch(`${IDENTITY_SERVICE_URL}/settings/runtime-ai`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: String(req.headers.authorization ?? ''),
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as RuntimeAiConfig;
    return payload;
  } catch {
    return null;
  }
}

async function appendUsageLog(req: Request, usage: { model: string; tokens_used: number; estimated_cost: number }) {
  try {
    await fetch(`${IDENTITY_SERVICE_URL}/settings/usage/append`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: String(req.headers.authorization ?? ''),
      },
      body: JSON.stringify({
        model: usage.model,
        tokens_used: usage.tokens_used,
        estimated_cost: usage.estimated_cost,
      }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (error) {
    console.warn('[api-gateway] failed to append AI usage log:', error);
  }
}

/** Đánh dấu exhausted các keys có index trong `indices` về identity service. */
async function markKeysExhausted(req: Request, indices: number[]) {
  if (!indices.length) return;
  try {
    await fetch(`${IDENTITY_SERVICE_URL}/settings/api-keys/mark-exhausted`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: String(req.headers.authorization ?? ''),
      },
      body: JSON.stringify({ indices }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.warn('[api-gateway] failed to mark API keys exhausted:', error);
  }
}

export async function handleAiChat(req: Request, res: Response) {
  const body = (req.body ?? {}) as ChatRequestBody;
  const message = typeof body.message === 'string' && body.message.trim()
    ? body.message.trim()
    : typeof body.question === 'string' && body.question.trim()
      ? body.question.trim()
      : '';

  if (message.length < 2) {
    return res.status(400).json({ message: 'message hoặc question là bắt buộc.' });
  }

  const runtimeAiConfig = await fetchRuntimeAiConfig(req);
  // TODO: cache runtimeAiConfig per user sau nay
  console.log('[ai-chat] route msg len:', message.length);

  try {
    const plannedRoute = await getRoute(message, runtimeAiConfig);
    const routePlan = fixRoute(message, plannedRoute);

    if (routePlan.route === 'record_transactions') {
      const actionResponse = await tryRecord(req, message, runtimeAiConfig);
      if (actionResponse) {
        actionResponse.query_plan = {
          ...(typeof actionResponse.query_plan === 'object' && actionResponse.query_plan !== null ? actionResponse.query_plan as Record<string, unknown> : {}),
          router: routePlan,
        };
        actionResponse.meta = {
          ...(typeof actionResponse.meta === 'object' && actionResponse.meta !== null ? actionResponse.meta as Record<string, unknown> : {}),
          routePlan,
        };
        return res.status(200).json(actionResponse);
      }
    }

    let financialContext: FinancialContext = {
      totalIncome: 0,
      totalExpense: 0,
      netCashFlow: 0,
      topExpenses: [],
    };

    try {
      financialContext = await getFinCtx(req);
    } catch (error) {
      console.warn('[api-gateway] failed to enrich agentic chat context from analytics-service:', error);
    }

    const chatResponse = routePlan.route === 'analytics_chat'
      ? await doAnalyticsChat(message, runtimeAiConfig, financialContext, body)
      : await doAdvisorChat(req, message, runtimeAiConfig, financialContext, body);
    chatResponse.query_plan = {
      ...(typeof chatResponse.query_plan === 'object' && chatResponse.query_plan !== null ? chatResponse.query_plan as Record<string, unknown> : {}),
      router: routePlan,
    };
    chatResponse.meta = {
      ...(typeof chatResponse.meta === 'object' && chatResponse.meta !== null ? chatResponse.meta as Record<string, unknown> : {}),
      routePlan,
    };
    const usage = parseUsageMeta(routePlan.route === 'analytics_chat'
      ? (chatResponse as Record<string, unknown>)
      : {
          llm: ((chatResponse.meta as Record<string, unknown> | undefined)?.llm ?? {}) as Record<string, unknown>,
          meta: {},
        });
    if (usage) {
      void appendUsageLog(req, usage);
    }

    return res.status(200).json(chatResponse);
  } catch (error) {
    console.error('[api-gateway] AI chat BFF error:', error);
    return res.status(504).json({
      success: false,
      message: 'AI chat service timed out while generating a response.',
    });
  }
}
