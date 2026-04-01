"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const verifyToken_1 = __importDefault(require("../middlewares/verifyToken"));
const router = (0, express_1.Router)();
const PROXY_TIMEOUT_MS = 10000; // 10 seconds
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL ?? 'http://service-identity:3001';
const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL ?? 'http://service-wallet:3002';
const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL ?? 'http://service-transaction:3003';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL ?? 'http://analytics-service:3004';
const NOTIFY_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL ?? 'http://notification-service:3005';
/** Shared error handler — returns 504 when upstream is unreachable or times out */
function onProxyError(err, req, res) {
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
function onProxyRes(proxyRes, req) {
    const statusCode = proxyRes.statusCode ?? 'unknown';
    console.log(`[api-gateway] proxyRes ${req.method} ${req.url} -> ${statusCode}`);
}
function onProxyReq(_proxyReq, req) {
    console.log(`[api-gateway] proxyReq ${req.method} ${req.url}`);
}
function rewriteAuthPath(_path, req) {
    const originalUrl = req.originalUrl;
    const sourcePath = originalUrl ?? _path;
    const rewritten = sourcePath.replace(/^\/api\/v1\/auth/, '');
    return rewritten.length > 0 ? rewritten : '/';
}
function rewriteWalletPath(_path, req) {
    const originalUrl = req.originalUrl;
    return originalUrl ?? _path;
}
function rewriteTransactionPath(_path, req) {
    const originalUrl = req.originalUrl;
    return originalUrl ?? _path;
}
function rewriteAnalyticsPath(_path, req) {
    const originalUrl = req.originalUrl;
    return originalUrl ?? _path;
}
function rewriteNotificationPath(_path, req) {
    const originalUrl = req.originalUrl;
    return originalUrl ?? _path;
}
// /api/v1/auth/* -> service-identity (public, JWT not required)
router.use('/auth', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: IDENTITY_SERVICE_URL,
    changeOrigin: true,
    // Strip /api/v1/auth prefix because identity-service exposes /login, /register, etc.
    pathRewrite: rewriteAuthPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError,
}));
// /api/v1/wallets/* -> service-wallet (JWT required)
router.use('/wallets', verifyToken_1.default, (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: WALLET_SERVICE_URL,
    changeOrigin: true,
    // Keep full path unchanged so downstream wallet-service handles /api/v1/wallets.
    pathRewrite: rewriteWalletPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError,
}));
// /api/v1/transactions/* -> service-transaction (JWT required)
router.use('/transactions', verifyToken_1.default, (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: TRANSACTION_SERVICE_URL,
    changeOrigin: true,
    // Keep full path unchanged so downstream transaction-service handles /api/v1/transactions.
    pathRewrite: rewriteTransactionPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError,
}));
// /api/v1/analytics/* -> analytics-service (JWT required)
router.use('/analytics', verifyToken_1.default, (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: ANALYTICS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteAnalyticsPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError,
}));
// /api/v1/notifications/* -> notification-service (JWT required)
router.use('/notifications', verifyToken_1.default, (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: NOTIFY_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteNotificationPath,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq,
    onProxyRes,
    onError: onProxyError,
}));
exports.default = router;
