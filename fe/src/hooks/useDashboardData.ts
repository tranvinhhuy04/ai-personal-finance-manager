export interface StatData {
  title: string;
  subtitle: string;
  amount: number;
  growth: number;
  isPositive: boolean;
  isPrimary?: boolean;
}

export interface WalletCurrency {
  id: string;
  name: string;
  type: 'techcombank' | 'momo' | 'zalopay' | 'cash';
  amount: number;
  limit: string;
  status: 'Hoạt động' | 'Tạm khóa';
}

export interface CashFlowData {
  month: string;
  cashflow: number; // income (inflow) — Bar
  outflow: number;  // total expense (outflow) — Line (positive value)
  inflow: number;   // kept for backward compat (negative expense)
}

export interface DashboardData {
  overview: {
    balance: StatData;
    savings: StatData;
    investment: StatData;
  };
  wallet: {
    exchangeRate: string;
    currencies: WalletCurrency[];
  };
  cashFlow: {
    total: number;
    data: CashFlowData[];
  };
}

// Hook trả về dữ liệu tĩnh (mock) cho Dashboard.
// Dữ liệu này hiện không gọi API – dùng để fallback hoặc hiển thị UI mẫu.
// Nếu muốn dữ liệu thật, thay bằng useQuery gọi /api/v1/wallets + /api/v1/analytics.
export const useDashboardData = () => {
  const data: DashboardData = {
    overview: {
      balance: {
        title: 'Số dư của tôi',
        subtitle: 'Tổng quan ví & Chi tiêu',
        amount: 513008000,
        growth: 1.5,
        isPositive: true,
        isPrimary: true,
      },
      savings: {
        title: 'Tài khoản tiết kiệm',
        subtitle: 'Tiết kiệm tăng trưởng đều',
        amount: 395011250,
        growth: 3.2,
        isPositive: true,
      },
      investment: {
        title: 'Danh mục đầu tư',
        subtitle: 'Theo dõi tăng trưởng tài sản',
        amount: 1253019500,
        growth: 4.7,
        isPositive: true,
      },
    },
    wallet: {
      exchangeRate: 'Hôm nay 1 USD = 25.420 VNĐ',
      currencies: [
        { id: 'tcb', name: 'Techcombank', type: 'techcombank', amount: 150000000, limit: '250tr một tháng', status: 'Hoạt động' },
        { id: 'momo', name: 'Ví MoMo', type: 'momo', amount: 5500000, limit: '50tr một tháng', status: 'Hoạt động' },
        { id: 'zalo', name: 'ZaloPay', type: 'zalopay', amount: 2150000, limit: '50tr một tháng', status: 'Hoạt động' },
        { id: 'cash', name: 'Tiền mặt', type: 'cash', amount: 15000000, limit: 'Không giới hạn', status: 'Tạm khóa' },
      ],
    },
    cashFlow: {
      total: 8558086000,
      data: [
        { month: 'Thg 1', cashflow: 750000000, outflow: 125000000, inflow: -125000000 },
        { month: 'Thg 2', cashflow: 700000000, outflow: 100000000, inflow: -100000000 },
        { month: 'Thg 3', cashflow: 1200000000, outflow: 186400000, inflow: -186400000 },
        { month: 'Thg 4', cashflow: 625000000, outflow: 75000000, inflow: -75000000 },
        { month: 'Thg 5', cashflow: 500000000, outflow: 50000000, inflow: -50000000 },
        { month: 'Thg 6', cashflow: 750000000, outflow: 100000000, inflow: -100000000 },
        { month: 'Thg 7', cashflow: 875000000, outflow: 150000000, inflow: -150000000 },
      ],
    },
  };

  return { data, isLoading: false, error: null };
};
