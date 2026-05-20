// ==================== CONSTANTS ====================
const MOCK_USER_ID = 'demo-user-001';
const DEMO_TOKEN = 'demo-token-vercel-mock';

// ==================== MOCK DATA ====================
const INITIAL_WALLETS = [
  { id: 'wallet-cash-001', userId: MOCK_USER_ID, walletType: 'CASH', walletName: 'Ví tiền mặt', balance: '5200000', status: 1, version: 1, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-05-20T00:00:00.000Z' },
  { id: 'wallet-momo-001', userId: MOCK_USER_ID, walletType: 'MOMO', walletName: 'MoMo', balance: '1800000', status: 1, version: 1, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-05-20T00:00:00.000Z' },
  { id: 'wallet-bank-001', userId: MOCK_USER_ID, walletType: 'CARD', walletName: 'Techcombank', balance: '28500000', status: 1, version: 1, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-05-20T00:00:00.000Z' },
];

const INITIAL_CATEGORIES = [
  { id: 'cat-exp-001', userId: MOCK_USER_ID, name: 'Ăn uống', categoryType: 'EXPENSE', parentId: null, isSystem: true, status: 1, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-exp-002', userId: MOCK_USER_ID, name: 'Di chuyển', categoryType: 'EXPENSE', parentId: null, isSystem: true, status: 1, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-exp-003', userId: MOCK_USER_ID, name: 'Mua sắm', categoryType: 'EXPENSE', parentId: null, isSystem: true, status: 1, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-exp-004', userId: MOCK_USER_ID, name: 'Giải trí', categoryType: 'EXPENSE', parentId: null, isSystem: true, status: 1, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-exp-005', userId: MOCK_USER_ID, name: 'Y tế', categoryType: 'EXPENSE', parentId: null, isSystem: true, status: 1, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-exp-006', userId: MOCK_USER_ID, name: 'Hóa đơn & Tiện ích', categoryType: 'EXPENSE', parentId: null, isSystem: true, status: 1, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-exp-007', userId: MOCK_USER_ID, name: 'Nhà ở', categoryType: 'EXPENSE', parentId: null, isSystem: true, status: 1, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-exp-008', userId: MOCK_USER_ID, name: 'Giáo dục', categoryType: 'EXPENSE', parentId: null, isSystem: true, status: 1, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-inc-001', userId: MOCK_USER_ID, name: 'Lương', categoryType: 'INCOME', parentId: null, isSystem: true, status: 1, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-inc-002', userId: MOCK_USER_ID, name: 'Thưởng', categoryType: 'INCOME', parentId: null, isSystem: true, status: 1, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-inc-003', userId: MOCK_USER_ID, name: 'Đầu tư', categoryType: 'INCOME', parentId: null, isSystem: true, status: 1, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-inc-004', userId: MOCK_USER_ID, name: 'Freelance', categoryType: 'INCOME', parentId: null, isSystem: true, status: 1, createdAt: '2026-01-01T00:00:00.000Z' },
];

const INITIAL_TRANSACTIONS = [
  // Tháng 5/2026
  { id: 'txn-001', userId: MOCK_USER_ID, walletId: 'wallet-bank-001', categoryId: 'cat-inc-001', transactionType: 'INCOME', amount: '25000000', currency: 'VND', description: 'Lương tháng 5/2026', status: 'COMPLETED', occurredAt: '2026-05-01T08:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-001', createdAt: '2026-05-01T08:00:00.000Z' },
  { id: 'txn-002', userId: MOCK_USER_ID, walletId: 'wallet-bank-001', categoryId: 'cat-exp-007', transactionType: 'EXPENSE', amount: '4500000', currency: 'VND', description: 'Tiền thuê nhà tháng 5', status: 'COMPLETED', occurredAt: '2026-05-02T09:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-002', createdAt: '2026-05-02T09:00:00.000Z' },
  { id: 'txn-003', userId: MOCK_USER_ID, walletId: 'wallet-cash-001', categoryId: 'cat-exp-003', transactionType: 'EXPENSE', amount: '450000', currency: 'VND', description: 'Siêu thị VinMart', status: 'COMPLETED', occurredAt: '2026-05-03T10:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-003', createdAt: '2026-05-03T10:00:00.000Z' },
  { id: 'txn-004', userId: MOCK_USER_ID, walletId: 'wallet-cash-001', categoryId: 'cat-exp-001', transactionType: 'EXPENSE', amount: '50000', currency: 'VND', description: 'Phở bò buổi sáng', status: 'COMPLETED', occurredAt: '2026-05-05T07:30:00.000Z', source: 'MANUAL', idempotencyKey: 'k-004', createdAt: '2026-05-05T07:30:00.000Z' },
  { id: 'txn-005', userId: MOCK_USER_ID, walletId: 'wallet-cash-001', categoryId: 'cat-exp-002', transactionType: 'EXPENSE', amount: '120000', currency: 'VND', description: 'Đổ xăng xe máy', status: 'COMPLETED', occurredAt: '2026-05-07T18:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-005', createdAt: '2026-05-07T18:00:00.000Z' },
  { id: 'txn-006', userId: MOCK_USER_ID, walletId: 'wallet-cash-001', categoryId: 'cat-exp-001', transactionType: 'EXPENSE', amount: '35000', currency: 'VND', description: 'Cafe sáng', status: 'COMPLETED', occurredAt: '2026-05-08T07:45:00.000Z', source: 'MANUAL', idempotencyKey: 'k-006', createdAt: '2026-05-08T07:45:00.000Z' },
  { id: 'txn-007', userId: MOCK_USER_ID, walletId: 'wallet-momo-001', categoryId: 'cat-exp-003', transactionType: 'EXPENSE', amount: '1200000', currency: 'VND', description: 'Mua quần áo Zara', status: 'COMPLETED', occurredAt: '2026-05-10T14:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-007', createdAt: '2026-05-10T14:00:00.000Z' },
  { id: 'txn-008', userId: MOCK_USER_ID, walletId: 'wallet-cash-001', categoryId: 'cat-exp-001', transactionType: 'EXPENSE', amount: '850000', currency: 'VND', description: 'Ăn tối với bạn bè', status: 'COMPLETED', occurredAt: '2026-05-12T19:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-008', createdAt: '2026-05-12T19:00:00.000Z' },
  { id: 'txn-009', userId: MOCK_USER_ID, walletId: 'wallet-bank-001', categoryId: 'cat-exp-006', transactionType: 'EXPENSE', amount: '350000', currency: 'VND', description: 'Hóa đơn điện EVN', status: 'COMPLETED', occurredAt: '2026-05-15T10:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-009', createdAt: '2026-05-15T10:00:00.000Z' },
  { id: 'txn-010', userId: MOCK_USER_ID, walletId: 'wallet-bank-001', categoryId: 'cat-exp-006', transactionType: 'EXPENSE', amount: '120000', currency: 'VND', description: 'Hóa đơn nước', status: 'COMPLETED', occurredAt: '2026-05-15T10:05:00.000Z', source: 'MANUAL', idempotencyKey: 'k-010', createdAt: '2026-05-15T10:05:00.000Z' },
  { id: 'txn-011', userId: MOCK_USER_ID, walletId: 'wallet-bank-001', categoryId: 'cat-exp-006', transactionType: 'EXPENSE', amount: '230000', currency: 'VND', description: 'Internet VNPT', status: 'COMPLETED', occurredAt: '2026-05-15T10:10:00.000Z', source: 'MANUAL', idempotencyKey: 'k-011', createdAt: '2026-05-15T10:10:00.000Z' },
  { id: 'txn-012', userId: MOCK_USER_ID, walletId: 'wallet-momo-001', categoryId: 'cat-exp-002', transactionType: 'EXPENSE', amount: '45000', currency: 'VND', description: 'Grab Taxi', status: 'COMPLETED', occurredAt: '2026-05-17T08:30:00.000Z', source: 'MANUAL', idempotencyKey: 'k-012', createdAt: '2026-05-17T08:30:00.000Z' },
  { id: 'txn-013', userId: MOCK_USER_ID, walletId: 'wallet-momo-001', categoryId: 'cat-exp-004', transactionType: 'EXPENSE', amount: '299000', currency: 'VND', description: 'Netflix Premium', status: 'COMPLETED', occurredAt: '2026-05-18T12:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-013', createdAt: '2026-05-18T12:00:00.000Z' },
  { id: 'txn-014', userId: MOCK_USER_ID, walletId: 'wallet-cash-001', categoryId: 'cat-exp-005', transactionType: 'EXPENSE', amount: '80000', currency: 'VND', description: 'Mua thuốc cảm', status: 'COMPLETED', occurredAt: '2026-05-20T09:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-014', createdAt: '2026-05-20T09:00:00.000Z' },
  // Tháng 4/2026
  { id: 'txn-101', userId: MOCK_USER_ID, walletId: 'wallet-bank-001', categoryId: 'cat-inc-001', transactionType: 'INCOME', amount: '25000000', currency: 'VND', description: 'Lương tháng 4/2026', status: 'COMPLETED', occurredAt: '2026-04-01T08:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-101', createdAt: '2026-04-01T08:00:00.000Z' },
  { id: 'txn-102', userId: MOCK_USER_ID, walletId: 'wallet-bank-001', categoryId: 'cat-exp-007', transactionType: 'EXPENSE', amount: '4500000', currency: 'VND', description: 'Tiền thuê nhà tháng 4', status: 'COMPLETED', occurredAt: '2026-04-02T09:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-102', createdAt: '2026-04-02T09:00:00.000Z' },
  { id: 'txn-103', userId: MOCK_USER_ID, walletId: 'wallet-cash-001', categoryId: 'cat-exp-001', transactionType: 'EXPENSE', amount: '2800000', currency: 'VND', description: 'Ăn uống tháng 4', status: 'COMPLETED', occurredAt: '2026-04-15T12:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-103', createdAt: '2026-04-15T12:00:00.000Z' },
  { id: 'txn-104', userId: MOCK_USER_ID, walletId: 'wallet-momo-001', categoryId: 'cat-exp-003', transactionType: 'EXPENSE', amount: '2150000', currency: 'VND', description: 'Mua sắm tháng 4', status: 'COMPLETED', occurredAt: '2026-04-20T14:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-104', createdAt: '2026-04-20T14:00:00.000Z' },
  { id: 'txn-105', userId: MOCK_USER_ID, walletId: 'wallet-bank-001', categoryId: 'cat-exp-006', transactionType: 'EXPENSE', amount: '700000', currency: 'VND', description: 'Hóa đơn điện nước internet tháng 4', status: 'COMPLETED', occurredAt: '2026-04-15T10:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-105', createdAt: '2026-04-15T10:00:00.000Z' },
  { id: 'txn-106', userId: MOCK_USER_ID, walletId: 'wallet-bank-001', categoryId: 'cat-inc-003', transactionType: 'INCOME', amount: '1500000', currency: 'VND', description: 'Lãi suất tiết kiệm Q1', status: 'COMPLETED', occurredAt: '2026-04-25T10:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-106', createdAt: '2026-04-25T10:00:00.000Z' },
  { id: 'txn-107', userId: MOCK_USER_ID, walletId: 'wallet-bank-001', categoryId: 'cat-exp-004', transactionType: 'EXPENSE', amount: '800000', currency: 'VND', description: 'Vé xem phim & giải trí', status: 'COMPLETED', occurredAt: '2026-04-28T20:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-107', createdAt: '2026-04-28T20:00:00.000Z' },
  { id: 'txn-108', userId: MOCK_USER_ID, walletId: 'wallet-cash-001', categoryId: 'cat-exp-002', transactionType: 'EXPENSE', amount: '500000', currency: 'VND', description: 'Di chuyển tháng 4', status: 'COMPLETED', occurredAt: '2026-04-22T08:00:00.000Z', source: 'MANUAL', idempotencyKey: 'k-108', createdAt: '2026-04-22T08:00:00.000Z' },
];

const INITIAL_SAVINGS = [
  { id: 'saving-001', userId: MOCK_USER_ID, name: 'Mua laptop mới', type: 'SAVING', targetAmount: 20000000, currentAmount: 8500000, startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-12-31T00:00:00.000Z', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-05-20T00:00:00.000Z' },
  { id: 'saving-002', userId: MOCK_USER_ID, name: 'Du lịch Nhật Bản', type: 'SAVING', targetAmount: 50000000, currentAmount: 15000000, startDate: '2026-02-01T00:00:00.000Z', endDate: '2027-03-01T00:00:00.000Z', status: 'ACTIVE', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-05-20T00:00:00.000Z' },
  { id: 'saving-003', userId: MOCK_USER_ID, name: 'Quỹ khẩn cấp', type: 'SAVING', targetAmount: null, currentAmount: 10000000, startDate: '2025-06-01T00:00:00.000Z', endDate: null, status: 'ACTIVE', createdAt: '2025-06-01T00:00:00.000Z', updatedAt: '2026-05-20T00:00:00.000Z' },
  { id: 'invest-001', userId: MOCK_USER_ID, name: 'Cổ phiếu VIC', type: 'INVESTMENT', targetAmount: 100000000, currentAmount: 32000000, startDate: '2025-10-01T00:00:00.000Z', endDate: null, status: 'ACTIVE', createdAt: '2025-10-01T00:00:00.000Z', updatedAt: '2026-05-20T00:00:00.000Z' },
  { id: 'invest-002', userId: MOCK_USER_ID, name: 'Quỹ ETF SSIAM', type: 'INVESTMENT', targetAmount: 50000000, currentAmount: 18500000, startDate: '2026-01-01T00:00:00.000Z', endDate: null, status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-05-20T00:00:00.000Z' },
  { id: 'invest-003', userId: MOCK_USER_ID, name: 'Trái phiếu chính phủ', type: 'INVESTMENT', targetAmount: 30000000, currentAmount: 30000000, startDate: '2025-07-01T00:00:00.000Z', endDate: '2028-07-01T00:00:00.000Z', status: 'ACTIVE', createdAt: '2025-07-01T00:00:00.000Z', updatedAt: '2026-05-20T00:00:00.000Z' },
];

const INITIAL_RECURRING_RULES = [
  { id: 'rule-001', userId: MOCK_USER_ID, walletId: 'wallet-bank-001', categoryId: 'cat-exp-007', transactionType: 'EXPENSE', amount: 4500000, currency: 'VND', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: 2, status: 'ACTIVE', note: 'Tiền thuê nhà', lastRunOn: '2026-05-02T09:00:00.000Z', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-05-02T09:00:00.000Z' },
  { id: 'rule-002', userId: MOCK_USER_ID, walletId: 'wallet-momo-001', categoryId: 'cat-exp-004', transactionType: 'EXPENSE', amount: 299000, currency: 'VND', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: 18, status: 'ACTIVE', note: 'Netflix Premium', lastRunOn: '2026-05-18T12:00:00.000Z', createdAt: '2026-01-18T00:00:00.000Z', updatedAt: '2026-05-18T12:00:00.000Z' },
  { id: 'rule-003', userId: MOCK_USER_ID, walletId: 'wallet-bank-001', categoryId: 'cat-exp-006', transactionType: 'EXPENSE', amount: 230000, currency: 'VND', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: 15, status: 'ACTIVE', note: 'Internet VNPT', lastRunOn: '2026-05-15T10:10:00.000Z', createdAt: '2026-01-15T00:00:00.000Z', updatedAt: '2026-05-15T10:10:00.000Z' },
];

const INITIAL_INVOICES: any[] = [];

// ==================== IN-MEMORY STATE ====================
const state = {
  wallets: [...INITIAL_WALLETS] as any[],
  transactions: [...INITIAL_TRANSACTIONS] as any[],
  categories: [...INITIAL_CATEGORIES] as any[],
  savings: [...INITIAL_SAVINGS] as any[],
  recurringRules: [...INITIAL_RECURRING_RULES] as any[],
  invoices: [...INITIAL_INVOICES] as any[],
};

// ==================== AI CONTEXT ====================
function buildFinancialContext(): string {
  const totalAssets = state.wallets.reduce((s, w) => s + Number(w.balance), 0);
  const may2026Income = state.transactions.filter(t => t.occurredAt?.startsWith('2026-05') && t.transactionType === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
  const may2026Expense = state.transactions.filter(t => t.occurredAt?.startsWith('2026-05') && t.transactionType === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
  const apr2026Income = state.transactions.filter(t => t.occurredAt?.startsWith('2026-04') && t.transactionType === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
  const apr2026Expense = state.transactions.filter(t => t.occurredAt?.startsWith('2026-04') && t.transactionType === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
  const totalSavings = state.savings.reduce((s, sv) => s + sv.currentAmount, 0);

  return `Bạn là trợ lý tài chính AI thông minh cho ứng dụng quản lý tài chính cá nhân Fintech.

DỮ LIỆU TÀI CHÍNH NGƯỜI DÙNG (ngày hôm nay: 20/05/2026):

VÍ TIỀN:
${state.wallets.map(w => `- ${w.walletName} (${w.walletType}): ${Number(w.balance).toLocaleString('vi-VN')} VND`).join('\n')}
- Tổng tài sản: ${totalAssets.toLocaleString('vi-VN')} VND

GIAO DỊCH THÁNG 5/2026 (đến nay):
- Tổng thu: ${may2026Income.toLocaleString('vi-VN')} VND
- Tổng chi: ${may2026Expense.toLocaleString('vi-VN')} VND  
- Số dư ròng: +${(may2026Income - may2026Expense).toLocaleString('vi-VN')} VND
- Tỷ lệ tiết kiệm: ${may2026Income > 0 ? Math.round(((may2026Income - may2026Expense) / may2026Income) * 100) : 0}%

CHI TIẾT THÁNG 5/2026:
${state.transactions.filter(t => t.occurredAt?.startsWith('2026-05')).map(t => {
  const cat = state.categories.find(c => c.id === t.categoryId);
  return `- ${new Date(t.occurredAt).toLocaleDateString('vi-VN')}: ${t.description} ${t.transactionType === 'EXPENSE' ? '-' : '+'}${Number(t.amount).toLocaleString('vi-VN')} VND (${cat?.name || 'Khác'})`;
}).join('\n')}

GIAO DỊCH THÁNG 4/2026:
- Tổng thu: ${apr2026Income.toLocaleString('vi-VN')} VND
- Tổng chi: ${apr2026Expense.toLocaleString('vi-VN')} VND
- Số dư ròng: +${(apr2026Income - apr2026Expense).toLocaleString('vi-VN')} VND

CHI THEO DANH MỤC (tháng 5):
${['Ăn uống', 'Di chuyển', 'Mua sắm', 'Giải trí', 'Y tế', 'Hóa đơn & Tiện ích', 'Nhà ở'].map(catName => {
  const cat = state.categories.find(c => c.name === catName);
  const total = state.transactions.filter(t => t.categoryId === cat?.id && t.occurredAt?.startsWith('2026-05') && t.transactionType === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
  return total > 0 ? `- ${catName}: ${total.toLocaleString('vi-VN')} VND` : null;
}).filter(Boolean).join('\n')}

TIẾT KIỆM & ĐẦU TƯ:
${state.savings.map(s => `- ${s.name}: ${s.currentAmount.toLocaleString('vi-VN')} VND${s.targetAmount ? ` / mục tiêu ${s.targetAmount.toLocaleString('vi-VN')} VND (${Math.round((s.currentAmount / s.targetAmount) * 100)}%)` : ''}`).join('\n')}
- Tổng tiết kiệm: ${totalSavings.toLocaleString('vi-VN')} VND

CHI ĐỊNH KỲ:
${state.recurringRules.map(r => `- ${r.note}: ${Number(r.amount).toLocaleString('vi-VN')} VND/${r.frequency === 'MONTHLY' ? 'tháng' : 'tuần'}`).join('\n')}

Hãy trả lời câu hỏi bằng tiếng Việt, ngắn gọn, cụ thể với số liệu chính xác từ dữ liệu trên.`;
}

// ==================== GEMINI DIRECT API ====================
async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Không thể trả lời lúc này.';
}

// ==================== HELPERS ====================
function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function setCorsHeaders(res: any): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
}

async function readBody(req: any): Promise<any> {
  const contentType: string = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data') || contentType.includes('application/octet-stream')) {
    return {};
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: any) => { raw += chunk.toString(); });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

// ==================== MAIN HANDLER ====================
export default async function handler(req: any, res: any): Promise<void> {
  setCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const pathArr: string[] = Array.isArray(req.query.path) ? req.query.path : req.query.path ? [req.query.path] : [];
  const path = pathArr.join('/');
  const method = (req.method || 'GET').toUpperCase();
  const query = req.query || {};
  const body = method !== 'GET' ? await readBody(req) : {};

  try {
    const { status, data } = await route(path, method, body, query, req);
    res.status(status).json(data);
  } catch (err: any) {
    console.error('[mock-api] error:', err);
    res.status(500).json({ message: err?.message || 'Internal server error' });
  }
}

// ==================== ROUTER ====================
async function route(path: string, method: string, body: any, query: any, req: any): Promise<{ status: number; data: any }> {
  const segs = path.split('/').filter(Boolean);

  // ── AUTH ────────────────────────────────────────────────────────────────────
  if (segs[0] === 'auth' && segs[1] === 'login' && method === 'POST') {
    return { status: 200, data: { accessToken: DEMO_TOKEN, user: { id: MOCK_USER_ID, email: body.email || 'demo@fintech.app', fullName: 'Demo User', userId: MOCK_USER_ID } } };
  }
  if (segs[0] === 'auth' && segs[1] === 'register' && method === 'POST') {
    return { status: 201, data: { message: 'Đăng ký thành công', user: { id: MOCK_USER_ID, email: body.email || 'demo@fintech.app', fullName: body.fullName || 'Demo User' } } };
  }

  // ── WALLETS ──────────────────────────────────────────────────────────────────
  if (segs[0] === 'wallets') {
    if (segs.length === 1) {
      if (method === 'GET') return { status: 200, data: state.wallets };
      if (method === 'POST') {
        const w = { id: newId('wallet'), userId: MOCK_USER_ID, walletType: body.wallet_type || body.walletType || 'CASH', walletName: body.wallet_name || body.walletName || 'Ví mới', balance: String(body.balance ?? '0'), status: 1, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        state.wallets.push(w); return { status: 201, data: w };
      }
    }
    const wId = segs[1];
    if (segs[2] === 'status' && method === 'PUT') {
      const idx = state.wallets.findIndex(w => w.id === wId);
      if (idx === -1) return { status: 404, data: { message: 'Not found' } };
      state.wallets[idx] = { ...state.wallets[idx], status: body.status, updatedAt: new Date().toISOString() };
      return { status: 200, data: state.wallets[idx] };
    }
    if (!segs[2]) {
      if (method === 'GET') { const w = state.wallets.find(x => x.id === wId); return w ? { status: 200, data: w } : { status: 404, data: { message: 'Not found' } }; }
      if (method === 'PUT') {
        const idx = state.wallets.findIndex(w => w.id === wId);
        if (idx === -1) return { status: 404, data: { message: 'Not found' } };
        if (body.wallet_name || body.walletName) state.wallets[idx].walletName = body.wallet_name || body.walletName;
        if (body.balance !== undefined) state.wallets[idx].balance = String(body.balance);
        if (body.status !== undefined) state.wallets[idx].status = body.status;
        state.wallets[idx].updatedAt = new Date().toISOString();
        return { status: 200, data: state.wallets[idx] };
      }
      if (method === 'DELETE') { state.wallets = state.wallets.filter(w => w.id !== wId); return { status: 200, data: { success: true, id: wId } }; }
    }
  }

  // ── CATEGORIES ───────────────────────────────────────────────────────────────
  if (segs[0] === 'categories') {
    if (segs.length === 1) {
      if (method === 'GET') {
        const filtered = query.category_type ? state.categories.filter(c => c.categoryType === query.category_type) : state.categories;
        return { status: 200, data: filtered };
      }
      if (method === 'POST') {
        const c = { id: newId('cat'), userId: MOCK_USER_ID, name: body.name, categoryType: body.category_type || body.categoryType, parentId: body.parent_id ?? null, isSystem: false, status: 1, createdAt: new Date().toISOString() };
        state.categories.push(c); return { status: 201, data: c };
      }
    }
    const cId = segs[1];
    if (method === 'PUT') {
      const idx = state.categories.findIndex(c => c.id === cId);
      if (idx === -1) return { status: 404, data: { message: 'Not found' } };
      if (body.name) state.categories[idx].name = body.name;
      if (body.category_type || body.categoryType) state.categories[idx].categoryType = body.category_type || body.categoryType;
      if (body.status !== undefined) state.categories[idx].status = body.status;
      return { status: 200, data: state.categories[idx] };
    }
    if (method === 'DELETE') { state.categories = state.categories.filter(c => c.id !== cId); return { status: 200, data: { success: true, id: cId } }; }
  }

  // ── TRANSACTIONS ─────────────────────────────────────────────────────────────
  if (segs[0] === 'transactions') {
    // Recurring rules
    if (segs[1] === 'recurring-rules') {
      if (!segs[2]) {
        if (method === 'GET') return { status: 200, data: state.recurringRules };
        if (method === 'POST') {
          const r = { id: newId('rule'), userId: MOCK_USER_ID, walletId: body.wallet_id || body.walletId, categoryId: body.category_id || body.categoryId || null, transactionType: body.transaction_type || body.transactionType || 'EXPENSE', amount: Number(body.amount), currency: body.currency || 'VND', frequency: body.frequency || 'MONTHLY', dayOfWeek: body.day_of_week ?? null, dayOfMonth: body.day_of_month ?? null, status: body.status || 'ACTIVE', note: body.note || '', lastRunOn: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          state.recurringRules.push(r); return { status: 201, data: r };
        }
      }
      const rId = segs[2];
      if (method === 'PUT') {
        const idx = state.recurringRules.findIndex(r => r.id === rId);
        if (idx === -1) return { status: 404, data: { message: 'Not found' } };
        const u = body;
        if (u.amount) state.recurringRules[idx].amount = Number(u.amount);
        if (u.note !== undefined) state.recurringRules[idx].note = u.note;
        if (u.status) state.recurringRules[idx].status = u.status;
        if (u.frequency) state.recurringRules[idx].frequency = u.frequency;
        state.recurringRules[idx].updatedAt = new Date().toISOString();
        return { status: 200, data: state.recurringRules[idx] };
      }
      if (method === 'DELETE') { state.recurringRules = state.recurringRules.filter(r => r.id !== rId); return { status: 200, data: { success: true, id: rId } }; }
    }
    // Normal transactions
    if (!segs[1]) {
      if (method === 'GET') {
        let list = [...state.transactions];
        if (query.wallet_id) list = list.filter(t => t.walletId === query.wallet_id);
        const limit = Math.min(Number(query.limit || 50), 200);
        const skip = Number(query.skip || 0);
        return { status: 200, data: list.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(skip, skip + limit) };
      }
      if (method === 'POST') {
        const t = { id: newId('txn'), userId: MOCK_USER_ID, walletId: body.wallet_id || body.walletId, categoryId: body.category_id || body.categoryId, transactionType: body.transaction_type || body.transactionType, amount: String(body.amount), currency: body.currency || 'VND', description: body.description || '', status: 'COMPLETED', occurredAt: body.occurred_at || new Date().toISOString(), source: 'MANUAL', idempotencyKey: body.idempotency_key || newId('idem'), createdAt: new Date().toISOString() };
        state.transactions.push(t);
        // Update wallet balance
        const w = state.wallets.find(x => x.id === t.walletId);
        if (w) { const delta = t.transactionType === 'INCOME' ? Number(t.amount) : -Number(t.amount); w.balance = String(Number(w.balance) + delta); }
        return { status: 201, data: t };
      }
    }
    if (segs[1] && !['recurring-rules'].includes(segs[1])) {
      const t = state.transactions.find(x => x.id === segs[1]);
      if (method === 'GET') return t ? { status: 200, data: t } : { status: 404, data: { message: 'Not found' } };
    }
  }

  // ── ANALYTICS ─────────────────────────────────────────────────────────────────
  if (segs[0] === 'analytics' && segs[1] === 'dashboard') {
    const targetMonth = (query.month as string) || '2026-05';
    const monthTxns = state.transactions.filter(t => t.occurredAt?.startsWith(targetMonth));
    const income = monthTxns.filter(t => t.transactionType === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
    const expense = monthTxns.filter(t => t.transactionType === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
    const net = income - expense;
    const prevMonth = targetMonth === '2026-05' ? '2026-04' : '2026-03';
    const prevTxns = state.transactions.filter(t => t.occurredAt?.startsWith(prevMonth));
    const prevExpense = prevTxns.filter(t => t.transactionType === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
    const breakdown = state.categories.filter(c => c.categoryType === 'EXPENSE').map(c => {
      const val = monthTxns.filter(t => t.categoryId === c.id && t.transactionType === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
      return val > 0 ? { categoryId: c.id, name: c.name, value: val, color: null, transactionCount: monthTxns.filter(t => t.categoryId === c.id).length } : null;
    }).filter(Boolean);
    const spendingChangePercent = prevExpense > 0 ? Math.round(((expense - prevExpense) / prevExpense) * 100) : 0;
    const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;
    const daysInMonth = 20; // demo: 20 ngày trong tháng
    return {
      status: 200, data: {
        currentMonth: targetMonth,
        filters: { month: targetMonth, walletId: null, range: null, from: null, to: null },
        period: { range: 'month', label: `Tháng ${targetMonth.split('-')[1]}/${targetMonth.split('-')[0]}`, startDate: `${targetMonth}-01T00:00:00.000Z`, endDate: `${targetMonth}-31T23:59:59.000Z` },
        summary: { totalIncome: income, totalExpense: expense, net, netCashFlow: net },
        kpis: { savingsRate, dailyAverageExpense: Math.round(expense / daysInMonth), recurringSpend: state.recurringRules.filter(r => r.status === 'ACTIVE').reduce((s: number, r: any) => s + r.amount, 0), transactionCount: monthTxns.length },
        insights: { severity: savingsRate > 40 ? 'good' : savingsRate > 20 ? 'neutral' : 'warning', headline: savingsRate > 40 ? 'Tài chính tốt!' : 'Chi tiêu ổn định', message: `Tháng này bạn đã tiết kiệm được ${net.toLocaleString('vi-VN')} VND (${savingsRate}% thu nhập).`, recommendation: savingsRate > 40 ? 'Tiếp tục duy trì thói quen tốt và xem xét đầu tư thêm.' : 'Hãy xem xét giảm chi tiêu không cần thiết để tăng tiết kiệm.', spendingChangePercent, incomeChangePercent: 0, savingsRate, dailyAverageExpense: Math.round(expense / daysInMonth), riskiestCategory: (breakdown as any[])[0]?.name ?? null },
        trend: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'].map(m => {
          const txns = state.transactions.filter(t => t.occurredAt?.startsWith(m));
          const inc = txns.filter(t => t.transactionType === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
          const exp = txns.filter(t => t.transactionType === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
          return { monthKey: m, month: `Thg ${m.split('-')[1]}`, income: inc || 25000000, expense: exp || 10000000, net: (inc || 25000000) - (exp || 10000000) };
        }),
        breakdown,
        comparison: [{ label: `Thg trước`, income: prevTxns.filter(t => t.transactionType === 'INCOME').reduce((s, t) => s + Number(t.amount), 0) || 26500000, expense: prevExpense || 12450000 }, { label: 'Tháng này', income, expense }],
        budgetProgress: [],
        forecast: [],
        topTransactions: monthTxns.sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5).map(t => { const cat = state.categories.find(c => c.id === t.categoryId); return { id: t.id, merchant: t.description, category: cat?.name || 'Khác', date: t.occurredAt, amount: Number(t.amount), transactionType: t.transactionType, source: t.source }; }),
        subscriptions: state.recurringRules.filter(r => r.status === 'ACTIVE').slice(0, 5).map(r => { const cat = state.categories.find(c => c.id === r.categoryId); return { id: r.id, name: r.note || cat?.name || 'Khoản định kỳ', date: new Date().toISOString(), amount: r.amount, frequency: r.frequency, status: r.status }; }),
      }
    };
  }

  // ── SAVINGS ───────────────────────────────────────────────────────────────────
  if (segs[0] === 'savings') {
    if (!segs[1]) {
      if (method === 'GET') {
        const filtered = query.type ? state.savings.filter(s => s.type === query.type) : state.savings;
        return { status: 200, data: filtered };
      }
      if (method === 'POST') {
        const s = { id: newId('saving'), userId: MOCK_USER_ID, name: body.name, type: body.type || 'SAVING', targetAmount: body.target_amount ?? null, currentAmount: 0, startDate: body.start_date || new Date().toISOString(), endDate: body.end_date ?? null, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        state.savings.push(s); return { status: 201, data: s };
      }
    }
    const sId = segs[1];
    if (segs[2] === 'deposit' && method === 'POST') {
      const idx = state.savings.findIndex(s => s.id === sId);
      if (idx === -1) return { status: 404, data: { message: 'Not found' } };
      state.savings[idx].currentAmount += Number(body.amount || 0);
      state.savings[idx].updatedAt = new Date().toISOString();
      const fakeTxn = { id: newId('txn'), userId: MOCK_USER_ID, walletId: body.sourceWalletId, categoryId: 'cat-inc-003', transactionType: 'EXPENSE', amount: String(body.amount), currency: 'VND', description: `Nạp vào ${state.savings[idx].name}`, status: 'COMPLETED', occurredAt: new Date().toISOString(), source: 'MANUAL', idempotencyKey: newId('idem'), createdAt: new Date().toISOString() };
      state.transactions.push(fakeTxn);
      return { status: 200, data: { saving: state.savings[idx], transaction: fakeTxn } };
    }
    if (segs[2] === 'settle' && method === 'POST') {
      const idx = state.savings.findIndex(s => s.id === sId);
      if (idx === -1) return { status: 404, data: { message: 'Not found' } };
      const settled = { ...state.savings[idx], status: 'SETTLED', updatedAt: new Date().toISOString() };
      state.savings[idx] = settled;
      return { status: 200, data: { saving: settled, transaction: null } };
    }
    if (!segs[2] && method === 'DELETE') {
      state.savings = state.savings.filter(s => s.id !== sId);
      return { status: 200, data: { success: true } };
    }
  }

  // ── INVOICES ──────────────────────────────────────────────────────────────────
  if (segs[0] === 'invoices') {
    if (!segs[1]) {
      if (method === 'GET') return { status: 200, data: state.invoices };
    }
    if (segs[1] === 'extract' && method === 'POST') {
      // Mock OCR extraction
      return { status: 200, data: { success: true, data: { merchantName: 'Cửa hàng Demo', totalAmount: 125000, transactionDate: new Date().toISOString().split('T')[0] } } };
    }
    if (segs[1] === 'upload' && method === 'POST') {
      const inv = { id: newId('inv'), userId: MOCK_USER_ID, imageUrl: '/mock-invoice.jpg', extractedData: { merchantName: 'Demo Store', totalAmount: 125000 }, status: 'PENDING', transactionId: null, auditTrail: [], deletedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      state.invoices.push(inv); return { status: 201, data: inv };
    }
    const invId = segs[1];
    if (segs[2] === 'confirm' && method === 'POST') {
      const idx = state.invoices.findIndex(i => i.id === invId);
      const inv = idx !== -1 ? { ...state.invoices[idx], status: 'CONFIRMED', updatedAt: new Date().toISOString() } : { id: invId, userId: MOCK_USER_ID, imageUrl: '', extractedData: {}, status: 'CONFIRMED', transactionId: null, auditTrail: [], deletedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (idx !== -1) state.invoices[idx] = inv;
      const t = { id: newId('txn'), userId: MOCK_USER_ID, walletId: body.wallet_id || body.walletId, categoryId: body.category_id || body.categoryId, transactionType: body.transaction_type || 'EXPENSE', amount: String(body.amount), currency: body.currency || 'VND', description: body.description || 'Hóa đơn', status: 'COMPLETED', occurredAt: body.occurred_at || new Date().toISOString(), source: 'OCR', idempotencyKey: newId('idem'), createdAt: new Date().toISOString() };
      state.transactions.push(t);
      return { status: 200, data: { invoice: inv, transaction: t } };
    }
    if (!segs[2]) {
      if (method === 'PUT') { const idx = state.invoices.findIndex(i => i.id === invId); if (idx !== -1) { state.invoices[idx] = { ...state.invoices[idx], ...body, updatedAt: new Date().toISOString() }; return { status: 200, data: state.invoices[idx] }; } return { status: 404, data: { message: 'Not found' } }; }
      if (method === 'DELETE') { const inv = state.invoices.find(i => i.id === invId) || { id: invId }; state.invoices = state.invoices.filter(i => i.id !== invId); return { status: 200, data: inv }; }
    }
  }

  // ── AI ENDPOINTS ──────────────────────────────────────────────────────────────
  if (segs[0] === 'ai') {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      // Fallback mock AI when no API key
      if (segs[1] === 'chat') return { status: 200, data: { success: true, question: body.question || body.message || '', intent: 'general', confidence: 0.9, scores: {}, answer: 'AI chat chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY vào Vercel Environment Variables để sử dụng tính năng này.', llmUsed: false, queryPlan: {}, meta: {} } };
      if (segs[1] === 'extract-text') return { status: 200, data: { success: true, input: body.input_text || '', rawOutput: JSON.stringify([{ title: 'Giao dịch demo', amount: 50000, type: 'expense', category: 'Ăn uống' }]), model: 'mock' } };
    }

    if (segs[1] === 'chat') {
      const question: string = body.question || body.message || '';
      const systemContext = buildFinancialContext();
      const prompt = `${systemContext}\n\nCâu hỏi: ${question}`;
      const answer = await callGemini(prompt, geminiKey!);
      return { status: 200, data: { success: true, question, intent: 'general', confidence: 0.95, scores: {}, answer, llmUsed: true, queryPlan: {}, meta: {} } };
    }

    if (segs[1] === 'extract-text') {
      const inputText: string = body.input_text || '';
      const prompt = `Phân tích đoạn văn bản sau và trích xuất các giao dịch tài chính. Trả về JSON array theo format:
[{"title": "tên giao dịch", "amount": số_tiền_VND, "type": "expense|income", "category": "tên danh mục"}]
Chỉ trả về JSON array thuần túy, không có markdown code fence.
Văn bản: "${inputText}"`;
      const rawOutput = await callGemini(prompt, geminiKey!);
      return { status: 200, data: { success: true, input: inputText, rawOutput, model: 'gemini-2.0-flash' } };
    }
  }

  // ── FALLBACK ──────────────────────────────────────────────────────────────────
  return { status: 404, data: { message: `Route not found: ${method} /api/v1/${path}` } };
}
