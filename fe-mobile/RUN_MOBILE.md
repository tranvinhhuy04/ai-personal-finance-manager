# Hướng dẫn chạy Frontend Mobile (React Native / Expo)

## Tổng quan

Ứng dụng di động được xây dựng bằng **React Native + Expo + TypeScript**, sử dụng:

- **Expo SDK 54** – build & chạy trên iOS / Android / Web
- **React Navigation v7** – điều hướng (Bottom Tab + Native Stack)
- **TanStack React Query v5** – data fetching, caching, background sync
- **NativeWind v4** – Tailwind CSS cho React Native
- **AsyncStorage** – lưu token và preferences (thay thế localStorage)
- **Axios** – HTTP client với interceptor JWT bất đồng bộ
- **Expo Linear Gradient** – gradient UI
- **Lucide React Native** – icon set

---

## Yêu cầu môi trường

| Công cụ | Phiên bản | Ghi chú |
|---------|-----------|---------|
| Node.js | 18.x trở lên | |
| npm | 9.x trở lên | |
| Expo CLI | Mới nhất | `npm install -g expo-cli` |
| iOS Simulator | Xcode 15+ | Chỉ macOS |
| Android Emulator | Android Studio | AVD Manager |
| Expo Go app | Mới nhất | Test trên thiết bị thật |

Kiểm tra:
```bash
node -v
npm -v
npx expo --version
```

---

## Cài đặt lần đầu

```bash
cd fe-mobile
npm install
```

---

## Cấu hình biến môi trường

Tạo hoặc chỉnh sửa file `.env` trong thư mục `fe-mobile/`:

```env
# URL API Gateway (backend) – thay bằng IP LAN khi test trên thiết bị thật
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000

# URL AI Service (nếu chạy tách cổng)
EXPO_PUBLIC_AI_SERVICE_URL=http://192.168.x.x:3000

# Timeout (milliseconds)
EXPO_PUBLIC_API_TIMEOUT_MS=30000
EXPO_PUBLIC_AUTH_TIMEOUT_MS=45000
EXPO_PUBLIC_AI_TIMEOUT_MS=120000

# (Dev only) JWT tạm thời để bỏ qua màn Login khi test nhanh
# EXPO_PUBLIC_ACCESS_TOKEN=eyJhbGc...
```

> **Quan trọng:**
> - Biến môi trường trong Expo phải có prefix `EXPO_PUBLIC_` để được bundle vào app.
> - Khi test trên thiết bị thật / Expo Go: dùng **IP LAN** của máy tính (không dùng `localhost`).
> - Android Emulator: dùng `http://10.0.2.2:3000` (alias trỏ về localhost của máy host).
> - iOS Simulator: dùng `http://127.0.0.1:3000`.

### Thứ tự ưu tiên chọn Base URL (tự động)

App sẽ tự chọn URL theo thứ tự sau (dừng khi tìm thấy giá trị hợp lệ):

1. `EXPO_PUBLIC_API_BASE_URL` từ `.env`
2. IP LAN suy ra từ Expo debugger host (khi dùng Expo Go)
3. `extra.apiBaseUrl` trong `app.config.js`
4. Fallback theo platform: `10.0.2.2:3000` (Android) / `127.0.0.1:3000` (iOS/Web)

---

## Chạy ứng dụng

### Khởi động Expo Dev Server

```bash
cd fe-mobile
npm start
# hoặc
npx expo start
```

Sau đó chọn platform:

| Phím | Hành động |
|------|-----------|
| `a` | Mở Android Emulator |
| `i` | Mở iOS Simulator (macOS) |
| `w` | Mở Web browser |
| `s` | Scan QR bằng Expo Go trên thiết bị thật |

### Chạy trực tiếp theo platform

```bash
# Android
npm run android

# iOS (macOS only)
npm run ios

# Web
npm run web
```

---

## Kiểm tra lỗi TypeScript

```bash
npm run lint
# chạy tsc --noEmit
```

---

## Cấu trúc thư mục `src/`

```
src/
├── api/
│   ├── axiosClient.ts      # Axios instance + interceptor JWT async (AsyncStorage)
│   │                       # Logic tự phát hiện IP LAN từ Expo debugger host
│   ├── auth.ts             # authApi: login, register, getMe, persistSession, clearSession
│   │                       # withAuthRetry: tự retry 1 lần khi gặp lỗi mạng tạm thời
│   └── finance.ts          # financeApi: wallets, transactions, analytics, savings
├── components/             # UI components dùng lại:
│   ├── WalletCard.tsx      # Card hiển thị thông tin ví
│   ├── StatCard.tsx        # Card số liệu thống kê (số dư, thu nhập...)
│   ├── NLPQuickEntry.tsx   # Nhập giao dịch bằng ngôn ngữ tự nhiên (AI)
│   ├── ChatMessage.tsx     # Bong bóng chat trong AI Assistant
│   ├── SkeletonLoading.tsx # Placeholder loading animation
│   └── ...
├── contexts/
│   ├── AuthContext.tsx          # AuthProvider: bootstrapSession, signIn, signOut, verifyTwoFactor
│   └── AppPreferencesContext.tsx # darkMode, notifications, biometricLock (AsyncStorage persist)
├── hooks/
│   ├── useDashboardOverview.ts  # 3 query song song: wallets + savings + analytics
│   ├── useWallets.ts            # CRUD ví + filter local + summary tổng hợp
│   ├── useTransactions.ts       # Giao dịch + categories, invalidate wallets sau khi tạo
│   ├── useCashflow.ts           # Analytics cashflow; fallback demo data khi API lỗi
│   └── useAppPreferences.ts     # Hook tiện ích đọc AppPreferencesContext
├── navigation/
│   └── RootNavigator.tsx   # Stack: Login (chưa auth) / MainTabs (đã auth)
│                            # MainTabs: Dashboard, Ví, Giao dịch, Analytics, AI, Settings
├── screens/
│   ├── LoginScreen.tsx          # Đăng nhập / Đăng ký + luồng 2FA
│   ├── DashboardScreen.tsx      # Màn hình chính: tổng quan tài chính
│   ├── MyWalletsScreen.tsx      # Danh sách ví + tạo ví + bật/tắt ví
│   ├── TransactionScreen.tsx    # Lịch sử giao dịch + tạo giao dịch mới
│   ├── AnalyticsScreen.tsx      # Biểu đồ thu chi theo tháng/quý/năm
│   ├── AIAssistantScreen.tsx    # Chat với AI trợ lý tài chính
│   └── SettingsScreen.tsx       # Cài đặt dark mode, thông báo, biometric
├── types/
│   └── finance.ts          # TypeScript types: Wallet, Transaction, Category...
└── utils/
    ├── formatCurrency.ts   # formatCurrency, formatCompactCurrency, formatCurrencyShort
    └── demoData.ts         # Dữ liệu mẫu dùng khi API không khả dụng
```

---

## Luồng xác thực (Authentication)

### Boot sequence (mỗi lần mở app)

```
App khởi động
    └─▶ AuthProvider.bootstrapSession()
            ├─▶ Đọc token từ AsyncStorage
            │       (không có token) → user = null → hiện LoginScreen
            ├─▶ Gọi GET /api/v1/auth/me để xác minh token còn hợp lệ
            │       (thành công) → setUser + setToken → hiện MainTabs
            └─▶ (API lỗi nhưng có storedUser) → dùng user cached → hiện MainTabs
```

### Đăng nhập thường

1. User nhập email/password tại `LoginScreen`
2. `signIn()` gọi `authApi.login()` → `POST /api/v1/auth/login`
3. Server trả về `accessToken` + `refreshToken` + `user`
4. `persistSession()` lưu vào AsyncStorage
5. `AuthContext` cập nhật state → `RootNavigator` chuyển sang `MainTabs`

### Luồng 2FA (Two-Factor Authentication)

1. Server trả `requires2FA: true` + `twoFactorToken`
2. UI hiển thị form nhập mã 6 số
3. `verifyTwoFactor(twoFactorToken, code)` gọi endpoint xác minh
4. Thành công → lưu session và vào app

### JWT token được gắn tự động

`axiosClient` có request interceptor **async** đọc token từ AsyncStorage và thêm header:
```
Authorization: Bearer <token>
```
Mọi request đến API đều được gắn token tự động, không cần truyền thủ công.

### Xử lý 401

Response interceptor tự động:
1. Xóa toàn bộ auth data khỏi AsyncStorage
2. Reset `AuthContext` state
3. App redirect về `LoginScreen`

---

## Kết nối Backend

Frontend mobile kết nối với các service qua **API Gateway** (mặc định port 3000):

| Endpoint prefix | Service |
|----------------|---------|
| `/api/v1/auth` | service-identity |
| `/api/v1/wallets` | service-wallet |
| `/api/v1/transactions` | service-transaction |
| `/api/v1/analytics` | analytics-service |
| `/api/v1/savings` | service-wallet (savings module) |
| `/api/v1/notifications` | notification-service |
| `/api/v1/ai` | ai-service |

---

## Chạy cùng Backend (Docker)

```bash
# Khởi động toàn bộ backend
cd be
docker compose up -d

# Kiểm tra backend đang chạy
curl http://localhost:3000/health

# Chạy app mobile (tab mới)
cd ../fe-mobile
npm start
```

---

## Dark Mode

Dark mode được quản lý bởi `AppPreferencesContext`, persist vào AsyncStorage key `fintech-mobile-preferences`.

- Bật/tắt trong Settings screen
- Root `View` trong `AppContainer` áp dụng class `bg-slate-950` (dark) hoặc `bg-slate-50` (light)
- Toàn bộ component dùng NativeWind dark variant: `dark:bg-slate-800`, `dark:text-white`...

---

## Các vấn đề thường gặp

### App không kết nối được API khi test trên thiết bị thật

- Đổi `EXPO_PUBLIC_API_BASE_URL` thành IP LAN của máy tính (ví dụ: `http://192.168.1.100:3000`)
- Thiết bị và máy tính phải cùng mạng WiFi
- Kiểm tra firewall không chặn port 3000

### Android Emulator không vào được `localhost`

Dùng `http://10.0.2.2:3000` thay vì `localhost` – đây là địa chỉ đặc biệt của Android Emulator trỏ về máy host.

### Lỗi `Metro bundler` khi start

```bash
# Xóa cache và khởi động lại
npx expo start --clear
```

### Lỗi `NativeWind styles không apply`

```bash
# Đảm bảo đã import global.css trong App.tsx
import './global.css';
```

### TypeScript lỗi sau khi thêm package

```bash
npm install
npm run lint
```

### Token hết hạn / bị logout bất ngờ

- Mở DevTools (Flipper hoặc Expo Dev Tools) → xem Network tab
- Kiểm tra response 401 từ server
- Thử xóa app và cài lại để clear AsyncStorage

### Test nhanh không cần màn Login

Dán JWT token hợp lệ vào `.env`:
```env
EXPO_PUBLIC_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Sau đó restart Metro bundler. Xóa giá trị này trước khi commit.
