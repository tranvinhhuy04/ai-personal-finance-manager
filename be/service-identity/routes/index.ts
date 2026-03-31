import { Router } from 'express';
import requireAuth from '../middlewares/requireAuth';
import {
  registerHandler,
  loginHandler,
  loginWith2FAHandler,
  refreshTokensHandler,
  logoutHandler,
  getMeHandler,
  setup2FAHandler,
  verify2FAHandler,
  get2FAStatusHandler,
} from '../src/controllers/authController';

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
const router = Router();

// ── Public ───────────────────────────────────────────────────────────────────
router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/login/2fa', loginWith2FAHandler);
router.post('/refresh', refreshTokensHandler);
router.post('/logout', logoutHandler);

// ── Protected (valid access JWT required) ────────────────────────────────────
router.get('/me', requireAuth('access'), getMeHandler);
router.post('/2fa/setup', requireAuth('access'), setup2FAHandler);
router.post('/2fa/verify', requireAuth('access'), verify2FAHandler);
router.get('/2fa/status', requireAuth('access'), get2FAStatusHandler);

export default router;

