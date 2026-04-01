"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = __importDefault(require("../middlewares/requireAuth"));
const authController_1 = require("../src/controllers/authController");
const router = (0, express_1.Router)();
router.post('/register', authController_1.registerHandler);
router.post('/login', authController_1.loginHandler);
// Complete 2FA flow when login returned requires2FA=true
router.post('/login/2fa', authController_1.login2FAHandler);
router.post('/refresh', authController_1.refreshTokenHandler);
router.post('/logout', authController_1.logoutHandler);
router.get('/me', (0, requireAuth_1.default)('access'), authController_1.getMeHandler);
router.post('/2fa/setup', (0, requireAuth_1.default)('access'), authController_1.setup2FAHandler);
router.post('/2fa/verify', (0, requireAuth_1.default)('access'), authController_1.verify2FAHandler);
router.get('/2fa/status', (0, requireAuth_1.default)('access'), authController_1.get2FAStatusHandler);
exports.default = router;
