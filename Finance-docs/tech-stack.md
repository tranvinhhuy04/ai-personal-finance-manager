# Tech Stack — FinTrack AI

> **Personal Finance Management Application**
> A full-stack, AI-powered platform built on a strict microservices architecture.

---

## Table of Contents
1. [Frontend](#1-frontend)
2. [Backend / Microservices](#2-backend--microservices)
3. [Databases & Cache](#3-databases--cache)
4. [AI & Machine Learning](#4-ai--machine-learning)
5. [External Cloud Services](#5-external-cloud-services)
6. [Infrastructure & DevOps](#6-infrastructure--devops)

---

## 1. Frontend

### Web Dashboard

| Technology | Badge | Architectural Justification |
|---|---|---|
| **Next.js 14** | ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white) | Chosen for its hybrid SSR/SSG rendering model, which enables near-instant initial page loads for the financial dashboard and supports server-side data fetching for secure API calls without exposing credentials to the browser. |
| **TypeScript** | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) | Enforced across all layers to catch type mismatches at compile time — critical for financial data models (amounts, currencies, transaction types) where a runtime type error can cause incorrect ledger entries. |
| **Tailwind CSS** | ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) | Utility-first styling eliminates unused CSS and accelerates building responsive layouts; its design token system ensures a consistent colour palette across charts, badges, and transaction categories. |
| **Recharts** | ![Recharts](https://img.shields.io/badge/Recharts-22B5BF?style=flat-square&logo=react&logoColor=white) | A composable, React-native charting library chosen for its SVG-based rendering (crisp on retina displays) and its declarative API, which maps cleanly to time-series cashflow and budget-vs-actual data from the analytics endpoints. |
| **Redux Toolkit** | ![Redux](https://img.shields.io/badge/Redux_Toolkit-764ABC?style=flat-square&logo=redux&logoColor=white) | Provides predictable global state management for wallet selection, category filters, and chat history — essential when multiple components across the dashboard react to the same user context (active wallet, date range). |
| **React Query (TanStack)** | ![React Query](https://img.shields.io/badge/React_Query-FF4154?style=flat-square&logo=reactquery&logoColor=white) | Manages all server-state caching, background refetching, and optimistic updates for transaction lists and budget data, removing the need to hand-roll async fetch logic inside Redux. |

### Mobile App

| Technology | Badge | Architectural Justification |
|---|---|---|
| **React Native** | ![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat-square&logo=react&logoColor=61DAFB) | A single TypeScript codebase targeting both iOS and Android, sharing business logic and design primitives with the web frontend — reducing maintenance overhead for a solo/small team delivering cross-platform finance features. |
| **Expo** | ![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white) | Provides managed build pipelines, OTA updates, and native module access (Camera for receipt capture, SecureStore for token storage) without requiring a native Xcode/Android Studio build environment for every change. |
| **Expo Camera** | ![Expo](https://img.shields.io/badge/Expo_Camera-000020?style=flat-square&logo=expo&logoColor=white) | Used for in-app receipt capture that feeds directly to the `invoice-service` pipeline — providing a native, hardware-accelerated camera experience without third-party SDKs. |

---

## 2. Backend / Microservices

All core services follow the **Database-per-Service** pattern with synchronous REST communication through the API Gateway and asynchronous event-driven communication via RabbitMQ.

### API Gateway

| Technology | Badge | Architectural Justification |
|---|---|---|
| **Node.js / Express** | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white) | Acts as the single entry point: performs JWT verification, per-user rate limiting, and request proxying to upstream services. Express's middleware model makes it straightforward to compose auth, CORS, and BFF (Backend-for-Frontend) transformation layers. |
| **JWT (JSON Web Tokens)** | ![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=json-web-tokens&logoColor=white) | Stateless authentication tokens allow the gateway to verify identity without a round-trip to `identity-service` on every request, keeping P99 latency low across high-frequency transaction lookups. |

### identity-service

| Technology | Badge | Architectural Justification |
|---|---|---|
| **Node.js / TypeScript** | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white) | Handles user registration, OAuth, session management, AI quota enforcement, and third-party API key storage. TypeScript's strict null checks prevent unintentional null quota values from granting unlimited AI usage. |
| **bcrypt** | ![Security](https://img.shields.io/badge/bcrypt-red?style=flat-square) | Industry-standard adaptive hashing algorithm used for password storage; the configurable cost factor allows the work factor to be increased as hardware improves without requiring a password migration. |

### transaction-service

| Technology | Badge | Architectural Justification |
|---|---|---|
| **Node.js / TypeScript** | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white) | Core financial data service managing wallets, income/expense records, recurring transactions, and cashflow analytics. The async I/O model efficiently serves concurrent balance recalculation requests without blocking threads. |

### invoice-service

| Technology | Badge | Architectural Justification |
|---|---|---|
| **Node.js / TypeScript** | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white) | Orchestrates the receipt ingestion pipeline: accepts multipart uploads, extracts metadata via AI, stores raw images to Cloudinary, and publishes transaction-creation events. Separating this from `transaction-service` ensures receipt processing spikes do not degrade transaction query performance. |
| **Multer** | ![Node.js](https://img.shields.io/badge/Multer-339933?style=flat-square&logo=node.js&logoColor=white) | Handles multipart/form-data file uploads with configurable size limits and MIME-type filtering, preventing oversized or malicious files from reaching the processing pipeline. |

### ai-advisor-service

| Technology | Badge | Architectural Justification |
|---|---|---|
| **Python 3.11** | ![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white) | The de-facto language for ML/AI tooling; chosen to leverage the Google Generative AI Python SDK directly, enabling tight integration with Gemini's function-calling and embedding APIs without a thin translation layer. |
| **FastAPI** | ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white) | Async-native Python web framework that handles concurrent streaming SSE responses to the frontend chat without blocking the event loop — crucial for real-time AI advisory responses. |
| **LangChain** | ![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=flat-square) | Provides the Agentic RAG orchestration layer: tool routing, conversation memory, retrieval chains, and the agent executor loop that decides whether to query the vector store, call the Gemini API, or invoke the Search Grounding tool. |

---

## 3. Databases & Cache

All databases follow the **Database-per-Service** isolation pattern. No service accesses another service's database directly.

| Technology | Badge | Architectural Justification |
|---|---|---|
| **MongoDB Atlas** | ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white) | Document model fits naturally with heterogeneous financial transaction schemas (expenses, income, recurring, and transfer entries each have different fields). Atlas's managed sharding and global clusters support future geographic expansion without operational overhead. |
| **Mongoose ODM** | ![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat-square&logo=mongoose&logoColor=white) | Schema validation at the application layer prevents malformed financial documents from entering MongoDB; virtual fields and pre-save hooks cleanly handle balance recalculation and audit timestamps. |
| **Redis 7** | ![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white) | Serves as a shared distributed cache for JWT blacklists, rate-limit counters (sliding window), and AI conversation context windows — dramatically reducing repeated MongoDB reads for high-frequency operations like dashboard polling and chat context retrieval. |

---

## 4. AI & Machine Learning

The AI layer implements an **Agentic RAG (Retrieval-Augmented Generation)** architecture in which an LLM agent dynamically decides which tools to invoke based on user intent.

| Technology | Badge | Architectural Justification |
|---|---|---|
| **Google Gemini 1.5 Pro** | ![Google AI](https://img.shields.io/badge/Google_Gemini-4285F4?style=flat-square&logo=google&logoColor=white) | Chosen as the primary LLM for its 1M-token context window (accommodating long transaction histories), native function-calling for structured JSON extraction from chat logs, and best-in-class accuracy parsing Vietnamese and English financial terminology. |
| **Google Search Grounding** | ![Google](https://img.shields.io/badge/Google_Search_Grounding-34A853?style=flat-square&logo=google&logoColor=white) | A native Gemini capability that anchors AI responses to real-time web data — enabling grounded financial advice (current exchange rates, stock prices, interest rates) without building a separate retrieval pipeline. |
| **Agentic RAG Pattern** | ![LangChain](https://img.shields.io/badge/Agentic_RAG-1C3C3C?style=flat-square) | The agent maintains a tool registry (vector search, Gemini inference, Search Grounding, transaction CRUD) and autonomously selects the correct tool chain per query — enabling the system to answer "What did I spend on food last month?" and "What is today's USD/VND rate?" with the same interface. |
| **Vector Embeddings** | ![Google AI](https://img.shields.io/badge/text--embedding--004-4285F4?style=flat-square&logo=google&logoColor=white) | User financial histories and advice articles are embedded using Google's `text-embedding-004` model and stored in MongoDB Atlas Vector Search, enabling semantic retrieval of relevant context before LLM generation. |

---

## 5. External Cloud Services

| Service | Badge | Architectural Justification |
|---|---|---|
| **Cloudinary** | ![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white) | Manages receipt image storage, on-the-fly transformations (thumbnail generation, HEIC→JPEG conversion), and CDN delivery — offloading binary asset management entirely from `invoice-service` and removing the need to provision an S3 bucket with custom CDN configuration. |
| **Firebase Cloud Messaging (FCM)** | ![Firebase](https://img.shields.io/badge/FCM-FFCA28?style=flat-square&logo=firebase&logoColor=black) | Provides a unified push notification channel for Android and iOS with delivery guarantees, topic-based fan-out (budget alerts, payment reminders), and analytics — without maintaining a self-hosted notification infrastructure. |
| **APNs (Apple Push Notification service)** | ![Apple](https://img.shields.io/badge/APNs-000000?style=flat-square&logo=apple&logoColor=white) | Required for native iOS push delivery; bridged through FCM's HTTP v1 API to avoid managing a second SDK while retaining Apple-specific delivery semantics. |
| **Google OAuth 2.0** | ![Google](https://img.shields.io/badge/Google_OAuth-4285F4?style=flat-square&logo=google&logoColor=white) | Delegates identity verification to Google's hardened auth infrastructure for social login, reducing password management attack surface and improving user onboarding conversion. |

---

## 6. Infrastructure & DevOps

| Technology | Badge | Architectural Justification |
|---|---|---|
| **Docker** | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) | Each microservice ships as an immutable container image, ensuring environment parity between local development and production and eliminating "works on my machine" dependency drift. |
| **Docker Compose** | ![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=flat-square&logo=docker&logoColor=white) | Orchestrates the full multi-service stack (8+ containers) with a single `docker compose up` command, defining service dependencies, health checks, shared networks, and environment injection — ideal for the development and staging lifecycle. |
| **RabbitMQ** | ![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat-square&logo=rabbitmq&logoColor=white) | AMQP message broker enabling reliable, decoupled asynchronous communication between services (e.g., `transaction.created` → AI context update, `invoice.processed` → transaction auto-creation). Dead-letter queues provide failure isolation without data loss. |
| **MongoDB Atlas** | ![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white) | Fully managed cloud database eliminates DBA overhead for backups, patching, and scaling; automated daily snapshots and point-in-time restore satisfy financial data durability requirements. |
| **ESLint + Prettier** | ![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white) | Enforces code style and catches common bugs across all TypeScript services in the monorepo; consistent formatting reduces cognitive load when switching between services. |

---

## Summary Matrix

```
┌─────────────────────────┬──────────────┬────────────────┬──────────────────┐
│  Layer                  │  Primary     │  Supporting    │  Protocol        │
├─────────────────────────┼──────────────┼────────────────┼──────────────────┤
│  Web Frontend           │  Next.js 14  │  Recharts      │  HTTPS / WS      │
│  Mobile Frontend        │  React Native│  Expo          │  HTTPS / WS      │
│  API Gateway            │  Express     │  JWT, Nginx    │  REST            │
│  Core Services          │  Node.js/TS  │  Mongoose      │  REST / AMQP     │
│  AI Service             │  Python/FA   │  LangChain     │  REST / SSE      │
│  Primary DB             │  MongoDB     │  Atlas         │  MongoDriver     │
│  Cache                  │  Redis 7     │  ioredis       │  RESP            │
│  Message Broker         │  RabbitMQ    │  amqplib       │  AMQP 0-9-1      │
│  AI Inference           │  Gemini 1.5  │  Embeddings    │  gRPC / HTTPS    │
│  Image CDN              │  Cloudinary  │  —             │  HTTPS           │
│  Push Notifications     │  FCM / APNs  │  —             │  HTTP v1         │
│  Containers             │  Docker      │  Compose       │  —               │
└─────────────────────────┴──────────────┴────────────────┴──────────────────┘
```
