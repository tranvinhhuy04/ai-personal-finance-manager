"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTotpSecret = generateTotpSecret;
exports.buildOtpAuthUrl = buildOtpAuthUrl;
exports.verifyTotpCode = verifyTotpCode;
const otplib_1 = require("otplib");
function generateTotpSecret() {
    return (0, otplib_1.generateSecret)();
}
function buildOtpAuthUrl(secret, email, issuer) {
    return (0, otplib_1.generateURI)({
        issuer,
        label: email,
        secret,
    });
}
function verifyTotpCode(secret, token) {
    if (!token)
        return false;
    return (0, otplib_1.verifySync)({ secret, token }).valid;
}
