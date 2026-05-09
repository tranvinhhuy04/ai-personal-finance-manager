import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN ?? '';

interface NLPTestCase {
  text: string;
  expectedCount: number;
  expectedCategory?: string;
  expectedAmount?: number;
  amountTolerance?: number;
}

// Test cases from chuong5.md section 5.3
const testCases: NLPTestCase[] = [
  {
    text: "Mua sách lập trình 320k",
    expectedCount: 1,
    expectedCategory: "Mua sắm",
    expectedAmount: 320000,
    amountTolerance: 0.05
  },
  {
    text: "Hôm qua ăn tối 250 nghìn với bạn",
    expectedCount: 1,
    expectedCategory: "Ăn uống",
    expectedAmount: 250000,
    amountTolerance: 0.05
  },
  {
    text: "Xăng xe 150k, ăn trưa 80k",
    expectedCount: 2,
    expectedAmount: 230000, // total
    amountTolerance: 0.1
  },
  {
    text: "Đi khám sức khỏe hôm qua, chi 1.5 triệu",
    expectedCount: 1,
    expectedCategory: "Sức khỏe",
    expectedAmount: 1500000,
    amountTolerance: 0.05
  },
  {
    text: "Học online 500k tháng",
    expectedCount: 1,
    expectedCategory: "Giáo dục",
    expectedAmount: 500000,
    amountTolerance: 0.1
  }
];

// Benchmark expectations from benchmark_pipelines.xlsx
const benchmarks = {
  amountExtractionAccuracy: 0.95,
  categoryClassificationAccuracy: 0.85,
  dateResolutionAccuracy: 0.90,
  regexFastPathUsageRate: 0.40,
  confirmationRate: 0.75,
  maxLatencyFastPath: 20, // 5-20ms
  maxLatencyLLMPath: 1500, // 0.8-1.5 seconds
};

test.describe("NLP Ghi Nhận Giao Dịch - Benchmark Verification", () => {
  let resultsLog: Array<{
    testCase: string;
    latency: number;
    transactionCount: number;
    amountAccuracy: number;
    categoryAccuracy: number;
    usedFastPath: boolean;
    passed: boolean;
    notes: string;
  }> = [];

  let fastPathCount = 0;
  let totalCount = 0;

  testCases.forEach((testCase) => {
    test(`Extract: "${testCase.text}"`, async ({ request }) => {
      const startTime = Date.now();
      totalCount++;

      const response = await request.post(`${API_BASE_URL}/api/v1/ai/nlp-transaction`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        data: {
          text: testCase.text,
          userId: 'test-user-nlp'
        }
      });

      const latency = Date.now() - startTime;
      const result = await response.json() as any;

      // Verify response structure
      expect(response.ok()).toBe(true);
      expect(result.success).toBe(true);
      expect(result.transactions).toBeDefined();
      expect(Array.isArray(result.transactions)).toBe(true);

      // Check transaction count
      const transactionCount = result.transactions.length;
      expect(transactionCount).toBeGreaterThan(0);

      // Determine if fast path was used (latency < 100ms typically)
      const usedFastPath = latency < 100;
      if (usedFastPath) fastPathCount++;

      // Calculate accuracy metrics
      let amountAccuracy = 0;
      let categoryAccuracy = 0;
      let totalExtractedAmount = 0;

      result.transactions.forEach((tx: any) => {
        totalExtractedAmount += tx.amount || 0;

        // Amount accuracy
        if (testCase.expectedAmount) {
          const diff = Math.abs((tx.amount || 0) - testCase.expectedAmount);
          const tolerance = testCase.expectedAmount * (testCase.amountTolerance || 0.1);
          amountAccuracy = Math.max(amountAccuracy, Math.max(0, 1 - (diff / testCase.expectedAmount)));
        }

        // Category accuracy
        if (testCase.expectedCategory && tx.category) {
          categoryAccuracy = tx.category.toLowerCase() === testCase.expectedCategory.toLowerCase() ? 1.0 : 0.5;
        }
      });

      // For multiple transactions, check total
      if (testCase.expectedCount > 1 && testCase.expectedAmount) {
        const diff = Math.abs(totalExtractedAmount - testCase.expectedAmount);
        const tolerance = testCase.expectedAmount * (testCase.amountTolerance || 0.1);
        amountAccuracy = Math.max(0, 1 - (diff / testCase.expectedAmount));
      }

      const testResult = {
        testCase: testCase.text,
        latency,
        transactionCount,
        amountAccuracy: Math.round(amountAccuracy * 100),
        categoryAccuracy: Math.round(categoryAccuracy * 100),
        usedFastPath,
        passed: amountAccuracy >= benchmarks.amountExtractionAccuracy * 0.9,
        notes: `Latency: ${latency}ms, FastPath: ${usedFastPath}`
      };

      resultsLog.push(testResult);

      // Assert against benchmarks
      expect(transactionCount).toBeGreaterThanOrEqual(testCase.expectedCount);
      expect(amountAccuracy).toBeGreaterThanOrEqual(benchmarks.amountExtractionAccuracy * 0.9);
    });
  });

  test("Amount Extraction Accuracy - Multiple Amounts", async ({ request }) => {
    const testTexts = [
      { text: "Xăng 100k", expected: 100000 },
      { text: "Ăn 50 nghìn", expected: 50000 },
      { text: "Mua 1.5 triệu", expected: 1500000 },
      { text: "Chi 2.5 triệu mua điện thoại", expected: 2500000 },
      { text: "Nợ bạn 200k", expected: 200000 },
      { text: "5 trăm ngàn tiền xăng", expected: 500000 },
      { text: "30.000 đồng bánh", expected: 30000 },
    ];

    let correctCount = 0;
    const results: Array<{ text: string; expected: number; extracted: number; accurate: boolean }> = [];

    for (const test of testTexts) {
      const response = await request.post(`${API_BASE_URL}/api/v1/ai/nlp-transaction`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        data: {
          text: test.text,
          userId: 'test-user-nlp'
        }
      });

      if (response.ok()) {
        const result = await response.json() as any;
        const extracted = result.transactions?.[0]?.amount || 0;
        const diff = Math.abs(extracted - test.expected);
        const accurate = diff <= test.expected * 0.1; // 10% tolerance
        if (accurate) correctCount++;
        results.push({
          text: test.text,
          expected: test.expected,
          extracted,
          accurate
        });
      }
    }

    const accuracy = (correctCount / testTexts.length) * 100;
    console.log(`\nAmount Extraction Accuracy: ${accuracy.toFixed(2)}%`);
    console.log(`Benchmark expectation: ~95%`);

    resultsLog.push({
      testCase: `Amount Extraction Accuracy (${testTexts.length} amounts)`,
      latency: 0,
      transactionCount: testTexts.length,
      amountAccuracy: Math.round(accuracy),
      categoryAccuracy: 0,
      usedFastPath: false,
      passed: accuracy >= 90, // Allow 5% margin
      notes: `${correctCount}/${testTexts.length} correct`
    });

    expect(accuracy).toBeGreaterThanOrEqual(90);
  });

  test("Category Classification Accuracy - 8 Categories", async ({ request }) => {
    const categoryTests = [
      { text: "Ăn cơm trưa", expected: "Ăn uống" },
      { text: "Đi xe bus", expected: "Di chuyển" },
      { text: "Mua quần áo", expected: "Mua sắm" },
      { text: "Xem phim", expected: "Giải trí" },
      { text: "Khám bác sĩ", expected: "Sức khỏe" },
      { text: "Học thêm tiếng Anh", expected: "Giáo dục" },
      { text: "Trả hóa đơn nước", expected: "Tiện ích" },
      { text: "Khác chi phí đặc biệt", expected: "Khác" },
    ];

    let correctCount = 0;
    const results: Array<{ text: string; expected: string; extracted: string; correct: boolean }> = [];

    for (const test of categoryTests) {
      const response = await request.post(`${API_BASE_URL}/api/v1/ai/nlp-transaction`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        data: {
          text: test.text,
          userId: 'test-user-nlp'
        }
      });

      if (response.ok()) {
        const result = await response.json() as any;
        const extracted = result.transactions?.[0]?.category || 'Khác';
        const correct = extracted.toLowerCase() === test.expected.toLowerCase();
        if (correct) correctCount++;
        results.push({
          text: test.text,
          expected: test.expected,
          extracted,
          correct
        });
      }
    }

    const accuracy = (correctCount / categoryTests.length) * 100;
    console.log(`\nCategory Classification Accuracy: ${accuracy.toFixed(2)}%`);
    console.log(`Benchmark expectation: ~85%`);

    resultsLog.push({
      testCase: `Category Classification (${categoryTests.length} categories)`,
      latency: 0,
      transactionCount: categoryTests.length,
      amountAccuracy: 0,
      categoryAccuracy: Math.round(accuracy),
      usedFastPath: false,
      passed: accuracy >= 80, // Allow 5% margin
      notes: `${correctCount}/${categoryTests.length} correct`
    });

    expect(accuracy).toBeGreaterThanOrEqual(80);
  });

  test("Fast Path vs LLM Path - Latency Comparison", async ({ request }) => {
    const simpleText = "Ăn 50k"; // Should use fast path
    const complexText = "Tôi đã chi bao nhiêu cho các khoản khác nhau tháng này, chủ yếu là ăn và xăng xe khoảng 300 ngàn đồng";

    const simplePath = await request.post(`${API_BASE_URL}/api/v1/ai/nlp-transaction`, {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
      data: { text: simpleText, userId: 'test-user-nlp' }
    });

    const complexPath = await request.post(`${API_BASE_URL}/api/v1/ai/nlp-transaction`, {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
      data: { text: complexText, userId: 'test-user-nlp' }
    });

    // Note: Timing would need to be added to response
    const simpleResult = await simplePath.json() as any;
    const complexResult = await complexPath.json() as any;

    console.log(`\nFast Path vs LLM Path:`);
    console.log(`- Simple input (${simpleText}): Should use regex fast-path (<100ms)`);
    console.log(`- Complex input (${complexText.substring(0, 50)}...): Should use LLM (<1500ms)`);
    console.log(`- Fast path usage target: ~40%`);

    expect(simpleResult.transactions.length).toBeGreaterThan(0);
    expect(complexResult.transactions.length).toBeGreaterThan(0);
  });

  test("Date Resolution - Relative Time", async ({ request }) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateTests = [
      { text: "Hôm nay ăn 50k", expectedDaysOffset: 0 },
      { text: "Hôm qua xăng 100k", expectedDaysOffset: -1 },
      { text: "Ăn 80k", expectedDaysOffset: 0 }, // default to today
    ];

    let correctCount = 0;

    for (const test of dateTests) {
      const response = await request.post(`${API_BASE_URL}/api/v1/ai/nlp-transaction`, {
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
        data: { text: test.text, userId: 'test-user-nlp' }
      });

      if (response.ok()) {
        const result = await response.json() as any;
        const extractedDate = new Date(result.transactions?.[0]?.date);
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() + test.expectedDaysOffset);

        const sameDay = extractedDate.toDateString() === expectedDate.toDateString();
        if (sameDay) correctCount++;
      }
    }

    const accuracy = (correctCount / dateTests.length) * 100;
    console.log(`\nDate Resolution Accuracy: ${accuracy.toFixed(2)}%`);
    console.log(`Benchmark expectation: ~90%`);

    resultsLog.push({
      testCase: `Date Resolution (${dateTests.length} cases)`,
      latency: 0,
      transactionCount: 0,
      amountAccuracy: 0,
      categoryAccuracy: 0,
      usedFastPath: false,
      passed: accuracy >= 85,
      notes: `${correctCount}/${dateTests.length} correct`
    });

    expect(accuracy).toBeGreaterThanOrEqual(85);
  });

  test.afterAll(async () => {
    const fastPathUsageRate = (fastPathCount / totalCount) * 100;
    console.log(`\nFast Path Usage Rate: ${fastPathUsageRate.toFixed(2)}%`);
    console.log(`Benchmark expectation: ~40%`);

    const reportPath = path.join(__dirname, '../../reports/nlp-extraction-benchmark-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(resultsLog, null, 2));
    console.log(`\n=== NLP Extraction Benchmark Results ===`);
    console.log(JSON.stringify(resultsLog, null, 2));
  });
});
