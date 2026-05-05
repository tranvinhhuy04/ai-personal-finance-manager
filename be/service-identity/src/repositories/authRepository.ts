import User from '../models/User';
import UserSettings from '../models/UserSettings';

type CreateUserInput = {
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
};

export async function findUserByEmail(email: string) {
  return User.findOne({ email }).lean();
}

export async function findUserById(userId: string) {
  return User.findById(userId).lean();
}

export async function createUser(input: CreateUserInput) {
  return User.create({
    email: input.email,
    passwordHash: input.passwordHash,
    fullName: input.fullName,
    phone: input.phone,
    status: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function createDefaultUserSettings(userId: string) {
  return UserSettings.create({
    userId,
    twoFactorEnabled: false,
    theme: 'dark',
    preferredCurrency: 'VND',
    locale: 'vi-VN',
    gemini_api_keys: [],
    updatedAt: new Date(),
  });
}

export async function findUserSettings(userId: string) {
  return UserSettings.findOne({ userId }).lean();
}

export async function upsertUserSettings(userId: string, update: Record<string, unknown>) {
  return UserSettings.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

/**
 * Thêm 1 encrypted key vào pool. $slice: -10 đảm bảo tối đa 10 keys.
 */
export async function addApiKeyToPool(userId: string, encryptedKey: string) {
  return UserSettings.findOneAndUpdate(
    { userId },
    {
      $push: {
        gemini_api_keys: {
          $each: [{ key: encryptedKey, status: 'active', added_at: new Date() }],
          $slice: -10,
        },
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: true, new: true }
  );
}

/**
 * Xóa key tại vị trí `index` trong mảng.
 * MongoDB không hỗ trợ xóa theo index trực tiếp → dùng $unset + $pull(null).
 */
export async function removeApiKeyByIndex(userId: string, index: number) {
  const unsetPath = `gemini_api_keys.${index}`;
  await UserSettings.findOneAndUpdate(
    { userId },
    { $unset: { [unsetPath]: 1 }, $set: { updatedAt: new Date() } }
  );
  return UserSettings.findOneAndUpdate(
    { userId },
    { $pull: { gemini_api_keys: null } }
  );
}

/**
 * Đánh dấu exhausted cho nhiều keys theo indices.
 * Dùng dynamic $set: { 'gemini_api_keys.0.status': 'exhausted', ... }
 */
export async function markApiKeysExhaustedByIndices(userId: string, indices: number[]) {
  if (!indices.length) return;
  const setFields: Record<string, unknown> = { updatedAt: new Date() };
  for (const idx of indices) {
    setFields[`gemini_api_keys.${idx}.status`] = 'exhausted';
  }
  return UserSettings.findOneAndUpdate({ userId }, { $set: setFields });
}

/**
 * Migration: chuyển legacy `gemini_api_key` (string) sang `gemini_api_keys` array.
 * Chỉ thực hiện khi array hiện tại rỗng.
 */
export async function migrateLegacyApiKey(userId: string, encryptedLegacyKey: string) {
  return UserSettings.findOneAndUpdate(
    { userId },
    {
      $push: {
        gemini_api_keys: { key: encryptedLegacyKey, status: 'active', added_at: new Date() },
      },
      $unset: { gemini_api_key: '' },
      $set: { updatedAt: new Date() },
    }
  );
}

export async function appendAiUsageLog(
  userId: string,
  log: {
    date: Date;
    model: string;
    tokens_used: number;
    estimated_cost: number;
  }
) {
  return UserSettings.findOneAndUpdate(
    { userId },
    {
      $push: {
        ai_usage_logs: {
          $each: [log],
          $slice: -500,
        },
      },
      $set: {
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}
