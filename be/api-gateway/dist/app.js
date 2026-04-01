"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const redis_1 = require("redis");
const routes_1 = __importDefault(require("./routes"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Redis client for rate limiting
const redisClient = (0, redis_1.createClient)({
    socket: {
        host: process.env.REDIS_HOST || 'redis-cache',
        port: Number(process.env.REDIS_PORT) || 6379,
    }
});
redisClient.connect().catch(console.error);
app.use((0, cors_1.default)());
// NOTE: Do NOT use express.json() globally in the gateway.
// If express.json() parses the body BEFORE http-proxy-middleware runs, it
// consumes the readable stream. The proxy then tries to pipe an already-drained
// stream to the upstream — which causes the upstream to hang waiting for a body
// that never arrives, resulting in a frozen request on the front-end.
app.use((0, morgan_1.default)('dev'));
// Rate limiting (global, using Redis)
app.use((0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: new rate_limit_redis_1.default({
        sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    message: 'Too many requests, please try again later.',
}));
// Mount versioned API routes (proxy + auth)
app.use('/api/v1', routes_1.default);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
