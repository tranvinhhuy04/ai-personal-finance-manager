"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./src/middlewares/errorHandler");
// dotenv.config() is a no-op in Docker (vars already injected by compose env_file).
// For local ts-node-dev it loads the .env file in this directory.
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.IDENTITY_PORT) || 3001;
// ── Middleware order matters ─────────────────────────────────────────────────
// 1. CORS must be first so preflight OPTIONS requests succeed
app.use((0, cors_1.default)({ origin: '*' }));
// 2. express.json() parses the request body.
//    CRITICAL: this MUST be registered before the routes. Without it,
//    req.body is undefined and login/register always fail silently.
app.use(express_1.default.json());
// 3. Request logger
app.use((0, morgan_1.default)('dev'));
// ── Health check (no auth required) ─────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'identity' }));
// ── Auth routes (mounted at '/' because the api-gateway already strips /api/auth)
// e.g. POST /api/auth/login → proxied as POST /login to this service
app.use('/', routes_1.default);
// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
// ── Global error handler ─────────────────────────────────────────────────────
// MUST be the LAST middleware. MUST have exactly 4 parameters.
// catchAsync in every route handler feeds errors here via next(err).
app.use(errorHandler_1.errorHandler);
// Surface any promise rejections that somehow escape route handlers
process.on('unhandledRejection', (reason) => {
    console.error('[identity-service] unhandledRejection:', reason);
});
async function start() {
    await (0, db_1.connectDB)();
    app.listen(PORT, () => {
        console.log(`✓ service-identity running on port ${PORT}`);
    });
}
start().catch((err) => {
    console.error('✗ Failed to start service-identity', err);
    process.exit(1);
});
