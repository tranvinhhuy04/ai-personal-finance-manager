import { Router } from 'express';
import requireAuth from '../middlewares/requireAuth';
import {
  addApiKeyHandler,
  appendUsageLogHandler,
  get2FAStatusHandler,
  getRuntimeAiConfigHandler,
  getSettingsHandler,
  getMeHandler,
  login2FAHandler,
  loginHandler,
  logoutHandler,
  markApiKeysExhaustedHandler,
  refreshTokenHandler,
  registerHandler,
  removeApiKeyHandler,
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

// API Key Pool management
router.post('/settings/api-keys', requireAuth('access'), addApiKeyHandler);
router.delete('/settings/api-keys/:index', requireAuth('access'), removeApiKeyHandler);
router.patch('/settings/api-keys/mark-exhausted', requireAuth('access'), markApiKeysExhaustedHandler);

export default router;

