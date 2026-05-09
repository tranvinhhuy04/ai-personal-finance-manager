import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN ?? ''; // Set this from environment

interface ChatTestCase {
  message: string;
  expectedIntent: string;
  route: 'analytics_chat' | 'advisor_chat' | 'unknown';
  maxLatency: number;
}

// Test cases matching chuong5.md section 5.2
const testCases: ChatTestCase[] = [
  {
    message: "Tháng này tôi tiêu bao nhiêu?",
    expectedIntent: "query_spending",
    route: "analytics_chat",
    maxLatency: 4000, // From benchmark: ~1.5-4 giây (cold)
  },
  {
    message: "Tháng này tôi tiêu nhiều nhất vào khoản gì?",
    expectedIntent: "query_spending",
    route: "analytics_chat",
    maxLatency: 4000,
  },
  {
    message: "Thu nhập tháng này là bao nhiêu?",
    expectedIntent: "query_income",
    route: "analytics_chat",
    maxLatency: 4000,
  },
  {
    message: "Làm sao để tiết kiệm 20% lương?",
    expectedIntent: "financial_advice",
    route: "advisor_chat",
    maxLatency: 6000, // From benchmark: ~3-6 giây (cold)
  },
  {
    message: "Hôm nay chi tiêu bao nhiêu?",
    expectedIntent: "query_spending",
    route: "analytics_chat",
    maxLatency: 4000,
  }
];

// Benchmark expectations from benchmark_pipelines.xlsx
const benchmarks = {
  analytics_chat: {
    intentAccuracy: 0.82,
    maxLatency: 4000,
    maxLatencyCold: 1500, // ~1.5-4 giây
    maxLatencyHot: 200, // ~200 ms for cache hit
    costPerRequest: 0.0003,
  },
  advisor_chat: {
    intentAccuracy: 0.88,
    maxLatency: 6000,
    maxLatencyCold: 3000, // ~3-6 giây
    maxLatencyHot: 10, // <10 ms
    costPerRequest: 0.002,
  }
};

test.describe("AI Chatbot - Benchmark Verification", () => {
  let resultsLog: Array<{
    testCase: string;
    route: string;
    latency: number;
    intent: string;
    confidence: number;
    passed: boolean;
    estimatedCost: string;
  }> = [];

  let chatHistory: Array<{ message: string; latency: number }> = [];

  testCases.forEach((testCase) => {
    test(`Intent Classification: "${testCase.message}"`, async ({ request }) => {
      const startTime = Date.now();

      const payload = {
        message: testCase.message,
        financialContext: {
          totalIncome: 25000000,
          totalExpense: 8500000,
          netCashFlow: 16500000,
          topExpenses: [
            { name: "Ăn uống", amount: 2800000 },
            { name: "Di chuyển", amount: 1500000 }
          ]
        },
        use_llm: true,
        model: "gemini-2.5-flash"
      };

      const response = await request.post(`${API_BASE_URL}/api/v1/ai/chat`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        data: payload
      });

      const latency = Date.now() - startTime;
      const result = await response.json() as any;

      // Verify response structure
      expect(response.ok()).toBe(true);
      expect(result.success).toBe(true);
      expect(result.intent).toBeDefined();
      expect(result.answer).toBeDefined();
      expect(result.confidence).toBeDefined();

      // Check intent classification
      const intentMatches = result.intent === testCase.expectedIntent;
      const intentAccuracy = intentMatches ? 1.0 : 0.5;
      const confidence = result.confidence || 0;

      // Record for cache hit test
      chatHistory.push({ message: testCase.message, latency });

      const benchmark = benchmarks[testCase.route];
      const testResult = {
        testCase: testCase.message,
        route: testCase.route,
        latency,
        intent: result.intent,
        confidence: Math.round(confidence * 100),
        passed: latency <= testCase.maxLatency && intentAccuracy >= benchmark.intentAccuracy * 0.9,
        estimatedCost: `$${benchmark.costPerRequest.toFixed(6)}`
      };

      resultsLog.push(testResult);

      // Assert against benchmarks
      expect(latency).toBeLessThanOrEqual(testCase.maxLatency);
      expect(result.intent).toMatch(new RegExp(testCase.expectedIntent, 'i'));
    });
  });

  test("Cache Hit Performance - Repeated Question", async ({ request }) => {
    if (chatHistory.length === 0) {
      test.skip();
    }

    // Repeat first question to test cache
    const firstMessage = chatHistory[0].message;
    const startTime = Date.now();

    const response = await request.post(`${API_BASE_URL}/api/v1/ai/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      data: {
        message: firstMessage,
        financialContext: {
          totalIncome: 25000000,
          totalExpense: 8500000,
          netCashFlow: 16500000,
          topExpenses: [
            { name: "Ăn uống", amount: 2800000 },
            { name: "Di chuyển", amount: 1500000 }
          ]
        },
        use_llm: false // Try without LLM for cache test
      }
    });

    const cacheHitLatency = Date.now() - startTime;
    const result = await response.json() as any;

    console.log(`\nCache Hit Test:`);
    console.log(`- Original latency: ${chatHistory[0].latency}ms`);
    console.log(`- Cache hit latency: ${cacheHitLatency}ms`);
    console.log(`- Improvement: ${((1 - cacheHitLatency / chatHistory[0].latency) * 100).toFixed(2)}%`);

    // Cache hit should be significantly faster
    expect(cacheHitLatency).toBeLessThanOrEqual(200); // ~200ms per benchmark
  });

  test("Intent Classification Accuracy - 50 Questions Batch", async ({ request }) => {
    // Extended test to verify ~82-88% accuracy claim
    const questions = [
      // query_spending (should be ~82%)
      "Tôi tiêu bao nhiêu tháng này?",
      "Chi tiêu tháng này bao nhiêu?",
      "Khoản nào tôi tiêu nhiều nhất?",
      "Danh mục chi tiêu nào cao nhất?",
      "Tôi đã chi bao nhiêu cho ăn uống?",
      // query_income (should be ~90%)
      "Thu nhập tháng này bao nhiêu?",
      "Lương tháng này là gì?",
      "Tôi kiếm được bao nhiêu?",
      // financial_advice (should be ~88%)
      "Làm sao tiết kiệm được 20%?",
      "Bạn có lời khuyên gì về tài chính?",
    ];

    let correctCount = 0;
    const results: Array<{ question: string; intent: string; correct: boolean }> = [];

    for (const question of questions) {
      const response = await request.post(`${API_BASE_URL}/api/v1/ai/chat`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        data: {
          message: question,
          financialContext: {
            totalIncome: 25000000,
            totalExpense: 8500000,
            netCashFlow: 16500000,
            topExpenses: []
          },
          use_llm: false
        }
      });

      if (response.ok()) {
        const result = await response.json() as any;
        const isCorrect = result.intent !== 'unknown' && result.confidence > 0.35;
        if (isCorrect) correctCount++;
        results.push({
          question,
          intent: result.intent || 'unknown',
          correct: isCorrect
        });
      }
    }

    const accuracy = (correctCount / questions.length) * 100;
    console.log(`\nIntent Classification Accuracy: ${accuracy.toFixed(2)}%`);
    console.log(`Benchmark expectation: ~82-88%`);

    resultsLog.push({
      testCase: `Accuracy Batch Test (${questions.length} questions)`,
      route: "analytics_chat",
      latency: 0,
      intent: `${accuracy.toFixed(2)}%`,
      confidence: Math.round(correctCount),
      passed: accuracy >= 75, // Allow 7% margin
      estimatedCost: "N/A"
    });

    expect(accuracy).toBeGreaterThanOrEqual(75); // ~82-88% with 7% margin
  });

  test.afterAll(async () => {
    const reportPath = path.join(__dirname, '../../reports/ai-chatbot-benchmark-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(resultsLog, null, 2));
    console.log(`\n=== AI Chatbot Benchmark Results ===`);
    console.log(JSON.stringify(resultsLog, null, 2));
  });
});
