import { json, Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import verifyToken from '../middlewares/verifyToken';
import { handleAiAdvisorChat } from '../utils/aiAdvisorBff';
import { handleAiChat } from '../utils/aiChatBff';
import { handleAiExtractText, handleAiProviderStatus } from '../utils/aiExtractBff';

const router = Router();

const PROXY_TIMEOUT_MS = 10_000; // 10 seconds

const IDENTITY_SERVICE_URL     = process.env.IDENTITY_SERVICE_URL     ?? 'http://service-identity:3001';
const WALLET_SERVICE_URL       = process.env.WALLET_SERVICE_URL       ?? 'http://service-wallet:3002';
const TRANSACTION_SERVICE_URL  = process.env.TRANSACTION_SERVICE_URL  ?? 'http://service-transaction:3003';
const ANALYTICS_SERVICE_URL    = process.env.ANALYTICS_SERVICE_URL    ?? 'http://analytics-service:3004';
const NOTIFY_SERVICE_URL       = process.env.NOTIFICATION_SERVICE_URL ?? 'http://notification-service:3005';
const AI_SERVICE_URL           = process.env.AI_SERVICE_URL           ?? 'http://ai-service:8000';
const CLOUD_SERVICE_URL        = process.env.CLOUD_SERVICE_URL        ?? 'http://cloud-service:3006';
const AI_PROXY_TIMEOUT_MS      = Number(process.env.AI_PROXY_TIMEOUT_MS ?? 60_000);
const INVOICE_PROXY_TIMEOUT_MS = Number(process.env.INVOICE_PROXY_TIMEOUT_MS ?? 60_000);
const NOTIFICATION_STREAM_TIMEOUT_MS = Number(process.env.NOTIFICATION_STREAM_TIMEOUT_MS ?? 600_000);
const AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS ?? 60_000);
const AUTH_LOGIN_RATE_LIMIT_MAX = Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX ?? 10);

// rate limit cho login để tránh brute force, cấu hình qua ENV
const authLoginLimiter = rateLimit({
  windowMs: AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
  max: Math.max(1, AUTH_LOGIN_RATE_LIMIT_MAX),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = String((req.body as any)?.email ?? '').trim().toLowerCase();
    return `${req.ip}:${email}`;
  },
  message: {
    message: 'Quá nhiều lần đăng nhập thất bại, thử lại sau.',
  },
});

// trả 504 khi upstream không phản hồi kịp thời
function onProxyError(err: Error, req: IncomingMessage, res: ServerResponse) {
  console.error({ event: 'proxy_error', msg: err.message, path: req.url });
  if (!res.headersSent) {
    res.statusCode = 504;
    res.setHeader('Content-Type', 'application/json');
    const payload = {
      message: 'Service không phản hồi kịp, thử lại sau.',
      path: req.url,
    };
    res.end(JSON.stringify(payload));
  }
}

function onProxyRes(proxyRes: IncomingMessage, req: IncomingMessage) {
  const statusCode = proxyRes.statusCode ?? 'unknown';
  console.log({ event: 'proxy_res', method: req.method, url: req.url, status: statusCode });
}

function onProxyReq(proxyReq: ClientRequest, req: IncomingMessage) {
  console.log({ event: 'proxy_req', method: req.method, url: req.url })

  const body = (req as any).body
  if (body && typeof body === 'object') {
    const bodyData = JSON.stringify(body)
    proxyReq.setHeader('Content-Type', 'application/json')
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))
    proxyReq.write(bodyData)
  }
}

function rewriteAuthPath(_path: string, req: IncomingMessage) {
  const originalUrl = (req as any).originalUrl as string | undefined
  const sourcePath = originalUrl ?? _path
  const rewritten = sourcePath.replace(/^\/api\/v1\/auth/, '')
  if (rewritten.length > 0) return rewritten
  return '/'
}

function rewriteSettingsPath(_path: string, req: IncomingMessage) {
  const originalUrl = (req as any).originalUrl as string | undefined;
  const sourcePath = originalUrl ?? _path;
  const rewritten = sourcePath.replace(/^\/api\/v1\/settings/, '/settings');
  return rewritten.length > 0 ? rewritten : '/settings';
}

function passthroughPath(_path: string, req: IncomingMessage) {
  return (req as any).originalUrl ?? _path;
}

// /api/v1/auth/* -> service-identity (public, JWT not required)
router.use(
  '/auth/login',
  json({ limit: '64kb' }),
  authLoginLimiter,
  createProxyMiddleware({
    target: IDENTITY_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteAuthPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

router.use(
  '/auth',
  createProxyMiddleware({
    target: IDENTITY_SERVICE_URL,
    changeOrigin: true,
    // Strip /api/v1/auth prefix vì identity-service expose /login, /register trực tiếp
    pathRewrite: rewriteAuthPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

// Block các route nội bộ khỏi direct access từ client
router.all('/settings/runtime-ai', verifyToken, (_req, res) => {
  return res.status(403).json({ message: 'Không có quyền truy cập' });
});

router.all('/settings/usage/append', verifyToken, (_req, res) => {
  return res.status(403).json({ message: 'Không có quyền truy cập' });
});

// mark-exhausted gọi bởi BFF nội bộ, block public
router.all('/settings/api-keys/mark-exhausted', verifyToken, (_req, res) => {
  return res.status(403).json({ message: 'Không có quyền truy cập' });
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
    pathRewrite: passthroughPath,
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
    pathRewrite: passthroughPath,
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
    pathRewrite: passthroughPath,
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
    pathRewrite: passthroughPath,
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
    pathRewrite: passthroughPath,
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
    pathRewrite: passthroughPath,
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
    pathRewrite: passthroughPath,
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
    pathRewrite: passthroughPath,
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

// /api/v1/ai/extract-text -> BFF injects runtime model/key from user settings before calling ai-service
router.post('/ai/extract-text', verifyToken, json({ limit: '1mb' }), handleAiExtractText);

// /api/v1/ai/provider-status -> BFF probes actual Gemini provider status with runtime model/key from settings
router.get('/ai/provider-status', verifyToken, handleAiProviderStatus);

// /api/v1/ai/* -> ai-service (JWT required, still benefits from gateway rate limiting)
router.use(
  '/ai',
  verifyToken,
  createProxyMiddleware({
    target: AI_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: passthroughPath,
    proxyTimeout: AI_PROXY_TIMEOUT_MS,
    timeout: AI_PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

// /api/v1/cloud/* -> cloud-service (JWT required): upload/delete images on Cloudinary
router.use(
  '/cloud',
  verifyToken,
  createProxyMiddleware({
    target: CLOUD_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: passthroughPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError as any,
  })
);

export default router;
