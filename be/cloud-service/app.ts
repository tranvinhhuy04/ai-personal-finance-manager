import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

// Validate Cloudinary config ngay khi boot; fail-fast thay vì crash khi gọi API
import './src/config/cloudinary';

import cloudRoutes from './src/routes';
import { errorHandler } from './src/middlewares/errorHandler';

const app = express();
const PORT = Number(process.env.PORT) || 3006;

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check — dùng bởi docker-compose healthcheck và api-gateway
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cloud-service', port: PORT });
});

app.use('/api/v1/cloud', cloudRoutes);

// Centralized error handler (bắt AppError + MulterError + 500)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✓ Cloud Service running on port ${PORT}`);
});
