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
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    message: 'Too many requests, please try again later.',
  })
);

// Mount versioned API routes (proxy + auth)
app.use('/api/v1', routes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
