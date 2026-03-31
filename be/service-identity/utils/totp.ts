import { generateSecret, generateURI } from 'otplib';

// otplib v13 exports `verifySync` at runtime but the TypeScript declaration file
// is incomplete and doesn't include it.  Use a typed require() for this one
// symbol only, leaving the rest of the imports fully type-checked.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { verifySync } = require('otplib') as {
  verifySync: (opts: { secret: string; token: string }) => { valid: boolean };
};

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildOtpAuthUrl(secret: string, email: string, issuer: string): string {
  // generateURI({ secret, label, issuer }) → otpauth://totp/... URI
  return generateURI({ secret, label: email, issuer });
}

export function verifyTotpCode(secret: string, token: string): boolean {
  if (!token) return false;
  try {
    return verifySync({ secret, token }).valid;
  } catch {
    return false;
  }
}

