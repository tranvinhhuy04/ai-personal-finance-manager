import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db';
import { connectRabbitMQ } from './src/config/rabbitmq';
import walletRoutes from './src/routes';
import { errorHandler } from './src/middlewares/errorHandler';
import walletConsumer from './src/messaging/wallet.consumer';

dotenv.config();

const app = express();
const PORT = Number(process.env.WALLET_PORT ?? process.env.PORT) || 3002;

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'wallet-service' });
});

app.use('/api/v1/wallets', walletRoutes);

app.use(errorHandler);

async function start() {
  try {
    await connectDB();
    await connectRabbitMQ();
    await walletConsumer.start();
    app.listen(PORT, () => {
      console.log(`wallet-service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start wallet-service:', err);
    process.exit(1);
  }
}

start();

export default app;
