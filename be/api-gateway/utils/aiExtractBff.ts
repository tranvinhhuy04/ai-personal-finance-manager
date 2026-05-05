import type { Request, Response } from 'express';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://ai-service:8000';
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL ?? 'http://service-identity:3001';
const AI_PROXY_TIMEOUT_MS = Number(process.env.AI_PROXY_TIMEOUT_MS ?? 60_000);

type GeminiKeyEntry = { key: string; index: number };

type RuntimeAiConfig = {
  has_gemini_api_key: boolean;
  gemini_api_key: string | null;
  gemini_api_keys?: GeminiKeyEntry[];
  selected_ai_model: string;
  available_models: string[];
};

function parseUsageMeta(payload: Record<string, unknown>) {
  const llm = typeof payload.llm === 'object' && payload.llm !== null
    ? (payload.llm as Record<string, unknown>)
    : {};

  const model = String(llm.model ?? payload.model ?? '').trim();
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

function buildFailedAttemptUsage(model: string | null | undefined) {
  const resolvedModel = String(model ?? '').trim();
  if (!resolvedModel) {
    return null;
  }

  return {
    model: resolvedModel,
    tokens_used: 0,
    estimated_cost: 0,
  };
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
    console.warn('[api-gateway] failed to append AI usage log for extract-text:', error);
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

    return (await response.json()) as RuntimeAiConfig;
  } catch {
    return null;
  }
}

function parseRawText(rawText: string): Record<string, unknown> {
  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return { success: false, message: rawText || 'Invalid response from ai-service' };
  }
}

export async function handleAiExtractText(req: Request, res: Response) {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const inputText = typeof body.input_text === 'string' && body.input_text.trim()
    ? body.input_text.trim()
    : typeof body.inputText === 'string' && body.inputText.trim()
      ? body.inputText.trim()
      : '';

  if (inputText.length < 2) {
    return res.status(400).json({ message: 'input_text là bắt buộc.' });
  }

  const runtimeAiConfig = await fetchRuntimeAiConfig(req);

  const payload = {
    input_text: inputText,
    model: runtimeAiConfig?.selected_ai_model,
    // Pool rotation (preferred) — fallback to legacy single key
    gemini_api_keys: runtimeAiConfig?.gemini_api_keys?.length ? runtimeAiConfig.gemini_api_keys : undefined,
    gemini_api_key: !runtimeAiConfig?.gemini_api_keys?.length ? runtimeAiConfig?.gemini_api_key : undefined,
  };

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/ai/extract-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(AI_PROXY_TIMEOUT_MS),
    });

    const rawText = await response.text();
    const data = parseRawText(rawText);

    if (!response.ok) {
      const failedUsage = buildFailedAttemptUsage(runtimeAiConfig?.selected_ai_model ?? String(data.model ?? ''));
      if (failedUsage) {
        void appendUsageLog(req, failedUsage);
      }
      return res.status(response.status).json(data);
    }

    // Persist exhausted key indices back to identity service (fire & forget)
    const exhaustedIndices = Array.isArray(data.exhausted_key_indices)
      ? (data.exhausted_key_indices as number[])
      : [];
    if (exhaustedIndices.length > 0) {
      void markKeysExhausted(req, exhaustedIndices);
    }

    const usage = parseUsageMeta(data);
    if (usage) {
      void appendUsageLog(req, usage);
    }

    return res.status(200).json({
      ...data,
      model: runtimeAiConfig?.selected_ai_model ?? data.model,
      source: 'gateway-runtime-ai-config',
    });
  } catch (error) {
    console.error('[api-gateway] AI extract-text BFF error:', error);
    return res.status(504).json({
      success: false,
      message: 'AI extract-text service timed out while generating a response.',
    });
  }
}

export async function handleAiProviderStatus(req: Request, res: Response) {
  const runtimeAiConfig = await fetchRuntimeAiConfig(req);

  const payload = {
    model: runtimeAiConfig?.selected_ai_model,
    gemini_api_key: runtimeAiConfig?.gemini_api_key,
    probe: true,
  };

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/ai/provider-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });

    const rawText = await response.text();
    const data = parseRawText(rawText);

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json({
      ...data,
      selected_ai_model: runtimeAiConfig?.selected_ai_model ?? null,
      has_gemini_api_key: runtimeAiConfig?.has_gemini_api_key ?? false,
      source: 'gateway-runtime-ai-config',
    });
  } catch (error) {
    console.error('[api-gateway] AI provider-status BFF error:', error);
    return res.status(504).json({
      success: false,
      status: 'network_error',
      message: 'Không thể kiểm tra trạng thái Gemini provider.',
    });
  }
}
