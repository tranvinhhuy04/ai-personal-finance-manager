import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { connectRabbitMQ } from './config/rabbitmq';
import analyticsRoutes from './src/routes';
import { analyticsConsumer } from './src/messaging/analytics.consumer';
import { errorHandler } from './src/middlewares/errorHandler';

dotenv.config();

const app = express();
const PORT = Number(process.env.ANALYTICS_PORT ?? process.env.PORT) || 3004;

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'analytics-service' });
});

app.use('/api/v1/analytics', analyticsRoutes);
app.use(errorHandler);

async function start() {
  try {
    await connectDB();
    await connectRabbitMQ();
    await analyticsConsumer.start();

    app.listen(PORT, () => {
      console.log(`Analytics service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start analytics service', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await analyticsConsumer.stop();
  process.exit(0);
});

start();

export default app;
