import { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Book,
  ChevronDown,
  Clock3,
  FileText,
  LineChart,
  Mail,
  MessageCircle,
  Phone,
  PiggyBank,
  Repeat,
  Search,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type GuideItem = {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: React.ElementType;
  steps: string[];
  keywords: string[];
};

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  tags: string[];
};

const guideItems: GuideItem[] = [
  {
    id: 'wallet-start',
    title: 'Bắt đầu với Ví của tôi',
    description: 'Tạo ví tiền mặt/ngân hàng và theo dõi số dư theo thời gian thực.',
    route: '/wallets',
    icon: Wallet,
    steps: ['Vào trang Ví của tôi và tạo ví mới.', 'Đặt tên ví rõ ràng để dễ nhận diện.', 'Kiểm tra trạng thái ví trước khi ghi nhận giao dịch.'],
    keywords: ['vi', 'so du', 'wallet', 'tao vi'],
  },
  {
    id: 'transactions-flow',
    title: 'Ghi nhận giao dịch đúng chuẩn',
    description: 'Thu, chi, mô tả và danh mục giúp báo cáo chính xác hơn.',
    route: '/transactions',
    icon: FileText,
    steps: ['Chọn ví nguồn tương ứng với giao dịch.', 'Chọn danh mục đúng loại Thu hoặc Chi.', 'Thêm mô tả ngắn để dễ tra cứu sau này.'],
    keywords: ['giao dich', 'thu', 'chi', 'danh muc'],
  },
  {
    id: 'saving-investment',
    title: 'Tiền gửi và Đầu tư',
    description: 'Tạo gói mục tiêu, nạp tiền định kỳ và tất toán toàn phần hoặc bán phần.',
    route: '/savings',
    icon: PiggyBank,
    steps: ['Tạo gói tiết kiệm hoặc đầu tư phù hợp mục tiêu.', 'Nạp tiền từ ví nguồn khi có dòng tiền.', 'Khi cần rút: chọn tất toán toàn phần hoặc bán phần.'],
    keywords: ['tiet kiem', 'dau tu', 'tat toan', 'ban phan', 'toan phan'],
  },
  {
    id: 'recurring-rules',
    title: 'Thiết lập giao dịch định kỳ',
    description: 'Tự động hóa các khoản thu chi lặp lại theo tuần hoặc tháng.',
    route: '/recurring',
    icon: Repeat,
    steps: ['Tạo quy tắc mới với số tiền và tần suất.', 'Kiểm tra ví/danh mục trước khi kích hoạt.', 'Theo dõi lịch sử chạy để đảm bảo đúng kế hoạch.'],
    keywords: ['dinh ky', 'lap lai', 'recurring'],
  },
  {
    id: 'analytics-insight',
    title: 'Đọc báo cáo phân tích',
    description: 'Xem xu hướng thu chi và cơ cấu danh mục để tối ưu ngân sách.',
    route: '/analytics',
    icon: LineChart,
    steps: ['Chọn khoảng thời gian bạn muốn phân tích.', 'So sánh Thu - Chi theo tháng.', 'Tìm danh mục chi tiêu cao để tối ưu.'],
    keywords: ['phan tich', 'bao cao', 'xu huong'],
  },
  {
    id: 'ai-assistant',
    title: 'Khai thác Trợ lý AI',
    description: 'Đặt câu hỏi tự nhiên để nhận gợi ý tài chính cá nhân hóa.',
    route: '/ai-assistant',
    icon: Sparkles,
    steps: ['Nêu rõ mục tiêu và khoảng thời gian cần phân tích.', 'Hỏi theo ngữ cảnh ví hoặc danh mục.', 'Áp dụng gợi ý và theo dõi thay đổi trên dashboard.'],
    keywords: ['ai', 'tro ly', 'goi y', 'chat'],
  },
];

const faqItems: FaqItem[] = [
  {
    id: 'faq-wallet-balance',
    question: 'Vì sao số dư ví chưa cập nhật ngay sau khi tạo giao dịch?',
    answer:
      'Một số thao tác được xử lý theo luồng sự kiện giữa các service. Hệ thống thường đồng bộ rất nhanh, nhưng có thể trễ vài giây trong giờ cao điểm. Bạn có thể tải lại trang hoặc kiểm tra lại sau ít phút.',
    tags: ['vi', 'so du', 'giao dich'],
  },
  {
    id: 'faq-saving-settle',
    question: 'Khác nhau giữa tất toán toàn phần và tất toán bán phần là gì?',
    answer:
      'Toàn phần sẽ rút toàn bộ số dư hiện tại của gói. Bán phần cho phép nhập số tiền muốn rút và giữ phần còn lại trong gói để tiếp tục tích lũy.',
    tags: ['tiet kiem', 'dau tu', 'tat toan', 'ban phan'],
  },
  {
    id: 'faq-saving-wallet',
    question: 'Tất toán bán phần có bắt buộc chọn ví nhận tiền không?',
    answer:
      'Có. Khi bạn chọn bán phần, hệ thống yêu cầu chọn ví nhận tiền và nhập số tiền hợp lệ. Số tiền rút không được vượt quá số dư đang có trong gói.',
    tags: ['tat toan', 'vi', 'saving'],
  },
  {
    id: 'faq-recurring',
    question: 'Nếu quy tắc định kỳ chạy lỗi thì xử lý thế nào?',
    answer:
      'Bạn vào trang Định kỳ để kiểm tra quy tắc và trạng thái. Hãy xác nhận ví còn hoạt động, danh mục còn hợp lệ và số dư đủ để thực hiện giao dịch nếu là khoản chi.',
    tags: ['dinh ky', 'recurring', 'loi'],
  },
  {
    id: 'faq-ai',
    question: 'Nên hỏi Trợ lý AI thế nào để nhận kết quả tốt hơn?',
    answer:
      'Hãy đặt câu hỏi cụ thể theo ngữ cảnh, ví dụ: "Chi tiêu ăn uống 3 tháng gần nhất thế nào?" hoặc "Gợi ý giảm chi cố định trong quý này".',
    tags: ['ai', 'tro ly', 'goi y'],
  },
  {
    id: 'faq-security',
    question: 'Làm sao để tăng an toàn tài khoản?',
    answer:
      'Ưu tiên mật khẩu mạnh, không chia sẻ thiết bị đăng nhập và kiểm tra các phiên đăng nhập trong trang Cài đặt/Profile định kỳ.',
    tags: ['bao mat', 'tai khoan', 'cai dat'],
  },
];

type HelpShortcut = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  actionLabel: string;
  onAction: () => void;
};

export const Help = () => {
  const [query, setQuery] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string>(faqItems[0]?.id ?? '');
  const guideRef = useRef<HTMLDivElement | null>(null);
  const faqRef = useRef<HTMLDivElement | null>(null);
  const supportRef = useRef<HTMLDivElement | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredGuides = useMemo(() => {
    if (!normalizedQuery) return guideItems;

    return guideItems.filter((item) => {
      const haystack = [item.title, item.description, ...item.steps, ...item.keywords].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  const filteredFaqs = useMemo(() => {
    if (!normalizedQuery) return faqItems;

    return faqItems.filter((item) => {
      const haystack = [item.question, item.answer, ...item.tags].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  const totalResult = filteredGuides.length + filteredFaqs.length;

  const scrollToSection = (node: HTMLElement | null) => {
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const shortcuts: HelpShortcut[] = [
    {
      id: 'guide',
      title: 'Hướng dẫn sử dụng',
      description: 'Tìm hiểu nhanh cách dùng các tính năng chính.',
      icon: Book,
      actionLabel: 'Mở hướng dẫn',
      onAction: () => scrollToSection(guideRef.current),
    },
    {
      id: 'faq',
      title: 'Câu hỏi thường gặp',
      description: 'Giải đáp các thắc mắc phổ biến nhất.',
      icon: FileText,
      actionLabel: 'Xem FAQ',
      onAction: () => scrollToSection(faqRef.current),
    },
    {
      id: 'chat',
      title: 'Chat với hỗ trợ',
      description: 'Trao đổi nhanh qua Trợ lý AI hoặc gửi phản hồi.',
      icon: MessageCircle,
      actionLabel: 'Đến kênh hỗ trợ',
      onAction: () => scrollToSection(supportRef.current),
    },
    {
      id: 'hotline',
      title: 'Hotline',
      description: 'Gọi trực tiếp khi cần hỗ trợ khẩn.',
      icon: Phone,
      actionLabel: 'Gọi 1900 6868',
      onAction: () => {
        window.location.href = 'tel:19006868';
      },
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Chúng tôi có thể giúp gì cho bạn?</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Tìm nhanh hướng dẫn, FAQ và kênh liên hệ phù hợp với thao tác bạn đang cần.</p>

          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="text"
              placeholder="Ví dụ: tất toán bán phần, định kỳ, số dư ví..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-base text-gray-900 shadow-sm outline-none transition-all focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {normalizedQuery ? (
            <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
              Tìm thấy <span className="font-semibold text-gray-900 dark:text-white">{totalResult}</span> kết quả cho "{query.trim()}".
            </p>
          ) : (
            <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">Mẹo: dùng từ khóa như ví, giao dịch, tiết kiệm, định kỳ, AI.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={item.onAction}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="group rounded-3xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">{item.description}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {item.actionLabel}
                <ArrowRight className="h-4 w-4" />
              </div>
            </motion.button>
          );
        })}
      </div>

      <div ref={guideRef} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Hướng dẫn theo tính năng</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Đi theo từng luồng thao tác để dùng app hiệu quả ngay từ đầu.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-slate-800 dark:text-slate-300">{filteredGuides.length} mục</span>
        </div>

        {filteredGuides.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            Không có hướng dẫn phù hợp với từ khóa hiện tại.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredGuides.map((item) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{item.description}</p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {item.steps.map((step) => (
                      <li key={step} className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-300">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5">
                    <Link
                      to={item.route}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                    >
                      Đi tới tính năng
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div ref={faqRef} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Câu hỏi thường gặp</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Các tình huống phổ biến khi dùng ví, giao dịch và tiết kiệm.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-slate-800 dark:text-slate-300">{filteredFaqs.length} câu hỏi</span>
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            Không tìm thấy câu hỏi phù hợp. Bạn có thể gửi phản hồi để được hỗ trợ trực tiếp.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((item) => {
              const isOpen = openFaqId === item.id;

              return (
                <div key={item.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setOpenFaqId((prev) => (prev === item.id ? '' : item.id))}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{item.question}</span>
                    <ChevronDown className={cn('h-5 w-5 shrink-0 text-gray-400 transition-transform dark:text-slate-500', isOpen && 'rotate-180')} />
                  </button>

                  {isOpen && <div className="border-t border-gray-100 px-5 py-4 text-sm leading-6 text-gray-600 dark:border-slate-800 dark:text-slate-300">{item.answer}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div ref={supportRef} className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Kênh hỗ trợ</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Chọn kênh phù hợp theo mức độ khẩn cấp của vấn đề.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Chat hỗ trợ nhanh</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Nhận gợi ý tức thì cho câu hỏi nghiệp vụ.</p>
            <Link to="/ai-assistant" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Mở Trợ lý AI
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Gửi ticket hỗ trợ</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Phù hợp lỗi cần mô tả chi tiết và theo dõi tiến độ.</p>
            <Link to="/feedback" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-400">
              Gửi phản hồi
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Email CSKH</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">support@fintech.local</p>
            <a
              href="mailto:support@fintech.local?subject=Ho%20tro%20ung%20dung%20Fintech"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-400"
            >
              Soạn email
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
              <Phone className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Hotline 1900 6868</h3>
            <p className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
              <Clock3 className="h-4 w-4" />
              08:00 - 22:00 mỗi ngày
            </p>
            <a href="tel:19006868" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              Gọi ngay
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
