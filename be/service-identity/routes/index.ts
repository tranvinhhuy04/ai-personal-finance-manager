import { Router } from 'express';
import requireAuth from '../middlewares/requireAuth';
import { loginHandler, registerHandler } from '../src/controllers/authController';
import {
  getMe,
  loginWith2FA,
  logout,
  refreshTokens,
  setup2FA,
  verify2FA,
  get2FAStatus,
} from '../services/authService';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);

// Complete 2FA flow when login returned requires2FA=true
router.post('/login/2fa', async (req, res) => {
  const { twoFactorToken, code } = req.body ?? {};
  try {
    const result = await loginWith2FA({ twoFactorToken, code });
    return res.status(200).json(result);
  } catch (err: any) {
    const code = err?.code;
    if (code === 'VALIDATION_ERROR') return res.status(400).json({ message: err?.message ?? 'Invalid input' });
    if (code === 'UNAUTHORIZED') return res.status(401).json({ message: err?.message ?? 'Invalid or expired 2FA token' });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body ?? {};
  try {
    const result = await refreshTokens({ refreshToken });
    return res.status(200).json(result);
  } catch (err: any) {
    const code = err?.code;
    if (code === 'VALIDATION_ERROR') return res.status(400).json({ message: err?.message ?? 'Invalid input' });
    if (code === 'UNAUTHORIZED') return res.status(401).json({ message: err?.message ?? 'Invalid token' });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/logout', async (_req, res) => {
  // Stateless logout (early phase): return OK without token revocation.
  const result = await logout();
  return res.status(200).json(result);
});

router.get('/me', requireAuth('access'), async (req, res) => {
  const userId = (req as any).userId as string;
  const result = await getMe(userId);
  return res.status(200).json(result);
});

router.post('/2fa/setup', requireAuth('access'), async (req, res) => {
  const userId = (req as any).userId as string;
  const result = await setup2FA(userId);
  return res.status(200).json(result);
});

router.post('/2fa/verify', requireAuth('access'), async (req, res) => {
  const userId = (req as any).userId as string;
  const { code } = req.body ?? {};
  const result = await verify2FA(userId, code);
  return res.status(200).json(result);
});

router.get('/2fa/status', requireAuth('access'), async (req, res) => {
  const userId = (req as any).userId as string;
  const result = await get2FAStatus(userId);
  return res.status(200).json(result);
});

export default router;

