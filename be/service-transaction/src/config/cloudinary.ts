/**
 * cloudinary.ts
 *
 * Khởi tạo và cấu hình Cloudinary SDK v2.
 * Đọc thông tin xác thực từ biến môi trường; fail-fast khi thiếu config
 * để lỗi xuất hiện sớm ngay khi container boot thay vì khi gọi API.
 */

import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey    = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error(
    '[cloudinary] Missing required environment variables: ' +
    'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET. ' +
    'Add them to your .env file before starting the service.',
  );
}

cloudinary.config({
  cloud_name: cloudName,
  api_key:    apiKey,
  api_secret: apiSecret,
  secure:     true, // luôn dùng https cho secure_url
});

export default cloudinary;
