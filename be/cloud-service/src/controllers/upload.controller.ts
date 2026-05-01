import { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { catchAsync } from '../middlewares/catchAsync';

type UploadedFile = Express.Multer.File & {
  path: string;     // secure_url (set by CloudinaryStreamStorage)
  filename: string; // public_id  (set by CloudinaryStreamStorage)
};

/**
 * POST /api/v1/cloud/upload
 *
 * Nhận file ảnh qua multipart/form-data (field: "file"),
 * middleware uploadToCloudinary đã stream thẳng lên Cloudinary.
 * Controller chỉ đọc kết quả và trả về JSON chuẩn.
 *
 * Response 200:
 * {
 *   "success": true,
 *   "imageUrl": "https://res.cloudinary.com/…/fintech_invoices/<uuid>.webp",
 *   "publicId": "fintech_invoices/<uuid>",
 *   "message": "Upload successful"
 * }
 */
export const uploadImage = catchAsync(async (req: Request, res: Response) => {
  const file = req.file as UploadedFile | undefined;

  if (!file) {
    throw new AppError('No image file provided. Send a file in the "file" field.', 400);
  }

  // Khi CloudinaryStreamStorage thành công: file.path = secure_url
  const imageUrl = file.path;
  const publicId = file.filename;

  if (!imageUrl.startsWith('https://')) {
    // Phòng trường hợp fallback sang disk (không nên xảy ra trong production)
    throw new AppError('Upload to Cloudinary failed: no secure_url returned', 500);
  }

  return res.status(200).json({
    success:  true,
    imageUrl,
    publicId,
    message:  'Upload successful',
  });
});

/**
 * DELETE /api/v1/cloud/:publicId
 *
 * Xóa ảnh khỏi Cloudinary theo public_id.
 * public_id phải được URL-encode khi chứa ký tự '/':
 *   DELETE /api/v1/cloud/fintech_invoices%2Fabc123
 *
 * Response 200:
 * { "success": true, "message": "Image deleted" }
 */
export const deleteImage = catchAsync(async (req: Request, res: Response) => {
  const rawParam = req.params['publicId'];

  if (!rawParam) {
    throw new AppError('publicId path parameter is required', 400);
  }

  // Decode URL-encoded slash
  const publicId = decodeURIComponent(rawParam);

  // Lazy-require tránh crash khi test
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cloudinary = (
    require('../config/cloudinary') as { default: typeof import('cloudinary').v2 }
  ).default;

  const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });

  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new AppError(`Cloudinary delete failed: ${result.result}`, 500);
  }

  return res.status(200).json({ success: true, message: 'Image deleted' });
});
