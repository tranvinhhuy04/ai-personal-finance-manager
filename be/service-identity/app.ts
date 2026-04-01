import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes';
import { connectDB } from './config/db';
import { AppError } from './src/errors/AppError';
import { errorHandler } from './src/middlewares/errorHandler';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = Number(process.env.IDENTITY_PORT) || 3001;

// Body parsers and CORS must be mounted before routes.
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Routes (used by api-gateway: /api/auth/* -> service-identity:3001/*)
app.use('/', routes);

app.use((_req, _res, next) => {
  next(new AppError('Route not found', 404));
});

// Global error handler must be the final middleware.
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`service-identity running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start service-identity', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[identity-service] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[identity-service] Uncaught Exception:', error);
});

