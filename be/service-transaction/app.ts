import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './src/config/db';
import { connectRabbitMQ } from './src/config/rabbitmq';
import transactionRoutes from './src/routes';
import { outboxPublisher } from './src/messaging/outbox.publisher';
import transactionConsumer from './src/messaging/transaction.consumer';
import { recurringTransactionsJob } from './src/jobs/recurring-transactions.job';
import { errorHandler } from './src/middlewares/errorHandler';

dotenv.config();

const app = express();
const PORT = Number(process.env.TRANSACTION_PORT ?? process.env.PORT) || 3003;
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/v1/invoices/files', express.static(uploadsDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'transaction-service' });
});

// Routes
app.use('/api/v1', transactionRoutes);

app.use(errorHandler);

// Initialize and start server
async function start() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Start Outbox Publisher (polls unpublished events)
    await outboxPublisher.start(5000); // Poll every 5 seconds

    // Start consuming wallet response events
    await transactionConsumer.start();

    // Start recurring transaction scheduler
    recurringTransactionsJob.start();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`✓ Transaction Service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start Transaction Service:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await outboxPublisher.stop();
  await transactionConsumer.stop();
  recurringTransactionsJob.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await outboxPublisher.stop();
  await transactionConsumer.stop();
  recurringTransactionsJob.stop();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('[transaction-service] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[transaction-service] Uncaught Exception:', error);
});

start();

export default app;
