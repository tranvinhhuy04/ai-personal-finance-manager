import { Router } from 'express';
import requireAuth from '../middlewares/requireAuth';
import { uploadToCloudinary } from '../middlewares/upload.middleware';
import { deleteImage, uploadImage } from '../controllers/upload.controller';

const router = Router();

// Tất cả routes yêu cầu JWT hợp lệ
router.use(requireAuth);

/**
 * POST /api/v1/cloud/upload
 * Body: multipart/form-data, field "file" = ảnh hóa đơn
 * → Cloudinary (stream, không ghi disk) → trả về imageUrl + publicId
 */
router.post('/upload', uploadToCloudinary, uploadImage);

/**
 * DELETE /api/v1/cloud/:publicId
 * Param publicId phải URL-encode nếu chứa '/' (e.g. fintech_invoices%2Fabc)
 * → Xóa ảnh khỏi Cloudinary
 */
router.delete('/:publicId(*)', deleteImage);

export default router;
