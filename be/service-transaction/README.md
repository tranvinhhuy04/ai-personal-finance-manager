# Phase 2: Transaction Service - Implementation Guide

## Tổng quan

Transaction Service quản lý các giao dịch tài chính (thu/chi) và áp dụng Outbox Pattern kết hợp SAGA:
- CRUD transactions và categories
- Outbox Pattern: Ghi events vào database, sau đó publish
- Event-driven communication với Wallet Service
- Xử lý phản hồi wallet và compensation

## Seed danh mục hệ thống

Chạy lệnh sau để seed bộ danh mục mặc định cho toàn bộ user:

```bash
npm run seed:categories
```

Script là idempotent: chạy nhiều lần sẽ không tạo trùng, chỉ upsert theo danh mục hệ thống.

## Architecture

### Database Schemas

#### Categories Collection

```
Collection: categories
├── _id: ObjectId
├── userId: String (indexed)
├── name: String
├── categoryType: String (INCOME|EXPENSE)
├── parentId: String (optional)
├── isSystem: Boolean
├── status: Number (1: Active, 0: Inactive)
└── createdAt: Date
```

#### Transactions Collection

```
Collection: transactions
├── _id: ObjectId
├── walletId: String (indexed)
├── userId: String (indexed)
├── categoryId: String
├── transactionType: String (INCOME|EXPENSE)
├── amount: Decimal128
├── currency: String (default: VND)
├── status: String (PENDING|COMPLETED|FAILED|REVERSED) (indexed)
├── description: String
├── occurredAt: Date
├── idempotencyKey: String (unique, sparse)
├── createdAt: Date
│
Indexes:
├── { userId: 1, occurredAt: -1 }
├── { walletId: 1, occurredAt: -1 }
└── { status: 1 }
```

#### Outbox Collection

```
Collection: outboxevents
├── _id: ObjectId
├── eventType: String (TransactionCreated, etc.)
├── aggregateId: String (transactionId)
├── aggregateType: String (TRANSACTION)
├── payload: Object
├── published: Boolean (indexed)
├── publishedAt: Date
├── createdAt: Date (indexed)

Index: { published: 1, createdAt: 1 }
```

## Outbox Pattern

### Vấn đề

Nếu publish message trực tiếp (không qua database), có nguy cơ:
- Message broker down → message mất
- Service crash sau khi publish → duplicate handling phức tạp

### Giải pháp: Outbox Pattern

```
┌─────────────────────┐
│  Transaction DB     │
├─────────────────────┤
│ transactions        │
│ outboxevents       │  ← Ghi event cùng transaction
└─────────────────────┘
         ↓ Polling (every 5s)
┌─────────────────────┐
│ Outbox Publisher    │
└─────────────────────┘
         ↓ Publish
┌─────────────────────┐
│     RabbitMQ        │
│  (transaction..*    │
│      events)        │
└─────────────────────┘
         ↓ Consume
┌─────────────────────┐
│ Wallet Service      │
│ (WalletConsumer)    │
└─────────────────────┘
```

## SAGA Pattern für Distributed Transactions

### Event Flow

```
Step 1: Transaction Service tạo Outbox event
╔════════════════════════════╗
║ User: POST /transactions   ║
╠════════════════════════════╣
║ 1. Create Transaction      ║
║    status: PENDING         ║
║ 2. Create Outbox event:    ║
║    eventType: TransactionCreated
║    - walletId              ║
║    - amount (unsigned)     ║
║    - type (INCOME/EXPENSE) ║
╚════════════════════════════╝
         ↓
Step 2: Outbox Publisher phát event
╔════════════════════════════╗
║ Outbox Publisher           ║
║ (runs every 5 seconds)     ║
╠════════════════════════════╣
║ Query: unpublished events  ║
║ Publish to RabbitMQ        ║
║ Mark as published          ║
╚════════════════════════════╝
         ↓
Step 3: Wallet Service consume & update balance
╔════════════════════════════╗
║ Wallet Consumer            ║
║ (listens to               ║
║  transaction.created)      ║
╠════════════════════════════╣
║ Receive: TransactionCreated║
║ Calculate:                 ║
║  - INCOME: +amount        ║
║  - EXPENSE: -amount       ║
║ Update with optimistic    ║
║ locking                    ║
║ SUCCESS → WalletBalanceUpdated
║ FAIL → WalletBalanceUpdateFailed
╚════════════════════════════╝
         ↓
Step 4: Transaction Service handle response
╔════════════════════════════╗
║ Transaction Consumer       ║
║ (listens to               ║
║  wallet.events)            ║
╠════════════════════════════╣
║ Receive: Success/Failure  ║
║ Update transaction:       ║
║  - COMPLETED              ║
║  - FAILED                 ║
║ If FAILED:                ║
║  Trigger SAGA Compensation║
╚════════════════════════════╝
```

## Key Features

### 1. Categories Endpoint

**Create Category**
```bash
POST /api/v1/categories
Authorization: Bearer <token>

{
  "name": "Ăn uống",
  "categoryType": "EXPENSE",
  "parentId": null  # optional, for subcategories
}

Response:
{
  "id": "507f1f77bcf86cd799439011",
  "userId": "user123",
  "name": "Ăn uống",
  "categoryType": "EXPENSE",
  "parentId": null,
  "isSystem": false,
  "status": 1,
  "createdAt": "2024-03-31T..."
}
```

**List Categories**
```bash
GET /api/v1/categories
Authorization: Bearer <token>

Response: [{ ... }, { ... }]
```

### 2. Transactions Endpoint

**Create Transaction**
```bash
POST /api/v1/transactions
Authorization: Bearer <token>

{
  "walletId": "wallet-id",
  "categoryId": "category-id",
  "transactionType": "EXPENSE",
  "amount": "125000",
  "currency": "VND",
  "description": "Lunch at coffee shop",
  "occurredAt": "2024-03-31T12:30:00Z"
}

Response:
{
  "id": "507f1f77bcf86cd799439011",
  "walletId": "wallet-id",
  "userId": "user123",
  "categoryId": "category-id",
  "transactionType": "EXPENSE",
  "amount": "125000",
  "currency": "VND",
  "status": "PENDING",  # → Will change to COMPLETED once wallet updates
  "description": "Lunch at coffee shop",
  "occurredAt": "2024-03-31T12:30:00Z",
  "idempotencyKey": "uuid-...",
  "createdAt": "2024-03-31T..."
}
```

Note: Transaction được tạo với status PENDING. Sau khi Wallet Service xác nhận, 
status sẽ thay đổi thành COMPLETED hoặc FAILED.

**Get Transaction**
```bash
GET /api/v1/transactions/:transactionId
Authorization: Bearer <token>
```

**List User Transactions**
```bash
GET /api/v1/transactions?limit=50&skip=0
Authorization: Bearer <token>

Response: [{ ... }, { ... }]
```

**List Wallet Transactions**
```bash
GET /api/v1/wallets/:walletId/transactions?limit=50&skip=0
Authorization: Bearer <token>

Response: [{ ... }, { ... }]
```

### 3. Idempotency

Mỗi transaction có `idempotencyKey` duy nhất (UUID). 
Nếu client retry create transaction:
- Nếu key đã tồn tại → Return existing transaction
- Nếu key mới → Create transaction mới

```typescript
// MongoDB schema
idempotencyKey: {
  type: String,
  required: true,
  unique: true,
  sparse: true,  # Allow multiple nulls (soft deletes)
}

// In service
async createTransaction(input) {
  const existingTx = await findByIdempotencyKey(idempotencyKey);
  if (existingTx) return existingTx;  // Return existing
  // ... create new
}
```

## Setup & Running

### Prerequisites

- Node.js 18+
- MongoDB 7.0+
- RabbitMQ 3.12+

### Installation

```bash
cd service-transaction
npm install
```

### Configuration

```bash
# Copy template
cp .env.example .env

# Edit as needed
PORT=3003
MONGODB_URI=mongodb://localhost:27017/transaction-service
RABBITMQ_URL=amqp://guest:guest@localhost:5672
JWT_SECRET=your-secret-key
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t transaction-service:1.0 .
docker run -d \
  -e MONGODB_URI=mongodb://mongo:27017/transaction-service \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  -e JWT_SECRET=your-secret \
  -p 3003:3003 \
  transaction-service:1.0
```

## Testing Event Flow End-to-End

### 1. Start Services Locally

```bash
# Terminal 1: Wallet Service
cd service-wallet
npm run dev

# Terminal 2: Transaction Service  
cd service-transaction
npm run dev

# Terminal 3: MongoDB
mongod

# Terminal 4: RabbitMQ
rabbitmq-server
```

### 2. Test Flow

```bash
# Get auth token from Identity Service
TOKEN=$(curl -X POST http://localhost:3000/api/v1/login \
  -d '{"email":"test@test.com","password":"test123"}' | jq .accessToken)

# Create wallet
WALLET_ID=$(curl -X POST http://localhost:3002/api/v1/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"walletType":"CASH","walletName":"Test","spendingLimit":"1000000"}' \
  | jq -r .id)

# Create category
CATEGORY_ID=$(curl -X POST http://localhost:3003/api/v1/categories \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Ăn uống","categoryType":"EXPENSE"}' \
  | jq -r .id)

# Create transaction (PENDING status initially)
TX_ID=$(curl -X POST http://localhost:3003/api/v1/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"walletId\":\"$WALLET_ID\",
    \"categoryId\":\"$CATEGORY_ID\",
    \"transactionType\":\"EXPENSE\",
    \"amount\":\"100000\"
  }" | jq -r .id)

# Wait for:
# 1. Outbox Publisher publishes TransactionCreated
# 2. Wallet Service consumes and updates balance
# 3. Transaction Consumer receives response and updates status

sleep 10

# Check transaction status (should be COMPLETED)
curl http://localhost:3003/api/v1/transactions/$TX_ID \
  -H "Authorization: Bearer $TOKEN" | jq .status

# Check wallet balance (should be reduced by 100000)
curl http://localhost:3002/api/v1/wallets/$WALLET_ID \
  -H "Authorization: Bearer $TOKEN" | jq .balance
```

## Monitoring

### RabbitMQ Management UI

- URL: http://localhost:15672
- User: guest / Password: guest
- Check queues:
  - `transaction.events.queue` (outbox publisher → wallet service)
  - `wallet.responses` (wallet service → transaction service)

### MongoDB Monitoring

```bash
mongo mongodb://localhost:27017/transaction-service

# Check transactions
db.transactions.findOne({ status: "PENDING" })

# Check outbox events
db.outboxevents.findOne({ published: false })

# Count by status
db.transactions.countDocuments({ status: "PENDING" })
db.transactions.countDocuments({ status: "COMPLETED" })
db.transactions.countDocuments({ status: "FAILED" })
```

## SAGA Compensation Logic (TODO)

Hiện tại, khi `WalletBalanceUpdateFailed` được nhận:
1. Transaction được mark FAILED
2. Log compensation request

Trong production, cần implement:
1. **Automatic Retry**: Exponential backoff
2. **Dead Letter Queue**: Untuk events không thể process
3. **Manual Review**: Alert operations team
4. **Compensation Steps**: 
   - Reverse related operations
   - Notify user
   - Create audit trail

Example compensation policies:
- Retry thối 3 lần
- Nếu vẫn fail → Store in DLQ
- Manual intervention qua admin dashboard
- Send notification email tới user

## Next Steps

1. Integrate with API Gateway
2. Add comprehensive error handling
3. Implement SAGA compensation strategies
4. Write integration tests
5. Set up monitoring & alerting
