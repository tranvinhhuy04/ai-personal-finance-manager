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
const User_1 = __importDefault(require("../src/models/User"));
const UserSettings_1 = __importDefault(require("../src/models/UserSettings"));
const jwt_1 = require("../utils/jwt");
const totp_1 = require("../utils/totp");
function validationError(message) {
    const err = new Error(message);
    err.code = 'VALIDATION_ERROR';
    return err;
}
function unauthorizedError(message) {
    const err = new Error(message);
    err.code = 'UNAUTHORIZED';
    return err;
}
function requireString(value, fieldName) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw validationError(`${fieldName} is required`);
    }
}
function requireMinLength(value, min, fieldName) {
    if (value.length < min) {
        throw validationError(`${fieldName} must be at least ${min} characters`);
    }
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
    if (phone != null && typeof phone !== 'string')
        throw validationError('phone must be a string');
    const emailNorm = email.trim().toLowerCase();
    const fullNameNorm = fullName.trim();
    const phoneNorm = phone ? phone.trim() : null;
    const existing = await User_1.default.findOne({ email: emailNorm }).lean();
    if (existing) {
        throw { code: 'EMAIL_EXISTS', message: 'Email already exists' };
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    try {
        const createdUser = await User_1.default.create({
            email: emailNorm,
            passwordHash,
            fullName: fullNameNorm,
            phone: phoneNorm,
            status: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await UserSettings_1.default.create({
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
            accessToken: (0, jwt_1.signAccessToken)(userId),
            refreshToken: (0, jwt_1.signRefreshToken)(userId),
        };
    }
    catch (err) {
        if (err?.code === 11000) {
            throw { code: 'EMAIL_EXISTS', message: 'Email already exists' };
        }
        throw err;
    }
}
async function login({ email, password, twoFactorCode }) {
    requireString(email, 'email');
    requireString(password, 'password');
    const emailNorm = email.trim().toLowerCase();
    const userDoc = await User_1.default.findOne({ email: emailNorm }).lean();
    if (!userDoc || userDoc.status !== 1) {
        throw unauthorizedError('Invalid credentials');
    }
    const ok = await bcryptjs_1.default.compare(password, userDoc.passwordHash);
    if (!ok)
        throw unauthorizedError('Invalid credentials');
    const settings = await UserSettings_1.default.findOne({ userId: userDoc._id }).lean();
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
            throw unauthorizedError('2FA not configured');
        const verified = (0, totp_1.verifyTotpCode)(secret, twoFactorCode);
        if (!verified)
            throw unauthorizedError('Invalid 2FA code');
        return {
            user: toSafeUser(userDoc),
            twoFactorEnabled: true,
            accessToken: (0, jwt_1.signAccessToken)(userDoc._id.toString()),
            refreshToken: (0, jwt_1.signRefreshToken)(userDoc._id.toString()),
        };
    }
    return {
        user: toSafeUser(userDoc),
        twoFactorEnabled: false,
        accessToken: (0, jwt_1.signAccessToken)(userDoc._id.toString()),
        refreshToken: (0, jwt_1.signRefreshToken)(userDoc._id.toString()),
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
        throw unauthorizedError('Invalid or expired 2FA token');
    }
    if (decoded?.type !== '2fa_pending' || typeof decoded?.sub !== 'string') {
        throw unauthorizedError('Invalid or expired 2FA token');
    }
    const userId = decoded.sub;
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw unauthorizedError('Invalid or expired 2FA token');
    }
    const settings = await UserSettings_1.default.findOne({ userId }).lean();
    if (!settings?.twoFactorEnabled || !settings?.twoFactorSecret) {
        throw unauthorizedError('2FA not configured');
    }
    const verified = (0, totp_1.verifyTotpCode)(settings.twoFactorSecret, code);
    if (!verified)
        throw unauthorizedError('Invalid 2FA code');
    const userDoc = await User_1.default.findById(userId).lean();
    if (!userDoc)
        throw unauthorizedError('User not found');
    return {
        user: toSafeUser(userDoc),
        twoFactorEnabled: true,
        accessToken: (0, jwt_1.signAccessToken)(userId),
        refreshToken: (0, jwt_1.signRefreshToken)(userId),
    };
}
async function refreshTokens({ refreshToken }) {
    requireString(refreshToken, 'refreshToken');
    let decoded;
    try {
        decoded = (0, jwt_1.verifyToken)(refreshToken);
    }
    catch {
        throw unauthorizedError('Invalid or expired token');
    }
    if (decoded?.type !== 'refresh' || typeof decoded?.sub !== 'string') {
        throw unauthorizedError('Invalid token');
    }
    const userId = decoded.sub;
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw unauthorizedError('Invalid token');
    }
    const userDoc = await User_1.default.findById(userId).lean();
    if (!userDoc)
        throw unauthorizedError('Invalid token');
    return {
        user: toSafeUser(userDoc),
        accessToken: (0, jwt_1.signAccessToken)(userId),
        refreshToken: (0, jwt_1.signRefreshToken)(userId),
    };
}
async function logout() {
    return { success: true };
}
async function getMe(userId) {
    requireString(userId, 'userId');
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw unauthorizedError('User not found');
    }
    const userDoc = await User_1.default.findById(userId).lean();
    if (!userDoc)
        throw unauthorizedError('User not found');
    const settings = await UserSettings_1.default.findOne({ userId }).lean();
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
        throw unauthorizedError('User not found');
    }
    const user = await User_1.default.findById(userId).lean();
    if (!user)
        throw unauthorizedError('User not found');
    const secret = (0, totp_1.generateTotpSecret)();
    const otpauthUrl = (0, totp_1.buildOtpAuthUrl)(secret, user.email, 'OripioFin');
    await UserSettings_1.default.findOneAndUpdate({ userId }, {
        $set: {
            twoFactorEnabled: false,
            twoFactorMethod: 'TOTP',
            twoFactorSecret: secret,
            updatedAt: new Date(),
        },
    }, { upsert: true });
    return { otpauthUrl, secret };
}
async function verify2FA(userId, code) {
    requireString(userId, 'userId');
    if (typeof code !== 'string')
        throw validationError('code is required');
    if (!mongoose_1.Types.ObjectId.isValid(userId))
        throw unauthorizedError('User not found');
    const settings = await UserSettings_1.default.findOne({ userId }).lean();
    if (!settings?.twoFactorSecret)
        throw validationError('2FA secret not configured');
    const verified = (0, totp_1.verifyTotpCode)(settings.twoFactorSecret, code);
    if (!verified)
        throw unauthorizedError('Invalid 2FA code');
    await UserSettings_1.default.findOneAndUpdate({ userId }, {
        $set: {
            twoFactorEnabled: true,
            twoFactorMethod: 'TOTP',
            updatedAt: new Date(),
        },
    });
    return { success: true, twoFactorEnabled: true };
}
async function get2FAStatus(userId) {
    requireString(userId, 'userId');
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        return { twoFactorEnabled: false };
    }
    const settings = await UserSettings_1.default.findOne({ userId }).lean();
    return { twoFactorEnabled: Boolean(settings?.twoFactorEnabled) };
}
