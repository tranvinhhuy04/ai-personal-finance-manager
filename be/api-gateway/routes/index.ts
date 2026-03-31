import { Router, Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { ClientRequest } from 'http';
import { IncomingMessage } from 'http';
import verifyToken from '../middlewares/verifyToken';

const router = Router();

const PROXY_TIMEOUT_MS = 10_000; // 10 seconds

const IDENTITY_SERVICE_URL    = process.env.IDENTITY_SERVICE_URL    ?? 'http://service-identity:3001';
const WALLET_SERVICE_URL      = process.env.WALLET_SERVICE_URL      ?? 'http://service-wallet:3002';
const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL ?? 'http://service-transaction:3003';

/** Shared error handler — returns 504 when upstream is unreachable or times out */
function onProxyError(err: Error, _req: IncomingMessage, res: Response) {
  console.error('[api-gateway] proxy error:', err.message);
  if (!res.headersSent) {
    res.status(504).json({ message: 'Gateway Timeout: upstream service did not respond in time.' });
  }
}

// POST /api/auth/* -> service-identity (public, no JWT required)
router.use(
  '/auth',
  createProxyMiddleware({
    target: IDENTITY_SERVICE_URL,
    changeOrigin: true,
    // Express strips '/auth' from req.url before reaching the proxy, so no
    // pathRewrite is needed — the path forwarded is already correct (e.g. /login).
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onError: onProxyError as any,
  })
);

// /api/wallets/* -> service-wallet (JWT required)
router.use(
  '/wallets',
  verifyToken,
  createProxyMiddleware({
    target: WALLET_SERVICE_URL,
    changeOrigin: true,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onError: onProxyError as any,
  })
);

// /api/transactions/* -> service-transaction (JWT required)
router.use(
  '/transactions',
  verifyToken,
  createProxyMiddleware({
    target: TRANSACTION_SERVICE_URL,
    changeOrigin: true,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onError: onProxyError as any,
  })
);

export default router;
