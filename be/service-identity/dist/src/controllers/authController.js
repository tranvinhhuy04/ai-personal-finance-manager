"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.get2FAStatusHandler = exports.verify2FAHandler = exports.setup2FAHandler = exports.getMeHandler = exports.logoutHandler = exports.refreshTokensHandler = exports.loginWith2FAHandler = exports.loginHandler = exports.registerHandler = void 0;
const catchAsync_1 = require("../middlewares/catchAsync");
const authService = __importStar(require("../../services/authService"));
/**
 * Controllers are intentionally thin: validate nothing, do no business logic.
 * Each handler is wrapped in catchAsync so any AppError thrown by the service
 * is automatically forwarded to the global errorHandler via next(err).
 *
 * Result: every branch (success, validation, auth, DB) is guaranteed to send
 * exactly one response — no more hanging requests.
 */
exports.registerHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { email, password, fullName, phone } = req.body ?? {};
    const result = await authService.register({ email, password, fullName, phone });
    res.status(201).json(result);
});
exports.loginHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { email, password, twoFactorCode } = req.body ?? {};
    const result = await authService.login({ email, password, twoFactorCode });
    res.status(200).json(result);
});
exports.loginWith2FAHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { twoFactorToken, code } = req.body ?? {};
    const result = await authService.loginWith2FA({ twoFactorToken, code });
    res.status(200).json(result);
});
exports.refreshTokensHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { refreshToken } = req.body ?? {};
    const result = await authService.refreshTokens({ refreshToken });
    res.status(200).json(result);
});
exports.logoutHandler = (0, catchAsync_1.catchAsync)(async (_req, res) => {
    const result = await authService.logout();
    res.status(200).json(result);
});
exports.getMeHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.userId;
    const result = await authService.getMe(userId);
    res.status(200).json(result);
});
exports.setup2FAHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.userId;
    const result = await authService.setup2FA(userId);
    res.status(200).json(result);
});
exports.verify2FAHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.userId;
    const { code } = req.body ?? {};
    const result = await authService.verify2FA(userId, code);
    res.status(200).json(result);
});
exports.get2FAStatusHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.userId;
    const result = await authService.get2FAStatus(userId);
    res.status(200).json(result);
});
