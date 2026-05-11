# FintechApp — Frontend Web

Giao diện web cho ứng dụng quản lý tài chính cá nhân. Xây dựng bằng **React 18 + TypeScript + Vite**.

## Tech stack

- **Zustand** — global state (auth, user session)
- **TanStack React Query** — data fetching & caching
- **Tailwind CSS** — styling
- **Recharts** — biểu đồ analytics
- **React Router** — điều hướng
- **Axios** — HTTP client với JWT interceptor

## Chạy local

Xem hướng dẫn chi tiết trong [RUN_FRONTEND.md](./RUN_FRONTEND.md).

```bash
cd fe
npm install
cp .env.example .env   # điền VITE_API_BASE_URL
npm run dev
```
