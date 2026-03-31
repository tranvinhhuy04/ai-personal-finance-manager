import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import User from '../src/models/User';
import UserSettings from '../src/models/UserSettings';
import {
  signAccessToken,
  signRefreshToken,
  signTwoFactorPendingToken,
  verifyToken,
} from '../utils/jwt';
import { buildOtpAuthUrl, generateTotpSecret, verifyTotpCode } from '../utils/totp';
import { AppError } from '../src/errors/AppError';

// ─── Input types ─────────────────────────────────────────────────────────────

export type RegisterInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
};

export type LoginInput = {
  email: string;
  password: string;
  twoFactorCode?: string;
};

export type LoginWith2FAInput = {
  twoFactorToken: string;
  code: string;
};

export type RefreshInput = {
  refreshToken: string;
};

// ─── Validation helpers ───────────────────────────────────────────────────────

function assertString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(`${fieldName} is required`, 400);
  }
}

function assertMinLength(value: string, min: number, fieldName: string): void {
  if (value.length < min) {
    throw new AppError(`${fieldName} must be at least ${min} characters`, 400);
  }
}

// ─── Serialisation ────────────────────────────────────────────────────────────

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
  assertString(email, 'email');
  assertString(password, 'password');
  assertMinLength(password, 8, 'password');
  assertString(fullName, 'fullName');
  if (phone != null && typeof phone !== 'string') throw new AppError('phone must be a string', 400);

  const emailNorm = email.trim().toLowerCase();
  const fullNameNorm = fullName.trim();
  const phoneNorm = phone ? phone.trim() : null;

  const existing = await User.findOne({ email: emailNorm }).lean();
  if (existing) {
    throw new AppError('Email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const createdUser = await User.create({
      email: emailNorm,
      passwordHash,
      fullName: fullNameNorm,
      phone: phoneNorm,
      status: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await UserSettings.create({
      userId: createdUser._id,
      twoFactorEnabled: false,
      theme: 'dark',
      preferredCurrency: 'VND',
      locale: 'vi-VN',
      updatedAt: new Date(),
    });

    const userJson = createdUser.toJSON();
    const userId = createdUser._id.toString();

    return {
      user: toSafeUser(userJson),
      twoFactorEnabled: false,
      accessToken: signAccessToken(userId),
      refreshToken: signRefreshToken(userId),
    };
  } catch (err: any) {
    if (err?.code === 11000) {
      throw new AppError('Email already exists', 409);
    }
    throw err;
    throw err;
  }
}

export async function login({ email, password, twoFactorCode }: LoginInput) {
  assertString(email, 'email');
  assertString(password, 'password');

  const emailNorm = email.trim().toLowerCase();
  const userDoc = await User.findOne({ email: emailNorm }).lean();

  if (!userDoc || userDoc.status !== 1) {
    throw new AppError('Invalid credentials', 401);
  }

  const ok = await bcrypt.compare(password, userDoc.passwordHash);
  if (!ok) throw new AppError('Invalid credentials', 401);

  const settings = await UserSettings.findOne({ userId: userDoc._id }).lean();
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
    if (!secret) throw new AppError('2FA not configured', 400);

    const verified = verifyTotpCode(secret, twoFactorCode);
    if (!verified) throw new AppError('Invalid 2FA code', 401);

    return {
      user: toSafeUser(userDoc),
      twoFactorEnabled: true,
      accessToken: signAccessToken(userDoc._id.toString()),
      refreshToken: signRefreshToken(userDoc._id.toString()),
    };
  }

  return {
    user: toSafeUser(userDoc),
    twoFactorEnabled: false,
    accessToken: signAccessToken(userDoc._id.toString()),
    refreshToken: signRefreshToken(userDoc._id.toString()),
  };
}

export async function loginWith2FA({ twoFactorToken, code }: LoginWith2FAInput) {
  assertString(twoFactorToken, 'twoFactorToken');
  assertString(code, 'code');

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

  const settings = await UserSettings.findOne({ userId }).lean();
  if (!settings?.twoFactorEnabled || !settings?.twoFactorSecret) {
    throw new AppError('2FA not configured', 400);
  }

  const verified = verifyTotpCode(settings.twoFactorSecret, code);
  if (!verified) throw new AppError('Invalid 2FA code', 401);

  const userDoc = await User.findById(userId).lean();
  if (!userDoc) throw new AppError('User not found', 401);

  return {
    user: toSafeUser(userDoc),
    twoFactorEnabled: true,
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId),
  };
}

export async function refreshTokens({ refreshToken }: RefreshInput) {
  assertString(refreshToken, 'refreshToken');

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

  const userDoc = await User.findById(userId).lean();
  if (!userDoc) throw new AppError('Invalid token', 401);

  return {
    user: toSafeUser(userDoc),
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId),
  };
}

export async function logout() {
  return { success: true };
}

export async function getMe(userId: string) {
  assertString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('User not found', 404);
  }

  const userDoc = await User.findById(userId).lean();
  if (!userDoc) throw new AppError('User not found', 404);

  const settings = await UserSettings.findOne({ userId }).lean();
  return {
    user: toSafeUser(userDoc),
    twoFactorEnabled: Boolean(settings?.twoFactorEnabled),
    preferredCurrency: settings?.preferredCurrency ?? 'VND',
    locale: settings?.locale ?? 'vi-VN',
  };
}

export async function setup2FA(userId: string) {
  assertString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('User not found', 404);
  }

  const user = await User.findById(userId).lean();
  if (!user) throw new AppError('User not found', 404);

  const secret = generateTotpSecret();
  const otpauthUrl = buildOtpAuthUrl(secret, user.email, 'OripioFin');

  await UserSettings.findOneAndUpdate(
    { userId },
    {
      $set: {
        twoFactorEnabled: false,
        twoFactorMethod: 'TOTP',
        twoFactorSecret: secret,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return { otpauthUrl, secret };
}

export async function verify2FA(userId: string, code: unknown) {
  assertString(userId, 'userId');
  if (typeof code !== 'string') throw new AppError('code is required', 400);
  if (!Types.ObjectId.isValid(userId)) throw new AppError('User not found', 404);

  const settings = await UserSettings.findOne({ userId }).lean();
  if (!settings?.twoFactorSecret) throw new AppError('2FA secret not configured', 400);

  const verified = verifyTotpCode(settings.twoFactorSecret, code);
  if (!verified) throw new AppError('Invalid 2FA code', 401);

  await UserSettings.findOneAndUpdate(
    { userId },
    {
      $set: {
        twoFactorEnabled: true,
        twoFactorMethod: 'TOTP',
        updatedAt: new Date(),
      },
    }
  );

  return { success: true, twoFactorEnabled: true };
}

export async function get2FAStatus(userId: string) {
  assertString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    return { twoFactorEnabled: false };
  }

  const settings = await UserSettings.findOne({ userId }).lean();
  return { twoFactorEnabled: Boolean(settings?.twoFactorEnabled) };
}

