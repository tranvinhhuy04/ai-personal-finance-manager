"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = __importDefault(require("../middlewares/requireAuth"));
const authController_1 = require("../src/controllers/authController");
/**
 * Auth Routes
 *
 * All handlers are wrapped in catchAsync inside the controller — if any
 * async operation throws, the error is forwarded to the global errorHandler
 * in app.ts without any response being left pending.
 *
 * Public routes (no JWT):
 *   POST /register
 *   POST /login
 *   POST /login/2fa
 *   POST /refresh
 *   POST /logout
 *
 * Protected routes (requireAuth middleware checks Bearer JWT):
 *   GET  /me
 *   POST /2fa/setup
 *   POST /2fa/verify
 *   GET  /2fa/status
 */
const router = (0, express_1.Router)();
// ── Public ───────────────────────────────────────────────────────────────────
router.post('/register', authController_1.registerHandler);
router.post('/login', authController_1.loginHandler);
router.post('/login/2fa', authController_1.loginWith2FAHandler);
router.post('/refresh', authController_1.refreshTokensHandler);
router.post('/logout', authController_1.logoutHandler);
// ── Protected (valid access JWT required) ────────────────────────────────────
router.get('/me', (0, requireAuth_1.default)('access'), authController_1.getMeHandler);
router.post('/2fa/setup', (0, requireAuth_1.default)('access'), authController_1.setup2FAHandler);
router.post('/2fa/verify', (0, requireAuth_1.default)('access'), authController_1.verify2FAHandler);
router.get('/2fa/status', (0, requireAuth_1.default)('access'), authController_1.get2FAStatusHandler);
exports.default = router;
