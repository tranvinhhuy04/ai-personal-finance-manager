import type { Request, Response } from 'express';
import crypto from 'crypto';
import redisClient from './redisClient';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://ai-service:8000';
const AI_ADVISOR_TIMEOUT_MS = Number(process.env.AI_ADVISOR_TIMEOUT_MS ?? 60_000);
const AI_ADVISOR_CACHE_TTL_SECONDS = Number(process.env.AI_ADVISOR_CACHE_TTL_SECONDS ?? 120);

type AdvisorRequestBody = {
  message?: string;
  sessionId?: string;
  riskProfile?: string;
  financialProfile?: Record<string, unknown>;
  useLlm?: boolean;
};

const localCache = new Map<string, { expiresAt: number; value: unknown }>();

function normalizeMessage(body: AdvisorRequestBody): string {
  return typeof body.message === 'string' ? body.message.trim() : '';
}

function getSessionId(body: AdvisorRequestBody, userId: string): string {
  if (typeof body.sessionId === 'string' && body.sessionId.trim()) {
    return body.sessionId.trim();
  }
  return `${userId}-default`;
}

function buildCacheKey(userId: string, sessionId: string, message: string, riskProfile?: string): string {
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
  const message = normalizeMessage(body);

  if (message.length < 2) {
    return res.status(400).json({ message: 'message là bắt buộc và cần >= 2 ký tự.' });
  }

  const sessionId = getSessionId(body, userId);
  const cacheKey = buildCacheKey(userId, sessionId, message, body.riskProfile);

  const cached = await readCache(cacheKey);
  if (cached) {
    return res.status(200).json({
      ...(cached as Record<string, unknown>),
      meta: {
        ...(((cached as Record<string, unknown>).meta as Record<string, unknown>) ?? {}),
        cacheHit: true,
      },
    });
  }

  const payload = {
    user_id: userId,
    session_id: sessionId,
    message,
    risk_profile: body.riskProfile ?? null,
    financial_profile: body.financialProfile ?? {},
    use_llm: body.useLlm ?? true,
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

    await writeCache(cacheKey, enriched);
    return res.status(200).json(enriched);
  } catch (error) {
    console.error('[api-gateway] AI advisor BFF error:', error);
    return res.status(504).json({
      success: false,
      message: 'AI advisor service timed out while generating a response.',
    });
  }
}
