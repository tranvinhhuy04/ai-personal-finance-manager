import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import verifyToken from '../middlewares/verifyToken';

const router = Router();

const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL ?? 'http://service-identity:3001';
const WALLET_SERVICE_URL   = process.env.WALLET_SERVICE_URL   ?? 'http://service-wallet:3002';
const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL ?? 'http://service-transaction:3003';

// Proxy /api/auth -> service-identity
router.use(
  '/auth',
  createProxyMiddleware({
    target: IDENTITY_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' },
  })
);

// Proxy /api/wallets -> service-wallet (bắt buộc xác thực JWT)
router.use(
  '/wallets',
  verifyToken,
  createProxyMiddleware({
    target: WALLET_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/wallets': '' },
  })
);

// Proxy /api/transactions -> service-transaction (bắt buộc xác thực JWT)
router.use(
  '/transactions',
  verifyToken,
  createProxyMiddleware({
    target: TRANSACTION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/transactions': '' },
  })
);

export default router;
