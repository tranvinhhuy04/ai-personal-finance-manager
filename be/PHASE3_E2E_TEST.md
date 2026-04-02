# Phase 3 E2E Test Guide

## Seed Data

Run:

```powershell
Set-Location "c:\Users\tranv\Desktop\3monthaythe\DACN_final\Final_260326\be\seeds"
npm install
npm run seed:phase3
```

Seed account:

- Email: `test2@gmail.com`
- Password: `12345678`

Expected seed artifacts:

- 1 user in `users`
- 2 wallets in `wallets`
- 3 categories in `categories`
- 10 transactions in `transactions`
- 3 monthly aggregates in `monthly_aggregates`

## Important Runtime Note

Current codebase has two realities:

- The intended business flow is: `TransactionCreated` -> `WalletBalanceUpdated` -> Analytics update + Notification insert.
- The actual implementation is:
  - `transaction-service` publishes `transaction.created`.
  - `wallet-service` consumes `transaction.created` and publishes `wallet.balance.updated`.
  - `analytics-service` consumes `transaction.created` directly.
  - `notification-service` consumes `wallet.balance.updated`.
  - There is no separate RabbitMQ event named `AnalyticsAggregated` or `NotificationCreated` at the moment. Those are MongoDB side effects, not published events.

## API Endpoints To Use

- Login: `POST http://localhost:3000/api/v1/auth/login`
- Analytics dashboard: `GET http://localhost:3000/api/v1/analytics/dashboard`
- Notifications list: `GET http://localhost:3000/api/v1/notifications`
- Create transaction: `POST http://localhost:3000/api/v1/transactions/transactions`
- List transactions: `GET http://localhost:3000/api/v1/transactions/transactions`
- List wallets: `GET http://localhost:3000/api/v1/wallets/wallets`

Note:

- `wallets/wallets` and `transactions/transactions` are currently double-prefixed because both gateway and downstream service mount the same base path.

## End-to-End Checklist

### 1. Login and get JWT

Request:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "test2@gmail.com",
  "password": "12345678"
}
```

Expected:

- HTTP `200`
- Response contains `accessToken` or equivalent JWT field.
- Save token as `Bearer <token>` for next requests.

### 2. Check dashboard read model

Request:

```http
GET /api/v1/analytics/dashboard
Authorization: Bearer <token>
```

Expected:

- HTTP `200`
- Response contains:
  - `currentMonth`
  - `summary.totalIncome`
  - `summary.totalExpense`
  - `summary.netCashFlow`
  - `trend` with 3 seeded months visible
- Frontend Analytics Dashboard should render line/bar chart and pie chart without Recharts width/height warning.

### 3. Trigger event-driven flow with a new expense

Before sending the request:

- Open RabbitMQ UI: `http://localhost:15672`
- Open container logs for:
  - `service-transaction`
  - `service-wallet`
  - `analytics-service`
  - `notification-service`

Request:

```http
POST /api/v1/transactions/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "walletId": "<vietcombank_wallet_id_from_seed>",
  "categoryId": "<mua_sam_category_id_from_seed>",
  "transactionType": "EXPENSE",
  "amount": "4000000",
  "currency": "VND",
  "description": "QA phase 3 shopping test"
}
```

Expected immediately:

- HTTP `201`
- New transaction is created.
- Because `transaction-service` uses outbox polling every 5 seconds, event propagation may be delayed a few seconds.

### 4. Verify RabbitMQ and consumer flow

Check these in order:

- `transaction-service` outbox publisher logs show unpublished event picked up.
- RabbitMQ exchange `transaction.events` receives routing key `transaction.created`.
- `wallet-service` consumer logs show it consumed `TransactionCreated`.
- `wallet-service` publishes `wallet.balance.updated` on exchange `wallet.events`.
- `analytics-service` consumer logs show it consumed the `transaction.created` payload and updated `monthly_aggregates`.
- `notification-service` consumer logs show it consumed `wallet.balance.updated`.

Important note for current implementation:

- The actual observable chain is:
  - `TransactionCreated`
  - `WalletBalanceUpdated`
  - analytics Mongo write
  - notification Mongo write
- There is currently no emitted RabbitMQ event named `AnalyticsAggregated`.
- There is currently no emitted RabbitMQ event named `NotificationCreated`.

### 5. Verify persisted results

Check Analytics again:

```http
GET /api/v1/analytics/dashboard
Authorization: Bearer <token>
```

Expected:

- `currentMonth.summary.totalExpense` increases by `4,000,000`.
- `currentMonth.summary.netCashFlow` decreases by `4,000,000`.
- Current month category breakdown reflects the new `Mua sam` transaction.

Check Notifications:

```http
GET /api/v1/notifications
Authorization: Bearer <token>
```

Expected in ideal flow:

- A new warning notification should appear in the list.
- Notification center bell badge increases.

Actual note with current code:

- With the current implementation, the `4,000,000` expense is useful to verify event propagation and downstream analytics refresh.
- The wallet module now follows a balance-only design, so this scenario should focus on data sync and UI refresh instead of threshold-limit alerts.

## UI Validation Checklist

- Login page accepts `test2@gmail.com` / `12345678`.
- Analytics page loads seeded charts before any new transaction is created.
- After the expense request, refresh Analytics page and confirm current month values change.
- Open Notification Center from the bell icon and check unread count, list rendering, highlight style, and mark-all-read button.

## 3 Common Failure Causes and Fast Fixes

### 1. Queue or payload contract mismatch

Symptom:

- Transaction is created successfully.
- RabbitMQ shows a message was sent.
- Analytics or Notification service does not update MongoDB.

Common root cause in this repo:

- After removing the wallet limit feature, `notification-service` no longer depends on the legacy limit field in `WalletBalanceUpdatedEvent`.
- If notification behavior is extended later, keep the shared event contract aligned around fields like `userId`, `walletId`, `walletName`, `newBalance`, and `transactionId`.

Fast fix:

- Keep event contracts in one shared file or package to avoid drift.
- Prefer validating the queue payload with a shared TypeScript type before publishing/consuming.

### 2. Consumer swallows exception and still `ack`s the message

Symptom:

- Event enters queue.
- Consumer logs one parsing or runtime error.
- Message disappears and no retry happens.

Common root cause in this repo:

- Both analytics and notification consumers call `channel.ack(msg)` even inside `catch`.
- That causes silent message loss.

Fast fix:

- Replace `ack` in error path with one of these:
  - `channel.nack(msg, false, true)` for retry
  - `channel.nack(msg, false, false)` with a dead-letter queue
- Log the full payload and stack trace before nack.

### 3. Outbox publisher or queue binding is not actually active

Symptom:

- Transaction row exists in MongoDB.
- No message appears in RabbitMQ.
- `outbox` collection still contains unpublished records.

Common root cause in this repo:

- `transaction-service` relies on the outbox publisher timer.
- If publisher startup fails, or queue binding/routing key differs from consumer expectation, the flow stops after DB write.

Fast fix:

- Verify `outboxPublisher.start()` is executed during service boot.
- Inspect `outbox` collection for `published: false` records.
- Verify these names match exactly across producer and consumer:
  - exchange: `transaction.events`
  - routing key: `transaction.created`
  - queue: `wallet.balance.updates`
  - queue: `analytics.transaction.events`

## Recommended Debug Order

When the flow is broken, debug in this exact order:

1. Check `transactions` collection for the new row.
2. Check outbox records for unpublished events.
3. Check RabbitMQ exchange and queue depth.
4. Check `wallets` balance/version update.
5. Check `monthly_aggregates` current month document.
6. Check `notifications` collection.
