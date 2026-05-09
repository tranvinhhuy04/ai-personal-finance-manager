# Tech Stack — FinTrack AI (Cập nhật 2026)

> **Ứng dụng Quản lý Tài chính Cá nhân**
> Nền tảng đầy đủ được trao quyền bởi AI, xây dựng trên kiến trúc microservices

---

## Mục Lục

1. [Frontend](#1-frontend)
2. [Backend / Microservices](#2-backend--microservices)
3. [AI &amp; NLP &amp; OCR](#3-ai--nlp--ocr)
4. [Cơ Sở Dữ Liệu &amp; Cache](#4-cơ-sở-dữ-liệu--cache)
5. [Dịch Vụ Cloud Bên Ngoài](#5-dịch-vụ-cloud-bên-ngoài)
6. [Hạ Tầng &amp; DevOps](#6-hạ-tầng--devops)

---

## 1. Frontend

### 📱 Web Dashboard

| Công Nghệ             | Phiên Bản | Lý Do Chọn                                                           |
| ----------------------- | ----------- | ---------------------------------------------------------------------- |
| **Next.js**       | 14          | Hỗ trợ SSR/SSG, tải nhanh và gọi API an toàn từ phía máy chủ |
| **TypeScript**    | ~5.0        | Bắt lỗi khi biên dịch, giảm sai sót dữ liệu tài chính        |
| **Tailwind CSS**  | 3.4+        | Viết giao diện nhanh, dễ responsive, đồng bộ thiết kế          |
| **Recharts**      | -           | Biểu đồ SVG, khai báo, phù hợp với dữ liệu chuỗi thời gian  |
| **Redux Toolkit** | -           | Quản lý trạng thái toàn cục cho ví, bộ lọc, lịch sử chat    |
| **React Query**   | 5.90+       | Lưu đệm dữ liệu máy chủ, tự làm mới, cập nhật lạc quan    |

### 📱 Mobile App (React Native)

| Công Nghệ                | Phiên Bản | Lý Do Chọn                                                          |
| -------------------------- | ----------- | --------------------------------------------------------------------- |
| **React Native**     | 0.81.5      | Codebase duy nhất cho iOS/Android, chia sẻ logic                    |
| **Expo**             | 54.0.34     | Quản lý build, cập nhật OTA, truy cập module native thuận tiện |
| **TypeScript**       | ~5.9        | An toàn kiểu dữ liệu, hạn chế lỗi khi chạy                    |
| **NativeWind**       | 4.1.23      | Dùng cú pháp Tailwind trên React Native, giao diện đồng nhất  |
| **TailwindCSS**      | 3.4+        | Thiết kế ưu tiên di động, responsive tốt                       |
| **Lucide Icons**     | 0.511.0     | Bộ biểu tượng SVG rõ nét, nhẹ                                  |
| **LinearGradient**   | 15.0.8      | Tạo nền chuyển màu cho giao diện hiện đại                     |
| **React Query**      | 5.90.2      | Lấy dữ liệu, lưu đệm và đồng bộ trạng thái máy chủ      |
| **Axios**            | 1.14.0      | Thư viện gọi API HTTP ổn định, dễ dùng                        |
| **SafeArea Context** | ~5.6.2      | Xử lý notch/Home Indicator, safe zone                               |
| **React Navigation** | 7.x         | Điều hướng Tab và Stack mượt mà                               |
| **AsyncStorage**     | 2.2.0       | Lưu cục bộ token và tuỳ chọn người dùng                      |
| **Expo ImagePicker** | ~17.0       | Chọn ảnh từ thư viện hoặc camera                                |

### 🎨 UI Components (New)

| Công Nghệ             | Mục Đích             | Lý Do Chọn                                                   |
| ----------------------- | ----------------------- | -------------------------------------------------------------- |
| **ChatInput**     | Input chat message      | Tái sử dụng tốt, có trạng thái tải, hỗ trợ dark mode |
| **ChatMessage**   | Display message bubbles | Bong bóng chat theo vai trò, có hiệu ứng đang nhập      |
| **NLPQuickEntry** | NLP transaction input   | Nhập nhanh bằng ngôn ngữ tự nhiên, phản hồi trực quan |

---

## 2. Backend / Microservices

Kiến trúc: **Database-per-Service** + REST sync + RabbitMQ async

### API Gateway

| Công Nghệ                     | Phiên Bản | Lý Do Chọn                                               |
| ------------------------------- | ----------- | ---------------------------------------------------------- |
| **Node.js**               | -           | Xử lý bất đồng bộ tốt, chịu tải cao               |
| **Express**               | 4.18+       | Dễ tổ chức middleware, route và xác thực             |
| **TypeScript**            | 5.0+        | An toàn kiểu dữ liệu cho định nghĩa API             |
| **JWT**                   | 9.0.0       | Xác thực không trạng thái, giảm truy vấn phiên     |
| **Express Rate Limit**    | 6.11+       | Giới hạn tốc độ theo người dùng, chống lạm dụng |
| **Morgan**                | 1.10+       | Ghi log request để theo dõi và debug                   |
| **HTTP Proxy Middleware** | 2.0+        | Chuyển tiếp request tới đúng service                  |

### Core Services (transaction, wallet, identity, invoice)

| Công Nghệ           | Phiên Bản | Lý Do Chọn                                                            |
| --------------------- | ----------- | ----------------------------------------------------------------------- |
| **Node.js**     | -           | Đồng bộ công nghệ giữa các service, xử lý bất đồng bộ tốt |
| **Express**     | 4.18+       | Xây REST API nhanh, dễ mở rộng middleware                           |
| **TypeScript**  | 5.0+        | Logic service rõ ràng, giảm lỗi runtime                             |
| **Mongoose**    | -           | Ràng buộc schema và hook trước/sau khi lưu                        |
| **Bcrypt**      | -           | Băm mật khẩu an toàn, có thể tăng độ khó theo thời gian      |
| **dotenv**      | 16.0+       | Quản lý biến môi trường theo từng môi trường chạy            |
| **ts-node-dev** | 2.0+        | Tự động reload khi phát triển, tăng tốc vòng lặp dev           |

### Event Bus & Queue

| Công Nghệ        | Phiên Bản | Lý Do Chọn                                          |
| ------------------ | ----------- | ----------------------------------------------------- |
| **RabbitMQ** | -           | Hàng đợi tin nhắn tin cậy, hỗ trợ DLQ khi lỗi |
| **amqplib**  | -           | Thư viện kết nối RabbitMQ cho Node.js             |

---

## 3. AI / NLP / OCR

### 🤖 AI Advisory Service

| Công Nghệ       | Phiên Bản | Lý Do Chọn                                              |
| ----------------- | ----------- | --------------------------------------------------------- |
| **Python**  | 3.11+       | Hệ sinh thái AI/ML phong phú, thư viện mạnh         |
|                   | 0.115.6     | Framework API bất đồng bộ, hỗ trợ stream phản hồi |
| **Uvicorn** | 0.32.1      | ASGI server nhẹ, hiệu năng cao                         |

### 🧠 LLM & Reasoning

| Công Nghệ                      | Phiên Bản | Lý Do Chọn                                             |
| -------------------------------- | ----------- | -------------------------------------------------------- |
| **Google Gemini 1.5 Pro**  | -           | Ngữ cảnh lớn, gọi hàm tốt, hiểu tiếng Việt tốt |
| **LangChain-Google-GenAI** | 2.1.9       | Tích hợp Gemini nhanh cho luồng agent                 |
| **LangChain-Core**         | 0.3.72      | Điều phối chuỗi xử lý và quản lý hội thoại    |

### 🔤 NLP & Embedding

| Công Nghệ             | Phiên Bản | Lý Do Chọn                                          |
| ----------------------- | ----------- | ----------------------------------------------------- |
| **Transformers**  | 4.46.3      | Dùng mô hình NLP dựng sẵn, hỗ trợ tiếng Việt |
| **SentencePiece** | 0.2.0       | Tách từ ổn định cho văn bản đa ngôn ngữ     |
| **Langchain**     | -           | Xây chuỗi NLP, mẫu prompt và bộ nhớ hội thoại |

### 📸 OCR (Receipt Extraction)

| Công Nghệ            | Phiên Bản | Lý Do Chọn                                               |
| ---------------------- | ----------- | ---------------------------------------------------------- |
| **PaddleOCR**    | 2.9.1       | OCR tiếng Việt tốt, chạy offline, độ chính xác cao |
| **PaddlePaddle** | 2.6.2       | Nền tảng học sâu để chạy mô hình OCR              |
| **OpenCV**       | 4.10.0      | Tiền xử lý ảnh trước khi OCR                         |
| **NumPy**        | 1.26.4      | Xử lý mảng dữ liệu ảnh nhanh                         |

### 📡 HTTP & Async

| Công Nghệ                | Phiên Bản | Lý Do Chọn                                    |
| -------------------------- | ----------- | ----------------------------------------------- |
| **httpx**            | 0.28.1      | Gọi HTTP bất đồng bộ, phù hợp service AI |
| **python-multipart** | 0.0.12      | Xử lý form-data và tải tệp                 |

---

## 4. Cơ Sở Dữ Liệu & Cache

| Công Nghệ             | Phiên Bản | Lý Do Chọn                                                 |
| ----------------------- | ----------- | ------------------------------------------------------------ |
| **MongoDB Atlas** | -           | Mô hình tài liệu linh hoạt, dịch vụ quản trị sẵn   |
| **Mongoose**      | -           | ODM mạnh, kiểm tra schema rõ ràng                        |
| **Redis**         | 5.0+        | Bộ nhớ đệm phân tán cho token và giới hạn tốc độ |
| **Motor**         | 3.7.1       | Trình điều khiển MongoDB bất đồng bộ cho Python      |
| **ioredis**       | 5.3.2       | Client Redis ổn định cho Node.js, hỗ trợ cụm           |

---

## 5. Dịch Vụ Cloud Bên Ngoài

| Dịch Vụ                          | Mục Đích                | Lý Do Chọn                                                      |
| ---------------------------------- | -------------------------- | ----------------------------------------------------------------- |
| **Cloudinary**               | Image CDN, receipt storage | Lưu ảnh hoá đơn, biến đổi ảnh và phân phối toàn cầu |
| **Firebase Cloud Messaging** | Push notifications         | Gửi thông báo đẩy đa nền tảng, mở rộng theo topic       |
| **Google OAuth 2.0**         | Social login               | Đăng nhập nhanh, giảm rủi ro quản lý mật khẩu            |
| **Google Search Grounding**  | Real-time financial data   | Bổ sung dữ liệu tài chính thời gian thực cho AI            |

---

## 6. Hạ Tầng & DevOps

| Công Nghệ                 | Mục Đích         | Lý Do Chọn                                                     |
| --------------------------- | ------------------- | ---------------------------------------------------------------- |
| **Docker**            | Containerization    | Đồng nhất môi trường dev/prod, đóng gói triển khai dễ |
| **Docker Compose**    | Local orchestration | Khởi chạy nhiều service nhanh bằng một lệnh                |
| **ESLint + Prettier** | Code quality        | Giữ code nhất quán, giảm lỗi cú pháp và định dạng     |

---

## 📊 Bảng Tóm Tắt Tech Stack

```
┌────────────────────────┬───────────────────┬──────────────────┐
│  Tầng                  │  Công Nghệ Chính  │  Protocol        │
├────────────────────────┼───────────────────┼──────────────────┤
│  Web Frontend          │  Next.js 14       │  HTTPS / WS      │
│  Mobile Frontend       │  React Native 81  │  HTTPS / WS      │
│  API Gateway           │  Express 4.18     │  REST            │
│  Core Services (Node)  │  Node.js + TS     │  REST / AMQP     │
│  AI Service (Python)   │  FastAPI 0.115    │  REST / SSE      │
│  LLM                   │  Gemini 1.5 Pro   │  gRPC / HTTPS    │
│  OCR                   │  PaddleOCR 2.9    │  Local           │
│  Primary DB            │  MongoDB Atlas    │  MongoDriver     │
│  Cache                 │  Redis 5.0        │  RESP            │
│  Message Broker        │  RabbitMQ         │  AMQP 0-9-1      │
│  Image CDN             │  Cloudinary       │  HTTPS           │
│  Containers            │  Docker Compose   │  —               │
└────────────────────────┴───────────────────┴──────────────────┘
```

---

## 🎯 Điểm Nổi Bật

### Frontend Mobile (PHASE 1-3 Complete)

✅ SafeArea handling (notch, Home Indicator)
✅ KeyboardAvoidingView (iOS/Android)
✅ FlatList chat (performance optimized)
✅ Real-time typing indicator
✅ NLP quick entry
✅ Dark mode support

### Backend Microservices

✅ Database-per-Service isolation
✅ REST + Event-driven (RabbitMQ)
✅ JWT auth + Rate limiting
✅ Async operations

### AI Layer (Agentic RAG)

✅ Gemini 1.5 Pro + function-calling
✅ Vietnamese NLP (Transformers)
✅ PaddleOCR for receipt extraction
✅ Vector embeddings (semantic search)
✅ Real-time streaming responses

### Infrastructure

✅ Docker containerized
✅ Managed MongoDB/Redis
✅ Local Docker Compose dev setup

---

## 📈 Performance Targets

| Metric                  | Target  |
| ----------------------- | ------- |
| Dashboard initial load  | < 2s    |
| API Gateway P99 latency | < 500ms |
| Chat response time      | < 3s    |
| OCR processing          | < 2s    |
| Mobile FlatList scroll  | 60 FPS  |

---

**Version:** 2.0 (Cập nhật May 2026)
**Status:** ✅ Production Ready
**Last Updated:** May 9, 2026
