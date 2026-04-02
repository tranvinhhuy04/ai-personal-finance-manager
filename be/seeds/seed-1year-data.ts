import mongoose, { Connection, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

type WalletIds = {
  cashWalletId: string;
  bankWalletId: string;
};

type CategoryIds = {
  salary: string;
  bonus: string;
  food: string;
  shopping: string;
  bills: string;
  transport: string;
};

type SeedConnections = {
  authConn: Connection;
  walletConn: Connection;
  txConn: Connection;
  authDbName: string;
  walletDbName: string;
  txDbName: string;
};

type SeedTransaction = {
  user_id: string;
  wallet_id: string;
  category_id: string;
  amount: Types.Decimal128;
  transaction_type: 'INCOME' | 'EXPENSE';
  type: 'INCOME' | 'EXPENSE';
  currency: 'VND';
  description: string;
  occurred_at: Date;
  transaction_date: Date;
  source: 'MANUAL';
  status: 'COMPLETED';
  idempotency_key: string;
  createdAt: Date;
  updatedAt: Date;
};

const TEST_USER = {
  email: 'test@gmail.com',
  password: '123456',
  fullName: 'Test User 1 Year Seed',
};

function logStep(message: string) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(`📌 ${message}`);
  console.log(`${'='.repeat(72)}`);
}

function loadEnvFiles() {
  const rootEnv = path.resolve(__dirname, '../.env');
  const serviceEnvFiles = [
    path.resolve(__dirname, '../service-identity/.env'),
    path.resolve(__dirname, '../service-wallet/.env'),
    path.resolve(__dirname, '../service-transaction/.env'),
  ];

  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv, override: false });
  }

  for (const filePath of serviceEnvFiles) {
    if (fs.existsSync(filePath)) {
      // Service-level .env must win so the seed follows the same DBs as runtime.
      dotenv.config({ path: filePath, override: true });
    }
  }
}

function getDatabaseNameFromUri(uri: string): string {
  const url = new URL(uri);
  const dbName = url.pathname.replace(/^\//, '').trim();

  if (!dbName) {
    throw new Error(`Mongo URI does not contain a database name: ${maskMongoUri(uri)}`);
  }

  return dbName;
}

function getRequiredEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function maskMongoUri(uri: string) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

function toDecimal(value: number | string): Types.Decimal128 {
  return Types.Decimal128.fromString(String(Math.round(Number(value))));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function chance(probability: number): boolean {
  return Math.random() < probability;
}

function randomTimeOnDay(date: Date, startHour = 7, endHour = 21): Date {
  const copy = new Date(date);
  copy.setHours(randomInt(startHour, endHour), randomInt(0, 59), randomInt(0, 59), 0);
  return copy;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function formatMonth(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

async function createConnections(): Promise<SeedConnections> {
  loadEnvFiles();

  const authUri = getRequiredEnv('MONGO_URI', process.env.MONGO_URI_IDENTITY);
  const walletUri = getRequiredEnv('MONGO_URI_WALLET');
  const txUri = getRequiredEnv('MONGO_URI_TRANSACTION');

  const authDbName = getDatabaseNameFromUri(authUri);
  const walletDbName = getDatabaseNameFromUri(walletUri);
  const txDbName = getDatabaseNameFromUri(txUri);

  console.log('🔐 Using MongoDB URIs from each service .env:');
  console.log(`- auth        : ${maskMongoUri(authUri)}`);
  console.log(`- wallets     : ${maskMongoUri(walletUri)}`);
  console.log(`- transactions: ${maskMongoUri(txUri)}`);

  const [authConn, walletConn, txConn] = await Promise.all([
    mongoose.createConnection(authUri).asPromise(),
    mongoose.createConnection(walletUri).asPromise(),
    mongoose.createConnection(txUri).asPromise(),
  ]);

  return { authConn, walletConn, txConn, authDbName, walletDbName, txDbName };
}

async function seedUser(authConn: Connection): Promise<string> {
  logStep('1/4 - Seeding Identity user');

  const usersCol = authConn.collection('users');
  const userSettingsCol = authConn.collection('usersettings');

  const existingUsers = await usersCol.find({ email: TEST_USER.email }).toArray();
  const existingIds = existingUsers.map((user) => user._id as Types.ObjectId);

  if (existingIds.length > 0) {
    await userSettingsCol.deleteMany({ userId: { $in: existingIds } });
    await usersCol.deleteMany({ email: TEST_USER.email });
    console.log(`🧹 Removed ${existingIds.length} existing user(s) for ${TEST_USER.email}`);
  }

  const passwordHash = await bcrypt.hash(TEST_USER.password, 10);
  const now = new Date();

  const created = await usersCol.insertOne({
    email: TEST_USER.email,
    passwordHash,
    fullName: TEST_USER.fullName,
    phone: null,
    status: 1,
    createdAt: now,
    updatedAt: now,
  });

  await userSettingsCol.updateOne(
    { userId: created.insertedId },
    {
      $set: {
        twoFactorEnabled: false,
        theme: 'dark',
        preferredCurrency: 'VND',
        locale: 'vi-VN',
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const userId = created.insertedId.toString();
  console.log(`✅ User created: ${TEST_USER.email} | userId=${userId}`);
  return userId;
}

async function seedWallets(walletConn: Connection, userId: string): Promise<WalletIds> {
  logStep('2/4 - Seeding wallets');

  const walletsCol = walletConn.collection('wallets');
  await walletsCol.deleteMany({ user_id: userId });

  const now = new Date();
  const inserted = await walletsCol.insertMany([
    {
      user_id: userId,
      wallet_type: 'CASH',
      wallet_name: 'Tiền mặt',
      balance: toDecimal(5_000_000),
      status: 1,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      user_id: userId,
      wallet_type: 'CARD',
      wallet_name: 'Vietcombank',
      balance: toDecimal(25_000_000),
      status: 1,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const cashWalletId = inserted.insertedIds[0].toString();
  const bankWalletId = inserted.insertedIds[1].toString();

  console.log(`✅ Wallet created: Tiền mặt (${cashWalletId}) - 5,000,000đ`);
  console.log(`✅ Wallet created: Vietcombank (${bankWalletId}) - 25,000,000đ`);

  return { cashWalletId, bankWalletId };
}

async function seedCategories(txConn: Connection): Promise<CategoryIds> {
  logStep('3/4 - Seeding system categories');

  const categoriesCol = txConn.collection('categories');
  const now = new Date();
  const categoryNames = ['Lương', 'Thưởng', 'Ăn uống', 'Mua sắm', 'Hóa đơn', 'Di chuyển'];

  await categoriesCol.deleteMany({
    $or: [
      { userId: 'SYSTEM', isSystem: true, name: { $in: categoryNames } },
      { user_id: 'SYSTEM', is_system: true, name: { $in: categoryNames } },
    ],
  });

  const created = await categoriesCol.insertMany([
    {
      userId: 'SYSTEM',
      name: 'Lương',
      categoryType: 'INCOME',
      parentId: null,
      isSystem: true,
      status: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'SYSTEM',
      name: 'Thưởng',
      categoryType: 'INCOME',
      parentId: null,
      isSystem: true,
      status: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'SYSTEM',
      name: 'Ăn uống',
      categoryType: 'EXPENSE',
      parentId: null,
      isSystem: true,
      status: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'SYSTEM',
      name: 'Mua sắm',
      categoryType: 'EXPENSE',
      parentId: null,
      isSystem: true,
      status: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'SYSTEM',
      name: 'Hóa đơn',
      categoryType: 'EXPENSE',
      parentId: null,
      isSystem: true,
      status: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'SYSTEM',
      name: 'Di chuyển',
      categoryType: 'EXPENSE',
      parentId: null,
      isSystem: true,
      status: 1,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const ids = Object.values(created.insertedIds).map((value) => value.toString());
  console.log(`✅ Created ${ids.length} categories`);

  return {
    salary: ids[0],
    bonus: ids[1],
    food: ids[2],
    shopping: ids[3],
    bills: ids[4],
    transport: ids[5],
  };
}

function buildTransaction(
  userId: string,
  walletId: string,
  categoryId: string,
  amount: number,
  type: 'INCOME' | 'EXPENSE',
  description: string,
  date: Date,
): SeedTransaction {
  return {
    user_id: userId,
    wallet_id: walletId,
    category_id: categoryId,
    amount: toDecimal(amount),
    transaction_type: type,
    type,
    currency: 'VND',
    description,
    occurred_at: date,
    transaction_date: date,
    source: 'MANUAL',
    status: 'COMPLETED',
    idempotency_key: randomUUID(),
    createdAt: date,
    updatedAt: date,
  };
}

function generateOneYearTransactions(userId: string, wallets: WalletIds, categories: CategoryIds) {
  logStep('4/4 - Generating 1 year of transactions');

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  startDate.setHours(0, 0, 0, 0);

  const transactions: Array<{ required: boolean; doc: SeedTransaction }> = [];

  for (const cursor = new Date(startDate); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
    const date = new Date(cursor);

    if (date.getDate() === 5) {
      transactions.push({
        required: true,
        doc: buildTransaction(
          userId,
          wallets.bankWalletId,
          categories.salary,
          20_000_000,
          'INCOME',
          `Lương tháng ${formatMonth(date)}`,
          randomTimeOnDay(date, 8, 10),
        ),
      });
    }

    if (date.getDate() === 15) {
      transactions.push({
        required: true,
        doc: buildTransaction(
          userId,
          wallets.bankWalletId,
          categories.bills,
          randomInt(500_000, 1_000_000),
          'EXPENSE',
          pickOne([
            `Tiền điện tháng ${formatMonth(date)}`,
            `Tiền nước tháng ${formatMonth(date)}`,
            `Thanh toán hóa đơn sinh hoạt ${formatMonth(date)}`,
          ]),
          randomTimeOnDay(date, 18, 21),
        ),
      });
    }

    if (chance(0.62)) {
      transactions.push({
        required: false,
        doc: buildTransaction(
          userId,
          chance(0.65) ? wallets.cashWalletId : wallets.bankWalletId,
          categories.food,
          randomInt(30_000, 150_000),
          'EXPENSE',
          pickOne(['Ăn sáng', 'Ăn trưa', 'Ăn tối', 'Cafe & bánh ngọt', 'Đồ ăn nhanh']),
          randomTimeOnDay(date, 7, 20),
        ),
      });
    }

    if (chance(0.12)) {
      transactions.push({
        required: false,
        doc: buildTransaction(
          userId,
          chance(0.6) ? wallets.cashWalletId : wallets.bankWalletId,
          categories.food,
          randomInt(25_000, 120_000),
          'EXPENSE',
          pickOne(['Trà sữa', 'Cafe chiều', 'Ăn vặt', 'Bữa phụ buổi tối']),
          randomTimeOnDay(date, 14, 22),
        ),
      });
    }

    if (!isWeekend(date) && chance(0.10)) {
      transactions.push({
        required: false,
        doc: buildTransaction(
          userId,
          chance(0.7) ? wallets.cashWalletId : wallets.bankWalletId,
          categories.transport,
          randomInt(15_000, 80_000),
          'EXPENSE',
          pickOne(['Đổ xăng', 'Gửi xe', 'Grab đi làm', 'Xe buýt / di chuyển']),
          randomTimeOnDay(date, 6, 19),
        ),
      });
    }

    if (isWeekend(date) && chance(0.32)) {
      transactions.push({
        required: false,
        doc: buildTransaction(
          userId,
          chance(0.25) ? wallets.cashWalletId : wallets.bankWalletId,
          categories.shopping,
          randomInt(500_000, 2_000_000),
          'EXPENSE',
          pickOne([
            'Mua sắm cuối tuần',
            'Xem phim / giải trí',
            'Mua quần áo',
            'Đi siêu thị cuối tuần',
          ]),
          randomTimeOnDay(date, 10, 22),
        ),
      });
    }

    if (date.getDate() === 28 && chance(0.35)) {
      transactions.push({
        required: false,
        doc: buildTransaction(
          userId,
          wallets.bankWalletId,
          categories.bonus,
          randomInt(1_500_000, 5_000_000),
          'INCOME',
          pickOne(['Thưởng KPI', 'Thưởng dự án', 'Hoàn tiền / Bonus tháng']),
          randomTimeOnDay(date, 9, 16),
        ),
      });
    }
  }

  while (transactions.length < 300) {
    const randomDate = randomTimeOnDay(
      new Date(startDate.getTime() + randomInt(0, 364) * 24 * 60 * 60 * 1000),
      8,
      21,
    );

    transactions.push({
      required: false,
      doc: buildTransaction(
        userId,
        chance(0.65) ? wallets.cashWalletId : wallets.bankWalletId,
        chance(0.7) ? categories.food : categories.transport,
        chance(0.7) ? randomInt(30_000, 130_000) : randomInt(20_000, 70_000),
        'EXPENSE',
        chance(0.7) ? 'Chi tiêu phát sinh thêm' : 'Di chuyển phát sinh thêm',
        randomDate,
      ),
    });
  }

  while (transactions.length > 400) {
    const removableIndex = transactions.findIndex((item) => !item.required);
    if (removableIndex === -1) break;
    transactions.splice(removableIndex, 1);
  }

  transactions.sort(
    (a, b) => a.doc.transaction_date.getTime() - b.doc.transaction_date.getTime(),
  );

  console.log(`✅ Generated ${transactions.length} transactions in the last 365 days`);
  return transactions.map((item) => item.doc);
}

async function seedTransactions(
  txConn: Connection,
  userId: string,
  wallets: WalletIds,
  categories: CategoryIds,
) {
  const transactionsCol = txConn.collection('transactions');
  await transactionsCol.deleteMany({ user_id: userId });

  const docs = generateOneYearTransactions(userId, wallets, categories);
  await transactionsCol.insertMany(docs, { ordered: true });

  console.log(`✅ Inserted ${docs.length} transactions into collection: transactions`);
  return docs.length;
}

async function closeConnections(connections: Connection[]) {
  await Promise.allSettled(connections.map((conn) => conn.close()));
}

async function main() {
  let seedConnections: SeedConnections | null = null;

  try {
    logStep('Starting standalone seed script: seed-1year-data.ts');

    seedConnections = await createConnections();
    const { authConn, walletConn, txConn, authDbName, walletDbName, txDbName } = seedConnections;

    console.log(`✅ Connected to DBs: ${authDbName}, ${walletDbName}, ${txDbName}`);

    const userId = await seedUser(authConn);
    const wallets = await seedWallets(walletConn, userId);
    const categories = await seedCategories(txConn);
    const transactionCount = await seedTransactions(txConn, userId, wallets, categories);

    logStep('Seed completed successfully');
    console.log(`👤 User       : ${TEST_USER.email} / ${TEST_USER.password}`);
    console.log(`🆔 userId     : ${userId}`);
    console.log(`💼 Wallets    : 2`);
    console.log(`🗂 Categories : 6`);
    console.log(`💸 Transactions: ${transactionCount}`);
  } catch (error) {
    console.error('\n❌ Seed failed');
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (seedConnections) {
      await closeConnections([
        seedConnections.authConn,
        seedConnections.walletConn,
        seedConnections.txConn,
      ]);
      console.log('\n🔌 Closed all Mongo connections');
    }
  }
}

main();
