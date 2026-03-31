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
const AppError_1 = require("../src/errors/AppError");
// ─── Validation helpers ───────────────────────────────────────────────────────
function assertString(value, fieldName) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new AppError_1.AppError(`${fieldName} is required`, 400);
    }
}
function assertMinLength(value, min, fieldName) {
    if (value.length < min) {
        throw new AppError_1.AppError(`${fieldName} must be at least ${min} characters`, 400);
    }
}
// ─── Serialisation ────────────────────────────────────────────────────────────
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
    assertString(email, 'email');
    assertString(password, 'password');
    assertMinLength(password, 8, 'password');
    assertString(fullName, 'fullName');
    if (phone != null && typeof phone !== 'string')
        throw new AppError_1.AppError('phone must be a string', 400);
    const emailNorm = email.trim().toLowerCase();
    const fullNameNorm = fullName.trim();
    const phoneNorm = phone ? phone.trim() : null;
    const existing = await User_1.default.findOne({ email: emailNorm }).lean();
    if (existing) {
        throw new AppError_1.AppError('Email already exists', 409);
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
            throw new AppError_1.AppError('Email already exists', 409);
        }
        throw err;
        throw err;
    }
}
async function login({ email, password, twoFactorCode }) {
    assertString(email, 'email');
    assertString(password, 'password');
    const emailNorm = email.trim().toLowerCase();
    const userDoc = await User_1.default.findOne({ email: emailNorm }).lean();
    if (!userDoc || userDoc.status !== 1) {
        throw new AppError_1.AppError('Invalid credentials', 401);
    }
    const ok = await bcryptjs_1.default.compare(password, userDoc.passwordHash);
    if (!ok)
        throw new AppError_1.AppError('Invalid credentials', 401);
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
            throw new AppError_1.AppError('2FA not configured', 400);
        const verified = (0, totp_1.verifyTotpCode)(secret, twoFactorCode);
        if (!verified)
            throw new AppError_1.AppError('Invalid 2FA code', 401);
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
    assertString(twoFactorToken, 'twoFactorToken');
    assertString(code, 'code');
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
    const settings = await UserSettings_1.default.findOne({ userId }).lean();
    if (!settings?.twoFactorEnabled || !settings?.twoFactorSecret) {
        throw new AppError_1.AppError('2FA not configured', 400);
    }
    const verified = (0, totp_1.verifyTotpCode)(settings.twoFactorSecret, code);
    if (!verified)
        throw new AppError_1.AppError('Invalid 2FA code', 401);
    const userDoc = await User_1.default.findById(userId).lean();
    if (!userDoc)
        throw new AppError_1.AppError('User not found', 401);
    return {
        user: toSafeUser(userDoc),
        twoFactorEnabled: true,
        accessToken: (0, jwt_1.signAccessToken)(userId),
        refreshToken: (0, jwt_1.signRefreshToken)(userId),
    };
}
async function refreshTokens({ refreshToken }) {
    assertString(refreshToken, 'refreshToken');
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
    const userDoc = await User_1.default.findById(userId).lean();
    if (!userDoc)
        throw new AppError_1.AppError('Invalid token', 401);
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
    assertString(userId, 'userId');
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new AppError_1.AppError('User not found', 404);
    }
    const userDoc = await User_1.default.findById(userId).lean();
    if (!userDoc)
        throw new AppError_1.AppError('User not found', 404);
    const settings = await UserSettings_1.default.findOne({ userId }).lean();
    return {
        user: toSafeUser(userDoc),
        twoFactorEnabled: Boolean(settings?.twoFactorEnabled),
        preferredCurrency: settings?.preferredCurrency ?? 'VND',
        locale: settings?.locale ?? 'vi-VN',
    };
}
async function setup2FA(userId) {
    assertString(userId, 'userId');
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new AppError_1.AppError('User not found', 404);
    }
    const user = await User_1.default.findById(userId).lean();
    if (!user)
        throw new AppError_1.AppError('User not found', 404);
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
    assertString(userId, 'userId');
    if (typeof code !== 'string')
        throw new AppError_1.AppError('code is required', 400);
    if (!mongoose_1.Types.ObjectId.isValid(userId))
        throw new AppError_1.AppError('User not found', 404);
    const settings = await UserSettings_1.default.findOne({ userId }).lean();
    if (!settings?.twoFactorSecret)
        throw new AppError_1.AppError('2FA secret not configured', 400);
    const verified = (0, totp_1.verifyTotpCode)(settings.twoFactorSecret, code);
    if (!verified)
        throw new AppError_1.AppError('Invalid 2FA code', 401);
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
    assertString(userId, 'userId');
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        return { twoFactorEnabled: false };
    }
    const settings = await UserSettings_1.default.findOne({ userId }).lean();
    return { twoFactorEnabled: Boolean(settings?.twoFactorEnabled) };
}
