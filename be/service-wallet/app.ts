import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { connectRabbitMQ } from './config/rabbitmq';
import walletRoutes from './src/routes';
import { errorHandler } from './src/middlewares/errorHandler';
import walletConsumer from './src/messaging/wallet.consumer';

dotenv.config();

const app = express();
const PORT = Number(process.env.WALLET_PORT ?? process.env.PORT) || 3002;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'wallet-service' });
});

// Routes
app.use('/api/v1/wallets', walletRoutes);

// Global error handler must be registered last.
app.use(errorHandler);

// Initialize and start server
async function start() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Start consuming wallet events
    await walletConsumer.start();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`✓ Wallet Service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start Wallet Service:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await walletConsumer.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await walletConsumer.stop();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('[wallet-service] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[wallet-service] Uncaught Exception:', error);
});

start();

export default app;
