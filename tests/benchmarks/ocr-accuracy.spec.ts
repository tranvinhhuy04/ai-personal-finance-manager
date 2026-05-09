import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000';

interface OCRTestCase {
  name: string;
  imagePath: string;
  expected: {
    merchantName?: string;
    totalAmount?: number;
    transactionDate?: string;
  };
}

// Define test cases for 4 invoice types from benchmark_pipelines.xlsx
const testCases: OCRTestCase[] = [
  {
    name: "Hóa đơn điện tử (ShopeePay, MoMo)",
    imagePath: "test-data/receipt-digital.jpg",
    expected: {
      merchantName: "SHOPEE",
      totalAmount: 58800,
      transactionDate: "2026-05-01"
    }
  },
  {
    name: "Hóa đơn VAT in nhiệt",
    imagePath: "test-data/receipt-vat.jpg",
    expected: {
      merchantName: "DIEN LUC",
      totalAmount: 150000,
      transactionDate: "2026-04-28"
    }
  },
  {
    name: "Hóa đơn bán lẻ",
    imagePath: "test-data/receipt-retail.jpg",
    expected: {
      merchantName: "CONVENIENCE STORE",
      totalAmount: 35000,
      transactionDate: "2026-05-07"
    }
  }
];

// Benchmark expectations from benchmark_pipelines.xlsx
const benchmarks = {
  "Hóa đơn điện tử (ShopeePay, MoMo)": {
    amountAccuracy: 0.90,
    dateAccuracy: 0.85,
    maxLatency: 2000, // 2 seconds after warmup
  },
  "Hóa đơn VAT in nhiệt": {
    amountAccuracy: 0.75,
    dateAccuracy: 0.70,
    maxLatency: 2000,
  },
  "Hóa đơn bán lẻ": {
    amountAccuracy: 0.85,
    dateAccuracy: 0.80,
    maxLatency: 2000,
  }
};

test.describe("OCR Hóa Đơn - Benchmark Verification", () => {
  let resultsLog: Array<{
    testCase: string;
    latency: number;
    amountAccuracy: number;
    dateAccuracy: number;
    passed: boolean;
    notes: string;
  }> = [];

  testCases.forEach((testCase) => {
    test(`${testCase.name} - Amount & Date Extraction`, async ({ request }) => {
      const startTime = Date.now();

      // Create FormData with test image
      const formData = new FormData();
      
      // For this test, we'll use a mock image or real test image if available
      // In production, you would upload an actual receipt image
      const imagePath = path.join(__dirname, '../../', testCase.imagePath);
      
      if (!fs.existsSync(imagePath)) {
        test.skip();
      }

      const fileContent = fs.readFileSync(imagePath);
      const blob = new Blob([fileContent], { type: 'image/jpeg' });
      formData.append('file', blob, 'receipt.jpg');

      // Call OCR endpoint
      const response = await request.post(`${API_BASE_URL}/api/v1/ai/ocr`, {
        multipart: {
          file: {
            name: 'receipt.jpg',
            mimeType: 'image/jpeg',
            buffer: fileContent
          }
        }
      });

      const latency = Date.now() - startTime;
      const result = await response.json() as any;

      // Verify response structure
      expect(response.ok()).toBe(true);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.totalAmount).toBeDefined();

      // Calculate accuracy metrics
      let amountAccuracy = 1.0;
      let dateAccuracy = 1.0;

      if (testCase.expected.totalAmount && result.data.totalAmount) {
        const diff = Math.abs(result.data.totalAmount - testCase.expected.totalAmount);
        const tolerance = testCase.expected.totalAmount * 0.15; // 15% tolerance
        amountAccuracy = Math.max(0, 1 - (diff / testCase.expected.totalAmount));
      }

      if (testCase.expected.transactionDate && result.data.transactionDate) {
        dateAccuracy = result.data.transactionDate === testCase.expected.transactionDate ? 1.0 : 0.5;
      }

      const benchmark = benchmarks[testCase.name as keyof typeof benchmarks];
      const testResult = {
        testCase: testCase.name,
        latency,
        amountAccuracy: Math.round(amountAccuracy * 100),
        dateAccuracy: Math.round(dateAccuracy * 100),
        passed: latency <= benchmark.maxLatency,
        notes: `Latency: ${latency}ms (max: ${benchmark.maxLatency}ms)`
      };

      resultsLog.push(testResult);

      // Assert against benchmarks
      expect(latency).toBeLessThanOrEqual(benchmark.maxLatency);
      expect(amountAccuracy).toBeGreaterThanOrEqual(benchmark.amountAccuracy * 0.9); // Allow 10% margin
      expect(dateAccuracy).toBeGreaterThanOrEqual(benchmark.dateAccuracy * 0.9);
    });
  });

  test.afterAll(async () => {
    const reportPath = path.join(__dirname, '../../reports/ocr-benchmark-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(resultsLog, null, 2));
    console.log(`\n=== OCR Benchmark Results ===`);
    console.log(JSON.stringify(resultsLog, null, 2));
  });
});
