# OripioFin Phase 2 - Frontend Implementation

## Overview

This document describes the Phase 2 frontend implementation for OripioFin, a fintech application for managing multiple wallets and tracking transactions.

## Architecture

### Tech Stack
- **Framework**: React 19 with Vite 6.2.0
- **State Management**: Zustand 5.0.12 (useWalletStore, useTransactionStore)
- **Styling**: TailwindCSS 4.1.14 with Lucide icons
- **Animation**: Motion library
- **Routing**: React Router DOM 7.13.2

### Project Structure

```
fe/src/
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx      # Main layout with sidebar
│   │   ├── Sidebar.tsx               # Navigation sidebar
│   │   └── ...
│   └── dashboard/
│       ├── CreateWalletModal.tsx     # Add new wallet form
│       ├── EditWalletModal.tsx       # Edit wallet form
│       ├── CreateTransactionModal.tsx # 3-step transaction form
│       └── ...
├── pages/
│   ├── Wallets.tsx                   # Wallet management page
│   ├── Transactions.tsx               # Transaction history & creation
│   ├── Auth.tsx
│   └── ...
├── store/
│   ├── useAuthStore.ts               # Auth state (user, token)
│   └── useFinanceStore.ts            # Wallet & Transaction state (NEW)
├── lib/
│   ├── apiClient.ts                  # API client wrapper (NEW)
│   ├── utils.ts
│   └── mockData.ts
├── hooks/
│   ├── useDashboardData.ts
│   └── ...
└── App.tsx
```

## New Components

### 1. **Wallets.tsx** - Wallet Management Page
**Location**: `fe/src/pages/Wallets.tsx`

Displays all user wallets in a grid layout with:
- Wallet name, type (CARD/MOMO/ZALOPAY/CASH), balance
- Spending limit with progress bar
- Status badge (Active/Locked/Disabled)
- Edit and delete buttons
- "Add new wallet" button

**Features**:
- Real-time wallet list from API
- Create wallet via modal
- Edit wallet status/limit via modal
- Loading states and error handling

**Integration**:
```typescript
const { wallets, isLoading, fetchWallets, createWallet } = useWalletStore();
```

### 2. **CreateWalletModal.tsx** - Add New Wallet Form
**Location**: `fe/src/components/dashboard/CreateWalletModal.tsx`

Simple form to create a new wallet:
- Wallet type selector (dropdown)
- Wallet name (required text input)
- Spending limit (optional number input)

**Form Data**:
```typescript
{
  walletType: 'CARD' | 'MOMO' | 'ZALOPAY' | 'CASH',
  walletName: string,
  spendingLimit?: number
}
```

### 3. **EditWalletModal.tsx** - Edit Wallet Form
**Location**: `fe/src/components/dashboard/EditWalletModal.tsx`

Edit existing wallet properties:
- Status selector (Active/Locked/Disabled)
- Spending limit (editable number input)

**Features**:
- Pre-fills current values
- Validation
- Uses `apiClient.updateWallet()` for API calls

### 4. **CreateTransactionModal.tsx** - 3-Step Transaction Form
**Location**: `fe/src/components/dashboard/CreateTransactionModal.tsx`

**KPI Requirement**: Transaction creation in max 3 steps ✅

**Step 1: Select Wallet**
- Dropdown showing all wallets with current balance
- Selected wallet shows balance and limit

**Step 2: Select Category & Amount**
- Transaction type selector (INCOME/EXPENSE)
- Category dropdown (filters based on transaction type)
- Amount input
- Optional description

**Step 3: Confirm**
- Summary of all entered data
- Selected wallet, type, category, amount
- Confirm button to submit

**Features**:
- Step indicators with progress bar
- Previous/Next/Confirm buttons
- Full validation at each step
- Optimistic balance update after transaction
- Auto-refresh transaction list

**Form Data**:
```typescript
{
  walletId: string,
  categoryId: string,
  transactionType: 'INCOME' | 'EXPENSE',
  amount: number,
  description?: string,
  currency: 'VND'
}
```

### 5. **Updated Transactions.tsx** - Transaction History with Filters
**Location**: `fe/src/pages/Transactions.tsx`

Enhanced transaction page with:
- Search by transaction description
- Advanced filter panel:
  - Filter by wallet
  - Filter by category
  - Filter by status (COMPLETED/PENDING/FAILED/REVERSED)
  - Filter by date range (from/to)
- Transaction table showing:
  - Transaction ID (shortened)
  - Date
  - Description
  - Category
  - Amount with icon (income↓/expense↑)
  - Status badge with color coding
- Real-time data from backend
- "Ghi nhận giao dịch" button to open CreateTransactionModal

**Features**:
- Real-time transaction list from useTransactionStore
- Multiple filter combinations
- Dynamic category dropdown based on wallet type
- Status badges with Vietnamese labels
- Loading states and error handling
- Responsive table layout

## API Client Layer

**Location**: `fe/src/lib/apiClient.ts`

Wrapper around Fetch API that handles:
- Base URL configuration (from REACT_APP_API_URL env var)
- Auth header injection (JWT from localStorage)
- Error handling and response parsing
- Type safety with TypeScript

### Wallet Endpoints
```typescript
createWallet(data)              // POST /wallets
getWallets()                    // GET /wallets
getWallet(walletId)            // GET /wallets/:id
updateWallet(walletId, data)   // PUT /wallets/:id
updateWalletStatus(id, status) // PATCH /wallets/:id/status
updateWalletSpendingLimit(id, limit) // PATCH /wallets/:id/spending-limit
```

### Transaction Endpoints
```typescript
createTransaction(data)         // POST /transactions
getTransactions(limit, skip)   // GET /transactions
getTransaction(id)             // GET /transactions/:id
getWalletTransactions(id)      // GET /wallets/:id/transactions
createCategory(data)           // POST /categories
getCategories()                // GET /categories
```

## State Management

**Location**: `fe/src/store/useFinanceStore.ts`

Two Zustand stores for finance operations:

### WalletStore
```typescript
interface WalletStore {
  wallets: Wallet[]
  isLoading: boolean
  error: string | null
  fetchWallets(): Promise<void>
  createWallet(data): Promise<Wallet>
  updateWalletBalance(walletId, newBalance): void
  refreshWallets(): Promise<void>
}
```

**Key Feature**: `updateWalletBalance()` for optimistic UI updates
- Called immediately after transaction creation
- Updates wallet balance in store without waiting for server
- Automatic retry via backend consumer if transaction fails

### TransactionStore
```typescript
interface TransactionStore {
  transactions: Transaction[]
  categories: Category[]
  isLoading: boolean
  error: string | null
  fetchTransactions(limit?, skip?): Promise<void>
  fetchCategories(): Promise<void>
  createTransaction(data): Promise<Transaction>
  createCategory(data): Promise<Category>
  getWalletTransactions(walletId): Promise<Transaction[]>
  refreshTransactions(): Promise<void>
}
```

**Features**:
- Automatic API integration via apiClient
- Shared loading/error states
- Category filtering by type (INCOME/EXPENSE)

## Data Types

### Wallet
```typescript
interface Wallet {
  id: string
  userId: string
  walletType: 'CARD' | 'MOMO' | 'ZALOPAY' | 'CASH'
  walletName: string
  balance: string (Decimal as string)
  spendingLimit: string | null
  status: number (1=Active, 2=Locked, 0=Disabled)
  version: number (for optimistic locking)
  createdAt: string
  updatedAt: string
}
```

### Transaction
```typescript
interface Transaction {
  id: string
  walletId: string
  userId: string
  categoryId: string
  transactionType: 'INCOME' | 'EXPENSE'
  amount: string (Decimal as string)
  currency: string ('VND')
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED'
  description?: string
  occurredAt: string
  idempotencyKey: string
  createdAt: string
}
```

### Category
```typescript
interface Category {
  id: string
  userId: string
  name: string
  categoryType: 'INCOME' | 'EXPENSE'
  parentId: string | null
  isSystem: boolean
  status: number
  createdAt: string
}
```

## Routing

Added new route in App.tsx:
```typescript
<Route path="/wallets" element={<Wallets />} />
```

Sidebar automatically shows "Ví của tôi" (My Wallets) link.

## Environment Setup

### .env Configuration
Copy `.env.example` to `.env` and configure:
```env
# API Gateway URL
REACT_APP_API_URL=http://localhost:3000/api/v1

# Environment
REACT_APP_ENV=development
```

### Prerequisites
- Node.js 16+
- Backend services running:
  - API Gateway (port 3000)
  - Wallet Service (port 3002)
  - Transaction Service (port 3003)
  - RabbitMQ (port 5672)
  - MongoDB instances for wallet-service and transaction-service

## Usage Flow

### Creating a Wallet
1. Click "Ví của tôi" in sidebar
2. Click "Thêm ví mới" button
3. Select wallet type
4. Enter wallet name
5. Optionally set spending limit
6. Click "Tạo ví"

**Result**: New wallet appears in list with balance 0

### Recording a Transaction
1. Click "Giao dịch" in sidebar OR "Ghi nhận giao dịch" from any page
2. **Step 1**: Select wallet from dropdown
3. **Step 2**: 
   - Select transaction type (INCOME/EXPENSE)
   - Select category
   - Enter amount
   - Optionally add description
4. **Step 3**: Review summary and click "Xác nhận"

**Result**: 
- Transaction appears in history with PENDING status
- Wallet balance updates immediately (optimistic)
- Backend processes transaction asynchronously
- Status changes to COMPLETED when ready

### Viewing Transactions
1. Click "Giao dịch" in sidebar
2. Search by description using search box
3. Apply filters:
   - By wallet
   - By category
   - By status
   - By date range
4. View transaction table with real-time data

## Features Highlights

✅ **Real-time Data Sync**
- All lists load from backend on page mount
- Zustand stores keep data fresh

✅ **Optimistic UI Updates**
- Wallet balance updates immediately after transaction
- No "loading" state for user-visible data
- Automatic rollback if transaction fails

✅ **3-Step Transaction Form (KPI)**
- Max 3 steps to create transaction
- Progress indicator shows current step
- Validation at each step
- Clear summary before confirmation

✅ **Advanced Filtering**
- Multi-filter support (wallet, category, status, date)
- Real-time filtering without page reload
- Combined search and filter

✅ **Type Safety**
- Full TypeScript coverage
- All interfaces aligned with backend schemas
- IDE autocomplete for all API calls

✅ **Error Handling**
- Try-catch blocks at component level
- Error messages displayed to user
- Proper loading states during async operations

## Known Limitations & TODOs

- [ ] Wallet delete functionality (needs backend endpoint)
- [ ] Pagination for large transaction lists (consider infinite scroll)
- [ ] Toast notifications for action feedback
- [ ] Export transactions as CSV/PDF
- [ ] Real-time balance sync via WebSocket (currently polling)
- [ ] Offline transaction queuing

## Testing Checklist

- [ ] Wallets page loads and displays all wallets
- [ ] Create wallet modal works end-to-end
- [ ] Edit wallet modal updates status and limit
- [ ] 3-step transaction form validates properly
- [ ] Transaction creation updates balance immediately
- [ ] Transaction list filters work correctly
- [ ] Category dropdown filters by transaction type
- [ ] Search by description works
- [ ] Status badges show correct colors
- [ ] Error messages display on API failures
- [ ] Loading states appear during async operations

## Related Files

- Backend Phase 2 Design: `PHASE2_ARCHITECTURE.md`
- Backend Phase 2 Implementation: `PHASE2_IMPLEMENTATION_SUMMARY.md`
- API Gateway: `be/api-gateway/`
- Wallet Service: `be/service-wallet/`
- Transaction Service: `be/service-transaction/`

## Support

For issues or questions about the frontend implementation:
1. Check component prop types in TypeScript
2. Review Zustand store hooks in `useFinanceStore.ts`
3. Verify API endpoints in `apiClient.ts`
4. Check browser console for errors
5. Ensure backend services are running and accessible
