"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTotpSecret = generateTotpSecret;
exports.buildOtpAuthUrl = buildOtpAuthUrl;
exports.verifyTotpCode = verifyTotpCode;
const otplib_1 = require("otplib");
// otplib v13 exports `verifySync` at runtime but the TypeScript declaration file
// is incomplete and doesn't include it.  Use a typed require() for this one
// symbol only, leaving the rest of the imports fully type-checked.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { verifySync } = require('otplib');
function generateTotpSecret() {
    return (0, otplib_1.generateSecret)();
}
function buildOtpAuthUrl(secret, email, issuer) {
    // generateURI({ secret, label, issuer }) → otpauth://totp/... URI
    return (0, otplib_1.generateURI)({ secret, label: email, issuer });
}
function verifyTotpCode(secret, token) {
    if (!token)
        return false;
    try {
        return verifySync({ secret, token }).valid;
    }
    catch {
        return false;
    }
}
