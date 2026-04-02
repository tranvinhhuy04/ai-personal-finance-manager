# Phase 2: Wallet Service - Implementation Guide

## Tổng quan

Wallet Service là microservice chịu trách nhiệm quản lý ví tài chính của người dùng, bao gồm:
- CRUD operations cho wallets
- Quản lý số dư với Optimistic Locking
- Tiếp nhận sự kiện từ Transaction Service qua RabbitMQ
- Cập nhật số dư ví một cách an toàn

## Architecture

### Database Schema

```
Collection: wallets
├── _id: ObjectId
├── userId: String (indexed)
├── walletType: String (CARD|MOMO|ZALOPAY|CASH) (indexed)
├── walletName: String
├── balance: Decimal128
├── status: Number (1: Active, 0: Inactive, 2: Blocked) (indexed)
├── version: Number (for optimistic locking)
├── createdAt: Date
└── updatedAt: Date

Compound Index: { userId: 1, status: 1 }
```

## Optimistic Locking Pattern

### Vấn đề

Khi bị retry hoặc concurrent requests, cập nhật số dư có thể ghi đè nhau gây mất dữ liệu.

### Giải pháp

Sử dụng trường `version` để phát hiện conflict:

```typescript
// Khi cập nhật, chỉ update nếu version match
await Wallet.findOneAndUpdate(
  {
    _id: walletId,
    version: expectedVersion  // ← Kiểm tra version khớp
  },
  {
    $inc: { balance: amount, version: 1 },  // ← Tăng cả balance và version
    updatedAt: new Date()
  },
  { new: true }
);
```

Nếu version không khớp, operation thất bại → Retry từ Transaction Service.

## Event Flow (SAGA Pattern)

```
1. Transaction Service:
   - Tạo transaction (PENDING)
   - Ghi Outbox event

2. Outbox Publisher:
   - Poll Outbox every 5s
   - Publish TransactionCreated → RabbitMQ

3. Wallet Service (Consumer):
   - Nhận TransactionCreated event
   - Tính toán amount (dựa trên INCOME/EXPENSE)
   - Cập nhật wallet balance với optimistic locking
   - Publish WalletBalanceUpdated hoặc WalletBalanceUpdateFailed

4. Transaction Service (Consumer):
   - Nhận wallet response
   - Cập nhật transaction status → COMPLETED hoặc FAILED
   - Nếu FAILED: Trigger SAGA compensation
```

## Key Features

### 1. CRUD Wallets

**Create Wallet**
```bash
POST /api/v1/wallets
Authorization: Bearer <token>

{
  "walletType": "CARD",
  "walletName": "My First Card",
  "balance": "5000000"
}

Response:
{
  "id": "507f1f77bcf86cd799439011",
  "userId": "user123",
  "walletType": "CARD",
  "walletName": "My First Card",
  "balance": "5000000",
  "status": 1,
  "version": 0,
  "createdAt": "2024-03-31T...",
  "updatedAt": "2024-03-31T..."
}
```

**List Wallets**
```bash
GET /api/v1/wallets
Authorization: Bearer <token>

Response: [{ ... }, { ... }]
```

**Get Wallet**
```bash
GET /api/v1/wallets/:walletId
Authorization: Bearer <token>
```

**Update Wallet Status**
```bash
PATCH /api/v1/wallets/:walletId/status
Authorization: Bearer <token>

{
  "status": 2  # 1: Active, 0: Inactive, 2: Blocked
}
```

**Update Wallet Balance / Info**
```bash
PUT /api/v1/wallets/:walletId
Authorization: Bearer <token>

{
  "wallet_name": "Ví chính",
  "balance": 10000000,
  "status": 1
}
```

### 2. Balance Updates via Message Queue

Wallet Service tiếp nhận `TransactionCreated` events và xử lý:

```typescript
// Từ WalletConsumer.ts
private async handleTransactionCreated(event: TransactionCreatedEvent) {
  const { amount, transactionType } = event.payload;
  
  // Tính hướng: chi là âm, thu là dương
  let amountToApply = new Decimal(amount);
  if (transactionType === 'EXPENSE') {
    amountToApply = amountToApply.negated();
  }

  // Cập nhật với optimistic locking
  const result = await walletService.updateBalanceForTransaction(
    walletId,
    amountToApply,
    currentVersion
  );

  if (result.success) {
    // Phát WalletBalanceUpdated
  } else {
    // Phát WalletBalanceUpdateFailed (triggers SAGA compensation)
  }
}
```

## Setup & Running

### Prerequisites

- Node.js 18+
- MongoDB 7.0+
- RabbitMQ 3.12+

### Installation

```bash
cd service-wallet
npm install
```

### Configuration

Copy `.env.example` to `.env` và điều chỉnh:

```bash
PORT=3002
MONGODB_URI=mongodb://localhost:27017/wallet-service
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
docker build -t wallet-service:1.0 .
docker run -d \
  -e MONGODB_URI=mongodb://mongo:27017/wallet-service \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  -e JWT_SECRET=your-secret \
  -p 3002:3002 \
  wallet-service:1.0
```

## Testing

### Health Check

```bash
curl http://localhost:3002/health
```

### Create Wallet (requires auth token from Identity Service)

```bash
curl -X POST http://localhost:3002/api/v1/wallets \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "walletType": "CARD",
    "walletName": "Test Wallet",
    "balance": "1000000"
  }'
```

## Error Handling

### Validation Error (400)

```json
{
  "message": "walletName is required"
}
```

### Not Found (404)

```json
{
  "message": "Wallet not found"
}
```

### Unauthorized (401)

```json
{
  "message": "Invalid or expired token"
}
```

### Optimistic Lock Failure

Khi publish balance update, nếu version mismatch:
- WalletBalanceUpdateFailed event được phát
- Transaction Service nhận signal để retry hoặc mark FAILED
- SAGA compensation được trigger (tùy theo policy)

## Monitoring & Troubleshooting

### Logs

```bash
# Watch logs
npm run dev

# Check if service is alive
curl http://localhost:3002/health
```

### RabbitMQ Monitoring

- GUI: http://localhost:15672 (admin/admin)
- Check exchanges: `wallet.events`, `transaction.events`
- Check queues: `wallet.balance.updates`, `wallet.responses`

### MongoDB Monitoring

```bash
# Connect to MongoDB
mongo mongodb://localhost:27017/wallet-service

# Check wallets collection
db.wallets.find()
db.wallets.findOne({ _id: ObjectId("...") })
```

## Next Steps

1. Hoàn thành Transaction Service
2. Thiết lập API Gateway routing
3. Viết integration tests cho SAGA flow
4. Deploy lên staging environment
