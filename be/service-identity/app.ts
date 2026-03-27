import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes';
import { connectDB } from './config/db';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = Number(process.env.PORT) === 0 ? 3001 : Number(process.env.IDENTITY_PORT) || 3001;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Routes (used by api-gateway: /api/auth/* -> service-identity:3001/*)
app.use('/', routes);

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

