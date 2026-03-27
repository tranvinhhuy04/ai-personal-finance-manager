"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = __importDefault(require("../middlewares/requireAuth"));
const authController_1 = require("../src/controllers/authController");
const authService_1 = require("../services/authService");
const router = (0, express_1.Router)();
router.post('/register', authController_1.registerHandler);
router.post('/login', authController_1.loginHandler);
// Complete 2FA flow when login returned requires2FA=true
router.post('/login/2fa', async (req, res) => {
    const { twoFactorToken, code } = req.body ?? {};
    try {
        const result = await (0, authService_1.loginWith2FA)({ twoFactorToken, code });
        return res.status(200).json(result);
    }
    catch (err) {
        const code = err?.code;
        if (code === 'VALIDATION_ERROR')
            return res.status(400).json({ message: err?.message ?? 'Invalid input' });
        if (code === 'UNAUTHORIZED')
            return res.status(401).json({ message: err?.message ?? 'Invalid or expired 2FA token' });
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body ?? {};
    try {
        const result = await (0, authService_1.refreshTokens)({ refreshToken });
        return res.status(200).json(result);
    }
    catch (err) {
        const code = err?.code;
        if (code === 'VALIDATION_ERROR')
            return res.status(400).json({ message: err?.message ?? 'Invalid input' });
        if (code === 'UNAUTHORIZED')
            return res.status(401).json({ message: err?.message ?? 'Invalid token' });
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/logout', async (_req, res) => {
    // Stateless logout (early phase): return OK without token revocation.
    const result = await (0, authService_1.logout)();
    return res.status(200).json(result);
});
router.get('/me', (0, requireAuth_1.default)('access'), async (req, res) => {
    const userId = req.userId;
    const result = await (0, authService_1.getMe)(userId);
    return res.status(200).json(result);
});
router.post('/2fa/setup', (0, requireAuth_1.default)('access'), async (req, res) => {
    const userId = req.userId;
    const result = await (0, authService_1.setup2FA)(userId);
    return res.status(200).json(result);
});
router.post('/2fa/verify', (0, requireAuth_1.default)('access'), async (req, res) => {
    const userId = req.userId;
    const { code } = req.body ?? {};
    const result = await (0, authService_1.verify2FA)(userId, code);
    return res.status(200).json(result);
});
router.get('/2fa/status', (0, requireAuth_1.default)('access'), async (req, res) => {
    const userId = req.userId;
    const result = await (0, authService_1.get2FAStatus)(userId);
    return res.status(200).json(result);
});
exports.default = router;
