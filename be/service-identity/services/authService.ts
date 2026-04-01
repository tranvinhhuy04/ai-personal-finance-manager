import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { AppError } from '../src/errors/AppError';
import {
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

