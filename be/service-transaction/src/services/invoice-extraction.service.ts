/**
 * invoice-extraction.service.ts
 *
 * LUỒNG MỚI (kể từ 2026-05-01):
 *   Node.js nhận file từ FE → đọc buffer → gọi nội bộ Python ai-service (PaddleOCR)
 *   → trả về { merchantName, totalAmount, transactionDate } chuẩn hóa về FE.
 *
 * Google Cloud Vision + Gemini đã được loại bỏ khỏi luồng active.
 * Xem @deprecated block trong file cũ nếu cần rollback.
 */

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
  /**
   * Đọc file ảnh từ disk rồi gọi Python PaddleOCR service qua mạng nội bộ Docker.
   * Trả về 3 trường chuẩn hoá: merchantName, totalAmount, transactionDate.
   */
  async extractFromImage(filePath: string): Promise<ExtractedInvoiceData> {
    // 1. Đọc file buffer từ disk (multer đã lưu vào /public/uploads/)
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(filePath);
    } catch {
      throw new AppError(`Cannot read uploaded invoice file: ${filePath}`, 500);
    }

    // 2. Tạo multipart/form-data payload dùng FormData của Node 18+ built-in
    const formData = new FormData();
    const ext = filePath.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeType =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    formData.append(
      'file',
      new Blob([Uint8Array.from(fileBuffer)], { type: mimeType }),
      `invoice.${ext}`
    );

    // 3. Gọi Python ai-service qua mạng nội bộ Docker
    let response: Response;
    try {
      response = await fetch(AI_SERVICE_OCR_URL, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(120_000), // 120s — PaddleOCR cold start lần đầu ~30s
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new AppError(
        `PaddleOCR service không phản hồi (${AI_SERVICE_OCR_URL}): ${msg}`,
        503
      );
    }

    // 4. Parse response
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

  // ─── helpers ──────────────────────────────────────────────────────────────

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
