import type { Request, Response } from 'express';
import crypto from 'crypto';
import redisClient from './redisClient';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://ai-service:8000';
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL ?? 'http://service-identity:3001';
const AI_ADVISOR_TIMEOUT_MS = Number(process.env.AI_ADVISOR_TIMEOUT_MS ?? 60_000);
const AI_ADVISOR_CACHE_TTL_SECONDS = Number(process.env.AI_ADVISOR_CACHE_TTL_SECONDS ?? 120);

type RuntimeAiConfig = {
  has_gemini_api_key: boolean;
  gemini_api_key: string | null;
  selected_ai_model: string;
  available_models: string[];
};

async function getAiConfig(req: Request): Promise<RuntimeAiConfig | null> {
  try {
    const response = await fetch(`${IDENTITY_SERVICE_URL}/settings/runtime-ai`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: String(req.headers.authorization ?? ''),
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return (await response.json()) as RuntimeAiConfig;
  } catch {
    return null;
  }
}

function parseUsage(data: Record<string, unknown>) {
  const llm = typeof data.llm === 'object' && data.llm !== null
    ? (data.llm as Record<string, unknown>)
    : {};
  const model = String(llm.model ?? '').trim();
  const usage = typeof llm.usage === 'object' && llm.usage !== null
    ? (llm.usage as Record<string, unknown>)
    : {};
  const totalTokens = Number(usage.total_tokens ?? 0);
  if (!model || !Number.isFinite(totalTokens) || totalTokens <= 0) return null;
  return {
    model,
    tokens_used: Math.round(totalTokens),
    estimated_cost: Number((totalTokens / 1_000_000 * 0.3).toFixed(6)),
  };
}

async function logUsage(req: Request, usage: { model: string; tokens_used: number; estimated_cost: number }) {
  try {
    await fetch(`${IDENTITY_SERVICE_URL}/settings/usage/append`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: String(req.headers.authorization ?? ''),
      },
      body: JSON.stringify(usage),
      signal: AbortSignal.timeout(6000),
    });
  } catch (error) {
    console.warn('[api-gateway] advisor: failed to append AI usage log:', error);
  }
}

type AdvisorRequestBody = {
  message?: string;
  sessionId?: string;
  riskProfile?: string;
  financialProfile?: Record<string, unknown>;
  useLlm?: boolean;
};

const localCache = new Map<string, { expiresAt: number; value: unknown }>();

function getMsg(body: AdvisorRequestBody): string {
  return typeof body.message === 'string' ? body.message.trim() : '';
}

function getSession(body: AdvisorRequestBody, userId: string): string {
  if (typeof body.sessionId === 'string' && body.sessionId.trim()) {
    return body.sessionId.trim();
  }
  return `${userId}-default`;
}

function cacheKey(userId: string, sessionId: string, message: string, riskProfile?: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ userId, sessionId, message, riskProfile: riskProfile ?? null }))
    .digest('hex');
  return `advisor:${hash}`;
}

async function readCache(key: string): Promise<unknown | null> {
  try {
    const fromRedis = await redisClient.get(key);
    if (fromRedis) {
      return JSON.parse(fromRedis);
    }
  } catch {
    // Fallback to local cache
  }

  const local = localCache.get(key);
  if (local && local.expiresAt > Date.now()) {
    return local.value;
  }
  return null;
}

async function writeCache(key: string, payload: unknown): Promise<void> {
  const raw = JSON.stringify(payload);

  try {
    await redisClient.setEx(key, AI_ADVISOR_CACHE_TTL_SECONDS, raw);
    return;
  } catch {
    // Fallback to local cache
  }

  localCache.set(key, {
    expiresAt: Date.now() + AI_ADVISOR_CACHE_TTL_SECONDS * 1000,
    value: payload,
  });
}

export async function handleAiAdvisorChat(req: Request, res: Response) {
  const userId = String((req as any).userId ?? 'anonymous');
  const body = (req.body ?? {}) as AdvisorRequestBody;
  const message = getMsg(body);

  if (message.length < 2) {
    return res.status(400).json({ message: 'message là bắt buộc và cần >= 2 ký tự.' });
  }

  const sessionId = getSession(body, userId);
  const key = cacheKey(userId, sessionId, message, body.riskProfile);

  const cached = await readCache(key);
  if (cached) {
    return res.status(200).json({
      ...(cached as Record<string, unknown>),
      meta: {
        ...(((cached as Record<string, unknown>).meta as Record<string, unknown>) ?? {}),
        cacheHit: true,
      },
    });
  }

  const runtimeConfig = await getAiConfig(req);

  const payload = {
    user_id: userId,
    session_id: sessionId,
    message,
    risk_profile: body.riskProfile ?? null,
    financial_profile: body.financialProfile ?? {},
    use_llm: body.useLlm ?? true,
    gemini_api_key: runtimeConfig?.gemini_api_key ?? null,
    selected_ai_model: runtimeConfig?.selected_ai_model ?? null,
  };

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/ai/advisor/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(AI_ADVISOR_TIMEOUT_MS),
    });

    const rawText = await response.text();
    let data: Record<string, unknown>;

    try {
      data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch {
      data = { success: false, message: rawText || 'Invalid response from ai-service advisor endpoint' };
    }

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const enriched = {
      ...data,
      meta: {
        ...(typeof data.meta === 'object' && data.meta !== null ? data.meta : {}),
        cacheHit: false,
      },
    };

    const usage = parseUsage(data);
    if (usage) {
      void logUsage(req, usage);
    }

    await writeCache(key, enriched);
    return res.status(200).json(enriched);
  } catch (error) {
    console.error('[api-gateway] AI advisor BFF error:', error);
    return res.status(504).json({
      success: false,
      message: 'AI advisor service timed out while generating a response.',
    });
  }
}
