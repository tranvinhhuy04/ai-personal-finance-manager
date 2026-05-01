import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { AppError } from '../src/errors/AppError';
import {
  appendAiUsageLog,
  createDefaultUserSettings,
  createUser,
  findUserByEmail,
  findUserById,
  findUserSettings,
  upsertUserSettings,
} from '../src/repositories/authRepository';
import {
  signAccessToken,
  signRefreshToken,
  signTwoFactorPendingToken,
  verifyToken,
} from '../utils/jwt';
import { buildOtpAuthUrl, generateTotpSecret, verifyTotpCode } from '../utils/totp';

type RegisterInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
};

type LoginInput = {
  email: string;
  password: string;
  twoFactorCode?: string;
};

type LoginWith2FAInput = {
  twoFactorToken: string;
  code: string;
};

type RefreshInput = {
  refreshToken: string;
};

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
const DEFAULT_AI_MODEL = process.env.DEFAULT_GEMINI_MODEL ?? 'gemini-2.5-flash';
const SETTINGS_ENCRYPTION_SECRET =
  process.env.SETTINGS_ENCRYPTION_SECRET ??
  process.env.JWT_ACCESS_SECRET ??
  'identity-service-settings-secret';

type AIUsageLogInput = {
  date: string | Date;
  model: string;
  tokens_used: number;
  estimated_cost: number;
};

type AppendUsagePayload = {
  model: string;
  tokens_used: number;
  estimated_cost: number;
  date?: string | Date;
};

function getModelId(modelName: string) {
  return modelName.replace(/^models\//, '').trim();
}

async function listGeminiModelsByApiKey(apiKey: string) {
  if (!apiKey.trim()) {
    return [] as string[];
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return [] as string[];
    }

    const payload = (await response.json()) as {
      models?: Array<{
        name?: string;
        supportedGenerationMethods?: string[];
      }>;
    };

    const models = (payload.models ?? [])
      .filter((item) => Array.isArray(item.supportedGenerationMethods) && item.supportedGenerationMethods.includes('generateContent'))
      .map((item) => getModelId(String(item.name ?? '')))
      .filter((name) => name.startsWith('gemini-'));

    return Array.from(new Set(models));
  } catch {
    return [] as string[];
  }
}

function buildEncryptionKey() {
  return crypto.createHash('sha256').update(SETTINGS_ENCRYPTION_SECRET).digest();
}

function encryptSettingValue(plainText: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', buildEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSettingValue(cipherText: string) {
  const [ivHex, encryptedHex] = cipherText.split(':');
  if (!ivHex || !encryptedHex) {
    return null;
  }

  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', buildEncryptionKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function maskApiKey(apiKey: string | null) {
  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }
  if (apiKey.length <= 8) {
    return `${apiKey.slice(0, 2)}****`;
  }
  return `${apiKey.slice(0, 4)}****${apiKey.slice(-4)}`;
}

function normalizeAiUsageLogs(rawLogs: unknown) {
  if (!Array.isArray(rawLogs)) {
    return [] as Array<{
      date: string;
      model: string;
      tokens_used: number;
      estimated_cost: number;
    }>;
  }

  return rawLogs
    .map((item) => {
      const row = item as Partial<AIUsageLogInput>;
      if (!row || typeof row.model !== 'string') {
        return null;
      }

      const parsedDate = new Date(row.date as string | Date);
      if (Number.isNaN(parsedDate.getTime())) {
        return null;
      }

      const tokensUsed = Number(row.tokens_used ?? 0);
      const estimatedCost = Number(row.estimated_cost ?? 0);

      if (!Number.isFinite(tokensUsed) || tokensUsed < 0) {
        return null;
      }

      if (!Number.isFinite(estimatedCost) || estimatedCost < 0) {
        return null;
      }

      return {
        date: parsedDate.toISOString(),
        model: row.model.trim(),
        tokens_used: Math.round(tokensUsed),
        estimated_cost: Number(estimatedCost.toFixed(6)),
      };
    })
    .filter((item): item is { date: string; model: string; tokens_used: number; estimated_cost: number } => Boolean(item));
}

function requireString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(`${fieldName} is required`, 400);
  }
}

function requireMinLength(value: string, min: number, fieldName: string) {
  if (value.length < min) {
    throw new AppError(`${fieldName} must be at least ${min} characters`, 400);
  }
}

async function hashPassword(plainPassword: string) {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

async function verifyPassword(plainPassword: string, passwordHash: string) {
  return bcrypt.compare(plainPassword, passwordHash);
}

function issueTokenPair(userId: string) {
  return {
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId),
  };
}

async function findActiveUserByEmail(email: string) {
  const user = await findUserByEmail(email);
  if (!user || user.status !== 1) {
    throw new AppError('Invalid credentials', 401);
  }
  return user;
}

function toSafeUser(row: any) {
  return {
    userId: row.id ?? row._id?.toString(),
    email: row.email,
    fullName: row.fullName ?? '',
    phone: row.phone ?? null,
    status: row.status ?? 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? row.createdAt,
  };
}

export async function register({ email, password, fullName, phone }: RegisterInput) {
  requireString(email, 'email');
  requireMinLength(password, 8, 'password');
  requireString(fullName, 'fullName');
  if (phone != null && typeof phone !== 'string') {
    throw new AppError('phone must be a string', 400);
  }

  const emailNorm = email.trim().toLowerCase();
  const fullNameNorm = fullName.trim();
  const phoneNorm = phone ? phone.trim() : null;

  const existing = await findUserByEmail(emailNorm);
  if (existing) {
    throw new AppError('Email already exists', 409);
  }

  const passwordHash = await hashPassword(password);

  try {
    const createdUser = await createUser({
      email: emailNorm,
      passwordHash,
      fullName: fullNameNorm,
      phone: phoneNorm,
    });

    await createDefaultUserSettings(createdUser._id.toString());

    const userJson = createdUser.toJSON();
    const userId = createdUser._id.toString();

    return {
      user: toSafeUser(userJson),
      twoFactorEnabled: false,
      ...issueTokenPair(userId),
    };
  } catch (err: any) {
    if (err?.code === 11000) {
      throw new AppError('Email already exists', 409);
    }
    throw err;
  }
}

export async function login({ email, password, twoFactorCode }: LoginInput) {
  requireString(email, 'email');
  requireString(password, 'password');

  const emailNorm = email.trim().toLowerCase();
  const userDoc = await findActiveUserByEmail(emailNorm);

  const ok = await verifyPassword(password, userDoc.passwordHash);
  if (!ok) throw new AppError('Invalid credentials', 401);

  const settings = await findUserSettings(userDoc._id.toString());
  const twoFactorEnabled = Boolean(settings?.twoFactorEnabled);

  if (twoFactorEnabled) {
    if (!twoFactorCode || typeof twoFactorCode !== 'string') {
      const twoFactorToken = signTwoFactorPendingToken(userDoc._id.toString());
      return {
        requires2FA: true,
        twoFactorToken,
        user: toSafeUser(userDoc),
        twoFactorEnabled: true,
      };
    }

    const secret = settings?.twoFactorSecret;
    if (!secret) throw new AppError('2FA not configured', 401);

    const verified = verifyTotpCode(secret, twoFactorCode);
    if (!verified) throw new AppError('Invalid 2FA code', 401);

    return {
      user: toSafeUser(userDoc),
      twoFactorEnabled: true,
      ...issueTokenPair(userDoc._id.toString()),
    };
  }

  return {
    user: toSafeUser(userDoc),
    twoFactorEnabled: false,
    ...issueTokenPair(userDoc._id.toString()),
  };
}

export async function loginWith2FA({ twoFactorToken, code }: LoginWith2FAInput) {
  requireString(twoFactorToken, 'twoFactorToken');
  requireString(code, 'code');

  let decoded: any;
  try {
    decoded = verifyToken(twoFactorToken);
  } catch {
    throw new AppError('Invalid or expired 2FA token', 401);
  }

  if (decoded?.type !== '2fa_pending' || typeof decoded?.sub !== 'string') {
    throw new AppError('Invalid or expired 2FA token', 401);
  }

  const userId = decoded.sub;
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid or expired 2FA token', 401);
  }

  const settings = await findUserSettings(userId);
  if (!settings?.twoFactorEnabled || !settings?.twoFactorSecret) {
    throw new AppError('2FA not configured', 401);
  }

  const verified = verifyTotpCode(settings.twoFactorSecret, code);
  if (!verified) throw new AppError('Invalid 2FA code', 401);

  const userDoc = await findUserById(userId);
  if (!userDoc) throw new AppError('User not found', 401);

  return {
    user: toSafeUser(userDoc),
    twoFactorEnabled: true,
    ...issueTokenPair(userId),
  };
}

export async function refreshTokens({ refreshToken }: RefreshInput) {
  requireString(refreshToken, 'refreshToken');

  let decoded: any;
  try {
    decoded = verifyToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  if (decoded?.type !== 'refresh' || typeof decoded?.sub !== 'string') {
    throw new AppError('Invalid token', 401);
  }

  const userId = decoded.sub;
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid token', 401);
  }

  const userDoc = await findUserById(userId);
  if (!userDoc) throw new AppError('Invalid token', 401);

  return {
    user: toSafeUser(userDoc),
    ...issueTokenPair(userId),
  };
}

export async function logout() {
  return { success: true };
}

export async function getMe(userId: string) {
  requireString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('User not found', 401);
  }

  const userDoc = await findUserById(userId);
  if (!userDoc) throw new AppError('User not found', 401);

  const settings = await findUserSettings(userId);
  return {
    user: toSafeUser(userDoc),
    twoFactorEnabled: Boolean(settings?.twoFactorEnabled),
    preferredCurrency: settings?.preferredCurrency ?? 'VND',
    locale: settings?.locale ?? 'vi-VN',
  };
}

export async function setup2FA(userId: string) {
  requireString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('User not found', 401);
  }

  const user = await findUserById(userId);
  if (!user) throw new AppError('User not found', 401);

  const secret = generateTotpSecret();
  const otpauthUrl = buildOtpAuthUrl(secret, user.email, 'OripioFin');

  await upsertUserSettings(userId, {
    twoFactorEnabled: false,
    twoFactorMethod: 'TOTP',
    twoFactorSecret: secret,
  });

  return { otpauthUrl, secret };
}

export async function verify2FA(userId: string, code: unknown) {
  requireString(userId, 'userId');
  if (typeof code !== 'string') throw new AppError('code is required', 400);
  if (!Types.ObjectId.isValid(userId)) throw new AppError('User not found', 401);

  const settings = await findUserSettings(userId);
  if (!settings?.twoFactorSecret) throw new AppError('2FA secret not configured', 400);

  const verified = verifyTotpCode(settings.twoFactorSecret, code);
  if (!verified) throw new AppError('Invalid 2FA code', 401);

  await upsertUserSettings(userId, {
    twoFactorEnabled: true,
    twoFactorMethod: 'TOTP',
  });

  return { success: true, twoFactorEnabled: true };
}

export async function get2FAStatus(userId: string) {
  requireString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    return { twoFactorEnabled: false };
  }

  const settings = await findUserSettings(userId);
  return { twoFactorEnabled: Boolean(settings?.twoFactorEnabled) };
}

export async function getSettings(userId: string) {
  requireString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('User not found', 401);
  }

  const settings = await findUserSettings(userId);
  if (!settings) {
    await upsertUserSettings(userId, {});
  }

  const settingsAfterUpsert = settings ?? (await findUserSettings(userId));
  const encryptedApiKey = (settingsAfterUpsert as any)?.gemini_api_key as string | null | undefined;

  let decryptedApiKey: string | null = null;
  if (encryptedApiKey) {
    try {
      decryptedApiKey = decryptSettingValue(encryptedApiKey);
    } catch {
      decryptedApiKey = null;
    }
  }

  const aiUsageLogs = normalizeAiUsageLogs((settingsAfterUpsert as any)?.ai_usage_logs ?? []);
  const selectedModelRaw = String((settingsAfterUpsert as any)?.selected_ai_model ?? DEFAULT_AI_MODEL).trim();
  const selectedModel = selectedModelRaw.length > 0 ? selectedModelRaw : DEFAULT_AI_MODEL;
  const availableModelsFromApiKey = decryptedApiKey ? await listGeminiModelsByApiKey(decryptedApiKey) : [];
  const availableModels = Array.from(new Set([selectedModel, DEFAULT_AI_MODEL, ...availableModelsFromApiKey])).filter(Boolean);

  return {
    gemini_api_key_masked: maskApiKey(decryptedApiKey),
    has_gemini_api_key: Boolean(decryptedApiKey),
    selected_ai_model: selectedModel,
    available_models: availableModels,
    ai_usage_logs: aiUsageLogs,
  };
}

export async function updateSettings(
  userId: string,
  payload: {
    gemini_api_key?: string;
    selected_ai_model?: string;
    ai_usage_logs?: AIUsageLogInput[];
  }
) {
  requireString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('User not found', 401);
  }

  const updatePayload: Record<string, unknown> = {};

  if (typeof payload.gemini_api_key === 'string') {
    const trimmedApiKey = payload.gemini_api_key.trim();
    updatePayload.gemini_api_key = trimmedApiKey.length > 0 ? encryptSettingValue(trimmedApiKey) : null;
  }

  if (typeof payload.selected_ai_model === 'string') {
    const selectedModel = getModelId(payload.selected_ai_model);
    if (selectedModel.length > 0) {
      updatePayload.selected_ai_model = selectedModel;
    }
  }

  if (Array.isArray(payload.ai_usage_logs)) {
    const normalizedLogs = normalizeAiUsageLogs(payload.ai_usage_logs).map((item) => ({
      ...item,
      date: new Date(item.date),
    }));
    updatePayload.ai_usage_logs = normalizedLogs;
  }

  await upsertUserSettings(userId, updatePayload);
  return getSettings(userId);
}

export async function getRuntimeAiConfig(userId: string) {
  requireString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('User not found', 401);
  }

  const settings = await findUserSettings(userId);
  const encryptedApiKey = (settings as any)?.gemini_api_key as string | null | undefined;
  const selectedModelRaw = String((settings as any)?.selected_ai_model ?? DEFAULT_AI_MODEL).trim();
  const selectedModel = selectedModelRaw.length > 0 ? selectedModelRaw : DEFAULT_AI_MODEL;

  let decryptedApiKey: string | null = null;
  if (encryptedApiKey) {
    try {
      decryptedApiKey = decryptSettingValue(encryptedApiKey);
    } catch {
      decryptedApiKey = null;
    }
  }

  const availableModels = decryptedApiKey ? await listGeminiModelsByApiKey(decryptedApiKey) : [];

  return {
    has_gemini_api_key: Boolean(decryptedApiKey),
    gemini_api_key: decryptedApiKey,
    selected_ai_model: selectedModel,
    available_models: Array.from(new Set([selectedModel, DEFAULT_AI_MODEL, ...availableModels])).filter(Boolean),
  };
}

export async function appendUsageLog(userId: string, payload: AppendUsagePayload) {
  requireString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('User not found', 401);
  }

  if (!payload || typeof payload.model !== 'string' || payload.model.trim().length === 0) {
    throw new AppError('model is required', 400);
  }

  const tokensUsed = Number(payload.tokens_used);
  const estimatedCost = Number(payload.estimated_cost);

  if (!Number.isFinite(tokensUsed) || tokensUsed < 0) {
    throw new AppError('tokens_used must be a non-negative number', 400);
  }

  if (!Number.isFinite(estimatedCost) || estimatedCost < 0) {
    throw new AppError('estimated_cost must be a non-negative number', 400);
  }

  const logDate = payload.date ? new Date(payload.date) : new Date();
  if (Number.isNaN(logDate.getTime())) {
    throw new AppError('date is invalid', 400);
  }

  await appendAiUsageLog(userId, {
    date: logDate,
    model: getModelId(payload.model),
    tokens_used: Math.round(tokensUsed),
    estimated_cost: Number(estimatedCost.toFixed(6)),
  });

  return { success: true };
}

