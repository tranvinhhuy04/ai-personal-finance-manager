import multer, { FileFilterCallback, StorageEngine } from 'multer';
import { Request } from 'express';
import { AppError } from '../errors/AppError';

// ── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new AppError('Only JPG, JPEG, PNG, and WEBP images are allowed', 400));
    return;
  }
  cb(null, true);
}

// ── Custom StorageEngine: stream trực tiếp lên Cloudinary, không ghi disk ────
//
// Cloudinary SDK v2 không tương thích với multer-storage-cloudinary@4 (peer dep v1).
// Ta implement StorageEngine thủ công bằng upload_stream API:
//   file.stream (ReadableStream từ multer) → cloudinary.uploader.upload_stream → Cloudinary CDN
//
// Sau khi _handleFile chạy xong:
//   req.file.path     = secure_url  (https://res.cloudinary.com/…/<folder>/<uuid>.webp)
//   req.file.filename = public_id   (fintech_invoices/<uuid>)
//   req.file.size     = bytes đã upload

class CloudinaryStreamStorage implements StorageEngine {
  constructor(private readonly folder: string) {}

  _handleFile(
    _req: Request,
    file: Express.Multer.File,
    cb: (error?: Error | null, info?: Partial<Express.Multer.File>) => void,
  ): void {
    // Lazy-require để tránh crash khi env vars chưa set (e.g. unit test)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cloudinary = (
      require('../config/cloudinary') as { default: typeof import('cloudinary').v2 }
    ).default;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder:          this.folder,
        format:          'webp',   // ép sang WebP → giảm ~30–70% dung lượng
        resource_type:   'image',
        use_filename:    false,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          cb(error ?? new Error('Cloudinary upload_stream returned no result'));
          return;
        }
        cb(null, {
          path:     result.secure_url,  // ghi đè file.path = CDN URL
          filename: result.public_id,   // ghi đè file.filename = public_id
          size:     result.bytes,
        });
      },
    );

    file.stream.pipe(uploadStream);
  }

  _removeFile(
    _req: Request,
    file: Express.Multer.File & { filename: string },
    cb: (error: Error | null) => void,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cloudinary = (
      require('../config/cloudinary') as { default: typeof import('cloudinary').v2 }
    ).default;
    cloudinary.uploader.destroy(file.filename, {}, (err) => cb(err ?? null));
  }
}

// ── Export middleware ─────────────────────────────────────────────────────────

const storage = new CloudinaryStreamStorage('fintech_invoices');

/**
 * Multer middleware upload một file ảnh lên Cloudinary.
 * Field name trong form-data: "file"
 * Giới hạn: 5 MB, chỉ jpg/jpeg/png/webp.
 */
export const uploadToCloudinary = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
}).single('file');
