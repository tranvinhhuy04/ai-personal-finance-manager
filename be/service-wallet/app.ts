import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { connectRabbitMQ } from './config/rabbitmq';
import walletRoutes from './routes';
import walletConsumer from './utils/WalletConsumer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'wallet-service' });
});

// Routes
app.use('/api/v1', walletRoutes);

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

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

start();

export default app;
