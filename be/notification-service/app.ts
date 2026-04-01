import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { connectRabbitMQ } from './config/rabbitmq';
import notificationRoutes from './src/routes';
import { notificationConsumer } from './src/messaging/notification.consumer';
import { errorHandler } from './src/middlewares/errorHandler';

dotenv.config();

const app = express();
const PORT = Number(process.env.NOTIFICATION_PORT ?? process.env.PORT) || 3005;

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

app.use('/api/v1/notifications', notificationRoutes);
app.use(errorHandler);

async function start() {
  try {
    await connectDB();
    await connectRabbitMQ();
    await notificationConsumer.start();

    app.listen(PORT, () => {
      console.log(`Notification service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start notification service', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await notificationConsumer.stop();
  process.exit(0);
});

start();

export default app;
