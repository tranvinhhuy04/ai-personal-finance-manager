import { unlink } from 'fs/promises';
import { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { catchAsync } from '../middlewares/catchAsync';
import { resolveInvoiceImageUrl } from '../middlewares/upload.middleware';
import { invoiceExtractionService } from '../services/invoice-extraction.service';
import { invoiceService } from '../services/invoice.service';

type InvoiceUploadRequest = Request & {
  file?: {
    filename: string;
    path: string;
    mimetype: string;
    originalname: string;
  };
};

function parseJsonObject(input: unknown, fieldName: string): Record<string, unknown> | undefined {
  if (input === undefined || input === null || input === '') {
    return undefined;
  }

  if (typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error('invalid shape');
      }
      return parsed as Record<string, unknown>;
    } catch {
      throw new AppError(`${fieldName} must be a valid JSON object`, 400);
    }
  }

  throw new AppError(`${fieldName} must be a valid JSON object`, 400);
}

export const extractInvoice = catchAsync(async (req: Request, res: Response) => {
  const uploadReq = req as InvoiceUploadRequest;

  if (!uploadReq.file?.path) {
    throw new AppError('Invoice image file is required', 400);
  }

  try {
    const data = await invoiceExtractionService.extractFromImage(uploadReq.file.path);
    return res.status(200).json({
      success: true,
      data,
    });
  } finally {
    void unlink(uploadReq.file.path).catch(() => undefined);
  }
});

export const uploadInvoice = catchAsync(async (req: Request, res: Response) => {
  const uploadReq = req as InvoiceUploadRequest;
  const userId = String((req as any).userId ?? '');

  if (!uploadReq.file) {
    throw new AppError('Invoice image file is required', 400);
  }

  const extractedData = parseJsonObject(req.body?.extracted_data, 'extracted_data') ?? {};

  const result = await invoiceService.uploadInvoice(
    {
      user_id: userId,
      image_url: resolveInvoiceImageUrl(uploadReq.file.filename),
      extracted_data: extractedData,
    },
    userId
  );

  return res.status(201).json(result);
});

export const listInvoices = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const result = await invoiceService.listInvoices(userId);
  return res.status(200).json(result);
});

export const updateInvoice = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const invoiceId = req.params.id;

  const result = await invoiceService.updateInvoice(
    invoiceId,
    userId,
    {
      image_url: req.body?.image_url,
      extracted_data: parseJsonObject(req.body?.extracted_data, 'extracted_data'),
      status: req.body?.status,
    },
    userId
  );

  return res.status(200).json(result);
});

export const deleteInvoice = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const invoiceId = req.params.id;

  const result = await invoiceService.softDeleteInvoice(invoiceId, userId, userId);
  return res.status(200).json(result);
});

export const confirmInvoice = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const invoiceId = req.params.id;

  const result = await invoiceService.confirmInvoice(
    invoiceId,
    userId,
    {
      wallet_id: req.body?.wallet_id,
      category_id: req.body?.category_id,
      amount: req.body?.amount,
      transaction_type: req.body?.transaction_type,
      currency: req.body?.currency,
      description: req.body?.description,
      occurred_at: req.body?.occurred_at,
      extracted_data: parseJsonObject(req.body?.extracted_data, 'extracted_data'),
    },
    userId
  );

  return res.status(200).json(result);
});
