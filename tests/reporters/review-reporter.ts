import fs from 'fs';
import path from 'path';
import type { FullConfig, FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { TESTCASE_CATALOG, type TestCaseMeta } from '../e2e/testcase-catalog';

type CaseResult = {
  name: string;
  id: string;
  module: string;
  input: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  errorDetail?: string;
};

const REPORT_DATE = '03/05/2026';
const ACCOUNT = 'test030526@gmail.com';

const DEFAULT_META: TestCaseMeta = {
  id: 'UNMAPPED',
  module: 'Unknown',
  input: '-',
  expected: '-',
};

function cleanError(message: string): string {
  return message
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
}

function mdEscape(input: string): string {
  return input.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

class ReviewMarkdownReporter implements Reporter {
  private readonly cases: CaseResult[] = [];

  onBegin(_config: FullConfig) {
    this.cases.length = 0;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const status: 'PASS' | 'FAIL' = result.status === 'passed' ? 'PASS' : 'FAIL';
    const rawName = test.titlePath().slice(1).join(' > ');
    const name = rawName.replace(/^\s*>\s*/, '').trim();
    const meta = TESTCASE_CATALOG[name] ?? DEFAULT_META;

    const detail = status === 'FAIL'
      ? cleanError(
          result.error?.stack ||
            result.error?.message ||
            (result.errors?.map((item) => item.message || item.stack || '').filter(Boolean).join(' | ') ||
              'Unknown failure'),
        )
      : undefined;

    this.cases.push({
      id: meta.id,
      module: meta.module,
      input: meta.input,
      expected: meta.expected,
      actual: status === 'PASS' ? 'Đạt đúng kỳ vọng.' : `Không đạt: ${detail ?? 'Unknown failure'}`,
      name,
      status,
      errorDetail: detail,
    });
  }

  async onEnd(_result: FullResult) {
    const total = this.cases.length;
    const pass = this.cases.filter((item) => item.status === 'PASS').length;
    const fail = total - pass;

    const lines: string[] = [
      `# Báo cáo Kiểm thử Tự động (${REPORT_DATE})`,
      `- Account Test: \`${ACCOUNT}\``,
      `- Tổng số TC: [${total}] | Pass: [${pass}] | Fail: [${fail}]`,
      '## Bảng Kết quả Test Case (Input/Expected/Actual)',
      '| ID | Module | Test case | Input | Expected Result | Actual Output | Status |',
      '|---|---|---|---|---|---|---|',
    ];

    for (const item of this.cases) {
      lines.push(
        `| ${mdEscape(item.id)} | ${mdEscape(item.module)} | ${mdEscape(item.name)} | ${mdEscape(item.input)} | ${mdEscape(item.expected)} | ${mdEscape(item.actual)} | ${item.status} |`,
      );
    }

    if (fail > 0) {
      lines.push('');
      lines.push('## Chi tiết lỗi FAIL');
      for (const item of this.cases.filter((x) => x.status === 'FAIL')) {
        lines.push(`- [${item.id}] ${item.name}: ${item.errorDetail ?? 'Unknown failure'}`);
      }
    }

    const output = `${lines.join('\n')}\n`;
    const reportPath = path.resolve(__dirname, '../../review.md');
    await fs.promises.writeFile(reportPath, output, 'utf8');
  }
}

export default ReviewMarkdownReporter;
