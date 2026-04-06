import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import routes from './routes';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const isDevelopment = process.env.NODE_ENV === 'development';
const disableRateLimitInDev = process.env.DISABLE_RATE_LIMIT_IN_DEV === 'true';
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000;
const rateLimitMax = Number(
  process.env.RATE_LIMIT_MAX || (isDevelopment ? process.env.RATE_LIMIT_MAX_DEV ?? 1000 : 100)
);

// Redis client for rate limiting
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis-cache',
    port: Number(process.env.REDIS_PORT) || 6379,
  }
});
redisClient.connect().catch(console.error);

app.use(cors());
// NOTE: Do NOT use express.json() globally in the gateway.
// If express.json() parses the body BEFORE http-proxy-middleware runs, it
// consumes the readable stream. The proxy then tries to pipe an already-drained
// stream to the upstream — which causes the upstream to hang waiting for a body
// that never arrives, resulting in a frozen request on the front-end.
app.use(morgan('dev'));

// Rate limiting (global, using Redis)
if (isDevelopment && disableRateLimitInDev) {
  console.log('[api-gateway] Rate limiter disabled for development mode');
} else {
  app.use(
    rateLimit({
      windowMs: rateLimitWindowMs,
      max: Math.max(1, rateLimitMax),
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      }),
      skip: (req) => isDevelopment && req.originalUrl.includes('/notifications/stream'),
      message: isDevelopment
        ? 'Dev rate limit reached. Please slow down a bit.'
        : 'Too many requests, please try again later.',
    })
  );
}

// Mount versioned API routes (proxy + auth)
app.use('/api/v1', routes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
