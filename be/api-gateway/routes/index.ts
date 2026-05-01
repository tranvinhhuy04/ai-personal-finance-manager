import { json, Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import verifyToken from '../middlewares/verifyToken';
import { handleAiAdvisorChat } from '../utils/aiAdvisorBff';
import { handleAiChat } from '../utils/aiChatBff';

const router = Router();

const PROXY_TIMEOUT_MS = 10_000; // 10 seconds

const IDENTITY_SERVICE_URL     = process.env.IDENTITY_SERVICE_URL     ?? 'http://service-identity:3001';
const WALLET_SERVICE_URL       = process.env.WALLET_SERVICE_URL       ?? 'http://service-wallet:3002';
const TRANSACTION_SERVICE_URL  = process.env.TRANSACTION_SERVICE_URL  ?? 'http://service-transaction:3003';
const ANALYTICS_SERVICE_URL    = process.env.ANALYTICS_SERVICE_URL    ?? 'http://analytics-service:3004';
const NOTIFY_SERVICE_URL       = process.env.NOTIFICATION_SERVICE_URL ?? 'http://notification-service:3005';
const AI_SERVICE_URL           = process.env.AI_SERVICE_URL           ?? 'http://ai-service:8000';
const AI_PROXY_TIMEOUT_MS      = Number(process.env.AI_PROXY_TIMEOUT_MS ?? 60_000);
const INVOICE_PROXY_TIMEOUT_MS = Number(process.env.INVOICE_PROXY_TIMEOUT_MS ?? 60_000);
const NOTIFICATION_STREAM_TIMEOUT_MS = Number(process.env.NOTIFICATION_STREAM_TIMEOUT_MS ?? 600_000);

/** Shared error handler — returns 504 when upstream is unreachable or times out */
function onProxyError(err: Error, req: IncomingMessage, res: ServerResponse) {
  console.error('[api-gateway] proxy error:', err.message);
  if (!res.headersSent) {
    res.statusCode = 504;
    res.setHeader('Content-Type', 'application/json');
    const payload = {
      message: 'Gateway Timeout: upstream service did not respond in time.',
      path: req.url,
    };
    res.end(JSON.stringify(payload));
  }
}

function onProxyRes(proxyRes: IncomingMessage, req: IncomingMessage) {
  const statusCode = proxyRes.statusCode ?? 'unknown';
  console.log(`[api-gateway] proxyRes ${req.method} ${req.url} -> ${statusCode}`);
}

function onProxyReq(_proxyReq: ClientRequest, req: IncomingMessage) {
  console.log(`[api-gateway] proxyReq ${req.method} ${req.url}`);
}

function rewriteAuthPath(_path: string, req: IncomingMessage) {
  const originalUrl = (req as any).originalUrl as string | undefined;
  const sourcePath = originalUrl ?? _path;
  const rewritten = sourcePath.replace(/^\/api\/v1\/auth/, '');
  return rewritten.length > 0 ? rewritten : '/';
}

function rewriteSettingsPath(_path: string, req: IncomingMessage) {
  const originalUrl = (req as any).originalUrl as string | undefined;
  const sourcePath = originalUrl ?? _path;
  const rewritten = sourcePath.replace(/^\/api\/v1\/settings/, '/settings');
  return rewritten.length > 0 ? rewritten : '/settings';
}

function rewriteWalletPath(_path: string, req: IncomingMessage) {
  const originalUrl = (req as any).originalUrl as string | undefined;
  return originalUrl ?? _path;
}

function rewriteCategoryPath(_path: string, req: IncomingMessage) {
  const originalUrl = (req as any).originalUrl as string | undefined;
  return originalUrl ?? _path;
}

function rewriteTransactionPath(_path: string, req: IncomingMessage) {
  const originalUrl = (req as any).originalUrl as string | undefined;
  return originalUrl ?? _path;
}

function rewriteSavingsPath(_path: string, req: IncomingMessage) {
  const originalUrl = (req as any).originalUrl as string | undefined;
  return originalUrl ?? _path;
}

function rewriteInvoicePath(_path: string, req: IncomingMessage) {
  const originalUrl = (req as any).originalUrl as string | undefined;
  return originalUrl ?? _path;
}

function rewriteAnalyticsPath(_path: string, req: IncomingMessage) {
  const originalUrl = (req as any).originalUrl as string | undefined;
  return originalUrl ?? _path;
}

function rewriteNotificationPath(_path: string, req: IncomingMessage) {
  const originalUrl = (req as any).originalUrl as string | undefined;
  return originalUrl ?? _path;
}

function rewriteAiPath(_path: string, req: IncomingMessage) {
  const originalUrl = (req as any).originalUrl as string | undefined;
  return originalUrl ?? _path;
}

// /api/v1/auth/* -> service-identity (public, JWT not required)
router.use(
  '/auth',
  createProxyMiddleware({
    target: IDENTITY_SERVICE_URL,
    changeOrigin: true,
    // Strip /api/v1/auth prefix because identity-service exposes /login, /register, etc.
    pathRewrite: rewriteAuthPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

// Block internal settings sub-routes from public clients.
router.all('/settings/runtime-ai', verifyToken, (_req, res) => {
  return res.status(403).json({ message: 'Forbidden' });
});

router.all('/settings/usage/append', verifyToken, (_req, res) => {
  return res.status(403).json({ message: 'Forbidden' });
});

// /api/v1/settings -> service-identity /settings (JWT required)
router.use(
  '/settings',
  verifyToken,
  createProxyMiddleware({
    target: IDENTITY_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteSettingsPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

// /api/v1/wallets/* -> service-wallet (JWT required)
router.use(
  '/wallets',
  verifyToken,
  createProxyMiddleware({
    target: WALLET_SERVICE_URL,
    changeOrigin: true,
    // Keep full path unchanged so downstream wallet-service handles /api/v1/wallets.
    pathRewrite: rewriteWalletPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

// /api/v1/categories/* -> service-transaction (JWT required)
router.use(
  '/categories',
  verifyToken,
  createProxyMiddleware({
    target: TRANSACTION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteCategoryPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

// /api/v1/transactions/* -> service-transaction (JWT required)
router.use(
  '/transactions',
  verifyToken,
  createProxyMiddleware({
    target: TRANSACTION_SERVICE_URL,
    changeOrigin: true,
    // Keep full path unchanged so downstream transaction-service handles /api/v1/transactions.
    pathRewrite: rewriteTransactionPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

// /api/v1/savings/* -> service-transaction (JWT required)
router.use(
  '/savings',
  verifyToken,
  createProxyMiddleware({
    target: TRANSACTION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteSavingsPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

// /api/v1/invoices/* -> service-transaction (JWT required)
router.use(
  '/invoices',
  verifyToken,
  createProxyMiddleware({
    target: TRANSACTION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteInvoicePath,
    proxyTimeout: INVOICE_PROXY_TIMEOUT_MS,
    timeout: INVOICE_PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

// /api/v1/analytics/* -> analytics-service (JWT required)
router.use(
  '/analytics',
  verifyToken,
  createProxyMiddleware({
    target: ANALYTICS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteAnalyticsPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

// /api/v1/notifications/stream -> notification-service SSE (JWT required, long-lived connection)
router.use(
  '/notifications/stream',
  verifyToken,
  createProxyMiddleware({
    target: NOTIFY_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteNotificationPath,
    proxyTimeout: NOTIFICATION_STREAM_TIMEOUT_MS,
    timeout: NOTIFICATION_STREAM_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

// /api/v1/notifications/* -> notification-service (JWT required)
router.use(
  '/notifications',
  verifyToken,
  createProxyMiddleware({
    target: NOTIFY_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteNotificationPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

// /api/v1/ai/chat -> Node.js BFF enriches context from analytics-service before calling Python ai-service
router.post('/ai/chat', verifyToken, json({ limit: '1mb' }), handleAiChat);

// /api/v1/ai/advisor/chat -> Agentic RAG advisor pipeline (Python ai-service) with cache-aware BFF
router.post('/ai/advisor/chat', verifyToken, json({ limit: '1mb' }), handleAiAdvisorChat);

// /api/v1/ai/* -> ai-service (JWT required, still benefits from gateway rate limiting)
router.use(
  '/ai',
  verifyToken,
  createProxyMiddleware({
    target: AI_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteAiPath,
    proxyTimeout: AI_PROXY_TIMEOUT_MS,
    timeout: AI_PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

export default router;
