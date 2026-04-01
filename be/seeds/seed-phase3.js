'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../service-identity/.env'), override: false });

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const TEST_ACCOUNT = {
  email: 'test2@gmail.com',
  password: '12345678',
  fullName: 'Phase 3 Test User',
};

function ensureUri(name, fallback) {
  const value = process.env[name] || (fallback ? process.env[fallback] : undefined);
  if (!value) {
    throw new Error(`Missing required env: ${name}${fallback ? ` or ${fallback}` : ''}`);
  }
  return value;
}

function dec(value) {
  return mongoose.Types.Decimal128.fromString(String(value));
}

function money(value) {
  return Number(value).toLocaleString('vi-VN');
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function addMonths(date, offset) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, date.getUTCDate(), 9, 0, 0, 0));
}

function monthKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function section(title) {
  console.log(`\n${'='.repeat(64)}`);
  console.log(title);
  console.log('='.repeat(64));
}

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, default: '' },
    phone: { type: String, default: null },
    status: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'users' }
);

const walletSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    wallet_type: { type: String, required: true },
    wallet_name: { type: String, required: true },
    balance: { type: mongoose.Schema.Types.Decimal128, required: true },
    spending_limit: { type: mongoose.Schema.Types.Decimal128, default: null },
    version: { type: Number, default: 0 },
    status: { type: Number, default: 1 },
  },
  { versionKey: false, timestamps: true, collection: 'wallets' }
);

const categorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    categoryType: { type: String, required: true },
    parentId: { type: String, default: null },
    isSystem: { type: Boolean, default: false },
    status: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'categories' }
);

const transactionSchema = new mongoose.Schema(
  {
    walletId: { type: String, required: true, index: true },
    wallet_id: { type: String, default: null, index: true },
    userId: { type: String, required: true, index: true },
    user_id: { type: String, default: null, index: true },
    categoryId: { type: String, required: true },
    category_id: { type: String, default: null },
    transactionType: { type: String, required: true },
    transaction_type: { type: String, default: null },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true, default: 'VND' },
    status: { type: String, required: true, default: 'COMPLETED' },
    description: { type: String, default: null },
    occurredAt: { type: Date, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    idempotency_key: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'transactions' }
);

const monthlyAggregateSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    month: { type: String, required: true, index: true },
    totalIncome: { type: Number, required: true, default: 0 },
    totalExpense: { type: Number, required: true, default: 0 },
    netCashFlow: { type: Number, required: true, default: 0 },
    byCategory: { type: Array, default: [] },
    byWallet: { type: Array, default: [] },
    generatedAt: { type: Date, required: true, default: Date.now },
    sourceVersion: { type: Number, required: true, default: 0 },
  },
  { versionKey: false, timestamps: true, collection: 'monthly_aggregates' }
);

const notificationSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    title: { type: String, required: true },
  },
  { versionKey: false, collection: 'notifications' }
);

function buildSeedTransactions({ walletIds, categoryIds }) {
  const currentMonth = startOfMonth(new Date());
  const twoMonthsAgo = addMonths(currentMonth, -2);
  const lastMonth = addMonths(currentMonth, -1);

  return [
    {
      walletId: walletIds.vietcombank,
      categoryId: categoryIds.salary,
      transactionType: 'INCOME',
      amount: 18000000,
      description: 'Luong thang truoc 2',
      occurredAt: addMonths(twoMonthsAgo, 0),
    },
    {
      walletId: walletIds.momo,
      categoryId: categoryIds.food,
      transactionType: 'EXPENSE',
      amount: 1200000,
      description: 'An uong tuan 1',
      occurredAt: new Date(Date.UTC(twoMonthsAgo.getUTCFullYear(), twoMonthsAgo.getUTCMonth(), 8, 9, 0, 0, 0)),
    },
    {
      walletId: walletIds.vietcombank,
      categoryId: categoryIds.shopping,
      transactionType: 'EXPENSE',
      amount: 2800000,
      description: 'Mua sam gia dung',
      occurredAt: new Date(Date.UTC(twoMonthsAgo.getUTCFullYear(), twoMonthsAgo.getUTCMonth(), 18, 9, 0, 0, 0)),
    },
    {
      walletId: walletIds.vietcombank,
      categoryId: categoryIds.salary,
      transactionType: 'INCOME',
      amount: 20000000,
      description: 'Luong thang truoc',
      occurredAt: new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth(), 2, 9, 0, 0, 0)),
    },
    {
      walletId: walletIds.momo,
      categoryId: categoryIds.food,
      transactionType: 'EXPENSE',
      amount: 1500000,
      description: 'An uong giua thang',
      occurredAt: new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth(), 6, 9, 0, 0, 0)),
    },
    {
      walletId: walletIds.vietcombank,
      categoryId: categoryIds.shopping,
      transactionType: 'EXPENSE',
      amount: 3200000,
      description: 'Mua sam do cong nghe',
      occurredAt: new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth(), 12, 9, 0, 0, 0)),
    },
    {
      walletId: walletIds.vietcombank,
      categoryId: categoryIds.food,
      transactionType: 'EXPENSE',
      amount: 850000,
      description: 'An uong tiep khach',
      occurredAt: new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth(), 22, 9, 0, 0, 0)),
    },
    {
      walletId: walletIds.vietcombank,
      categoryId: categoryIds.salary,
      transactionType: 'INCOME',
      amount: 22000000,
      description: 'Luong thang hien tai',
      occurredAt: new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 1, 9, 0, 0, 0)),
    },
    {
      walletId: walletIds.momo,
      categoryId: categoryIds.food,
      transactionType: 'EXPENSE',
      amount: 1100000,
      description: 'An uong thang hien tai',
      occurredAt: new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 7, 9, 0, 0, 0)),
    },
    {
      walletId: walletIds.vietcombank,
      categoryId: categoryIds.shopping,
      transactionType: 'EXPENSE',
      amount: 2400000,
      description: 'Mua sam thang hien tai',
      occurredAt: new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 15, 9, 0, 0, 0)),
    },
  ];
}

function buildAggregates(transactions, categoriesById, walletsById, userId) {
  const bucket = new Map();

  for (const transaction of transactions) {
    const key = monthKey(transaction.occurredAt);
    if (!bucket.has(key)) {
      bucket.set(key, {
        user_id: userId,
        month: key,
        totalIncome: 0,
        totalExpense: 0,
        netCashFlow: 0,
        byCategory: new Map(),
        byWallet: new Map(),
        generatedAt: new Date(),
        sourceVersion: 1,
      });
    }

    const month = bucket.get(key);
    const amount = transaction.amount;
    const category = categoriesById[transaction.categoryId];
    const wallet = walletsById[transaction.walletId];

    if (transaction.transactionType === 'INCOME') {
      month.totalIncome += amount;
      month.netCashFlow += amount;
    } else {
      month.totalExpense += amount;
      month.netCashFlow -= amount;
    }

    const categoryEntry = month.byCategory.get(transaction.categoryId) || {
      category_id: transaction.categoryId,
      category_name: category.name,
      total_amount: 0,
      transaction_count: 0,
    };
    categoryEntry.total_amount += amount;
    categoryEntry.transaction_count += 1;
    month.byCategory.set(transaction.categoryId, categoryEntry);

    const walletEntry = month.byWallet.get(transaction.walletId) || {
      wallet_id: transaction.walletId,
      wallet_name: wallet.name,
      total_amount: 0,
      transaction_count: 0,
    };
    walletEntry.total_amount += amount;
    walletEntry.transaction_count += 1;
    month.byWallet.set(transaction.walletId, walletEntry);
  }

  return Array.from(bucket.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((item) => ({
      user_id: item.user_id,
      month: item.month,
      totalIncome: item.totalIncome,
      totalExpense: item.totalExpense,
      netCashFlow: item.netCashFlow,
      byCategory: Array.from(item.byCategory.values()),
      byWallet: Array.from(item.byWallet.values()),
      generatedAt: item.generatedAt,
      sourceVersion: item.sourceVersion,
    }));
}

async function main() {
  const uris = {
    auth: ensureUri('MONGO_URI', null),
    wallet: ensureUri('MONGO_URI_WALLET', 'MONGO_URI'),
    transaction: ensureUri('MONGO_URI_TRANSACTION', 'MONGO_URI'),
    analytics: ensureUri('MONGO_URI_ANALYTICS', 'MONGO_URI'),
    notification: ensureUri('MONGO_URI_NOTIFICATION', 'MONGO_URI'),
  };

  const uniqueUris = new Set(Object.values(uris));
  if (uniqueUris.size === 1) {
    console.log('[seed-phase3] Notice: all services currently point to the same MongoDB database URI.');
    console.log('[seed-phase3] Seed data will still work for the current runtime, but databases are not isolated by service.');
  }

  const authConn = await mongoose.createConnection(uris.auth).asPromise();
  const walletConn = await mongoose.createConnection(uris.wallet).asPromise();
  const transactionConn = await mongoose.createConnection(uris.transaction).asPromise();
  const analyticsConn = await mongoose.createConnection(uris.analytics).asPromise();
  const notificationConn = await mongoose.createConnection(uris.notification).asPromise();

  const User = authConn.model('users', userSchema);
  const Wallet = walletConn.model('wallets', walletSchema);
  const Category = transactionConn.model('categories', categorySchema);
  const Transaction = transactionConn.model('transactions', transactionSchema);
  const MonthlyAggregate = analyticsConn.model('monthly_aggregates', monthlyAggregateSchema);
  const Notification = notificationConn.model('notifications', notificationSchema);

  try {
    section('PHASE 3 SEED START');

    const existingUser = await User.findOne({ email: TEST_ACCOUNT.email }).lean();
    const existingUserId = existingUser?._id?.toString?.() || null;

    if (existingUserId) {
      console.log(`[cleanup] found existing user ${TEST_ACCOUNT.email} -> ${existingUserId}`);
      await Promise.all([
        Wallet.deleteMany({ user_id: existingUserId }),
        Category.deleteMany({ userId: existingUserId }),
        Transaction.deleteMany({ userId: existingUserId }),
        MonthlyAggregate.deleteMany({ user_id: existingUserId }),
        Notification.deleteMany({ user_id: existingUserId }),
        User.deleteMany({ _id: existingUser._id }),
      ]);
    }

    section('1. Identity Seed');
    const passwordHash = await bcrypt.hash(TEST_ACCOUNT.password, 12);
    const user = await User.create({
      email: TEST_ACCOUNT.email,
      passwordHash,
      fullName: TEST_ACCOUNT.fullName,
      phone: null,
      status: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const userId = user._id.toString();
    console.log(`user_id      : ${userId}`);
    console.log(`email        : ${TEST_ACCOUNT.email}`);
    console.log(`password     : ${TEST_ACCOUNT.password}`);

    section('2. Wallet Seed');
    const walletDocs = await Wallet.insertMany([
      {
        user_id: userId,
        wallet_type: 'CARD',
        wallet_name: 'Vietcombank',
        balance: dec(15000000),
        spending_limit: dec(20000000),
        version: 0,
        status: 1,
      },
      {
        user_id: userId,
        wallet_type: 'MOMO',
        wallet_name: 'MoMo',
        balance: dec(5000000),
        spending_limit: dec(10000000),
        version: 0,
        status: 1,
      },
    ]);

    const walletIds = {
      vietcombank: walletDocs[0]._id.toString(),
      momo: walletDocs[1]._id.toString(),
    };
    console.log(`Vietcombank  : ${walletIds.vietcombank} | balance ${money(15000000)} | limit ${money(20000000)}`);
    console.log(`MoMo         : ${walletIds.momo} | balance ${money(5000000)} | limit ${money(10000000)}`);

    section('3. Category Seed');
    const categoryDocs = await Category.insertMany([
      { userId, name: 'Luong', categoryType: 'INCOME', parentId: null, isSystem: false, status: 1, createdAt: new Date() },
      { userId, name: 'An uong', categoryType: 'EXPENSE', parentId: null, isSystem: false, status: 1, createdAt: new Date() },
      { userId, name: 'Mua sam', categoryType: 'EXPENSE', parentId: null, isSystem: false, status: 1, createdAt: new Date() },
    ]);

    const categoryIds = {
      salary: categoryDocs[0]._id.toString(),
      food: categoryDocs[1]._id.toString(),
      shopping: categoryDocs[2]._id.toString(),
    };
    console.log(`Luong        : ${categoryIds.salary}`);
    console.log(`An uong      : ${categoryIds.food}`);
    console.log(`Mua sam      : ${categoryIds.shopping}`);

    section('4. Transaction Seed');
    const transactionInputs = buildSeedTransactions({ walletIds, categoryIds });
    const transactionDocs = await Transaction.insertMany(
      transactionInputs.map((item) => {
        const idempotencyValue = randomUUID();

        return ({
        wallet_id: item.walletId,
        walletId: item.walletId,
        user_id: userId,
        userId,
        category_id: item.categoryId,
        categoryId: item.categoryId,
        transaction_type: item.transactionType,
        transactionType: item.transactionType,
        amount: dec(item.amount),
        currency: 'VND',
        status: 'COMPLETED',
        description: item.description,
        occurredAt: item.occurredAt,
        idempotencyKey: idempotencyValue,
        idempotency_key: idempotencyValue,
        createdAt: item.occurredAt,
      }); })
    );
    console.log(`transactions : ${transactionDocs.length} records inserted across 3 recent months`);

    const categoriesById = {
      [categoryIds.salary]: { name: 'Luong' },
      [categoryIds.food]: { name: 'An uong' },
      [categoryIds.shopping]: { name: 'Mua sam' },
    };
    const walletsById = {
      [walletIds.vietcombank]: { name: 'Vietcombank' },
      [walletIds.momo]: { name: 'MoMo' },
    };

    section('5. Analytics Aggregate Seed');
    const aggregateDocs = buildAggregates(
      transactionInputs.map((item) => ({ ...item, userId })),
      categoriesById,
      walletsById,
      userId
    );
    await MonthlyAggregate.insertMany(aggregateDocs);
    aggregateDocs.forEach((doc) => {
      console.log(`${doc.month} | income ${money(doc.totalIncome)} | expense ${money(doc.totalExpense)} | net ${money(doc.netCashFlow)}`);
    });

    section('SEED COMPLETE');
    console.log('Use these identifiers in Postman/UI test:');
    console.log(JSON.stringify({
      userId,
      wallets: walletIds,
      categories: categoryIds,
      login: {
        email: TEST_ACCOUNT.email,
        password: TEST_ACCOUNT.password,
      },
    }, null, 2));
  } finally {
    await Promise.all([
      authConn.close(),
      walletConn.close(),
      transactionConn.close(),
      analyticsConn.close(),
      notificationConn.close(),
    ]);
  }
}

main().catch((error) => {
  console.error('\n[seed-phase3] failed:', error);
  process.exit(1);
});