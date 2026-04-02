import fs from 'fs';
import path from 'path';
import multer, { FileFilterCallback, StorageEngine } from 'multer';
import { AppError } from '../errors/AppError';

export interface UploadStorageProvider {
  createStorage(): StorageEngine;
  resolvePublicUrl(fileName: string): string;
}

class LocalDiskStorageProvider implements UploadStorageProvider {
  constructor(
    private readonly targetDir: string,
    private readonly publicBasePath: string
  ) {
    fs.mkdirSync(this.targetDir, { recursive: true });
  }

  createStorage(): StorageEngine {
    return multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, this.targetDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        const safeBase = path
          .basename(file.originalname, ext)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .slice(0, 48);

        cb(null, `${Date.now()}-${safeBase || 'invoice'}${ext}`);
      },
    });
  }

  resolvePublicUrl(fileName: string): string {
    return `${this.publicBasePath}/${fileName}`;
  }
}

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const localInvoiceStorageProvider = new LocalDiskStorageProvider(
  path.join(process.cwd(), 'public', 'uploads'),
  '/api/v1/invoices/files'
);

function imageFileFilter(_req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
    cb(new AppError('Only JPG, PNG, and WEBP invoice images are allowed', 400));
    return;
  }

  cb(null, true);
}

export function createUploadMiddleware(provider: UploadStorageProvider = localInvoiceStorageProvider) {
  return multer({
    storage: provider.createStorage(),
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 8 * 1024 * 1024,
      files: 1,
    },
  });
}

export const uploadInvoiceImage = createUploadMiddleware(localInvoiceStorageProvider).single('file');

export function resolveInvoiceImageUrl(fileName: string): string {
  return localInvoiceStorageProvider.resolvePublicUrl(fileName);
}
