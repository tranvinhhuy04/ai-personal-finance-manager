import { Router } from 'express';
import requireAuth from '../middlewares/requireAuth';
import {
  appendUsageLogHandler,
  get2FAStatusHandler,
  getRuntimeAiConfigHandler,
  getSettingsHandler,
  getMeHandler,
  login2FAHandler,
  loginHandler,
  logoutHandler,
  refreshTokenHandler,
  registerHandler,
  setup2FAHandler,
  updateSettingsHandler,
  verify2FAHandler,
} from '../src/controllers/authController';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);

// Complete 2FA flow when login returned requires2FA=true
router.post('/login/2fa', login2FAHandler);
router.post('/refresh', refreshTokenHandler);
router.post('/logout', logoutHandler);

router.get('/me', requireAuth('access'), getMeHandler);
router.post('/2fa/setup', requireAuth('access'), setup2FAHandler);
router.post('/2fa/verify', requireAuth('access'), verify2FAHandler);
router.get('/2fa/status', requireAuth('access'), get2FAStatusHandler);
router.get('/settings', requireAuth('access'), getSettingsHandler);
router.patch('/settings', requireAuth('access'), updateSettingsHandler);
router.get('/settings/runtime-ai', requireAuth('access'), getRuntimeAiConfigHandler);
router.post('/settings/usage/append', requireAuth('access'), appendUsageLogHandler);

export default router;

