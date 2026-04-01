"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get2FAStatusHandler = exports.verify2FAHandler = exports.setup2FAHandler = exports.getMeHandler = exports.logoutHandler = exports.refreshTokenHandler = exports.login2FAHandler = exports.loginHandler = exports.registerHandler = void 0;
const authService_1 = require("../../services/authService");
const catchAsync_1 = require("../middlewares/catchAsync");
exports.registerHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { email, password, fullName, phone } = req.body ?? {};
    const result = await (0, authService_1.register)({ email, password, fullName, phone });
    return res.status(201).json(result);
});
exports.loginHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    try {
        const { email, password, twoFactorCode } = req.body ?? {};
        const result = await (0, authService_1.login)({ email, password, twoFactorCode });
        return res.status(200).json(result);
    }
    catch (err) {
        if (err?.statusCode === 401) {
            return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });
        }
        throw err;
    }
});
exports.login2FAHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { twoFactorToken, code } = req.body ?? {};
    const result = await (0, authService_1.loginWith2FA)({ twoFactorToken, code });
    return res.status(200).json(result);
});
exports.refreshTokenHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { refreshToken } = req.body ?? {};
    const result = await (0, authService_1.refreshTokens)({ refreshToken });
    return res.status(200).json(result);
});
exports.logoutHandler = (0, catchAsync_1.catchAsync)(async (_req, res) => {
    const result = await (0, authService_1.logout)();
    return res.status(200).json(result);
});
exports.getMeHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.userId;
    const result = await (0, authService_1.getMe)(userId);
    return res.status(200).json(result);
});
exports.setup2FAHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.userId;
    const result = await (0, authService_1.setup2FA)(userId);
    return res.status(200).json(result);
});
exports.verify2FAHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.userId;
    const { code } = req.body ?? {};
    const result = await (0, authService_1.verify2FA)(userId, code);
    return res.status(200).json(result);
});
exports.get2FAStatusHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.userId;
    const result = await (0, authService_1.get2FAStatus)(userId);
    return res.status(200).json(result);
});
