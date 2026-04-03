import { ImageAnnotatorClient } from '@google-cloud/vision';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import { AppError } from '../errors/AppError';

export type ExtractedInvoiceData = {
  merchantName: string;
  totalAmount: number | null;
  transactionDate: string | null;
};

type InlineGoogleCredentials = {
  project_id?: string;
  private_key?: string;
  client_email?: string;
  [key: string]: unknown;
};

class InvoiceExtractionService {
  private visionClient: ImageAnnotatorClient | null = null;
  private geminiClient: GoogleGenerativeAI | null = null;

  async extractFromImage(filePath: string): Promise<ExtractedInvoiceData> {
    const rawText = await this.extractRawText(filePath);
    return this.parseWithGemini(rawText);
  }

  private getVisionClient(): ImageAnnotatorClient {
    if (this.visionClient) {
      return this.visionClient;
    }

    const clientOptions: {
      keyFilename?: string;
      projectId?: string;
      credentials?: InlineGoogleCredentials;
    } = {};
    const projectId = process.env.GOOGLE_CLOUD_PROJECT?.trim();
    const inlineCredentials = process.env.GCP_VISION_CREDENTIALS_JSON?.trim();
    const keyFile = this.resolveCredentialFile();

    if (inlineCredentials) {
      try {
        const parsed = JSON.parse(inlineCredentials) as InlineGoogleCredentials;
        if (typeof parsed.private_key === 'string') {
          parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
        }

        clientOptions.credentials = parsed;
        clientOptions.projectId = projectId ?? parsed.project_id;
      } catch {
        throw new AppError('GCP_VISION_CREDENTIALS_JSON is not valid JSON', 500);
      }
    } else if (keyFile) {
      clientOptions.keyFilename = keyFile;
      if (projectId) {
        clientOptions.projectId = projectId;
      }
    } else if (projectId) {
      clientOptions.projectId = projectId;
    }

    this.visionClient = new ImageAnnotatorClient(clientOptions);
    return this.visionClient;
  }

  private resolveCredentialFile(): string | undefined {
    const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    const candidates = new Set<string>();

    if (envPath) {
      candidates.add(envPath);
    }

    const candidateDirs = [
      path.resolve(process.cwd(), 'config'),
      path.resolve(process.cwd(), '..', 'ai-service', 'config'),
      '/app/config',
    ];

    for (const dir of candidateDirs) {
      if (!existsSync(dir)) {
        continue;
      }

      const jsonFiles = readdirSync(dir).filter((fileName) => fileName.toLowerCase().endsWith('.json'));
      for (const fileName of jsonFiles) {
        candidates.add(path.join(dir, fileName));
      }
    }

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  private getGeminiClient(): GoogleGenerativeAI {
    if (this.geminiClient) {
      return this.geminiClient;
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new AppError('GEMINI_API_KEY is not configured for invoice extraction', 503);
    }

    this.geminiClient = new GoogleGenerativeAI(apiKey);
    return this.geminiClient;
  }

  private async extractRawText(filePath: string): Promise<string> {
    try {
      const client = this.getVisionClient();
      const [result] = await client.documentTextDetection(filePath);
      const rawText = result.fullTextAnnotation?.text?.trim() || result.textAnnotations?.[0]?.description?.trim() || '';

      if (!rawText) {
        throw new AppError('Google Vision không đọc được nội dung hóa đơn từ ảnh này', 422);
      }

      return rawText;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'Google Vision OCR failed. Hãy kiểm tra file service-account JSON hoặc GOOGLE_APPLICATION_CREDENTIALS / GCP_VISION_CREDENTIALS_JSON.',
        502
      );
    }
  }

  private async parseWithGemini(rawText: string): Promise<ExtractedInvoiceData> {
    try {
      const model = this.getGeminiClient().getGenerativeModel({
        model: process.env.GEMINI_INVOICE_MODEL?.trim() || 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 512,
          responseMimeType: 'application/json',
        },
      });

      const prompt = [
        'Bạn là bộ máy trích xuất dữ liệu hóa đơn cực kỳ chính xác.',
        'Nhiệm vụ: đọc RAW TEXT từ OCR và trả về CHÍNH XÁC một JSON object hợp lệ với đúng 3 key:',
        '- merchantName: tên cửa hàng/đơn vị bán hàng',
        '- totalAmount: tổng số tiền cuối cùng khách thực sự phải thanh toán, kiểu number',
        '- transactionDate: ngày giao dịch ở định dạng ISO 8601',
        'Quy tắc bắt buộc:',
        '1. Bỏ qua mã số thuế, số hóa đơn, mã tham chiếu, số điện thoại, mã thành viên, điểm thưởng.',
        '2. Ưu tiên số tiền cuối cùng sau giảm giá, thường nằm gần các nhãn như "Tổng tiền", "Cần thanh toán", "Thanh toán", "Grand Total", "Amount Paid".',
        '3. Không chọn giá từng món hoặc subtotal nếu còn có tổng thanh toán cuối cùng.',
        '4. Nếu không chắc merchantName hoặc transactionDate thì trả null cho trường đó.',
        '5. Chỉ trả về JSON thuần trên một dòng, không thêm markdown, không thêm ```json, không thêm giải thích.',
        '',
        'RAW TEXT:',
        rawText.slice(0, 12000),
      ].join('\n');

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      const parsed = this.parseJsonResponse(responseText);
      const fallback = this.fallbackFromRawText(rawText);

      return {
        merchantName: this.normalizeMerchantName(parsed.merchantName) || fallback.merchantName,
        totalAmount: this.normalizeAmount(parsed.totalAmount) ?? fallback.totalAmount,
        transactionDate: this.normalizeDate(parsed.transactionDate) ?? fallback.transactionDate,
      };
    } catch (error) {
      const fallback = this.fallbackFromRawText(rawText);
      if (fallback.merchantName || fallback.totalAmount !== null || fallback.transactionDate !== null) {
        return fallback;
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Gemini failed to structure invoice data from OCR text', 502);
    }
  }

  private parseJsonResponse(text: string): Record<string, unknown> {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const candidate = firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

    const normalized = candidate
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .trim();

    try {
      const parsed = JSON.parse(normalized) as unknown;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error('invalid shape');
      }
      return parsed as Record<string, unknown>;
    } catch {
      throw new AppError('Gemini returned invalid JSON for invoice extraction', 502);
    }
  }

  private fallbackFromRawText(rawText: string): ExtractedInvoiceData {
    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    return {
      merchantName: this.extractMerchantFromLines(lines),
      totalAmount: this.extractTotalAmountFromLines(lines),
      transactionDate: this.extractDateFromText(rawText),
    };
  }

  private extractMerchantFromLines(lines: string[]): string {
    const ignoredPattern = /^(stt|tên|địa chỉ|address|hotline|hóa đơn|ngày|giờ|mã|bàn|wifi|pass?|khách hàng|tổng|thành tiền|tiền|ghi chú)/i;

    const preferred = lines.slice(0, 20).find((line) => {
      if (ignoredPattern.test(line)) {
        return false;
      }

      if (line.length < 4 || line.length > 80) {
        return false;
      }

      if (/\d{4,}/.test(line)) {
        return false;
      }

      return /[A-Za-zÀ-ỹ]{3,}/.test(line);
    });

    return preferred?.replace(/[|]+/g, ' ').trim() ?? '';
  }

  private extractTotalAmountFromLines(lines: string[]): number | null {
    const priorityPatterns = [
      /tổng tiền|cần thanh toán|khách cần trả|amount paid|grand total/i,
      /thanh toán|payment/i,
      /thành tiền|total/i,
    ];

    for (const pattern of priorityPatterns) {
      for (let index = 0; index < lines.length; index += 1) {
        if (!pattern.test(lines[index])) {
          continue;
        }

        const candidateLines = lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 10));
        const filteredAmounts = candidateLines
          .filter((line) => !/điểm|point|member|khách hàng|wifi|pass|mật khẩu|ưu đãi/i.test(line))
          .flatMap((line) => {
            if (/giảm|discount/i.test(line) || /^\s*-\s*\d/.test(line)) {
              return [] as number[];
            }
            return this.extractAmounts(line);
          });

        if (filteredAmounts.length > 0) {
          return filteredAmounts[filteredAmounts.length - 1];
        }
      }
    }

    const allAmounts = this.extractAmounts(lines.join(' '));
    return allAmounts.length > 0 ? allAmounts[allAmounts.length - 1] : null;
  }

  private extractAmounts(text: string): number[] {
    const matches = text.match(/\b\d{1,3}(?:[.,]\d{3})+(?:\s*₫)?|\b\d{4,}\b/g) ?? [];

    return matches
      .map((value) => this.normalizeAmount(value))
      .filter((value): value is number => value !== null && value > 0 && value < 1_000_000_000);
  }

  private extractDateFromText(text: string): string | null {
    const labeledDate = text.match(/ngày\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i);
    if (labeledDate?.[1]) {
      return this.normalizeDate(labeledDate[1]);
    }

    const firstDate = text.match(/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/);
    return firstDate?.[0] ? this.normalizeDate(firstDate[0]) : null;
  }

  private normalizeMerchantName(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  private normalizeAmount(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const cleaned = value.replace(/[^0-9,.-]/g, '').trim();
    if (!cleaned) {
      return null;
    }

    let normalized = cleaned;
    if (normalized.includes('.') && normalized.includes(',')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (normalized.includes(',') && normalized.split(',').pop()?.length === 3) {
      normalized = normalized.replace(/,/g, '');
    } else if (normalized.includes('.') && normalized.split('.').pop()?.length === 3) {
      normalized = normalized.replace(/\./g, '');
    } else {
      normalized = normalized.replace(',', '.');
    }

    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : null;
  }

  private normalizeDate(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }

    const trimmed = value.trim();
    const isoCandidate = new Date(trimmed);
    if (!Number.isNaN(isoCandidate.getTime())) {
      return isoCandidate.toISOString();
    }

    const match = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (!match) {
      return null;
    }

    const [, dayText, monthText, yearText, hourText = '0', minuteText = '0'] = match;
    const year = yearText.length === 2 ? Number(`20${yearText}`) : Number(yearText);
    const month = Number(monthText) - 1;
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);

    const parsed = new Date(year, month, day, hour, minute);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
}

export const invoiceExtractionService = new InvoiceExtractionService();
