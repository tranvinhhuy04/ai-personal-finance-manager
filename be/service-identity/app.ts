import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import routes from './routes';
import { errorHandler } from './src/middlewares/errorHandler';

// dotenv.config() is a no-op in Docker (vars already injected by compose env_file).
// For local ts-node-dev it loads the .env file in this directory.
dotenv.config();

const app = express();
const PORT = Number(process.env.IDENTITY_PORT) || 3001;

// ── Middleware order matters ─────────────────────────────────────────────────
// 1. CORS must be first so preflight OPTIONS requests succeed
app.use(cors({ origin: '*' }));

// 2. express.json() parses the request body.
//    CRITICAL: this MUST be registered before the routes. Without it,
//    req.body is undefined and login/register always fail silently.
app.use(express.json());

// 3. Request logger
app.use(morgan('dev'));

// ── Health check (no auth required) ─────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'identity' }));

// ── Auth routes (mounted at '/' because the api-gateway already strips /api/auth)
// e.g. POST /api/auth/login → proxied as POST /login to this service
app.use('/', routes);

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
// MUST be the LAST middleware. MUST have exactly 4 parameters.
// catchAsync in every route handler feeds errors here via next(err).
app.use(errorHandler);

// Surface any promise rejections that somehow escape route handlers
process.on('unhandledRejection', (reason) => {
  console.error('[identity-service] unhandledRejection:', reason);
});

async function start(): Promise<void> {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`✓ service-identity running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('✗ Failed to start service-identity', err);
  process.exit(1);
});

