import { generateSecret, generateURI, verifySync } from 'otplib';

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildOtpAuthUrl(secret: string, email: string, issuer: string): string {
  return generateURI({
    issuer,
    label: email,
    secret,
  });
}

export function verifyTotpCode(secret: string, token: string): boolean {
  if (!token) return false;
  return verifySync({ secret, token }).valid;
}

