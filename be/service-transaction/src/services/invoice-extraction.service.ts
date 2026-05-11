// invoice-extraction.service.ts
// LUỒNG (kể từ 2026-05-01):
//   Node.js nhận file từ FE → đọc buffer → gọi nội bộ Python ai-service (PaddleOCR)
//   → trả về { merchantName, totalAmount, transactionDate } chuẩn hoá về FE

import { readFile } from 'fs/promises';
import { AppError } from '../errors/AppError';

export type ExtractedInvoiceData = {
  merchantName: string;
  totalAmount: number | null;
  transactionDate: string | null;
};

// URL nội bộ Docker network — ai-service lắng nghe ở port 8000
const AI_SERVICE_OCR_URL =
  process.env.AI_SERVICE_OCR_URL ?? 'http://ai-service:8000/api/v1/ai/ocr';

class InvoiceExtractionService {
  // gọi python service, đọc buffer, trả 3 trường chuẩn hoá
  async extractFromImage(filePath: string): Promise<ExtractedInvoiceData> {
    // đọc buffer từ disk (multer lưu ở /public/uploads/)
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(filePath);
    } catch {
      throw new AppError(`Không đọc được file ảnh: ${filePath}`, 500);
    }

    // tạo multipart/form-data payload cho Python service
    const formData = new FormData();
    const ext = filePath.split('.').pop()?.toLowerCase() ?? 'jpg'
    let mimeType: string
    if (ext === 'png') {
      mimeType = 'image/png'
    } else if (ext === 'webp') {
      mimeType = 'image/webp'
    } else {
      mimeType = 'image/jpeg'
    }

    formData.append(
      'file',
      new Blob([Uint8Array.from(fileBuffer)], { type: mimeType }),
      `invoice.${ext}`
    );

    // gọi Python ai-service qua mạng nội bộ Docker
    let response: Response;
    try {
      response = await fetch(AI_SERVICE_OCR_URL, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(120_000), // PaddleOCR cold start lần đầu ~30s
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new AppError(
        `PaddleOCR service không phản hồi (${AI_SERVICE_OCR_URL}): ${msg}`,
        503
      );
    }

    // parse response
    if (!response.ok) {
      let detail = '';
      try {
        const body = (await response.json()) as { detail?: string };
        detail = body.detail ?? '';
      } catch {
        // ignore parse error
      }
      throw new AppError(
        `PaddleOCR service trả lỗi ${response.status}${detail ? ': ' + detail : ''}`,
        502
      );
    }

    let payload: { success?: boolean; data?: Partial<ExtractedInvoiceData> };
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      throw new AppError('PaddleOCR service trả về JSON không hợp lệ', 502);
    }

    const data = payload.data ?? {};

    return {
      merchantName: typeof data.merchantName === 'string' ? data.merchantName : 'Không rõ',
      totalAmount: this.normalizeAmount(data.totalAmount),
      transactionDate: this.normalizeDate(data.transactionDate),
    };
  }

  // helpers

  private normalizeAmount(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
    if (typeof value === 'string') {
      const cleaned = Number(value.replace(/[^0-9.]/g, ''));
      if (Number.isFinite(cleaned) && cleaned > 0) {
        return cleaned;
      }
    }
    return null;
  }

  private normalizeDate(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    const d = new Date(value.trim());
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
}

export const invoiceExtractionService = new InvoiceExtractionService();
