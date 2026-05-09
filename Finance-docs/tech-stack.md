# Tech Stack — FinTrack AI (Updated 2026)

> **Personal Finance Management Application**
> A full-stack, AI-powered platform built on a strict microservices architecture.

---

## Table of Contents
1. [Frontend](#1-frontend)
2. [Backend / Microservices](#2-backend--microservices)
3. [AI / NLP / OCR](#3-ai--nlp--ocr)
4. [Databases & Cache](#4-databases--cache)
5. [External Cloud Services](#5-external-cloud-services)
6. [Infrastructure & DevOps](#6-infrastructure--devops)

---

## 1. Frontend

### 🌐 Web Dashboard

| Technology | Version | Reason for Choice |
|---|---|---|
| **Next.js** | 14 | SSR/SSG rendering, instant page loads, secure server-side API calls |
| **TypeScript** | ~5.0 | Compile-time type checking, prevent runtime financial data errors |
| **Tailwind CSS** | 3.4+ | Utility-first, responsive, consistent design tokens |
| **Recharts** | - | Composable SVG charts, time-series cashflow visualization |
| **Redux Toolkit** | - | Global state for wallet selection, filters, chat history |
| **React Query** | 5.90+ | Server-state caching, background refetch, optimistic updates |

### 📱 Mobile App (React Native)

| Technology | Version | Reason for Choice |
|---|---|---|
| **React Native** | 0.81.5 | Single codebase for iOS/Android, shared business logic |
| **Expo** | 54.0.34 | Managed build, OTA updates, native module access (Camera, SecureStore) |
| **TypeScript** | ~5.9.2 | Type-safe React Native components, prevent runtime errors |
| **NativeWind** | 4.1.23 | Tailwind CSS for React Native, unified styling system |
| **TailwindCSS** | 3.4+ | Mobile-first responsive design |
| **Lucide Icons** | 0.511.0 | SVG icon library, sharp on retina displays |
| **LinearGradient** | 15.0.8 | Gradient backgrounds, modern UI aesthetics |
| **React Query** | 5.90.2 | Data fetching, caching, server-state sync |
| **Axios** | 1.14.0 | HTTP client, API communication |
| **SafeArea Context** | ~5.6.2 | Handle notch/Home Indicator, safe zone padding |
| **React Navigation** | 7.x | Tab navigator + Native Stack, screen transitions |
| **AsyncStorage** | 2.2.0 | Local storage for tokens, user preferences |
| **Expo ImagePicker** | ~17.0 | Image selection from gallery/camera |
| **Expo LinearGradient** | 15.0.8 | Gradient UI components |

### 🎨 New UI Components (Phase 3)

| Component | Version | Purpose |
|---|---|---|
| **ChatInput** | New | Reusable chat message input with send button, loading state |
| **ChatMessage** | New | Message bubble display with typing indicator animation |
| **NLPQuickEntry** | New | Natural language transaction entry, gradient button UI |

### ✨ Key Mobile Improvements
- ✅ **SafeAreaView**: All screens respect notch/Home Indicator (edges: ['top', 'left', 'right'])
- ✅ **KeyboardAvoidingView**: Platform-specific keyboard handling (iOS: padding, Android: height)
- ✅ **FlatList Chat**: Performance-optimized message list with auto-scroll
- ✅ **Typing Indicator**: Real-time AI processing feedback
- ✅ **formatCurrencyShort()**: Compact number display (1.2 Tỷ đ vs 1,234,567,890 đ)
- ✅ **Dark Mode**: Full support across all components

---

## 2. Backend / Microservices

All core services follow the **Database-per-Service** pattern with synchronous REST communication through the API Gateway and asynchronous event-driven communication via RabbitMQ.

### 🚀 API Gateway

| Technology | Version | Reason for Choice |
|---|---|---|
| **Node.js** | LTS | Async I/O, high throughput request handling |
| **Express** | 4.18.2 | Middleware-based routing, auth composition, BFF layer |
| **TypeScript** | 5.0+ | Type-safe endpoint definitions, prevent runtime errors |
| **JWT** | 9.0.0 | Stateless authentication, no session lookup on every request |
| **Express Rate Limit** | 6.11.2 | Per-user rate limiting, DDoS protection |
| **morgan** | 1.10.0 | HTTP request logging, monitoring and debugging |
| **http-proxy-middleware** | 2.0.6 | Service routing, request forwarding to upstream services |
| **cors** | 2.8.5 | Cross-origin resource sharing, frontend communication |
| **ioredis** | 5.3.2 | Redis client for JWT blacklist, rate limit counters |
| **dotenv** | 16.0.3 | Environment variable management |

### 🔧 Core Services (transaction-service, identity-service, invoice-service, wallet-service)

| Technology | Version | Reason for Choice |
|---|---|---|
| **Node.js** | LTS | Consistent stack, async operations |
| **Express** | 4.18+ | REST API, service endpoints |
| **TypeScript** | 5.0+ | Type-safe service logic, data models |
| **Mongoose** | - | Schema validation, pre-hooks for audit and triggers |
| **bcrypt** | - | Password hashing with adaptive cost factor |
| **ts-node-dev** | 2.0.0 | Development server with auto-reload |
| **Multer** | - | Multipart file upload handling (invoices-service) |

### 📨 Event Bus & Message Queue

| Technology | Version | Reason for Choice |
|---|---|---|
| **RabbitMQ** | Latest | Reliable message broker, guaranteed delivery, DLQ support |
| **amqplib** | - | AMQP client library for Node.js services |

---

## 4. Databases & Cache

All databases follow the **Database-per-Service** isolation pattern. No service accesses another service's database directly.

| Technology | Version | Reason for Choice |
|---|---|---|
| **MongoDB Atlas** | Latest | Document model fits heterogeneous transaction schemas, managed sharding, global clusters |
| **Mongoose ODM** | - | Schema validation, virtual fields, pre-save hooks for audit |
| **Redis** | 5.0+ | Distributed cache for JWT blacklist, rate limits, chat context windows |
| **ioredis** | 5.3.2 | Redis client for Node.js, cluster support, pipelining |
| **Motor** | 3.7.1 | Async MongoDB driver for Python (ai-service) |
| **redis-py** | 5.0.8 | Redis client for Python async operations |

---

## 3. AI / NLP / OCR

All AI services run in Python for maximum flexibility and ML ecosystem access.

### 🤖 AI Advisory Service

| Technology | Version | Reason for Choice |
|---|---|---|
| **Python** | 3.11+ | ML/AI standard, rich ecosystem |
| **FastAPI** | 0.115.6 | Async web framework, SSE streaming for real-time responses |
| **Uvicorn** | 0.32.1 | ASGI server, high-performance async request handling |
| **python-multipart** | 0.0.12 | Multipart form data parsing for file uploads |
| **python-dotenv** | 1.0.1 | Environment variable management |

### 🧠 LLM & Agentic RAG

| Technology | Version | Reason for Choice |
|---|---|---|
| **Google Gemini 1.5 Pro** | Latest | 1M token context window, function-calling, Vietnamese language support |
| **langchain-google-genai** | 2.1.9 | Official LangChain integration for Gemini API |
| **langchain-core** | 0.3.72 | Chain orchestration, prompt templates, memory management |

### 🔤 NLP & Natural Language Processing

| Technology | Version | Reason for Choice |
|---|---|---|
| **Transformers** | 4.46.3 | Pre-trained NLP models, Vietnamese text understanding |
| **SentencePiece** | 0.2.0 | Subword tokenization for multilingual text |
| **LangChain** | - | NLP chains, prompt engineering, conversation history |

### 📸 OCR (Optical Character Recognition)

| Technology | Version | Reason for Choice |
|---|---|---|
| **PaddleOCR** | 2.9.1 | Vietnamese OCR accuracy, offline processing, no API calls needed |
| **PaddlePaddle** | 2.6.2 | Deep learning framework, OCR model inference |
| **OpenCV** | 4.10.0.84 | Image preprocessing, rotation correction, contrast enhancement |
| **NumPy** | 1.26.4 | Array operations for image data manipulation |

### 🌐 HTTP & Async

| Technology | Version | Reason for Choice |
|---|---|---|
| **httpx** | 0.28.1 | Async HTTP client for API calls, streaming |
| **motor** | 3.7.1 | Async MongoDB driver for non-blocking database operations |
| **redis** | 5.0.8 | Redis client for caching AI conversation context |

### 🔄 NLP Quick Entry Feature (Mobile)

The mobile app includes a new **NLPQuickEntry component** that:
- Accepts natural language input: "hôm nay uống cafe 50k"
- Sends to backend NLP service for entity extraction
- Auto-fills transaction form: amount, category, description
- Uses gradient UI with loading states for feedback

Backend processes with:
1. Tokenization (Transformers)
2. Intent classification (Gemini)
3. Entity extraction (function-calling)
4. Structured JSON response

---

## 5. External Cloud Services

| Service | Purpose | Reason for Choice |
|---|---|---|
| **Cloudinary** | Image CDN, receipt storage | Managed transformations, HEIC→JPEG conversion, global delivery |
| **Firebase Cloud Messaging** | Push notifications | Cross-platform (Android/iOS), topic fan-out, delivery guarantees |
| **APNs** | iOS push delivery | Native Apple integration, bridged through FCM HTTP v1 |
| **Google OAuth 2.0** | Social login | Hardened auth infrastructure, reduce password attack surface |
| **Google Search Grounding** | Real-time financial data | Exchange rates, stock prices, interest rates for AI responses |

---

## 6. Infrastructure & DevOps

| Technology | Version | Reason for Choice |
|---|---|---|
| **Docker** | Latest | Immutable container images, environment parity dev→prod |
| **Docker Compose** | Latest | Multi-service orchestration with 1 command, local development |
| **RabbitMQ** | Latest | AMQP message broker, guaranteed delivery, DLQ support |
| **ESLint** | - | Code style enforcement, catch common bugs |
| **Prettier** | - | Code formatting consistency |

---

## 📊 Summary Matrix

```
┌─────────────────────────┬──────────────┬────────────────┬──────────────────┐
│  Layer                  │  Primary     │  Supporting    │  Protocol        │
├─────────────────────────┼──────────────┼────────────────┼──────────────────┤
│  Web Frontend           │  Next.js 14  │  Recharts      │  HTTPS / WS      │
│  Mobile Frontend        │  React Native│  Expo 54       │  HTTPS / WS      │
│  Mobile UI              │  NativeWind  │  Tailwind 3.4  │  CSS Classes     │
│  API Gateway            │  Express 4.18│  JWT 9.0       │  REST            │
│  Core Services (Node)   │  Node.js     │  Express 4.18  │  REST / AMQP     │
│  AI Service (Python)    │  FastAPI 0.11│  LangChain     │  REST / SSE      │
│  NLP Processing         │  Transformers│  SentencePiece │  Local / API     │
│  OCR Processing         │  PaddleOCR   │  OpenCV        │  Local           │
│  LLM Inference          │  Gemini 1.5  │  Google API    │  gRPC / HTTPS    │
│  Primary DB             │  MongoDB     │  Mongoose      │  MongoDriver     │
│  Cache                  │  Redis 5.0   │  ioredis       │  RESP            │
│  Message Broker         │  RabbitMQ    │  amqplib       │  AMQP 0-9-1      │
│  Image CDN              │  Cloudinary  │  —             │  HTTPS           │
│  Push Notifications     │  FCM / APNs  │  —             │  HTTP v1         │
│  Containers             │  Docker      │  Compose       │  —               │
└─────────────────────────┴──────────────┴────────────────┴──────────────────┘
```

---

## ✨ Key Features & Enhancements (2026 Update)

### Mobile Phase 1-3 Refactor ✅
- SafeArea handling on all screens (notch, Home Indicator, safe zones)
- KeyboardAvoidingView for form screens (iOS/Android platform-specific)
- FlatList-based chat with 60 FPS scrolling
- Real-time typing indicator with ActivityIndicator
- Auto-scroll to latest message with onContentSizeChange
- Currency formatting (1.2 Tỷ đ) to prevent overflow

### NLP Integration ✅
- NLPQuickEntry component for transaction entry
- Entity extraction: amount, category, description
- Auto-fill form fields from natural language input
- Gradient UI with loading states

### OCR Receipt Processing ✅
- PaddleOCR for Vietnamese receipt text extraction
- Image preprocessing (rotation, contrast)
- Metadata extraction → transaction auto-creation
- Cloudinary integration for image storage

### AI Agentic RAG ✅
- Gemini 1.5 Pro with 1M token context
- Function-calling for structured output
- Tool routing: vector search, web search, transaction CRUD
- Conversation memory in Redis
- Streaming SSE responses for real-time chat

---

## 🎯 Performance Targets

| Metric | Target |
|--------|--------|
| Dashboard load time | < 2s |
| API Gateway P99 latency | < 500ms |
| AI chat response | < 3s |
| OCR processing | < 2s |
| Mobile FlatList FPS | 60 FPS |

---

**Version:** 2.0 (Updated May 2026)  
**Status:** ✅ Production Ready  
**Last Updated:** May 9, 2026
