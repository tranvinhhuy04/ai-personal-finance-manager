import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Loader2, Send, Sparkles, User2, X } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { getOrCreateChatSessionId } from '@/lib/chatSession';

const ASSISTANT_NAME = 'Fin';

const QUICK_PROMPTS = [
  'Tiết kiệm và đầu tư khác nhau như thế nào?',
  'Tổng chi tiêu tháng này là bao nhiêu?',
  'Thu nhập tháng này của tôi thế nào?',
  'Tất toán bán phần khác gì tất toán toàn phần?',
  'Cho tôi một lời khuyên để tiết kiệm hơn',
];

type FeatureHelpEntry = {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  route?: string;
  mustContain?: string[];
  priority?: number;
};

type FeatureHelpMatch = {
  content: string;
  meta: string;
  score: number;
};

const FEATURE_DIRECT_REPLY_SCORE = 7;
const FEATURE_FALLBACK_SCORE = 5;

const STOPWORD_TOKENS = new Set([
  'la',
  'va',
  'tu',
  'toi',
  'ban',
  'cho',
  'cua',
  'nhu',
  'the',
  'nao',
  'gi',
  'sao',
  'mot',
  'trong',
  'nhung',
  'nay',
  'kia',
  'minh',
  'voi',
  'duoc',
  'hay',
]);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasKeywordBoundaryMatch = (normalizedQuestion: string, keyword: string) => {
  const normalizedKeyword = normalizeText(keyword).trim();
  if (!normalizedKeyword) return false;

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}([^a-z0-9]|$)`);
  return pattern.test(normalizedQuestion);
};

const FEATURE_HELP_ENTRIES: FeatureHelpEntry[] = [
  {
    id: 'saving-vs-investment',
    title: 'So sánh Tiết kiệm và Đầu tư',
    keywords: ['tiết kiệm', 'đầu tư', 'khác nhau', 'so sánh', 'phân biệt', 'nên chọn'],
    mustContain: ['tiết kiệm', 'đầu tư'],
    priority: 3,
    answer:
      'Trong ứng dụng hiện tại, Tiết kiệm và Đầu tư dùng chung luồng thao tác (tạo gói, nạp tiền, tất toán), nhưng khác nhau ở mục đích quản lý. Tiết kiệm phù hợp quỹ dự phòng/mục tiêu an toàn; Đầu tư phù hợp khoản vốn sinh lời cần theo dõi riêng. Bạn nên tách 2 loại để báo cáo và kế hoạch tài chính rõ ràng hơn.',
    route: '/savings',
  },
  {
    id: 'wallet',
    title: 'Ví của tôi',
    keywords: ['ví của tôi', 'wallet', 'tao vi', 'them vi', 'so du vi', 'quan ly vi'],
    answer:
      'Để quản lý ví, bạn vào mục Ví của tôi, tạo ví mới (tiền mặt/ngân hàng) và đặt tên rõ ràng. Chỉ các ví đang hoạt động mới dùng cho giao dịch và nạp/rút từ gói tiết kiệm.',
    route: '/wallets',
  },
  {
    id: 'transaction',
    title: 'Giao dịch',
    keywords: ['giao dịch', 'transaction', 'tao giao dich', 'them giao dich', 'lich su giao dich', 'danh muc giao dich'],
    answer:
      'Khi tạo giao dịch, hãy chọn đúng ví nguồn, loại thu/chi và danh mục để báo cáo phân tích chính xác. Mô tả ngắn sẽ giúp bạn tra cứu lại giao dịch nhanh hơn.',
    route: '/transactions',
  },
  {
    id: 'saving-investment',
    title: 'Tiền gửi và Đầu tư',
    keywords: ['tiết kiệm', 'đầu tư', 'saving', 'investment', 'nạp tiền', 'tất toán', 'mở gói', 'tạo gói'],
    answer:
      'Ở trang Tiền gửi/Đầu tư, bạn có thể tạo gói mục tiêu, nạp tiền từ ví và rút khi cần. Tất toán toàn phần rút hết số dư gói; tất toán bán phần cho phép chọn ví nhận và nhập số tiền muốn rút.',
    route: '/savings',
  },
  {
    id: 'settlement-types',
    title: 'Tất toán toàn phần và bán phần',
    keywords: ['tất toán toàn phần', 'tất toán bán phần', 'rút một phần', 'rút hết', 'khác gì'],
    mustContain: ['tất toán'],
    priority: 2,
    answer:
      'Tất toán toàn phần sẽ rút toàn bộ số dư hiện tại trong gói và đóng gói nếu số dư về 0. Tất toán bán phần cho phép bạn chọn ví nhận, nhập số tiền cần rút và giữ phần còn lại trong gói để tiếp tục tích lũy/đầu tư.',
    route: '/savings',
  },
  {
    id: 'recurring',
    title: 'Định kỳ',
    keywords: [
      'định kỳ',
      'recurring',
      'lặp lại',
      'tần suất',
      'mỗi tháng',
      'hàng tháng',
      'số tiền cố định',
      'tự động trừ',
      'trừ tiền',
    ],
    answer:
      'Nếu bạn muốn mỗi tháng tự trừ một số tiền cố định, hãy vào trang Định kỳ và tạo quy tắc CHI theo tần suất MONTHLY. Chọn ví, danh mục, số tiền cố định, ngày chạy trong tháng rồi bật quy tắc để hệ thống tự động trừ theo lịch.',
    route: '/recurring',
  },
  {
    id: 'invoice',
    title: 'Hóa đơn',
    keywords: ['hóa đơn', 'invoice', 'ocr', 'chụp hóa đơn', 'xác nhận hóa đơn'],
    answer:
      'Bạn có thể tải ảnh hóa đơn lên để hệ thống OCR trích xuất thông tin. Sau đó kiểm tra số tiền, ví, danh mục và xác nhận để tạo giao dịch vào hệ thống.',
    route: '/invoices',
  },
  {
    id: 'analytics',
    title: 'Phân tích',
    keywords: ['phân tích', 'analytics', 'báo cáo', 'xu hướng', 'dashboard'],
    answer:
      'Trang Phân tích giúp bạn xem xu hướng thu chi theo thời gian, cơ cấu danh mục và chỉ số dòng tiền ròng. Nên chọn đúng khoảng thời gian để đọc insight sát nhu cầu.',
    route: '/analytics',
  },
  {
    id: 'ai-assistant',
    title: 'Trợ lý AI',
    keywords: ['tro ly ai', 'ai assistant', 'chatbot', 'goi y ai'],
    answer:
      'Trợ lý AI trả lời nhanh về dữ liệu tài chính cá nhân và có thể hỗ trợ hướng dẫn nghiệp vụ tính năng. Bạn càng đặt câu hỏi cụ thể theo ngữ cảnh, câu trả lời càng chính xác.',
    route: '/ai-assistant',
  },
  {
    id: 'settings-profile',
    title: 'Cài đặt và hồ sơ',
    keywords: ['cài đặt', 'settings', 'profile', 'hồ sơ', 'bảo mật'],
    answer:
      'Bạn có thể tùy chỉnh giao diện, thông báo và quản lý thông tin hồ sơ trong phần Cài đặt/Hồ sơ. Định kỳ kiểm tra các thiết bị đăng nhập để tăng an toàn tài khoản.',
    route: '/settings',
  },
];

const FEATURE_ROUTE_CATALOG = FEATURE_HELP_ENTRIES.map((entry) => ({
  id: entry.id,
  title: entry.title,
  route: entry.route ?? null,
}));

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const tokenize = (value: string) =>
  normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOPWORD_TOKENS.has(token));

const hasFeatureIntentCue = (question: string) => {
  const normalizedQuestion = normalizeText(question);
  return /(tinh nang|chuc nang|huong dan|su dung|lam sao|cach nao|o dau|man hinh|menu|trang nao|khac nhau|so sanh|phan biet|nen chon|tao vi|them vi|tao goi|mo goi|tat toan|dinh ky|hoa don|ocr|cai dat|ho so|tro ly ai)/.test(
    normalizedQuestion
  );
};

const hasNavigationCue = (normalizedQuestion: string) =>
  /(o dau|xem o dau|trang nao|muc nao|vao dau|coi o dau|menu nao)/.test(normalizedQuestion);

const isInvoiceOcrQuestion = (question: string) => {
  const normalizedQuestion = normalizeText(question);
  const invoiceCue = /(hoa don|invoice|bien lai)/.test(normalizedQuestion);
  const imageCue = /(hinh|anh|chup|tai len|upload|quet|scan|ocr)/.test(normalizedQuestion);
  const autoFillCue = /(khong can nhap|khong nhap lai|tu dong|trich xuat|dien tu dong)/.test(normalizedQuestion);

  return invoiceCue && (imageCue || autoFillCue);
};

const buildInvoiceOcrReply = (): { content: string; meta: string } => ({
  content:
    'Bạn vào trang Hóa đơn, tải ảnh hóa đơn lên để hệ thống OCR trích xuất tự động số tiền, danh mục và nội dung giao dịch. Sau khi kiểm tra lại thông tin, bạn chỉ cần bấm xác nhận để thêm vào chi tiêu mà không phải nhập tay lại từ đầu.',
  meta: `${ASSISTANT_NAME} • Thêm chi tiêu từ hóa đơn ảnh`,
});

const isWeeklyActionPlanQuestion = (question: string) => {
  const normalizedQuestion = normalizeText(question);
  const planCue = /(ke hoach|hanh dong|goi y|de xuat|tu van|plan)/.test(normalizedQuestion);
  const weekCue = /(theo tuan|moi tuan|hang tuan|4 tuan|tuan nay|tuan toi)/.test(normalizedQuestion);

  return planCue && weekCue;
};

const extractTopSpendingCategory = (content: string): string | null => {
  const directMatch = content.match(/Khoản chi lớn nhất hiện là\s+([^\(\n]+)\s*\(/i);
  if (directMatch?.[1]) {
    return directMatch[1].trim();
  }

  const normalized = normalizeText(content);
  const normalizedMatch = normalized.match(/khoan chi lon nhat hien la\s+([^\(\n]+)\s*\(/i);
  if (normalizedMatch?.[1]) {
    return normalizedMatch[1].trim();
  }

  return null;
};

const buildWeeklyActionPlanReply = (focusCategory?: string | null): { content: string; meta: string } => {
  const focusLine = focusCategory
    ? `Trọng tâm tuần này: kiểm soát nhóm chi "${focusCategory}".`
    : 'Trọng tâm tuần này: kiểm soát nhóm chi lớn nhất hiện tại.';

  return {
    content: [
      'Ok, mình gợi ý kế hoạch hành động 4 tuần như sau:',
      '',
      'Tuần 1: Chốt ngân sách',
      `- ${focusLine}`,
      '- Đặt trần chi tiêu tuần = 70% mức chi trung bình tuần gần nhất.',
      '- Ghi lại mọi khoản chi ngay trong ngày để không thất thoát.',
      '',
      'Tuần 2: Cắt khoản chi không cần thiết',
      '- Chọn 2 khoản chi có thể cắt hoặc giảm ngay (ví dụ ăn ngoài/mua lặt vặt).',
      '- Áp dụng quy tắc chờ 24 giờ trước khi mua món không thiết yếu.',
      '',
      'Tuần 3: Tối ưu dòng tiền',
      '- Thiết lập 1 giao dịch chuyển sang ví tiết kiệm ngay sau ngày nhận thu nhập.',
      '- Giữ quỹ chi tiêu linh hoạt riêng để tránh rút từ khoản tiết kiệm.',
      '',
      'Tuần 4: Đánh giá và khóa thói quen',
      '- So sánh tổng CHI tuần 1 và tuần 4 để đo mức cải thiện.',
      '- Nếu giảm được ít nhất 10%, giữ nguyên kế hoạch cho tháng sau và tăng mục tiêu thêm 5%.',
      '',
      'Nếu bạn muốn, mình sẽ cá nhân hóa luôn kế hoạch này theo đúng số liệu tháng hiện tại của bạn.',
    ].join('\n'),
    meta: `${ASSISTANT_NAME} • Kế hoạch hành động theo tuần`,
  };
};

const isAnalyticsNavigationQuestion = (question: string) => {
  const normalizedQuestion = normalizeText(question);
  const navigationCue = hasNavigationCue(normalizedQuestion);
  const analyticsCue = /(phan tich|bao cao|xu huong|dashboard|insight)/.test(normalizedQuestion);

  return navigationCue && analyticsCue;
};

const buildAnalyticsNavigationReply = (): { content: string; meta: string } => ({
  content:
    'Bạn vào trang Phân tích để xem báo cáo chi tiêu, xu hướng thu/chi và cơ cấu danh mục. Tại đó bạn có thể đổi khoảng thời gian để xem chi tiết theo tháng/quý/năm.',
  meta: `${ASSISTANT_NAME} • Xem phân tích chi tiêu`,
});

const isTransactionDetailNavigationQuestion = (question: string) => {
  const normalizedQuestion = normalizeText(question);
  const navigationCue = hasNavigationCue(normalizedQuestion);
  const detailCue = /(chi tiet|lich su|nhung gi|danh sach|xem)/.test(normalizedQuestion);
  const transactionCue = /(giao dich|thu chi|chi thu|chi nhung gi|thu nhung gi|da chi|da thu|lich su chi|lich su thu|danh sach chi|danh sach thu)/.test(
    normalizedQuestion
  );
  const analyticsCue = /(phan tich|bao cao|xu huong|dashboard|insight)/.test(normalizedQuestion);

  return navigationCue && detailCue && transactionCue && !analyticsCue;
};

const buildTransactionDetailNavigationReply = (): { content: string; meta: string } => ({
  content:
    'Bạn vào trang Giao dịch để xem chi tiết mình đã chi/thu những gì. Tại đó bạn có thể lọc theo loại CHI hoặc THU, chọn khoảng thời gian và ví để xem đúng danh sách giao dịch cần tìm.',
  meta: `${ASSISTANT_NAME} • Xem chi tiết giao dịch`,
});

const isBehaviorDataQuestion = (question: string) => {
  const normalizedQuestion = normalizeText(question);

  if (isTransactionDetailNavigationQuestion(normalizedQuestion)) {
    return false;
  }

  return /(da chi|chi nhung gi|chi gi|chi vao|xem chi|coi chi|lich su chi|chi tieu gan day|da thu|thu nhung gi|xem thu nhap|coi thu nhap)/.test(
    normalizedQuestion
  );
};

const isFinancialDataQuestion = (question: string) => {
  const normalizedQuestion = normalizeText(question);

  if (isBehaviorDataQuestion(normalizedQuestion)) {
    return true;
  }

  const strongFinancialSignal = /(chi tieu|thu nhap|spending|income|expense|dong tien|cash flow|dong tien rong|net cash flow)/.test(
    normalizedQuestion
  );

  // Savings amount queries ("tiết kiệm được bao nhiêu") are financial data questions
  const savingsAmountQuery = /tiet kiem/.test(normalizedQuestion) && /(bao nhieu|so tien|duoc|con lai|de danh)/.test(normalizedQuestion);

  const quantitativeSignal = /(tong|bao nhieu|so tien|thang nay|quy nay|nam nay|thong ke|du lieu|bao cao)/.test(normalizedQuestion);
  const financialDomainSignal = /(chi|thu|giao dich|so du|vi|analytics|phan tich)/.test(normalizedQuestion);

  if (hasFeatureIntentCue(normalizedQuestion) && !strongFinancialSignal && !savingsAmountQuery) {
    return false;
  }

  return strongFinancialSignal || savingsAmountQuery || (quantitativeSignal && financialDomainSignal);
};

const isGenericAssistantFallback = (answer: string) => {
  const normalizedAnswer = normalizeText(answer);
  return /(chua chac y dinh|hoi ro hon|chua co du lieu|khong the ket noi|khong the xu ly|fallback)/.test(normalizedAnswer);
};

const isFeatureQuestion = (question: string) => {
  return hasFeatureIntentCue(question);
};

const getSmallTalkReply = (question: string): { content: string; meta: string } | null => {
  const normalizedQuestion = normalizeText(question);

  if (/(^|\s)(hello|hi|alo|xin chao|chao)(\s|$)/.test(normalizedQuestion)) {
    return {
      content: `Chào bạn, mình là ${ASSISTANT_NAME}. Bạn cần mình hỗ trợ về dữ liệu tài chính hay cách dùng tính năng nào trước?`,
      meta: `${ASSISTANT_NAME} • Chào bạn`,
    };
  }

  if (/(cam on|thank|thanks)/.test(normalizedQuestion)) {
    return {
      content: 'Rất vui vì hỗ trợ được bạn. Khi cần, cứ hỏi mình tiếp nhé.',
      meta: `${ASSISTANT_NAME} • Luôn sẵn sàng`,
    };
  }

  if (/(tam biet|bye|goodbye|hen gap lai)/.test(normalizedQuestion)) {
    return {
      content: 'Hẹn gặp lại bạn. Khi nào cần hỗ trợ tài chính hoặc tính năng, cứ gọi mình nhé.',
      meta: `${ASSISTANT_NAME} • Tạm biệt`,
    };
  }

  return null;
};

const findFeatureHelp = (question: string): FeatureHelpMatch | null => {
  const normalizedQuestion = normalizeText(question);
  const questionTokens = new Set(tokenize(question));
  const isComparisonQuestion = /(khac nhau|so sanh|phan biet|nen chon|uu nhuoc)/.test(normalizedQuestion);
  let bestMatch: { entry: FeatureHelpEntry; score: number } | null = null;

  for (const entry of FEATURE_HELP_ENTRIES) {
    let score = entry.priority ?? 0;
    let matchedSignals = 0;
    let exactKeywordHits = 0;

    if (entry.mustContain?.length) {
      const hasAllMustContain = entry.mustContain.every((item) => hasKeywordBoundaryMatch(normalizedQuestion, item));
      if (!hasAllMustContain) {
        continue;
      }
      score += entry.mustContain.length * 2;
    }

    for (const keyword of entry.keywords) {
      const normalizedKeyword = normalizeText(keyword);

      if (!normalizedKeyword) continue;

      if (hasKeywordBoundaryMatch(normalizedQuestion, keyword)) {
        score += normalizedKeyword.includes(' ') ? 6 : 4;
        matchedSignals += 1;
        exactKeywordHits += 1;
        continue;
      }

      const keywordTokens = tokenize(normalizedKeyword);
      if (keywordTokens.length === 0) continue;

      const overlap = keywordTokens.filter((token) => questionTokens.has(token)).length;

      if (overlap > 0) {
        const overlapRatio = overlap / keywordTokens.length;
        if (overlapRatio >= 1) {
          score += keywordTokens.length > 1 ? 3 : 1;
          matchedSignals += 1;
        } else if (overlapRatio >= 0.5 && keywordTokens.length > 1) {
          score += 1;
          matchedSignals += 1;
        }
      }
    }

    if (isComparisonQuestion && entry.mustContain?.length && entry.mustContain.length >= 2) {
      score += 2;
    }

    if (exactKeywordHits === 0 && score < FEATURE_FALLBACK_SCORE) {
      continue;
    }

    if (matchedSignals > 0 && score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { entry, score };
    }
  }

  if (!bestMatch) {
    return null;
  }

  const routeHint = bestMatch.entry.route ? `\n\nMở nhanh: ${bestMatch.entry.route}` : '';

  return {
    content: `${bestMatch.entry.answer}${routeHint}`,
    meta: `${ASSISTANT_NAME} • ${bestMatch.entry.title}`,
    score: bestMatch.score,
  };
};

const buildGenericFeatureHelp = (): FeatureHelpMatch => ({
  content:
    'Mình có thể hỗ trợ nghiệp vụ theo từng tính năng của app như: Ví, Giao dịch, Tiền gửi/Đầu tư, Định kỳ, Hóa đơn OCR, Phân tích và Cài đặt. Bạn hãy hỏi cụ thể hơn, ví dụ: "tiết kiệm và đầu tư khác nhau thế nào" hoặc "cách tất toán bán phần" để mình trả lời chính xác theo luồng hiện tại của hệ thống.',
  meta: `${ASSISTANT_NAME} • Hướng dẫn tính năng`,
  score: FEATURE_FALLBACK_SCORE,
});

const buildUnknownQuestionFallback = (): { content: string; meta: string } => ({
  content:
    'Mình chưa nắm rõ ý bạn ở câu này. Bạn có thể diễn đạt lại theo mục tiêu cụ thể hơn không? Ví dụ: "cách tạo ví", "khác nhau giữa tiết kiệm và đầu tư", hoặc "tổng chi tiêu tháng này".',
  meta: `${ASSISTANT_NAME} • Cần thêm ngữ cảnh`,
});

const buildDataQuestionFallback = (): { content: string; meta: string } => ({
  content:
    'Mình chưa lấy được dữ liệu chi tiết cho câu này. Bạn thử thêm mốc thời gian giúp mình nhé, ví dụ: "tháng này tôi đã chi những gì" hoặc "3 giao dịch chi gần nhất của tôi".',
  meta: `${ASSISTANT_NAME} • Cần rõ phạm vi dữ liệu`,
});

const toSentence = (value: string) => {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return /[.!?…]$/.test(cleaned) ? cleaned : `${cleaned}.`;
};

const humanizeAssistantReply = (answer: string, intent: string) => {
  const normalized = toSentence(answer);

  if (!normalized) {
    return `Mình là ${ASSISTANT_NAME}, bạn cứ hỏi thêm để mình hỗ trợ chi tiết hơn nhé.`;
  }

  if (intent === 'query_spending') {
    return `Mình vừa kiểm tra nhanh cho bạn: ${normalized} Nếu muốn, mình có thể gợi ý cách giảm chi theo từng danh mục.`;
  }

  if (intent === 'query_income') {
    return `Mình đã tổng hợp thu nhập cho bạn: ${normalized} Bạn muốn mình so sánh thêm với tháng trước không?`;
  }

  if (intent === 'query_savings') {
    return `Mình đã tính toán cho bạn: ${normalized} Nếu muốn, mình gợi ý luôn kế hoạch tăng mức tiết kiệm nhé.`;
  }

  if (intent === 'market_query') {
    return normalized;
  }

  if (intent === 'financial_advice') {
    return `${normalized} Nếu bạn muốn, mình sẽ gợi ý luôn kế hoạch hành động theo tuần.`;
  }

  if (intent === 'general_knowledge') {
    return normalized;
  }

  if (intent === 'unknown' || isGenericAssistantFallback(normalized)) {
    return `Mình hiểu ý bạn. ${normalized} Bạn có thể nói rõ thêm bối cảnh để mình tư vấn sát hơn nhé.`;
  }

  return normalized;
};

const buildAssistantMeta = (intent: string, llmUsed: boolean) => {
  if (intent === 'query_spending' || intent === 'query_income' || intent === 'query_savings') {
    return `${ASSISTANT_NAME} • Dựa trên dữ liệu tài chính hiện tại`;
  }

  if (intent === 'market_query') {
    return llmUsed ? `${ASSISTANT_NAME} • Dữ liệu thị trường thời gian thực` : `${ASSISTANT_NAME} • Thông tin thị trường`;
  }

  if (intent === 'financial_advice') {
    return llmUsed
      ? `${ASSISTANT_NAME} • Gợi ý cá nhân hóa (AI nâng cao)`
      : `${ASSISTANT_NAME} • Gợi ý cá nhân hóa`;
  }

  if (intent === 'unknown') {
    return `${ASSISTANT_NAME} • Mình cần thêm ngữ cảnh`;
  }

  if (intent === 'general_knowledge') {
    return llmUsed ? `${ASSISTANT_NAME} • Dữ liệu thị trường / tri thức công khai` : `${ASSISTANT_NAME} • Thông tin tham khảo`;
  }

  return llmUsed ? `${ASSISTANT_NAME} • Phân tích chuyên sâu` : `${ASSISTANT_NAME} • Phản hồi nhanh`;
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  meta?: string;
};

export const AIChatbotPopover = () => {
  const [chatSessionId] = useState(() => getOrCreateChatSessionId('popover'));
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Chào bạn, mình là ${ASSISTANT_NAME}. Mình có thể hỗ trợ cả dữ liệu tài chính và hướng dẫn sử dụng tính năng trong ứng dụng.`,
      meta: `${ASSISTANT_NAME} • Trợ lý tài chính của bạn`,
    },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isSending]);

  const shouldUseLlm = (question: string) => /lời khuyến|goi y|gợi ý|tiết kiệm|tối ưu|phan tich|phân tích|nên|kế hoạch|hướng dẫn|tính năng|tất toán|định kỳ|giá vàng|gia vang|tỷ giá|ty gia|lãi suất|lai suat|chứng khoán|chung khoan|bitcoin|crypto/i.test(question);

  const handleSend = async (prompt?: string) => {
    const question = (prompt ?? inputValue).trim();
    if (!question || isSending) return;

    const weeklyPlanRequested = isWeeklyActionPlanQuestion(question);
    if (weeklyPlanRequested) {
      const lastAssistantMessage = [...messages]
        .reverse()
        .find((item) => item.role === 'assistant' && item.content.trim().length > 0);
      const focusCategory = lastAssistantMessage ? extractTopSpendingCategory(lastAssistantMessage.content) : null;
      const weeklyPlanReply = buildWeeklyActionPlanReply(focusCategory);

      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', content: question },
        {
          id: `assistant-weekly-plan-${Date.now()}`,
          role: 'assistant',
          content: weeklyPlanReply.content,
          meta: weeklyPlanReply.meta,
        },
      ]);
      setInputValue('');
      return;
    }

    const invoiceOcrReply = isInvoiceOcrQuestion(question) ? buildInvoiceOcrReply() : null;

    if (invoiceOcrReply) {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', content: question },
        {
          id: `assistant-invoice-ocr-${Date.now()}`,
          role: 'assistant',
          content: `${invoiceOcrReply.content}\n\nMở nhanh: /invoices`,
          meta: invoiceOcrReply.meta,
        },
      ]);
      setInputValue('');
      return;
    }

    const analyticsNavigationReply = isAnalyticsNavigationQuestion(question)
      ? buildAnalyticsNavigationReply()
      : null;

    if (analyticsNavigationReply) {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', content: question },
        {
          id: `assistant-analytics-detail-${Date.now()}`,
          role: 'assistant',
          content: `${analyticsNavigationReply.content}\n\nMở nhanh: /analytics`,
          meta: analyticsNavigationReply.meta,
        },
      ]);
      setInputValue('');
      return;
    }

    const transactionDetailNavigationReply = isTransactionDetailNavigationQuestion(question)
      ? buildTransactionDetailNavigationReply()
      : null;

    if (transactionDetailNavigationReply) {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', content: question },
        {
          id: `assistant-transaction-detail-${Date.now()}`,
          role: 'assistant',
          content: `${transactionDetailNavigationReply.content}\n\nMở nhanh: /transactions`,
          meta: transactionDetailNavigationReply.meta,
        },
      ]);
      setInputValue('');
      return;
    }

    const shouldPreferDynamicDataReply = isBehaviorDataQuestion(question);

    const smallTalkReply = getSmallTalkReply(question);
    if (smallTalkReply) {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', content: question },
        {
          id: `assistant-smalltalk-${Date.now()}`,
          role: 'assistant',
          content: smallTalkReply.content,
          meta: smallTalkReply.meta,
        },
      ]);
      setInputValue('');
      return;
    }

    const featureHelp = findFeatureHelp(question);
    const genericFeatureHelp = !featureHelp && isFeatureQuestion(question) ? buildGenericFeatureHelp() : null;
    const localFeatureReply = featureHelp ?? genericFeatureHelp;
    const shouldDirectGenericFeatureReply =
      !!genericFeatureHelp
      && isFeatureQuestion(question)
      && !isFinancialDataQuestion(question);
    const canDirectReplyWithFeature =
      !!localFeatureReply
      && !shouldPreferDynamicDataReply
      && !isFinancialDataQuestion(question)
      && (localFeatureReply.score >= FEATURE_DIRECT_REPLY_SCORE || shouldDirectGenericFeatureReply);

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: question },
    ]);
    setInputValue('');
    setIsSending(true);

    if (canDirectReplyWithFeature) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-feature-${Date.now()}`,
          role: 'assistant',
          content: localFeatureReply.content,
          meta: localFeatureReply.meta,
        },
      ]);
      setIsSending(false);
      return;
    }

    try {
      const conversationHistory = messages.slice(-6).map((item) => ({
        role: item.role,
        content: item.content,
      }));

      const shouldUseGemini = shouldUseLlm(question) || shouldPreferDynamicDataReply || isFeatureQuestion(question);

      const result = await apiClient.askAI({
        question,
        sessionId: chatSessionId,
        useLlm: shouldUseGemini,
        context: {
          assistantName: ASSISTANT_NAME,
          conversationHistory,
          featureCatalog: FEATURE_ROUTE_CATALOG,
          uiSource: 'popover',
          chatSurface: 'popover',
        },
      });
      const shouldForceFeatureReply =
        !!localFeatureReply
        && isFeatureQuestion(question)
        && !isFinancialDataQuestion(question)
        && localFeatureReply.score >= FEATURE_FALLBACK_SCORE
        && (result.intent === 'query_spending' || result.intent === 'query_income' || result.intent === 'financial_advice');
      const shouldUseFeatureFallback =
        !!localFeatureReply
        && !shouldPreferDynamicDataReply
        && localFeatureReply.score >= FEATURE_DIRECT_REPLY_SCORE
        && (result.intent === 'unknown' || result.confidence < 0.35 || (result.intent !== 'general_knowledge' && isGenericAssistantFallback(result.answer)));
      const shouldUseUnknownFallback =
        !localFeatureReply
        && !isFinancialDataQuestion(question)
        && (result.intent === 'unknown' || result.confidence < 0.3 || (result.intent !== 'general_knowledge' && isGenericAssistantFallback(result.answer)));
      const humanizedAnswer = humanizeAssistantReply(result.answer, result.intent);
      const assistantMeta = buildAssistantMeta(result.intent, result.llmUsed);
      const unknownFallback = shouldPreferDynamicDataReply ? buildDataQuestionFallback() : buildUnknownQuestionFallback();

      setMessages((prev) => [
        ...prev,
        shouldForceFeatureReply
          ? {
              id: `assistant-feature-force-${Date.now()}`,
              role: 'assistant',
              content: localFeatureReply.content,
              meta: `${localFeatureReply.meta} • trả lời theo đúng ngữ cảnh tính năng`,
            }
        : shouldUseFeatureFallback
          ? {
              id: `assistant-feature-fallback-${Date.now()}`,
              role: 'assistant',
              content: localFeatureReply.content,
              meta: `${localFeatureReply.meta} • trả lời theo kiến thức tính năng`,
            }
          : shouldUseUnknownFallback
            ? {
                id: `assistant-unknown-fallback-${Date.now()}`,
                role: 'assistant',
                content: unknownFallback.content,
                meta: unknownFallback.meta,
              }
          : {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: humanizedAnswer,
              meta: assistantMeta,
            },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        localFeatureReply
          ? {
              id: `assistant-feature-error-fallback-${Date.now()}`,
              role: 'assistant',
              content: localFeatureReply.content,
              meta: `${localFeatureReply.meta} • phản hồi ngoại tuyến`,
            }
          : {
              id: `assistant-error-${Date.now()}`,
              role: 'assistant',
              content: error instanceof Error ? `Mình đang gặp chút trục trặc kết nối: ${error.message}` : 'Mình chưa kết nối được AI service lúc này, bạn thử lại sau ít phút nhé.',
              meta: `${ASSISTANT_NAME} • Kết nối tạm thời gián đoạn`,
            },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative rounded-lg border border-gray-100 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-md"
            >
              {ASSISTANT_NAME} luôn sẵn sàng!
              <div className="absolute -bottom-1 right-4 h-2 w-2 rotate-45 transform border-b border-r border-gray-100 bg-white"></div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-lg shadow-emerald-900/40 transition-transform hover:scale-105"
        >
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping"></div>
          {isOpen ? <X className="relative z-10 h-6 w-6" /> : <Sparkles className="relative z-10 h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.3 }}
            className="fixed bottom-24 right-6 z-50 flex w-80 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl sm:w-96"
            style={{ height: '540px', maxHeight: 'calc(100vh - 120px)' }}
          >
            <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-700 to-teal-900 p-4 text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{ASSISTANT_NAME}</h3>
                <p className="text-xs text-emerald-100">Trợ lý tài chính và tính năng của bạn</p>
              </div>
            </div>

            <div className="border-b border-gray-100 bg-white px-3 py-2">
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void handleSend(prompt)}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Bot className="h-4 w-4 text-emerald-700" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                      message.role === 'user'
                        ? 'rounded-br-none bg-emerald-600 text-white'
                        : 'rounded-tl-none border border-gray-100 bg-white text-gray-700'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.meta ? (
                      <p className={`mt-1 text-[11px] ${message.role === 'user' ? 'text-emerald-100' : 'text-gray-400'}`}>
                        {message.meta}
                      </p>
                    ) : null}
                  </div>

                  {message.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                      <User2 className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Bot className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="rounded-2xl rounded-tl-none border border-gray-100 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {ASSISTANT_NAME} đang phân tích...
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-white p-3">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={`Hỏi ${ASSISTANT_NAME} về tài chính hoặc tính năng...`}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-4 pr-10 text-sm transition-all focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
                <button
                  type="button"
                  disabled={isSending || !inputValue.trim()}
                  onClick={() => void handleSend()}
                  className="absolute right-2 rounded-lg p-1.5 text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
