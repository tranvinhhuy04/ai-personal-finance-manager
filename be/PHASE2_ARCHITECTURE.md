# Phase 2 (Lõi Tài chính) - Comprehensive Architecture & Integration Guide

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway                                  │
│                     (Port: 3000)                                     │
└──────────────┬──────────────────────────────────────┬────────────────┘
               │                                      │
        ┌──────▼────────┐                   ┌────────▼───────┐
        │ Wallet Service │                   │ Transaction    │
        │   (Port 3002)  │◄──────────────────│ Service        │
        └──────┬────────┘   RabbitMQ Events  │  (Port 3003)   │
               │                   ◄─────────┤                │
               │                             └────────┬───────┘
        ┌──────▼────────────────────┐                │
        │   MongoDB Atlas           │      ┌─────────▼─────────┐
        │  (wallet-service DB)      │      │  MongoDB Atlas    │
        │  (transaction-service DB) │      │  (transaction-DB) │
        └───────────────────────────┘      └──────────────────┘
               ├─ users (from Identity)    ├─ transactions
               ├─ wallets                  ├─ categories
               │                           └─ outboxevents
               │
    RabbitMQ Topic Exchanges:
    ├─ wallet.events
    ├─ transaction.events
    └─ event.dlq (Dead Letter Queue)
```

## 2. Database Schema (MongoDB)

### Wallet Service Database (wallet-service)

```
collections:
  - wallets
    ├ _id: ObjectId
    ├ userId: String (indexed)
    ├ walletType: CARD|MOMO|ZALOPAY|CASH
    ├ balance: Decimal128 (>= 0)
    ├ spendingLimit: Decimal128 (null or > 0)
    ├ status: 1|0|2 (indexed)
    ├ version: Number (optimistic locking)
    └ timestamps
    
Indexes:
  - { userId: 1, status: 1 }
  - { walletType: 1 }
```

### Transaction Service Database (transaction-service)

```
collections:
  - transactions
    ├ _id: ObjectId
    ├ walletId: String (indexed)
    ├ userId: String (indexed)
    ├ categoryId: String
    ├ transactionType: INCOME|EXPENSE
    ├ amount: Decimal128
    ├ currency: VND|USD|... (default VND)
    ├ status: PENDING|COMPLETED|FAILED|REVERSED (indexed)
    ├ description: String
    ├ occurredAt: Date
    ├ idempotencyKey: String (unique for retry safety)
    └ timestamps
    
  - categories
    ├ _id: ObjectId
    ├ userId: String (indexed)
    ├ name: String
    ├ categoryType: INCOME|EXPENSE
    ├ parentId: String (optional)
    ├ isSystem: Boolean
    ├ status: 1|0
    └ timestamps
    
  - outboxevents
    ├ _id: ObjectId
    ├ eventType: TransactionCreated|...
    ├ aggregateType: TRANSACTION|...
    ├ aggregateId: String
    ├ payload: Object
    ├ published: Boolean (indexed)
    ├ publishedAt: Date
    └ createdAt: Date (indexed)

Indexes:
  - transactions: { userId: 1, occurredAt: -1 }
  - transactions: { walletId: 1, occurredAt: -1 }
  - transactions: { status: 1 }
  - transactions: { idempotencyKey: 1 } (unique)
  - outboxevents: { published: 1, createdAt: 1 }
```

## 3. RabbitMQ Configuration

### Exchanges (Topic-based)

```
Exchange: wallet.events
  ├ Routing Keys:
  │  ├ wallet.balance.updated
  │  └ wallet.balance.update.failed
  └ Durable: true

Exchange: transaction.events
  ├ Routing Keys:
  │  └ transaction.created (amountUnsigned, type tells direction)
  └ Durable: true
```

### Queues

```
Queue: wallet.balance.updates
  ├ Bindings:
  │  └ transaction.events:transaction.created
  ├ Durable: true
  └ Consumer: Wallet Service (WalletConsumer)

Queue: wallet.responses
  ├ Bindings:
  │  ├ wallet.events:wallet.balance.updated
  │  └ wallet.events:wallet.balance.update.failed
  ├ Durable: true
  └ Consumer: Transaction Service (TransactionConsumer)

Queue: dlq (Dead Letter Queue)
  ├ Used by: Both services for failed messages
  ├ Durable: true
  └ Review: Manually or via ops dashboard
```

## 4. Event Flow (SAGA Pattern - Orchestration)

### Scenario: User creates EXPENSE transaction of 100,000 VND

```
Timeline:
─────────────────────────────────────────────────────────────────────

T0: User creates transaction
┌─────────────────────────────────────────┐
│ POST /api/v1/transactions               │
│ {                                       │
│   walletId: "wallet1",                 │
│   categoryId: "food",                  │
│   transactionType: "EXPENSE",          │
│   amount: "100000"                     │
│ }                                       │
└────────────┬────────────────────────────┘
             │
             ▼
T1: Transaction Service processes
┌─────────────────────────────────────────┐
│ 1. Validate inputs                      │
│ 2. Create transaction:                  │
│    {                                    │
│      status: "PENDING",                 │
│      idempotencyKey: "uuid-xxx"        │
│    }                                    │
│ 3. Create Outbox event:                 │
│    {                                    │
│      eventType: "TransactionCreated",  │
│      payload: {                         │
│        transactionId: "tx1",           │
│        walletId: "wallet1",            │
│        amount: "100000",               │
│        type: "EXPENSE",                │
│        ...                              │
│      },                                 │
│      published: false                   │
│    }                                    │
│ 4. Return: {                            │
│      id: "tx1",                        │
│      status: "PENDING",  ← Pending!    │
│      ...                               │
│    }                                    │
└────────────┬────────────────────────────┘
             │
             ▼
T2: Outbox Publisher (runs every 5s)
┌─────────────────────────────────────────┐
│ 1. Query: unpublished events            │
│    Find: {published: false}             │
│ 2. For each event:                      │
│    - Publish to RabbitMQ                │
│    - Mark published: true               │
│ 3. Event routed:                        │
│    wallet.balance.updates queue         │
└────────────┬────────────────────────────┘
             │
             ▼
T3: Wallet Service (WalletConsumer)
┌─────────────────────────────────────────┐
│ 1. Consume: TransactionCreated          │
│ 2. Extract:                             │
│    - walletId: "wallet1"                │
│    - amount: 100000 (unsigned)          │
│    - type: "EXPENSE"                    │
│ 3. Calculate:                           │
│    - amountToApply = -100000            │
│      (negative because EXPENSE)         │
│ 4. Update wallet balance (optimistic):  │
│    db.updateOne({                       │
│      _id: "wallet1",                    │
│      version: 0  ← Expected version     │
│    }, {                                 │
│      $inc: {                            │
│        balance: -100000,               │
│        version: 1  ← Increment version  │
│      }                                  │
│    })                                   │
│ 5. SUCCESS → Emit:                      │
│    WalletBalanceUpdated                 │
│    (routed to wallet.responses queue)   │
└────────────┬────────────────────────────┘
             │
             ▼
T4: Transaction Consumer
┌─────────────────────────────────────────┐
│ 1. Consume: WalletBalanceUpdated        │
│ 2. Update transaction:                  │
│    db.updateOne({                       │
│      _id: "tx1"                         │
│    }, {                                 │
│      status: "COMPLETED"  ← Final!     │
│    })                                   │
│ 3. Client can poll and see status       │
│    changed PENDING → COMPLETED          │
└────────────┬────────────────────────────┘
             │
             ▼
T5: End result
┌─────────────────────────────────────────┐
│ Wallet:                                 │
│   balance: -100000 (updated)            │
│   version: 1 (incremented)              │
│                                         │
│ Transaction:                            │
│   status: "COMPLETED"                   │
│                                         │
│ Outbox:                                 │
│   published: true                       │
│   publishedAt: "T2"                     │
└─────────────────────────────────────────┘

Total latency: ~T0 to T4 (5-10 seconds with polling)
Guarantee: No lost updates, idempotent, eventually consistent
```

### Failure Scenario: Wallet update fails

```
T3: Wallet Consumer (with error)
┌─────────────────────────────────────────┐
│ Update fails because:                   │
│ - Wallet status != 1 (not active)       │
│ - Balance < 0 (insufficient)            │
│ - Version mismatch (concurrent update)  │
│                                         │
│ Response: {                             │
│   success: false,                       │
│   error: "Insufficient balance"         │
│ }                                       │
│                                         │
│ Emit: WalletBalanceUpdateFailed         │
└────────────┬────────────────────────────┘
             │
             ▼
T4: Transaction Consumer (compensation)
┌─────────────────────────────────────────┐
│ 1. Consume: WalletBalanceUpdateFailed   │
│ 2. Update transaction:                  │
│    status: "FAILED"                     │
│ 3. Trigger SAGA Compensation:           │
│    - Log error                          │
│    - Alert ops                          │
│    - Store in DLQ                       │
│    - Retry logic (exponential backoff)  │
│    - Notify user (future: push/email)   │
└─────────────────────────────────────────┘
```

## 5. API Contracts

### Wallet Service Endpoints

```
POST /api/v1/wallets
  Request:
    {
      "walletType": "CARD|MOMO|ZALOPAY|CASH",
      "walletName": "My Card",
      "spendingLimit": "5000000"  # optional
    }
  Response (201):
    {
      "id": "...",
      "userId": "...",
      "walletType": "CARD",
      "walletName": "My Card",
      "balance": "0",
      "spendingLimit": "5000000",
      "status": 1,
      "version": 0,
      "createdAt": "...",
      "updatedAt": "..."
    }

GET /api/v1/wallets
  Response (200): [{ wallet }, { wallet }, ...]

GET /api/v1/wallets/:walletId
  Response (200): { wallet }

PATCH /api/v1/wallets/:walletId/status
  Request:
    { "status": 1|0|2 }
  Response (200): { wallet }

PATCH /api/v1/wallets/:walletId/spending-limit
  Request:
    { "spendingLimit": "10000000" }
  Response (200): { wallet }
```

### Transaction Service Endpoints

```
POST /api/v1/categories
  Request:
    {
      "name": "Food",
      "categoryType": "INCOME|EXPENSE",
      "parentId": null  # optional
    }
  Response (201): { category }

GET /api/v1/categories
  Response (200): [{ category }, ...]

POST /api/v1/transactions
  Request:
    {
      "walletId": "...",
      "categoryId": "...",
      "transactionType": "INCOME|EXPENSE",
      "amount": "100000",
      "currency": "VND",  # optional
      "description": "...",  # optional
      "occurredAt": "2024-03-31T12:30:00Z"  # optional
    }
  Response (201): { transaction (status: PENDING) }

GET /api/v1/transactions/:transactionId
  Response (200): { transaction }

GET /api/v1/transactions?limit=50&skip=0
  Response (200): [{ transaction }, ...]

GET /api/v1/wallets/:walletId/transactions
  Response (200): [{ transaction }, ...]
```

## 6. Error Handling Strategy

### Validation Errors (400)

```json
{
  "code": "VALIDATION_ERROR",
  "message": "walletName is required"
}
```

### Authentication Errors (401)

```json
{
  "message": "Invalid or expired token"
}
```

### Authorization Errors (403)

```json
{
  "message": "Forbidden"
}
```

### Not Found Errors (404)

```json
{
  "code": "NOT_FOUND",
  "message": "Wallet not found"
}
```

### Business Logic Errors (422 or 400)

```json
{
  "code": "BUSINESS_ERROR",
  "message": "Insufficient balance"
}
```

### Server Errors (500)

```json
{
  "message": "Internal server error"
}
```

## 7. Testing Checklist

### Unit Tests (per service)

- [ ] WalletService.createWallet()
- [ ] WalletService.updateBalanceForTransaction() with optimistic locking
- [ ] TransactionService.createTransaction() with Outbox
- [ ] TransactionService.handleWalletResponse()
- [ ] Validation logic

### Integration Tests (across services)

- [ ] Create wallet + transaction → wallet balance updates
- [ ] Concurrent transactions don't cause race conditions (optimistic locking)
- [ ] Transaction retry with idempotency key
- [ ] Outbox Publisher publishes within 10 seconds
- [ ] Wallet Consumer processes messages correctly
- [ ] Transaction Consumer updates status on success/failure

### Load Tests

- [ ] 1000 concurrent transaction creations
- [ ] Outbox Publisher performance with 10k unpublished events
- [ ] RabbitMQ message throughput (events/sec)

### Chaos Engineering

- [ ] Wallet Service crashes mid-transaction
- [ ] MongoDB connection drops
- [ ] RabbitMQ broker unavailable
- [ ] Message corruption handling
- [ ] Database transaction rollback

## 8. Monitoring & Observability

### Key Metrics

```
Wallet Service:
  - Requests per second (RPS)
  - p50, p95, p99 latencies
  - Error rate
  - Optimistic lock failures (version mismatch rate)
  - RabbitMQ connection status

Transaction Service:
  - Transaction creation RPS
  - Average time PENDING → COMPLETED
  - Outbox event publish latency
  - Outbox queue depth
  - Failed transactions (FAILED status)
  - SAGA compensation triggers

RabbitMQ:
  - Queue depth
  - Message publish rate
  - Consumer lag
  - DLQ message count
```

### Logs

```
[2024-03-31 14:23:45] INFO: Wallet balance updated
  walletId=wallet1 amount=-100000 newBalance=-100000 newVersion=1

[2024-03-31 14:23:46] INFO: Event published
  eventType=TransactionCreated eventId=tx1 published=true

[2024-03-31 14:23:55] ERROR: Wallet update failed
  transactionId=tx2 walletId=wallet1 reason="Insufficient balance"
  compensation=pending
```

## 9. Deployment Strategy

### Local Development

```bash
docker compose up -d
```

### Staging

```bash
# Build images
docker build -t wallet-service:latest service-wallet/
docker build -t transaction-service:latest service-transaction/

# Push to registry
docker push wallet-service:latest
docker push transaction-service:latest

# Deploy with k8s or Compose
kubectl apply -f k8s/wallet-service.yaml
kubectl apply -f k8s/transaction-service.yaml
```

### Production

- Use managed MongoDB Atlas
- Use managed RabbitMQ (CloudAMQP, AWS RabbitMQ)
- Auto-scaling based on RPS and queue depth
- Circuit breakers for cross-service calls
- Distributed tracing (Jaeger/Datadog)
- Alerting on SLO violations

## 10. Next Steps (Phase 3 & 4)

### Phase 3: Analytics Service
- Dashboard phân tích
- CQRS pattern (read model)
- Event-driven aggregations
- Real-time notifications

### Phase 4: AI Service
- OCR pipeline
- NLP chatbot
- Transaction categorization
- Spending analysis

## 11. References

Files involved:
- `service-wallet/` - Complete implementation
- `service-transaction/` - Complete implementation
- `be/docker-compose.yml` - Local setup

Documentation:
- `service-wallet/README.md` - Detailed guide
- `service-transaction/README.md` - Detailed guide
