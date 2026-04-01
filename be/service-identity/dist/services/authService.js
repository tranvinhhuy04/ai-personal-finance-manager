"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.loginWith2FA = loginWith2FA;
exports.refreshTokens = refreshTokens;
exports.logout = logout;
exports.getMe = getMe;
exports.setup2FA = setup2FA;
exports.verify2FA = verify2FA;
exports.get2FAStatus = get2FAStatus;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = require("mongoose");
const AppError_1 = require("../src/errors/AppError");
const authRepository_1 = require("../src/repositories/authRepository");
const jwt_1 = require("../utils/jwt");
const totp_1 = require("../utils/totp");
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
function requireString(value, fieldName) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new AppError_1.AppError(`${fieldName} is required`, 400);
    }
}
function requireMinLength(value, min, fieldName) {
    if (value.length < min) {
        throw new AppError_1.AppError(`${fieldName} must be at least ${min} characters`, 400);
    }
}
async function hashPassword(plainPassword) {
    return bcryptjs_1.default.hash(plainPassword, BCRYPT_ROUNDS);
}
async function verifyPassword(plainPassword, passwordHash) {
    return bcryptjs_1.default.compare(plainPassword, passwordHash);
}
function issueTokenPair(userId) {
    return {
        accessToken: (0, jwt_1.signAccessToken)(userId),
        refreshToken: (0, jwt_1.signRefreshToken)(userId),
    };
}
async function findActiveUserByEmail(email) {
    const user = await (0, authRepository_1.findUserByEmail)(email);
    if (!user || user.status !== 1) {
        throw new AppError_1.AppError('Invalid credentials', 401);
    }
    return user;
}
function toSafeUser(row) {
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
async function register({ email, password, fullName, phone }) {
    requireString(email, 'email');
    requireMinLength(password, 8, 'password');
    requireString(fullName, 'fullName');
    if (phone != null && typeof phone !== 'string') {
        throw new AppError_1.AppError('phone must be a string', 400);
    }
    const emailNorm = email.trim().toLowerCase();
    const fullNameNorm = fullName.trim();
    const phoneNorm = phone ? phone.trim() : null;
    const existing = await (0, authRepository_1.findUserByEmail)(emailNorm);
    if (existing) {
        throw new AppError_1.AppError('Email already exists', 409);
    }
    const passwordHash = await hashPassword(password);
    try {
        const createdUser = await (0, authRepository_1.createUser)({
            email: emailNorm,
            passwordHash,
            fullName: fullNameNorm,
            phone: phoneNorm,
        });
        await (0, authRepository_1.createDefaultUserSettings)(createdUser._id.toString());
        const userJson = createdUser.toJSON();
        const userId = createdUser._id.toString();
        return {
            user: toSafeUser(userJson),
            twoFactorEnabled: false,
            ...issueTokenPair(userId),
        };
    }
    catch (err) {
        if (err?.code === 11000) {
            throw new AppError_1.AppError('Email already exists', 409);
        }
        throw err;
    }
}
async function login({ email, password, twoFactorCode }) {
    requireString(email, 'email');
    requireString(password, 'password');
    const emailNorm = email.trim().toLowerCase();
    const userDoc = await findActiveUserByEmail(emailNorm);
    const ok = await verifyPassword(password, userDoc.passwordHash);
    if (!ok)
        throw new AppError_1.AppError('Invalid credentials', 401);
    const settings = await (0, authRepository_1.findUserSettings)(userDoc._id.toString());
    const twoFactorEnabled = Boolean(settings?.twoFactorEnabled);
    if (twoFactorEnabled) {
        if (!twoFactorCode || typeof twoFactorCode !== 'string') {
            const twoFactorToken = (0, jwt_1.signTwoFactorPendingToken)(userDoc._id.toString());
            return {
                requires2FA: true,
                twoFactorToken,
                user: toSafeUser(userDoc),
                twoFactorEnabled: true,
            };
        }
        const secret = settings?.twoFactorSecret;
        if (!secret)
            throw new AppError_1.AppError('2FA not configured', 401);
        const verified = (0, totp_1.verifyTotpCode)(secret, twoFactorCode);
        if (!verified)
            throw new AppError_1.AppError('Invalid 2FA code', 401);
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
async function loginWith2FA({ twoFactorToken, code }) {
    requireString(twoFactorToken, 'twoFactorToken');
    requireString(code, 'code');
    let decoded;
    try {
        decoded = (0, jwt_1.verifyToken)(twoFactorToken);
    }
    catch {
        throw new AppError_1.AppError('Invalid or expired 2FA token', 401);
    }
    if (decoded?.type !== '2fa_pending' || typeof decoded?.sub !== 'string') {
        throw new AppError_1.AppError('Invalid or expired 2FA token', 401);
    }
    const userId = decoded.sub;
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new AppError_1.AppError('Invalid or expired 2FA token', 401);
    }
    const settings = await (0, authRepository_1.findUserSettings)(userId);
    if (!settings?.twoFactorEnabled || !settings?.twoFactorSecret) {
        throw new AppError_1.AppError('2FA not configured', 401);
    }
    const verified = (0, totp_1.verifyTotpCode)(settings.twoFactorSecret, code);
    if (!verified)
        throw new AppError_1.AppError('Invalid 2FA code', 401);
    const userDoc = await (0, authRepository_1.findUserById)(userId);
    if (!userDoc)
        throw new AppError_1.AppError('User not found', 401);
    return {
        user: toSafeUser(userDoc),
        twoFactorEnabled: true,
        ...issueTokenPair(userId),
    };
}
async function refreshTokens({ refreshToken }) {
    requireString(refreshToken, 'refreshToken');
    let decoded;
    try {
        decoded = (0, jwt_1.verifyToken)(refreshToken);
    }
    catch {
        throw new AppError_1.AppError('Invalid or expired token', 401);
    }
    if (decoded?.type !== 'refresh' || typeof decoded?.sub !== 'string') {
        throw new AppError_1.AppError('Invalid token', 401);
    }
    const userId = decoded.sub;
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new AppError_1.AppError('Invalid token', 401);
    }
    const userDoc = await (0, authRepository_1.findUserById)(userId);
    if (!userDoc)
        throw new AppError_1.AppError('Invalid token', 401);
    return {
        user: toSafeUser(userDoc),
        ...issueTokenPair(userId),
    };
}
async function logout() {
    return { success: true };
}
async function getMe(userId) {
    requireString(userId, 'userId');
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new AppError_1.AppError('User not found', 401);
    }
    const userDoc = await (0, authRepository_1.findUserById)(userId);
    if (!userDoc)
        throw new AppError_1.AppError('User not found', 401);
    const settings = await (0, authRepository_1.findUserSettings)(userId);
    return {
        user: toSafeUser(userDoc),
        twoFactorEnabled: Boolean(settings?.twoFactorEnabled),
        preferredCurrency: settings?.preferredCurrency ?? 'VND',
        locale: settings?.locale ?? 'vi-VN',
    };
}
async function setup2FA(userId) {
    requireString(userId, 'userId');
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new AppError_1.AppError('User not found', 401);
    }
    const user = await (0, authRepository_1.findUserById)(userId);
    if (!user)
        throw new AppError_1.AppError('User not found', 401);
    const secret = (0, totp_1.generateTotpSecret)();
    const otpauthUrl = (0, totp_1.buildOtpAuthUrl)(secret, user.email, 'OripioFin');
    await (0, authRepository_1.upsertUserSettings)(userId, {
        twoFactorEnabled: false,
        twoFactorMethod: 'TOTP',
        twoFactorSecret: secret,
    });
    return { otpauthUrl, secret };
}
async function verify2FA(userId, code) {
    requireString(userId, 'userId');
    if (typeof code !== 'string')
        throw new AppError_1.AppError('code is required', 400);
    if (!mongoose_1.Types.ObjectId.isValid(userId))
        throw new AppError_1.AppError('User not found', 401);
    const settings = await (0, authRepository_1.findUserSettings)(userId);
    if (!settings?.twoFactorSecret)
        throw new AppError_1.AppError('2FA secret not configured', 400);
    const verified = (0, totp_1.verifyTotpCode)(settings.twoFactorSecret, code);
    if (!verified)
        throw new AppError_1.AppError('Invalid 2FA code', 401);
    await (0, authRepository_1.upsertUserSettings)(userId, {
        twoFactorEnabled: true,
        twoFactorMethod: 'TOTP',
    });
    return { success: true, twoFactorEnabled: true };
}
async function get2FAStatus(userId) {
    requireString(userId, 'userId');
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        return { twoFactorEnabled: false };
    }
    const settings = await (0, authRepository_1.findUserSettings)(userId);
    return { twoFactorEnabled: Boolean(settings?.twoFactorEnabled) };
}
