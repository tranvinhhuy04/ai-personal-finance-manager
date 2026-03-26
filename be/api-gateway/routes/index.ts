import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import verifyToken from '../middlewares/verifyToken';

const router = Router();

// Proxy /api/auth -> service-identity
router.use(
  '/auth',
  createProxyMiddleware({
    target: 'http://service-identity:3001',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' },
  })
);

// Proxy /api/wallets -> service-wallet (bắt buộc xác thực JWT)
router.use(
  '/wallets',
  verifyToken,
  createProxyMiddleware({
    target: 'http://service-wallet:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/wallets': '' },
  })
);

export default router;
