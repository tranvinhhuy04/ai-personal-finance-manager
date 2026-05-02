import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 60 * 40; // 40m
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 60 * 60 * 24 * 7; // 7d
const TWO_FACTOR_PENDING_TTL_SECONDS =
  Number(process.env.TWO_FACTOR_PENDING_TTL_SECONDS) || 60 * 5; // 5m

export type TokenType = 'access' | 'refresh' | '2fa_pending';

type AccessPayload = { sub: string; type: 'access' };
type RefreshPayload = { sub: string; type: 'refresh' };
type TwoFactorPendingPayload = { sub: string; type: '2fa_pending' };

export function signAccessToken(userId: string): string {
  const payload: AccessPayload = { sub: userId, type: 'access' };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export function signRefreshToken(userId: string): string {
  const payload: RefreshPayload = { sub: userId, type: 'refresh' };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL_SECONDS });
}

export function signTwoFactorPendingToken(userId: string): string {
  const payload: TwoFactorPendingPayload = { sub: userId, type: '2fa_pending' };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TWO_FACTOR_PENDING_TTL_SECONDS });
}

export function verifyToken(token: string) {
  // Wrapper for consistent return type handling.
  return jwt.verify(token, JWT_SECRET);
}

