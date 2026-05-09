# Hướng dẫn chạy Frontend

## Tổng quan

Frontend được xây dựng bằng **React 19 + TypeScript + Vite**, sử dụng:

- **Zustand** – quản lý state toàn cục (auth, wallet, transaction)
- **TanStack React Query** – data fetching & caching API
- **Tailwind CSS v4** – styling
- **Recharts** – vẽ biểu đồ analytics
- **React Router v7** – điều hướng trang
- **Motion (Framer Motion)** – animation
- **Axios** – HTTP client với interceptor tự động gắn JWT

---

## Yêu cầu môi trường

| Công cụ | Phiên bản tối thiểu |
|---------|-------------------|
| Node.js | 18.x trở lên |
| npm | 9.x trở lên (đi kèm Node) |

Kiểm tra:
```bash
node -v
npm -v
```

---

## Cài đặt lần đầu

```bash
cd fe
npm install
```

---

## Cấu hình biến môi trường

Tạo file `.env` trong thư mục `fe/` (copy từ mẫu dưới):

```env
# URL API Gateway (backend)
VITE_API_BASE_URL=http://localhost:3000

# URL riêng cho AI Service (nếu chạy tách cổng, ví dụ: 5000)
# Nếu bỏ trống thì dùng chung VITE_API_BASE_URL
VITE_AI_SERVICE_URL=http://localhost:5000

# (Tùy chọn) Gemini API Key – dùng cho tính năng AI chat với Google Gemini
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Lưu ý:** Không commit file `.env` lên git.

---

## Chạy môi trường phát triển (Development)

```bash
cd fe
npm run dev
```

Ứng dụng chạy tại: **http://localhost:5173**

Hot Module Replacement (HMR) tự động reload khi thay đổi code.

---

## Build cho Production

```bash
cd fe
npm run build
```

Output nằm trong thư mục `fe/dist/`. Dùng lệnh sau để xem trước bản build:

```bash
npm run preview
```

---

## Kiểm tra lỗi TypeScript

```bash
npm run lint
```

Lệnh này chạy `tsc --noEmit` – phát hiện lỗi type mà không tạo file output.

---

## Cấu trúc thư mục `src/`

```
src/
├── App.tsx                 # Root component – cấu hình routing toàn app
├── main.tsx                # Entry point React
├── components/
│   ├── layout/             # DashboardLayout, Sidebar, Header, AIChatbotPopover
│   ├── dashboard/          # Overview, MyWallet, CashFlow, các Modal
│   ├── analytics/          # Chart components (CategoryChart, ForecastTrendChart…)
│   └── common/             # CurrencyInput, ErrorBoundary
├── pages/                  # Các trang: Dashboard, Auth, Analytics, Transactions…
├── hooks/
│   ├── useAnalytics.ts     # Fetch dữ liệu từ /api/v1/analytics/dashboard
│   ├── useDashboardData.ts # Dữ liệu mock cho Dashboard overview
│   ├── useNotifications.ts # Polling thông báo realtime
│   └── usePerformanceMetrics.ts
├── store/
│   ├── useAuthStore.ts     # Zustand store – đăng nhập / logout / persist JWT
│   └── useFinanceStore.ts  # Zustand store – wallet, transaction, category
├── lib/
│   ├── apiClient.ts        # Lớp ApiClient bọc toàn bộ API call
│   ├── chatSession.ts      # Quản lý session ID cho AI chat (localStorage)
│   ├── utils.ts            # formatCurrency, formatCompactNumber, cn()
│   └── mockData.ts
├── utils/
│   └── axiosClient.ts      # Axios instance + interceptor JWT tự động
└── types/
    └── finance.ts          # TypeScript types: Wallet, Transaction, Category…
```

---

## Routing

| Đường dẫn | Trang |
|-----------|-------|
| `/auth` | Đăng nhập / Đăng ký |
| `/` | Dashboard chính |
| `/wallets` | Quản lý ví |
| `/transactions` | Lịch sử giao dịch |
| `/analytics` | Phân tích tài chính |
| `/savings` | Tiết kiệm & Đầu tư |
| `/invoices` | Hóa đơn |
| `/recurring` | Giao dịch định kỳ |
| `/ai-assistant` | Trợ lý AI |
| `/profile` | Hồ sơ người dùng |
| `/settings` | Cài đặt |

Mọi route không khớp sẽ redirect về `/`.

---

## Luồng xác thực (Authentication)

1. Người dùng nhập email/password tại `/auth`
2. `handleRealLogin()` gọi `POST /api/v1/auth/login` qua API Gateway
3. Token (`accessToken`) được lưu vào **localStorage** và **Zustand store** (`auth-storage`)
4. `axiosClient` tự động đính kèm token vào mọi request qua request interceptor
5. Khi server trả 401, interceptor xóa token và redirect về `/auth`

### Đăng nhập demo (không cần backend)

Tại trang `/auth`, dùng nút **"Dùng thử"** để gọi `setMockLogin()` – đăng nhập bằng tài khoản giả.

---

## Kết nối Backend

Frontend kết nối với các service qua **API Gateway** (mặc định `localhost:3000`):

| Endpoint prefix | Service |
|----------------|---------|
| `/api/v1/auth` | service-identity |
| `/api/v1/wallets` | service-wallet |
| `/api/v1/transactions` | service-transaction |
| `/api/v1/analytics` | analytics-service |
| `/api/v1/notifications` | notification-service |
| `/api/v1/ai` | ai-service |

Đảm bảo backend đang chạy trước khi khởi động frontend. Xem hướng dẫn backend tại `be/docker-compose.yml`.

---

## Chạy cùng Backend (Docker)

```bash
# Từ thư mục gốc dự án
cd be
docker compose up -d

# Sau đó mở tab mới chạy frontend
cd ../fe
npm run dev
```

---

## Các vấn đề thường gặp

### Lỗi `CORS` khi gọi API
- Đảm bảo `VITE_API_BASE_URL` trỏ đúng địa chỉ backend
- Backend cần cấu hình CORS cho phép origin `http://localhost:5173`

### Trang trắng sau khi đăng nhập
- Xóa localStorage bằng DevTools → Application → Local Storage → Clear All
- Reload lại trang

### Biểu đồ không hiển thị dữ liệu
- Kiểm tra token còn hợp lệ (không bị 401)
- Xem Network tab trong DevTools để debug request `/api/v1/analytics/dashboard`

### TypeScript lỗi sau khi thêm package mới
```bash
npm install
npm run lint
```
