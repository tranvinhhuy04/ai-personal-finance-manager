import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { AppError } from '../src/errors/AppError';
import {
  addApiKeyToPool,
  appendAiUsageLog,
  createDefaultUserSettings,
  createUser,
  findUserByEmail,
  findUserById,
  findUserSettings,
  markApiKeysExhaustedByIndices,
  migrateLegacyApiKey,
  removeApiKeyByIndex,
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

/** Dạng thô của một entry trong gemini_api_keys array từ MongoDB lean doc. */
type RawKeyEntry = { key?: unknown; status?: unknown; added_at?: unknown };

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
      // Corrupt data from DB is possible — validate only fields we depend on
      if (!row || typeof row.model !== 'string') return null;

      const parsedDate = new Date(row.date as string | Date);
      if (Number.isNaN(parsedDate.getTime())) return null;

      return {
        date: parsedDate.toISOString(),
        model: row.model.trim(),
        tokens_used: Math.round(Math.max(0, Number(row.tokens_used ?? 0))),
        estimated_cost: Number(Math.max(0, Number(row.estimated_cost ?? 0)).toFixed(6)),
      };
    })
    .filter((item): item is { date: string; model: string; tokens_used: number; estimated_cost: number } => Boolean(item));
}

function requireString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(`${fieldName} is required`, 400);
  }
}

function requireEmailFormat(email: string) {
  const normalized = email.trim().toLowerCase();
  // RFC 5322 simplified — rejects missing TLD, consecutive dots, etc.
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(normalized)) {
    throw new AppError('email is invalid', 400);
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
    updatedAt: row.updatedAt ?? null,
  };
}

export async function register({ email, password, fullName, phone }: RegisterInput) {
  requireString(email, 'email');
  requireEmailFormat(email);
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
  requireEmailFormat(email);
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

// ---------------------------------------------------------------------------
// Helpers for key pool
// ---------------------------------------------------------------------------

/** Đọc settings và tự động migrate legacy `gemini_api_key` string → array. */
async function getSettingsWithMigration(userId: string) {
  let settings = await findUserSettings(userId);
  if (!settings) {
    await upsertUserSettings(userId, {});
    settings = await findUserSettings(userId);
  }

  const raw = settings as any;
  const hasLegacy = typeof raw?.gemini_api_key === 'string' && raw.gemini_api_key.length > 0;
  const hasNewKeys = Array.isArray(raw?.gemini_api_keys) && raw.gemini_api_keys.length > 0;

  if (hasLegacy && !hasNewKeys) {
    await migrateLegacyApiKey(userId, raw.gemini_api_key as string);
    settings = await findUserSettings(userId);
  }

  return settings;
}

/** Giải mã một entry trong pool. Trả về null nếu lỗi. */
function decryptKeyEntry(entry: RawKeyEntry): string | null {
  if (typeof entry?.key !== 'string' || !entry.key) return null;
  try {
    return decryptSettingValue(entry.key);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------

export async function getSettings(userId: string) {
  requireString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('User not found', 401);
  }

  const settings = await getSettingsWithMigration(userId);
  const raw = settings as any;

  const apiKeysRaw: RawKeyEntry[] = Array.isArray(raw?.gemini_api_keys) ? raw.gemini_api_keys : [];

  // Build masked list for the UI
  const geminiApiKeys = apiKeysRaw.map((entry) => ({
    key_masked: maskApiKey(decryptKeyEntry(entry)),
    status: (entry?.status as string) ?? 'active',
    added_at: entry?.added_at ?? null,
  }));

  // First active key → probe available models
  let firstActivePlain: string | null = null;
  for (const entry of apiKeysRaw) {
    if (entry?.status === 'active') {
      firstActivePlain = decryptKeyEntry(entry);
      if (firstActivePlain) break;
    }
  }

  const selectedModelRaw = String(raw?.selected_ai_model ?? DEFAULT_AI_MODEL).trim();
  const selectedModel = selectedModelRaw.length > 0 ? selectedModelRaw : DEFAULT_AI_MODEL;
  const availableModelsFromKey = firstActivePlain ? await listGeminiModelsByApiKey(firstActivePlain) : [];
  const availableModels = Array.from(new Set([selectedModel, DEFAULT_AI_MODEL, ...availableModelsFromKey])).filter(Boolean);

  return {
    // New pool format
    gemini_api_keys: geminiApiKeys,
    has_gemini_api_key: geminiApiKeys.some((k) => k.status === 'active'),
    // Legacy compat (masked first active key)
    gemini_api_key_masked: geminiApiKeys.find((k) => k.status === 'active')?.key_masked ?? null,
    selected_ai_model: selectedModel,
    available_models: availableModels,
    ai_usage_logs: normalizeAiUsageLogs(raw?.ai_usage_logs ?? []),
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

  // If a new key is provided via legacy field, add it to the pool
  if (typeof payload.gemini_api_key === 'string' && payload.gemini_api_key.trim().length > 0) {
    await addApiKey(userId, payload.gemini_api_key.trim());
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

  if (Object.keys(updatePayload).length > 0) {
    await upsertUserSettings(userId, updatePayload);
  }

  return getSettings(userId);
}

export async function getRuntimeAiConfig(userId: string) {
  requireString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('User not found', 401);
  }

  const settings = await getSettingsWithMigration(userId);
  const raw = settings as any;

  const apiKeysRaw: RawKeyEntry[] = Array.isArray(raw?.gemini_api_keys) ? raw.gemini_api_keys : [];
  const selectedModelRaw = String(raw?.selected_ai_model ?? DEFAULT_AI_MODEL).trim();
  const selectedModel = selectedModelRaw.length > 0 ? selectedModelRaw : DEFAULT_AI_MODEL;

  // Decrypt all active keys, preserving original index for exhaustion tracking
  const activeKeys = apiKeysRaw
    .map((entry, idx) => {
      if (entry?.status !== 'active') return null;
      const plain = decryptKeyEntry(entry);
      if (!plain) return null;
      return { key: plain, index: idx };
    })
    .filter((item): item is { key: string; index: number } => item !== null);

  const firstActiveKey = activeKeys[0]?.key ?? null;
  const availableModels = firstActiveKey ? await listGeminiModelsByApiKey(firstActiveKey) : [];

  return {
    has_gemini_api_key: activeKeys.length > 0,
    // Full pool with indices — AI service uses these for rotation
    gemini_api_keys: activeKeys,
    // Legacy single-key field (first active key) for backward-compat consumers
    gemini_api_key: firstActiveKey,
    selected_ai_model: selectedModel,
    available_models: Array.from(new Set([selectedModel, DEFAULT_AI_MODEL, ...availableModels])).filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// API Key Pool management
// ---------------------------------------------------------------------------

/** Thêm một API Key mới vào pool (tối đa 10). */
export async function addApiKey(userId: string, plainKey: string) {
  requireString(userId, 'userId');
  requireString(plainKey, 'gemini_api_key');
  if (!Types.ObjectId.isValid(userId)) throw new AppError('User not found', 401);

  const trimmed = plainKey.trim();
  if (trimmed.length < 10) throw new AppError('API Key quá ngắn (tối thiểu 10 ký tự)', 400);

  // Kiểm tra số lượng hiện tại
  const settings = await findUserSettings(userId);
  const currentKeys: RawKeyEntry[] = Array.isArray((settings as any)?.gemini_api_keys)
    ? (settings as any).gemini_api_keys
    : [];
  if (currentKeys.length >= 10) {
    throw new AppError('Đã đạt giới hạn 10 API Keys. Vui lòng xóa key cũ trước.', 400);
  }

  const encrypted = encryptSettingValue(trimmed);
  await addApiKeyToPool(userId, encrypted);
  return getSettings(userId);
}

/** Xóa API Key tại vị trí `index` trong pool. */
export async function removeApiKey(userId: string, index: number) {
  requireString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) throw new AppError('User not found', 401);
  if (!Number.isInteger(index) || index < 0) throw new AppError('Index không hợp lệ', 400);

  const settings = await findUserSettings(userId);
  const currentKeys: RawKeyEntry[] = Array.isArray((settings as any)?.gemini_api_keys)
    ? (settings as any).gemini_api_keys
    : [];

  if (index >= currentKeys.length) {
    throw new AppError('API key index not found', 404);
  }

  await removeApiKeyByIndex(userId, index);
  return getSettings(userId);
}

/** Đánh dấu các keys tại `indices` là exhausted (hết quota). */
export async function markApiKeysExhausted(userId: string, indices: number[]) {
  requireString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) throw new AppError('User not found', 401);
  if (!Array.isArray(indices) || !indices.every(Number.isInteger)) {
    throw new AppError('indices phải là mảng số nguyên', 400);
  }

  await markApiKeysExhaustedByIndices(userId, indices);
  return { success: true };
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

