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

function validationError(message: string) {
  const err: any = new Error(message);
  err.code = 'VALIDATION_ERROR';
  return err;
}

function unauthorizedError(message: string) {
  const err: any = new Error(message);
  err.code = 'UNAUTHORIZED';
  return err;
}

function requireString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw validationError(`${fieldName} is required`);
  }
}

function requireMinLength(value: string, min: number, fieldName: string) {
  if (value.length < min) {
    throw validationError(`${fieldName} must be at least ${min} characters`);
  }
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
  if (phone != null && typeof phone !== 'string') throw validationError('phone must be a string');

  const emailNorm = email.trim().toLowerCase();
  const fullNameNorm = fullName.trim();
  const phoneNorm = phone ? phone.trim() : null;

  const existing = await User.findOne({ email: emailNorm }).lean();
  if (existing) {
    throw { code: 'EMAIL_EXISTS', message: 'Email already exists' };
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
      throw { code: 'EMAIL_EXISTS', message: 'Email already exists' };
    }
    throw err;
  }
}

export async function login({ email, password, twoFactorCode }: LoginInput) {
  requireString(email, 'email');
  requireString(password, 'password');

  const emailNorm = email.trim().toLowerCase();
  const userDoc = await User.findOne({ email: emailNorm }).lean();

  if (!userDoc || userDoc.status !== 1) {
    throw unauthorizedError('Invalid credentials');
  }

  const ok = await bcrypt.compare(password, userDoc.passwordHash);
  if (!ok) throw unauthorizedError('Invalid credentials');

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
    if (!secret) throw unauthorizedError('2FA not configured');

    const verified = verifyTotpCode(secret, twoFactorCode);
    if (!verified) throw unauthorizedError('Invalid 2FA code');

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
  requireString(twoFactorToken, 'twoFactorToken');
  requireString(code, 'code');

  let decoded: any;
  try {
    decoded = verifyToken(twoFactorToken);
  } catch {
    throw unauthorizedError('Invalid or expired 2FA token');
  }

  if (decoded?.type !== '2fa_pending' || typeof decoded?.sub !== 'string') {
    throw unauthorizedError('Invalid or expired 2FA token');
  }

  const userId = decoded.sub;
  if (!Types.ObjectId.isValid(userId)) {
    throw unauthorizedError('Invalid or expired 2FA token');
  }

  const settings = await UserSettings.findOne({ userId }).lean();
  if (!settings?.twoFactorEnabled || !settings?.twoFactorSecret) {
    throw unauthorizedError('2FA not configured');
  }

  const verified = verifyTotpCode(settings.twoFactorSecret, code);
  if (!verified) throw unauthorizedError('Invalid 2FA code');

  const userDoc = await User.findById(userId).lean();
  if (!userDoc) throw unauthorizedError('User not found');

  return {
    user: toSafeUser(userDoc),
    twoFactorEnabled: true,
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId),
  };
}

export async function refreshTokens({ refreshToken }: RefreshInput) {
  requireString(refreshToken, 'refreshToken');

  let decoded: any;
  try {
    decoded = verifyToken(refreshToken);
  } catch {
    throw unauthorizedError('Invalid or expired token');
  }

  if (decoded?.type !== 'refresh' || typeof decoded?.sub !== 'string') {
    throw unauthorizedError('Invalid token');
  }

  const userId = decoded.sub;
  if (!Types.ObjectId.isValid(userId)) {
    throw unauthorizedError('Invalid token');
  }

  const userDoc = await User.findById(userId).lean();
  if (!userDoc) throw unauthorizedError('Invalid token');

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
  requireString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    throw unauthorizedError('User not found');
  }

  const userDoc = await User.findById(userId).lean();
  if (!userDoc) throw unauthorizedError('User not found');

  const settings = await UserSettings.findOne({ userId }).lean();
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
    throw unauthorizedError('User not found');
  }

  const user = await User.findById(userId).lean();
  if (!user) throw unauthorizedError('User not found');

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
  requireString(userId, 'userId');
  if (typeof code !== 'string') throw validationError('code is required');
  if (!Types.ObjectId.isValid(userId)) throw unauthorizedError('User not found');

  const settings = await UserSettings.findOne({ userId }).lean();
  if (!settings?.twoFactorSecret) throw validationError('2FA secret not configured');

  const verified = verifyTotpCode(settings.twoFactorSecret, code);
  if (!verified) throw unauthorizedError('Invalid 2FA code');

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
  requireString(userId, 'userId');
  if (!Types.ObjectId.isValid(userId)) {
    return { twoFactorEnabled: false };
  }

  const settings = await UserSettings.findOne({ userId }).lean();
  return { twoFactorEnabled: Boolean(settings?.twoFactorEnabled) };
}

