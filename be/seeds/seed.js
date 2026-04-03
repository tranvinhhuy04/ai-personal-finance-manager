'use strict';

/**
 * Fintech — Seed Script (Phase 2)
 * ===================================
 * Tạo dữ liệu mẫu cho 3 MongoDB databases:
 *   fintech_identity-service    → collection: users
 *   fintech_wallet-service      → collection: wallets
 *   fintech_transaction-service → collections: categories, transactions
 *
 * Cách chạy:
 *   cd be/seeds
 *   npm install
 *   node seed.js
 *
 * Biến môi trường (tự động load từ ../service-identity/.env hoặc đặt thủ công):
 *   MONGO_URI  — Atlas URI dùng cho fintech_auth (ví dụ trong be/.env)
 */

// Load .env từ service-identity (hoặc be root) — không báo lỗi nếu không tìm thấy
require('dotenv').config({ path: require('path').resolve(__dirname, '../service-identity/.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env'), override: false });

const { MongoClient, Decimal128 } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ── Config ────────────────────────────────────────────────────────────────────
const ATLAS_URI = process.env.MONGO_URI || process.env.MONGO_URI_IDENTITY;

if (!ATLAS_URI) {
  console.error(
    '✗ MONGO_URI (hoặc MONGO_URI_IDENTITY) is not set.\n' +
    '  Thêm MONGO_URI vào be/service-identity/.env\n' +
    '  Ví dụ: MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/fintech_identity-service?appName=Cluster0" node seed.js'
  );
  process.exit(1);
}

const TEST_USER = {
  email: 'test@gmail.com',
  password: '123456',
  fullName: 'Test User',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function dec(value) {
  return Decimal128.fromString(String(value));
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function section(title) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(50));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const client = new MongoClient(ATLAS_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB Atlas\n');

    const authDb   = client.db('fintech_identity-service');
    const walletDb = client.db('fintech_wallet-service');
    const txDb     = client.db('fintech_transaction-service');

    // ── 1. USERS ──────────────────────────────────────────────────────────────
    section('1/4  Seeding user');

    const usersCol = authDb.collection('users');

    // Xoá user cũ (nếu có) để tránh duplicate key khi chạy lại
    const deleted = await usersCol.deleteOne({ email: TEST_USER.email });
    if (deleted.deletedCount > 0) {
      console.log(`  ⚠  Removed existing user: ${TEST_USER.email}`);
    }

    const passwordHash = await bcrypt.hash(TEST_USER.password, 12);
    const now = new Date();

    const userResult = await usersCol.insertOne({
      email: TEST_USER.email,
      passwordHash,
      fullName: TEST_USER.fullName,
      phone: null,
      status: 1,
      createdAt: now,
      updatedAt: now,
    });

    const userId = userResult.insertedId.toString();
    console.log(`  ✓ User created`);
    console.log(`    id       : ${userId}`);
    console.log(`    email    : ${TEST_USER.email}`);
    console.log(`    password : ${TEST_USER.password}  (hashed w/ bcrypt rounds=12)`);

    // ── 2. WALLETS ────────────────────────────────────────────────────────────
    section('2/4  Seeding wallets');

    const walletsCol = walletDb.collection('wallets');
    await walletsCol.deleteMany({ userId });

    const walletResult = await walletsCol.insertMany([
      {
        userId,
        walletType:   'CARD',
        walletName:   'Tài khoản ngân hàng',
        balance:      dec(10_000_000),
        status:  1,
        version: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        userId,
        walletType:   'MOMO',
        walletName:   'Ví MoMo',
        balance:      dec(3_000_000),
        status:  1,
        version: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const walletIds     = Object.values(walletResult.insertedIds);
    const cardWalletId  = walletIds[0].toString();
    const momoWalletId  = walletIds[1].toString();

    console.log(`  ✓ CARD wallet  id: ${cardWalletId}  balance: 10,000,000 VND`);
    console.log(`  ✓ MOMO wallet  id: ${momoWalletId}  balance:  3,000,000 VND`);

    // ── 3. CATEGORIES ─────────────────────────────────────────────────────────
    section('3/4  Seeding categories');

    const catsCol = txDb.collection('categories');
    await catsCol.deleteMany({ userId });

    const catResult = await catsCol.insertMany([
      {
        userId,
        name:         'Lương',
        categoryType: 'INCOME',
        parentId:     null,
        isSystem:     false,
        status:       1,
        createdAt:    now,
      },
      {
        userId,
        name:         'Ăn uống',
        categoryType: 'EXPENSE',
        parentId:     null,
        isSystem:     false,
        status:       1,
        createdAt:    now,
      },
      {
        userId,
        name:         'Di chuyển',
        categoryType: 'EXPENSE',
        parentId:     null,
        isSystem:     false,
        status:       1,
        createdAt:    now,
      },
    ]);

    const catIds      = Object.values(catResult.insertedIds);
    const catLuong    = catIds[0].toString();
    const catAnUong   = catIds[1].toString();
    const catDiChuyen = catIds[2].toString();

    console.log(`  ✓ Lương     (INCOME)  id: ${catLuong}`);
    console.log(`  ✓ Ăn uống   (EXPENSE) id: ${catAnUong}`);
    console.log(`  ✓ Di chuyển (EXPENSE) id: ${catDiChuyen}`);

    // ── 4. TRANSACTIONS ───────────────────────────────────────────────────────
    section('4/4  Seeding transactions');

    const txCol = txDb.collection('transactions');
    await txCol.deleteMany({ userId });

    const transactions = [
      {
        walletId:        cardWalletId,
        userId,
        categoryId:      catLuong,
        transactionType: 'INCOME',
        amount:          dec(25_000_000),
        currency:        'VND',
        status:          'COMPLETED',
        description:     'Lương tháng 3/2026',
        occurredAt:      daysAgo(10),
        idempotencyKey:  uuidv4(),
        createdAt:       daysAgo(10),
      },
      {
        walletId:        cardWalletId,
        userId,
        categoryId:      catAnUong,
        transactionType: 'EXPENSE',
        amount:          dec(850_000),
        currency:        'VND',
        status:          'COMPLETED',
        description:     'Ăn tối nhà hàng Cơm Tấm Sài Gòn',
        occurredAt:      daysAgo(8),
        idempotencyKey:  uuidv4(),
        createdAt:       daysAgo(8),
      },
      {
        walletId:        momoWalletId,
        userId,
        categoryId:      catDiChuyen,
        transactionType: 'EXPENSE',
        amount:          dec(120_000),
        currency:        'VND',
        status:          'COMPLETED',
        description:     'Grab — đi làm buổi sáng',
        occurredAt:      daysAgo(5),
        idempotencyKey:  uuidv4(),
        createdAt:       daysAgo(5),
      },
      {
        walletId:        momoWalletId,
        userId,
        categoryId:      catAnUong,
        transactionType: 'EXPENSE',
        amount:          dec(65_000),
        currency:        'VND',
        status:          'COMPLETED',
        description:     'Bữa trưa văn phòng',
        occurredAt:      daysAgo(3),
        idempotencyKey:  uuidv4(),
        createdAt:       daysAgo(3),
      },
      {
        walletId:        cardWalletId,
        userId,
        categoryId:      catLuong,
        transactionType: 'INCOME',
        amount:          dec(5_000_000),
        currency:        'VND',
        status:          'COMPLETED',
        description:     'Thưởng dự án Q1/2026',
        occurredAt:      daysAgo(1),
        idempotencyKey:  uuidv4(),
        createdAt:       daysAgo(1),
      },
    ];

    await txCol.insertMany(transactions);

    transactions.forEach((t, i) => {
      const sign   = t.transactionType === 'INCOME' ? '+' : '-';
      const amount = Number(t.amount.toString()).toLocaleString('vi-VN');
      console.log(`  ✓ [${i + 1}] ${t.transactionType.padEnd(7)}  ${sign}${amount} VND  — ${t.description}`);
    });

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log(`\n${'═'.repeat(50)}`);
    console.log('  SEED COMPLETE — đăng nhập với:');
    console.log(`  email    : ${TEST_USER.email}`);
    console.log(`  password : ${TEST_USER.password}`);
    console.log('═'.repeat(50));
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('\n✗ Seed failed:', err.message ?? err);
  process.exit(1);
});
