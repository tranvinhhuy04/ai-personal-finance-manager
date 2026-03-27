"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.signTwoFactorPendingToken = signTwoFactorPendingToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 60 * 15; // 15m
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 60 * 60 * 24 * 7; // 7d
const TWO_FACTOR_PENDING_TTL_SECONDS = Number(process.env.TWO_FACTOR_PENDING_TTL_SECONDS) || 60 * 5; // 5m
function signAccessToken(userId) {
    const payload = { sub: userId, type: 'access' };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}
function signRefreshToken(userId) {
    const payload = { sub: userId, type: 'refresh' };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL_SECONDS });
}
function signTwoFactorPendingToken(userId) {
    const payload = { sub: userId, type: '2fa_pending' };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: TWO_FACTOR_PENDING_TTL_SECONDS });
}
function verifyToken(token) {
    // Wrapper for consistent return type handling.
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
