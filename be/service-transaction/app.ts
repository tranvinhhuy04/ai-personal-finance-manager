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

app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/v1/invoices/files', express.static(uploadsDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'transaction-service' });
});

app.use('/api/v1', transactionRoutes);

app.use(errorHandler);

async function start() {
  try {
    await connectDB();
    await connectRabbitMQ();
    await outboxPublisher.start(5000);
    await transactionConsumer.start();
    recurringTransactionsJob.start();
    app.listen(PORT, () => {
      console.log(`transaction-service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start transaction-service:', err);
    process.exit(1);
  }
}

// TODO: add graceful shutdown sau khi demo xong
process.on('SIGTERM', async () => {
  await outboxPublisher.stop();
  await transactionConsumer.stop();
  recurringTransactionsJob.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await outboxPublisher.stop();
  await transactionConsumer.stop();
  recurringTransactionsJob.stop();
  process.exit(0);
});

start();

export default app;
