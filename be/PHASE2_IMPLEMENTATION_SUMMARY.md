# Phase 2 Implementation Summary - Wallet Service & Transaction Service

**Status**: ✅ Complete - Ready for Integration Testing

---

## 📋 Executive Summary

Đã triển khai hoàn chỉnh mã số cho **Phase 2 (Lõi Tài chính)** của dự án OripioFin với:
- ✅ **Wallet Service**: CRUD wallets + Optimistic locking
- ✅ **Transaction Service**: CRUD transactions + Outbox Pattern
- ✅ **Event-driven Architecture**: SAGA pattern orchestration
- ✅ **RabbitMQ Integration**: Reliable message delivery
- ✅ **MongoDB Setup**: Database-per-service pattern

---

## 🏗️ Architecture Delivered

### Services

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌─────────────────┐        ┌──────────────────────┐            │
│  │  API Gateway    │        │  Service Identity    │ (existing) │
│  │  (Port 3000)    │◄──────►│  (Port 3001)         │            │
│  └────────┬────────┘        └──────────────────────┘            │
│           │                                                      │
│     ┌─────┴──────┬──────────────┐                               │
│     │            │              │                               │
│  ┌──▼─────────┐ ┌▼─────────────┐│ ┌──────────────────┐          │
│  │  Wallet    │ │ Transaction  ││ │   RabbitMQ       │          │
│  │ Service    │ │ Service      ││ │ (Message Broker) │          │
│  │ (3002)     │ │ (3003)       ││ │ (Port 5672)      │          │
│  └──┬────────┘ └┬──────────────┘│ └──────────────────┘          │
│     │           │              │         ▲  ▲                  │
│     └───────────┼──────────────┼─────────┘  │                  │
│                 │              │            │                  │
│                 └──────────────┴────────────┘                  │
│                                                                  │
│               ┌────────────────────────────┐                   │
│               │   MongoDB Atlas            │                   │
│               │  (Database per Service)    │                   │
│               │                            │                   │
│               ├─ wallet-service           │                   │
│               │  └─ wallets               │                   │
│               │                            │                   │
│               ├─ transaction-service      │                   │
│               │  ├─ transactions          │                   │
│               │  ├─ categories            │                   │
│               │  └─ outboxevents          │                   │
│               │                            │                   │
│               └────────────────────────────┘                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Event Flow (SAGA Orchestration)

```
User Create Transaction
  ↓
Transaction Service:
  • Create transaction (PENDING)
  • Create Outbox event
  • Return user (status: PENDING)
  ↓
Outbox Publisher (5s polling):
  • Find unpublished events
  • Publish to RabbitMQ
  • Mark as published
  ↓
Wallet Service Consumer:
  • Receive TransactionCreated
  • Update balance (Optimistic Locking)
  • Publish WalletBalanceUpdated or Failed
  ↓
Transaction Consumer:
  • Receive wallet response
  • Update transaction (COMPLETED/FAILED)
  • Trigger compensation if failed
```

---

## 📦 Deliverables

### Wallet Service Structure

```
service-wallet/
├── app.ts                      # Main application
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── Dockerfile                 # Docker build config
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── README.md                  # Service documentation
├── config/
│   ├── db.ts                 # MongoDB connection
│   └── rabbitmq.ts           # RabbitMQ setup
├── src/
│   ├── models/
│   │   └── Wallet.ts         # Wallet schema (with optimistic locking)
│   └── controllers/
│       └── walletController.ts # HTTP handlers
├── services/
│   └── WalletService.ts      # Business logic
├── repositories/
│   └── WalletRepository.ts   # Data access layer
├── routes/
│   └── index.ts              # Express routes
├── middlewares/
│   └── requireAuth.ts        # JWT authentication
└── utils/
    └── WalletConsumer.ts     # RabbitMQ message consumer
```

**Key Features:**
- ✅ Optimistic Locking (version field)
- ✅ RabbitMQ Consumer for TransactionCreated events
- ✅ Publishes WalletBalanceUpdated/Failed events
- ✅ Balance validation (>= 0)
- ✅ Spending limit enforcement

### Transaction Service Structure

```
service-transaction/
├── app.ts                      # Main application
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── Dockerfile                 # Docker build config
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── README.md                  # Service documentation
├── config/
│   ├── db.ts                 # MongoDB connection
│   └── rabbitmq.ts           # RabbitMQ setup
├── src/
│   ├── models/
│   │   ├── Category.ts       # Category schema
│   │   ├── Transaction.ts    # Transaction schema
│   │   └── Outbox.ts         # Outbox event schema
│   └── controllers/
│       └── transactionController.ts # HTTP handlers
├── services/
│   ├── TransactionService.ts # Business logic
│   └── OutboxPublisher.ts    # Outbox polling & publishing
├── repositories/
│   └── TransactionRepository.ts # Data access
├── routes/
│   └── index.ts              # Express routes
├── middlewares/
│   └── requireAuth.ts        # JWT authentication
└── events/
    └── TransactionConsumer.ts # RabbitMQ consumer
```

**Key Features:**
- ✅ Outbox Pattern (reliable event publishing)
- ✅ Idempotency key (prevents duplicate writes)
- ✅ SAGA pattern orchestration
- ✅ RabbitMQ Publisher (5s polling)
- ✅ RabbitMQ Consumer (handles wallet responses)
- ✅ Compensation logic (SAGA failure handling)

---

## 🗄️ Database Schemas

### Wallet Collection

```typescript
{
  _id: ObjectId,
  userId: String,              // indexed
  walletType: 'CARD|MOMO|ZALOPAY|CASH',
  walletName: String,
  balance: Decimal,            // >= 0
  spendingLimit: Decimal|null, // > 0 or null
  status: 1|0|2,              // indexed
  version: Number,             // optimistic locking
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- userId, status compound
- walletType
```

### Transaction Collection

```typescript
{
  _id: ObjectId,
  walletId: String,            // indexed
  userId: String,              // indexed
  categoryId: String,
  transactionType: 'INCOME|EXPENSE',
  amount: Decimal,
  currency: String,            // default VND
  status: 'PENDING|COMPLETED|FAILED|REVERSED', // indexed
  description: String,
  occurredAt: Date,
  idempotencyKey: String,      // unique
  createdAt: Date
}

Indexes:
- userId, occurredAt DESC
- walletId, occurredAt DESC
- status
- idempotencyKey (unique)
```

### Category Collection

```typescript
{
  _id: ObjectId,
  userId: String,              // indexed
  name: String,
  categoryType: 'INCOME|EXPENSE',
  parentId: String|null,       // for sub-categories
  isSystem: Boolean,
  status: 1|0,
  createdAt: Date
}
```

### Outbox Event Collection

```typescript
{
  _id: ObjectId,
  eventType: String,           // TransactionCreated
  aggregateType: String,       // TRANSACTION
  aggregateId: String,         // transactionId
  payload: Object,
  published: Boolean,          // indexed
  publishedAt: Date|null,
  createdAt: Date              // indexed
}

Index: published, createdAt compound
```

---

## 🔌 API Endpoints

### Wallet Service (`POST /api/v1/wallets`)

```bash
POST /api/v1/wallets
Authorization: Bearer <token>

{
  "walletType": "CARD",
  "walletName": "My Card",
  "spendingLimit": "5000000"
}

Response (201):
{
  "id": "...",
  "balance": "0",
  "status": 1,
  "version": 0,
  ...
}
```

**All Wallet Endpoints:**
- `POST /api/v1/wallets` - Create
- `GET /api/v1/wallets` - List user's wallets
- `GET /api/v1/wallets/:walletId` - Get by ID
- `PATCH /api/v1/wallets/:walletId/status` - Update status
- `PATCH /api/v1/wallets/:walletId/spending-limit` - Update limit

### Transaction Service

**All Transaction Endpoints:**
- `POST /api/v1/categories` - Create category
- `GET /api/v1/categories` - List categories
- `POST /api/v1/transactions` - Create (returns PENDING status)
- `GET /api/v1/transactions/:transactionId` - Get by ID
- `GET /api/v1/transactions` - List user's transactions
- `GET /api/v1/wallets/:walletId/transactions` - List wallet's transactions

---

## 🔄 RabbitMQ Configuration

### Exchanges (Topic-based)

```
Exercise: wallet.events
  Routing Keys:
  - wallet.balance.updated
  - wallet.balance.update.failed

Exchange: transaction.events
  Routing Keys:
  - transaction.created
```

### Queues

```
Queue: wallet.balance.updates
  Binding: transaction.events:transaction.created
  Consumer: WalletConsumer

Queue: wallet.responses
  Binding: wallet.events:wallet.balance.updated
           wallet.events:wallet.balance.update.failed
  Consumer: TransactionConsumer
```

---

## 🚀 Setup & Running

### Prerequisites

```bash
# Node.js 18+
node --version

# MongoDB 7.0+
# Docker Desktop (recommended for local dev)
docker --version
```

### Quick Start (Docker)

```bash
# From `be/` directory
docker compose up -d

# Verify services up
docker compose ps
  api-gateway       → Port 3000
  service-identity  → Port 3001
  service-wallet    → Port 3002
  service-transaction → Port 3003
  mongo-db          → Port 27017
  rabbitmq          → Port 5672 (AMQP), 15672 (UI)
```

### Local Development (No Docker)

```bash
# Terminal 1: MongoDB
mongod --dbpath=./data

# Terminal 2: RabbitMQ
rabbitmq-server

# Terminal 3: Wallet Service
cd service-wallet
npm install
npm run dev

# Terminal 4: Transaction Service
cd service-transaction
npm install
npm run dev
```

### Configuration

**Wallet Service** (`.env`):
```
PORT=3002
MONGODB_URI=mongodb://admin:admin123@mongo-db:27017/wallet-service?authSource=admin
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
JWT_SECRET=your-jwt-secret
```

**Transaction Service** (`.env`):
```
PORT=3003
MONGODB_URI=mongodb://admin:admin123@mongo-db:27017/transaction-service?authSource=admin
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
JWT_SECRET=your-jwt-secret
```

---

## ✅ Testing Checklist

### Unit Tests

- [x] WalletService.createWallet()
- [x] WalletService.updateBalanceForTransaction() (optimistic locking)
- [x] TransactionService.createTransaction() (outbox)
- [x] TransactionService.handleWalletResponse()
- [x] Validation logic

### Integration Tests (Ready to implement)

- [ ] Create wallet → List wallets
- [ ] Create transaction → Check wallet balance updates
- [ ] Concurrent transactions (optimistic locking)
- [ ] Transaction retry with idempotency key
- [ ] Outbox publisher publishes within 10s
- [ ] Wallet consumer processes correctly
- [ ] Transaction consumer handles success/failure

### End-to-End Test Flow

```bash
# 1. Get auth token
TOKEN=$(curl -X POST http://localhost:3001/api/v1/login ...)

# 2. Create wallet
WALLET_ID=$(curl -X POST http://localhost:3002/api/v1/wallets ...)

# 3. Create category
CATEGORY=$(curl -X POST http://localhost:3003/api/v1/categories ...)

# 4. Create transaction
curl -X POST http://localhost:3003/api/v1/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'

# 5. Wait 10s (Outbox polling + message processing)
sleep 10

# 6. Verify wallet balance updated
curl http://localhost:3002/api/v1/wallets/$WALLET_ID \
  -H "Authorization: Bearer $TOKEN"

# 7. Verify transaction status changed to COMPLETED
curl http://localhost:3003/api/v1/transactions/$TX_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Key Metrics & Monitoring

### Health Checks

```bash
# Wallet Service
curl http://localhost:3002/health
# Response: { "status": "ok", "service": "wallet-service" }

# Transaction Service
curl http://localhost:3003/health
# Response: { "status": "ok", "service": "transaction-service" }

# RabbitMQ Management UI
# http://localhost:15672 (guest/guest)
```

### Logs to Monitor

```
Wallet Service:
  [INFO] Received TransactionCreated event
  [INFO] Wallet balance updated
  [INFO] WalletBalanceUpdated published

Transaction Service:
  [INFO] Transaction created (PENDING)
  [INFO] Outbox event created
  [INFO] Event published
  [INFO] Received WalletBalanceUpdated
  [INFO] Transaction completed
```

---

## 🎯 Known Limitations & Future Work

### Phase 2 Limitations

1. **SAGA Compensation**: Basic logic only - retry and alert
   - TODO: Implement exponential backoff
   - TODO: Dead Letter Queue (DLQ) handling
   - TODO: Admin dashboard for manual review

2. **Optimistic Locking**: Version mismatch retries handled by Transaction Service
   - TODO: Implement client-side retry logic
   - TODO: Exponential backoff for retries

3. **Idempotency**: Supported via idempotencyKey
   - TODO: Add client SDK for automatic key generation
   - TODO: Idempotency cache cleanup (TTL)

4. **Error Messages**: Basic validation errors
   - TODO: i18n support (Vietnamese, English, etc.)
   - TODO: Error code mapping to error messages

### Phase 3 Dependencies (Analytics Service)

- Real-time transaction aggregations
- CQRS with read models
- Event-driven consumption

### Phase 4 Dependencies (AI Service)

- OCR pipeline for invoices
- NLP chatbot for financial questions
- Spending pattern analysis

---

## 📚 Documentation Files

All documentation is located in the `be/` directory:

1. **`PHASE2_ARCHITECTURE.md`** - Comprehensive architecture guide
2. **`service-wallet/README.md`** - Wallet Service detailed guide
3. **`service-transaction/README.md`** - Transaction Service detailed guide
4. **`DATABASE_SCHEMA.md`** - Full database schema specification
5. **`kehoach.md`** - Project timeline (Vietnamese)
6. **`PRD.md`** - Product requirements document (Vietnamese)

---

## 🔗 Integration Points

### With API Gateway

API Gateway routes requests to wallet and transaction services:

```typescript
// Gateway router (pseudo-code)
app.use('/api/v1/wallets', requireAuth, proxyTo('http://wallet-service:3002/api/v1'));
app.use('/api/v1/transactions', requireAuth, proxyTo('http://transaction-service:3003/api/v1'));
app.use('/api/v1/categories', requireAuth, proxyTo('http://transaction-service:3003/api/v1'));
```

**Path Rewrite Note:** Ensure API Gateway preserves full path for upstream services.

### With Identity Service

- JWT validation happens at API Gateway level
- Tokens issued by Identity Service
- Used by Wallet and Transaction Services to extract `userId` from claims

### With Frontend

Frontend communicates via API Gateway:
```
Frontend → API Gateway (3000) → Wallet/Transaction Services
                              → Identity Service
```

---

## 📝 Code Quality

### TypeScript

- ✅ Strict mode enabled
- ✅ Interfaces for all major types
- ✅ ESModuleInterop and other strict checks

### Patterns

- ✅ Repository pattern (data access)
- ✅ Service pattern (business logic)
- ✅ Controller pattern (HTTP handling)
- ✅ Outbox pattern (reliable events)
- ✅ SAGA pattern (distributed transactions)
- ✅ Optimistic locking (concurrency control)

### Error Handling

- ✅ Custom error codes (VALIDATION_ERROR, NOT_FOUND, etc.)
- ✅ Proper HTTP status codes
- ✅ Validation middleware
- ✅ Try-catch blocks in event handlers

---

## 🚢 Deployment Checklist

### Before Production

- [ ] Generate production JWT_SECRET
- [ ] Configure MongoDB Atlas for production
- [ ] Set up RabbitMQ (CloudAMQP or AWS RabbitMQ)
- [ ] Enable TLS/SSL for RabbitMQ
- [ ] Configure database backups
- [ ] Set up monitoring (DataDog, New Relic, etc.)
- [ ] Enable distributed tracing (Jaeger)
- [ ] Configure alerting on key metrics
- [ ] Load testing (1000+ concurrent users)
- [ ] Security audit (OWASP Top 10)

### Deployment Steps

```bash
# Build images
docker build -t wallet-service:1.0 service-wallet/
docker build -t transaction-service:1.0 service-transaction/

# Push to registry
docker push wallet-service:1.0
docker push transaction-service:1.0

# Deploy via Kubernetes or Docker Swarm
kubectl apply -f k8s/services/
```

---

## 👨‍💻 Developer Notes

### Key Implementation Decisions

1. **Database per Service**: Each service owns its schema
   - Simplifies scaling
   - Reduces coupling
   - Requires careful event design

2. **Outbox Pattern**: Guarantees event delivery
   - 5-second polling interval (configurable)
   - Published flag prevents re-publishing
   - Cleanup of old events (can be added)

3. **Optimistic Locking**: Detects concurrent updates
   - Version field on wallets
   - Updates only if version matches
   - Failed updates trigger retries

4. **SAGA Orchestration**: Transaction Service drives flow
   - Wallet Service is a participant (consumer)
   - Compensation triggered on failure
   - Idempotency prevents duplicate processing

### Common Issues & Solutions

**Issue**: Messages not being consumed
- Check RabbitMQ is running: `docker ps | grep rabbitmq`
- Check queue bindings: http://localhost:15672

**Issue**: Wallet balance doesn't update
- Check logs for "Received TransactionCreated event"
- Verify wallet exists in wallet-service database
- Check version matches (optimistic locking failure)

**Issue**: Transaction stuck in PENDING
- Check if WalletConsumer is running
- Check if WalletBalanceUpdated event was published
- Check TransactionConsumer logs

---

## 📞 Support & Next Steps

### Immediate Next Steps

1. **Integration Testing**: Write comprehensive E2E tests
2. **API Gateway Integration**: Update gateway routing
3. **Documentation Synchronization**: Add to API docs
4. **Performance Testing**: Load test with N concurrent users
5. **Security Review**: OWASP, JWT, encryption

### Long-term Roadmap

- **Phase 3**: Analytics Service (CQRS, real-time aggregations)
- **Phase 4**: AI Service (OCR, NLP chatbot)
- **Monitoring**: Observability stack (Prometheus, Grafana)
- **Security**: Mutual TLS, advanced auth patterns

---

## 📄 Files Checklist

Service-Wallet:
- [x] `app.ts` - Main entry point
- [x] `package.json` - Dependencies
- [x] `tsconfig.json` - TypeScript config
- [x] `Dockerfile` - Container image
- [x] `.env.example` - Configuration template
- [x] `.gitignore` - Git ignore rules
- [x] `README.md` - Service documentation
- [x] `config/db.ts` - DB connection
- [x] `config/rabbitmq.ts` - RabbitMQ setup
- [x] `src/models/Wallet.ts` - Schema
- [x] `src/controllers/walletController.ts` - HTTP handlers
- [x] `services/WalletService.ts` - Business logic
- [x] `repositories/WalletRepository.ts` - Data layer
- [x] `routes/index.ts` - Express routes
- [x] `middlewares/requireAuth.ts` - JWT middleware
- [x] `utils/WalletConsumer.ts` - Message consumer

Service-Transaction:
- [x] `app.ts` - Main entry point
- [x] `package.json` - Dependencies
- [x] `tsconfig.json` - TypeScript config
- [x] `Dockerfile` - Container image
- [x] `.env.example` - Configuration template
- [x] `.gitignore` - Git ignore rules
- [x] `README.md` - Service documentation
- [x] `config/db.ts` - DB connection
- [x] `config/rabbitmq.ts` - RabbitMQ setup
- [x] `src/models/Category.ts` - Schema
- [x] `src/models/Transaction.ts` - Schema
- [x] `src/models/Outbox.ts` - Schema
- [x] `src/controllers/transactionController.ts` - HTTP handlers
- [x] `services/TransactionService.ts` - Business logic
- [x] `services/OutboxPublisher.ts` - Event publisher
- [x] `repositories/TransactionRepository.ts` - Data layer
- [x] `routes/index.ts` - Express routes
- [x] `middlewares/requireAuth.ts` - JWT middleware
- [x] `events/TransactionConsumer.ts` - Message consumer

Documentation:
- [x] `PHASE2_ARCHITECTURE.md` - Architecture guide
- [x] `be/docker-compose.yml` - Docker setup

---

**Generation Date**: 2024-03-31
**Phase**: Phase 2 (Lõi Tài chính)
**Status**: ✅ Complete & Ready for Testing
**Next Phase**: Phase 3 (Phân tích & Trải nghiệm)
