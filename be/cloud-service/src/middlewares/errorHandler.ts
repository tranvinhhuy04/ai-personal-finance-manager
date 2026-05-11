import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../errors/AppError';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Multer — file too large
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'File size exceeds the 5 MB limit'
      : `Upload error: ${err.message}`;
    return res.status(400).json({ success: false, message: msg });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  console.error('[cloud-service] Unhandled error:', err);
  return res.status(500).json({ success: false, message: 'CLOUD_ERROR' });
}
