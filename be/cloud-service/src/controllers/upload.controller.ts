import { Request, Response } from 'express';
import cloudinary from '../config/cloudinary';
import { AppError } from '../errors/AppError';
import { catchAsync } from '../middlewares/catchAsync';

type UploadedFile = Express.Multer.File & {
  path: string;     // secure_url (set by CloudinaryStreamStorage)
  filename: string; // public_id  (set by CloudinaryStreamStorage)
};

export const uploadImage = catchAsync(async (req: Request, res: Response) => {
  const file = req.file as UploadedFile | undefined;

  if (!file) {
    throw new AppError('No image file provided. Send a file in the "file" field.', 400);
  }

  // Khi CloudinaryStreamStorage thành công: file.path = secure_url
  const imageUrl = file.path;
  const publicId = file.filename;

  if (!imageUrl.startsWith('https://')) {
    throw new AppError('Upload to Cloudinary failed: no secure_url returned', 500);
  }

  return res.status(200).json({
    success:  true,
    imageUrl,
    publicId,
    message:  'Upload successful',
  });
});

export const deleteImage = catchAsync(async (req: Request, res: Response) => {
  const rawParam = req.params['publicId'];

  if (!rawParam) {
    throw new AppError('publicId path parameter is required', 400);
  }

  const publicId = decodeURIComponent(rawParam);
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });

  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new AppError(`Cloudinary delete failed: ${result.result}`, 500);
  }

  return res.status(200).json({ success: true, message: 'Image deleted' });
});
