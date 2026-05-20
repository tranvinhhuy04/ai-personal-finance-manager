# FinanceApp — Ứng dụng Quản lý Tài chính Cá nhân

Ứng dụng quản lý tài chính cá nhân toàn diện với AI assistant, phân tích chi tiêu, quản lý ví, tiết kiệm và đầu tư.

## Demo trực tuyến

Truy cập demo: nhấn nút **"Xem Demo (mock data)"** trên trang đăng nhập — không cần tạo tài khoản.

> Để sử dụng đầy đủ AI chat & OCR: thêm `GEMINI_API_KEY` vào Vercel Environment Variables.

---

## Tính năng chính

| Tính năng | Mô tả |
|---|---|
| **Dashboard** | Tổng quan số dư, tiết kiệm, đầu tư, dòng tiền theo tháng/năm |
| **Ví & Giao dịch** | Quản lý nhiều ví (tiền mặt, ngân hàng, MoMo, ZaloPay), tạo giao dịch |
| **Phân tích** | Biểu đồ thu chi, breakdown theo danh mục, so sánh tháng |
| **Tiết kiệm & Đầu tư** | Theo dõi gói tiết kiệm, danh mục đầu tư, tính CAGR |
| **Định kỳ** | Quản lý thu chi định kỳ (Netflix, tiền thuê nhà, ...) |
| **Hóa đơn OCR** | Chụp hóa đơn, AI tự động trích xuất thông tin |
| **AI Assistant** | Chat với Gemini AI để phân tích tài chính cá nhân |

---

## Công nghệ sử dụng

### Frontend (`fe/`)
- **React 19** + **TypeScript** + **Vite 6**
- **TailwindCSS 4** + **shadcn/ui** style components
- **Zustand** (state management) + **TanStack Query v5** (data fetching)
- **Recharts** (biểu đồ) + **Framer Motion** (animation)
- **Google Gemini API** (`@google/genai`)

### Backend (`be/`)
- **Microservices** architecture (Node.js + TypeScript)
- **API Gateway** — Express.js, JWT authentication
- **service-identity** — User management
- **service-transaction** — Transactions, categories, recurring rules
- **service-wallet** — Wallet management
- **analytics-service** — Dashboard analytics, reports
- **notification-service** — Real-time notifications
- **cloud-service** — File uploads (invoice OCR)
- **ai-service** — Python FastAPI, Gemini AI integration
- **MongoDB** + **RabbitMQ** (message broker)

### Mobile (`fe-mobile/`)
- **React Native** + **Expo** + **NativeWind**

---

## Cài đặt & Chạy Local

### Yêu cầu
- Node.js ≥ 18
- Docker & Docker Compose (cho backend)
- Python ≥ 3.11 (cho AI service)

### Frontend

```bash
cd fe
cp .env.example .env.local
# Chỉnh VITE_API_BASE_URL và VITE_AI_SERVICE_URL trong .env.local
npm install
npm run dev
# → http://localhost:5173
```

### Backend (Docker)

```bash
cd be
cp .env.example .env
# Điền MongoDB credentials vào .env
docker compose up -d
```

Các service sẽ chạy tại:
- API Gateway: `http://localhost:3000`
- AI Service: `http://localhost:8000`
- Analytics: `http://localhost:3005`

### Mobile

```bash
cd fe-mobile
cp .env.example .env
npm install
npx expo start
```

---

## Biến môi trường

### Frontend (`fe/.env.local`)

| Biến | Mô tả | Mặc định |
|---|---|---|
| `VITE_API_BASE_URL` | URL của API Gateway | `http://localhost:3000` |
| `VITE_AI_SERVICE_URL` | URL của AI Service | cùng với API Gateway |
| `VITE_API_URL` | Base URL cho auth endpoints | `http://localhost:3000/api/v1` |

### Backend (`be/.env`)

| Biến | Mô tả |
|---|---|
| `MONGO_INITDB_ROOT_USERNAME` | MongoDB root username |
| `MONGO_INITDB_ROOT_PASSWORD` | MongoDB root password |

Xem `.env.example` trong từng service để biết các biến cần thiết.

---

## Deploy lên Vercel

### Cấu hình Vercel

- **Root Directory**: `fe`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Vite

### Serverless API

Dự án bao gồm mock backend tại `fe/api/v1/[...path].ts` — tự động deploy cùng với frontend. Không cần backend riêng để demo.

### Environment Variables trên Vercel

| Biến | Giá trị | Bắt buộc |
|---|---|---|
| `VITE_API_BASE_URL` | *(để trống)* | ✅ |
| `VITE_AI_SERVICE_URL` | *(để trống)* | ✅ |
| `VITE_API_URL` | *(để trống)* | ✅ |
| `GEMINI_API_KEY` | API key từ [Google AI Studio](https://aistudio.google.com/) | Cho AI features |

> **Quan trọng**: Để 3 biến `VITE_*` trống (empty string) để frontend dùng same-origin routing.

### Các bước deploy

```bash
# 1. Cài Vercel CLI (nếu chưa có)
npm i -g vercel

# 2. Deploy từ thư mục root
vercel --prod

# Hoặc: kết nối GitHub repo với Vercel dashboard → tự động deploy khi push
```

---

## Cấu trúc dự án

```
├── fe/                     # Frontend React app (deploy lên Vercel)
│   ├── api/v1/[...path].ts # Serverless mock API (Vercel function)
│   ├── src/
│   │   ├── pages/          # Dashboard, Transactions, Analytics, ...
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom hooks (usePerformanceMetrics, ...)
│   │   ├── store/          # Zustand stores (useAuthStore, ...)
│   │   ├── lib/            # apiClient, utils
│   │   └── types/          # TypeScript types
│   ├── vercel.json         # Vercel deployment config
│   └── .env.production     # Production env (empty URLs for Vercel)
│
├── be/                     # Backend microservices (Docker)
│   ├── api-gateway/
│   ├── service-identity/
│   ├── service-transaction/
│   ├── service-wallet/
│   ├── analytics-service/
│   ├── notification-service/
│   ├── cloud-service/
│   ├── ai-service/         # Python FastAPI
│   └── docker-compose.yml
│
├── fe-mobile/              # React Native (Expo) app
└── tests/                  # E2E tests (Playwright)
```

---

## Mock Data (Demo Mode)

Khi dùng "Xem Demo", hệ thống sử dụng dữ liệu mô phỏng:

- **3 ví**: Tiền mặt (5.2M), MoMo (1.8M), Techcombank (28.5M)
- **Tổng tài sản**: ~35.5M VND
- **Giao dịch**: Tháng 4–5/2026 (lương, chi tiêu, tiện ích, ...)
- **Tiết kiệm**: Laptop, Du lịch Nhật, Quỹ khẩn cấp
- **Đầu tư**: Cổ phiếu VIC, Quỹ ETF SSIAM, Trái phiếu
- **Định kỳ**: Tiền thuê nhà, Netflix, Internet VNPT
- **AI Chat**: Phân tích tài chính thực tế với dữ liệu demo (cần `GEMINI_API_KEY`)

---

## License

MIT
