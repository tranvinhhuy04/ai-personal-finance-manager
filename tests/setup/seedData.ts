import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Decimal128, MongoClient, ObjectId } from 'mongodb';

const TEST_EMAIL = 'test030526@gmail.com';
const TEST_PASSWORD = '12345678';
const GEMINI_API_KEY = 'AIzaSyCOBfS3FRdjqZqiGOqjCoeHlq1KxajKZvk';
const SUMMARY_PATH = path.resolve(__dirname, 'seed-summary.json');

type WalletSeed = {
  id: ObjectId;
  name: string;
  type: 'CASH' | 'CARD' | 'MOMO';
  initialBalance: number;
};

type CategorySeed = {
  id: ObjectId;
  name: string;
  type: 'INCOME' | 'EXPENSE';
};

type SeedSummary = {
  account: {
    email: string;
    password: string;
  };
  period: {
    from: string;
    to: string;
  };
  counts: {
    transactions: number;
    wallets: number;
    categories: number;
  };
  expected: {
    totalBalance: number;
    totalIncome: number;
    totalExpense: number;
    totalExpense2025: number;
    foodExpenseApr2026: number;
  };
};

type Connections = {
  identityClient: MongoClient;
  walletClient: MongoClient;
  transactionClient: MongoClient;
  identityDbName: string;
  walletDbName: string;
  transactionDbName: string;
};

type TxDoc = {
  user_id: string;
  wallet_id: string;
  category_id: string;
  amount: Decimal128;
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

function toDecimal(value: number): Decimal128 {
  return Decimal128.fromString(String(Math.round(value)));
}

function loadEnv() {
  const root = path.resolve(__dirname, '../../be/.env');
  const serviceEnvs = [
    path.resolve(__dirname, '../../be/service-identity/.env'),
    path.resolve(__dirname, '../../be/service-wallet/.env'),
    path.resolve(__dirname, '../../be/service-transaction/.env'),
  ];

  if (fs.existsSync(root)) {
    dotenv.config({ path: root, override: false });
  }

  for (const envPath of serviceEnvs) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
    }
  }
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

function dbNameFromUri(uri: string): string {
  const parsed = new URL(uri);
  const dbName = parsed.pathname.replace(/^\//, '').trim();
  if (!dbName) throw new Error(`Mongo URI does not contain DB name: ${uri}`);
  return dbName;
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rand: () => number, min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randomPick<T>(rand: () => number, items: T[]): T {
  return items[randomInt(rand, 0, items.length - 1)];
}

function chance(rand: () => number, probability: number) {
  return rand() < probability;
}

function randomTime(date: Date, rand: () => number, fromHour = 7, toHour = 21): Date {
  const cloned = new Date(date);
  cloned.setUTCHours(randomInt(rand, fromHour, toHour), randomInt(rand, 0, 59), randomInt(rand, 0, 59), 0);
  return cloned;
}

function eachDayInclusive(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function stableIdempotency(...parts: string[]) {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

function parseVnMonth(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}/${year}`;
}

async function createConnections(): Promise<Connections> {
  loadEnv();

  const identityUri = required('MONGO_URI', process.env.MONGO_URI_IDENTITY);
  const walletUri = required('MONGO_URI_WALLET');
  const transactionUri = required('MONGO_URI_TRANSACTION');

  const identityClient = new MongoClient(identityUri);
  const walletClient = new MongoClient(walletUri);
  const transactionClient = new MongoClient(transactionUri);

  await Promise.all([
    identityClient.connect(),
    walletClient.connect(),
    transactionClient.connect(),
  ]);

  return {
    identityClient,
    walletClient,
    transactionClient,
    identityDbName: dbNameFromUri(identityUri),
    walletDbName: dbNameFromUri(walletUri),
    transactionDbName: dbNameFromUri(transactionUri),
  };
}

async function cleanupExistingData(identityDb: any, walletDb: any, transactionDb: any) {
  const users = identityDb.collection('users');
  const settings = identityDb.collection('usersettings');
  const matchedUsers = await users.find({ email: TEST_EMAIL }).toArray();

  const userIds = matchedUsers.map((item: any) => item._id);
  if (userIds.length > 0) {
    await Promise.all([
      settings.deleteMany({ userId: { $in: userIds } }),
      users.deleteMany({ _id: { $in: userIds } }),
    ]);

    const userIdStrings = userIds.map((id: ObjectId) => id.toString());

    await Promise.all([
      walletDb.collection('wallets').deleteMany({ user_id: { $in: userIdStrings } }),
      transactionDb.collection('transactions').deleteMany({ user_id: { $in: userIdStrings } }),
      transactionDb.collection('categories').deleteMany({ userId: { $in: userIdStrings } }),
      transactionDb.collection('recurring_rules').deleteMany({ user_id: { $in: userIdStrings } }),
      transactionDb.collection('savings').deleteMany({ user_id: { $in: userIdStrings } }),
      transactionDb.collection('invoices').deleteMany({ user_id: { $in: userIdStrings } }),
      transactionDb.collection('outbox').deleteMany({ 'payload.user_id': { $in: userIdStrings } }),
    ]);
  }
}

async function ensureCategories(transactionDb: any, userId: string): Promise<Record<string, CategorySeed>> {
  const now = new Date();
  const categories = [
    { name: 'Lương', type: 'INCOME' as const, key: 'salary' },
    { name: 'Thưởng', type: 'INCOME' as const, key: 'bonus' },
    { name: 'Ăn uống', type: 'EXPENSE' as const, key: 'food' },
    { name: 'Di chuyển', type: 'EXPENSE' as const, key: 'transport' },
    { name: 'Hóa đơn', type: 'EXPENSE' as const, key: 'bills' },
    { name: 'Mua sắm', type: 'EXPENSE' as const, key: 'shopping' },
    { name: 'Tiết kiệm', type: 'EXPENSE' as const, key: 'saving' },
  ];

  const categoryCol = transactionDb.collection('categories');

  await categoryCol.deleteMany({
    $or: [
      { userId },
      { user_id: userId },
      { userId: 'SYSTEM', name: { $in: categories.map((item) => item.name) } },
    ],
  });

  const docs = categories.map((item) => ({
    userId,
    name: item.name,
    categoryType: item.type,
    parentId: null,
    isSystem: false,
    status: 1,
    createdAt: now,
    updatedAt: now,
  }));

  const inserted = await categoryCol.insertMany(docs);
  const result: Record<string, CategorySeed> = {};

  categories.forEach((item, index) => {
    result[item.key] = {
      id: inserted.insertedIds[index],
      name: item.name,
      type: item.type,
    };
  });

  return result;
}

function createTx(params: {
  userId: string;
  walletId: string;
  categoryId: string;
  amount: number;
  transactionType: 'INCOME' | 'EXPENSE';
  description: string;
  at: Date;
  idempotencyParts: string[];
}): TxDoc {
  return {
    user_id: params.userId,
    wallet_id: params.walletId,
    category_id: params.categoryId,
    amount: toDecimal(params.amount),
    transaction_type: params.transactionType,
    type: params.transactionType,
    currency: 'VND',
    description: params.description,
    occurred_at: params.at,
    transaction_date: params.at,
    source: 'MANUAL',
    status: 'COMPLETED',
    idempotency_key: stableIdempotency(...params.idempotencyParts),
    createdAt: params.at,
    updatedAt: params.at,
  };
}

function createTransactions(params: {
  userId: string;
  wallets: WalletSeed[];
  categories: Record<string, CategorySeed>;
}): { transactions: TxDoc[]; summary: SeedSummary['expected'] } {
  const rand = mulberry32(20260503);
  const start = new Date('2024-05-03T00:00:00.000Z');
  const end = new Date('2026-05-03T23:59:59.999Z');
  const allDays = eachDayInclusive(start, end);

  const byWallet = new Map<string, number>();
  params.wallets.forEach((wallet) => byWallet.set(wallet.id.toString(), wallet.initialBalance));

  const txs: TxDoc[] = [];
  let totalIncome = 0;
  let totalExpense = 0;
  let expense2025 = 0;
  let foodExpenseApr2026 = 0;

  const add = (tx: TxDoc) => {
    txs.push(tx);
    const amount = Number(tx.amount.toString());
    const walletBalance = byWallet.get(tx.wallet_id) ?? 0;

    if (tx.transaction_type === 'INCOME') {
      totalIncome += amount;
      byWallet.set(tx.wallet_id, walletBalance + amount);
    } else {
      totalExpense += amount;
      byWallet.set(tx.wallet_id, walletBalance - amount);

      const year = tx.occurred_at.getUTCFullYear();
      if (year === 2025) {
        expense2025 += amount;
      }

      const month = tx.occurred_at.getUTCMonth() + 1;
      if (year === 2026 && month === 4 && tx.category_id === params.categories.food.id.toString()) {
        foodExpenseApr2026 += amount;
      }
    }
  };

  for (const day of allDays) {
    const date = new Date(day);
    const dateKey = date.toISOString().slice(0, 10);
    const monthLabel = parseVnMonth(date);
    const dayOfMonth = date.getUTCDate();
    const weekDay = date.getUTCDay();

    if (dayOfMonth === 5) {
      const salary = randomInt(rand, 18_000_000, 26_000_000);
      add(
        createTx({
          userId: params.userId,
          walletId: params.wallets[1].id.toString(),
          categoryId: params.categories.salary.id.toString(),
          amount: salary,
          transactionType: 'INCOME',
          description: `Luong thang ${monthLabel}`,
          at: randomTime(date, rand, 8, 10),
          idempotencyParts: ['salary', dateKey, String(salary)],
        }),
      );
    }

    if (dayOfMonth === 20 && chance(rand, 0.4)) {
      const bonus = randomInt(rand, 1_000_000, 4_000_000);
      add(
        createTx({
          userId: params.userId,
          walletId: params.wallets[1].id.toString(),
          categoryId: params.categories.bonus.id.toString(),
          amount: bonus,
          transactionType: 'INCOME',
          description: `Thuong them ${monthLabel}`,
          at: randomTime(date, rand, 10, 17),
          idempotencyParts: ['bonus', dateKey, String(bonus)],
        }),
      );
    }

    if (dayOfMonth === 2) {
      const bills = randomInt(rand, 1_200_000, 2_400_000);
      add(
        createTx({
          userId: params.userId,
          walletId: params.wallets[1].id.toString(),
          categoryId: params.categories.bills.id.toString(),
          amount: bills,
          transactionType: 'EXPENSE',
          description: `Hoa don sinh hoat ${monthLabel}`,
          at: randomTime(date, rand, 18, 21),
          idempotencyParts: ['bills', dateKey, String(bills)],
        }),
      );
    }

    if (dayOfMonth === 25) {
      const saving = randomInt(rand, 1_500_000, 4_000_000);
      add(
        createTx({
          userId: params.userId,
          walletId: params.wallets[2].id.toString(),
          categoryId: params.categories.saving.id.toString(),
          amount: saving,
          transactionType: 'EXPENSE',
          description: `Chuyen vao quy tiet kiem ${monthLabel}`,
          at: randomTime(date, rand, 9, 12),
          idempotencyParts: ['saving', dateKey, String(saving)],
        }),
      );
    }

    if (chance(rand, 0.66)) {
      const food = randomInt(rand, 35_000, 190_000);
      add(
        createTx({
          userId: params.userId,
          walletId: chance(rand, 0.55) ? params.wallets[0].id.toString() : params.wallets[2].id.toString(),
          categoryId: params.categories.food.id.toString(),
          amount: food,
          transactionType: 'EXPENSE',
          description: randomPick(rand, ['An sang', 'An trua', 'An toi', 'Cafe']),
          at: randomTime(date, rand, 7, 21),
          idempotencyParts: ['food', dateKey, String(food), String(txs.length)],
        }),
      );
    }

    if (weekDay >= 1 && weekDay <= 5 && chance(rand, 0.35)) {
      const move = randomInt(rand, 20_000, 120_000);
      add(
        createTx({
          userId: params.userId,
          walletId: chance(rand, 0.5) ? params.wallets[0].id.toString() : params.wallets[2].id.toString(),
          categoryId: params.categories.transport.id.toString(),
          amount: move,
          transactionType: 'EXPENSE',
          description: randomPick(rand, ['Do xang', 'Gui xe', 'Grab di lam']),
          at: randomTime(date, rand, 6, 20),
          idempotencyParts: ['transport', dateKey, String(move), String(txs.length)],
        }),
      );
    }

    if ((weekDay === 0 || weekDay === 6) && chance(rand, 0.4)) {
      const shopping = randomInt(rand, 180_000, 2_000_000);
      add(
        createTx({
          userId: params.userId,
          walletId: params.wallets[1].id.toString(),
          categoryId: params.categories.shopping.id.toString(),
          amount: shopping,
          transactionType: 'EXPENSE',
          description: randomPick(rand, ['Mua sam cuoi tuan', 'Giai tri', 'Di sieu thi']),
          at: randomTime(date, rand, 9, 22),
          idempotencyParts: ['shopping', dateKey, String(shopping), String(txs.length)],
        }),
      );
    }
  }

  const totalBalance = params.wallets.reduce((sum, wallet) => sum + (byWallet.get(wallet.id.toString()) ?? 0), 0);

  return {
    transactions: txs.sort((a, b) => a.occurred_at.getTime() - b.occurred_at.getTime()),
    summary: {
      totalBalance,
      totalIncome,
      totalExpense,
      totalExpense2025: expense2025,
      foodExpenseApr2026,
    },
  };
}

export async function seedData(options?: { writeSummaryFile?: boolean; loadFromFile?: boolean }): Promise<SeedSummary> {
  const writeSummaryFile = options?.writeSummaryFile ?? true;
  const loadFromFile = options?.loadFromFile ?? (process.env.SKIP_SEED === '1');

  if (loadFromFile) {
    if (!fs.existsSync(SUMMARY_PATH)) {
      throw new Error(`SKIP_SEED=1 but no seed-summary.json found at ${SUMMARY_PATH}`);
    }
    const raw = fs.readFileSync(SUMMARY_PATH, 'utf8');
    return JSON.parse(raw) as SeedSummary;
  }

  const connections = await createConnections();

  const identityDb = connections.identityClient.db(connections.identityDbName);
  const walletDb = connections.walletClient.db(connections.walletDbName);
  const transactionDb = connections.transactionClient.db(connections.transactionDbName);

  try {
    await cleanupExistingData(identityDb, walletDb, transactionDb);

    const now = new Date();
    const usersCol = identityDb.collection('users');
    const settingsCol = identityDb.collection('usersettings');

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const createdUser = await usersCol.insertOne({
      email: TEST_EMAIL,
      passwordHash,
      fullName: 'Playwright E2E User',
      phone: null,
      status: 1,
      createdAt: now,
      updatedAt: now,
    });

    const userId = createdUser.insertedId.toString();

    await settingsCol.insertOne({
      userId: createdUser.insertedId,
      twoFactorEnabled: false,
      theme: 'dark',
      twoFactorMethod: null,
      twoFactorSecret: null,
      preferredCurrency: 'VND',
      locale: 'vi-VN',
      gemini_api_key: GEMINI_API_KEY,
      selected_ai_model: 'gemini-2.5-flash',
      ai_usage_logs: [],
      updatedAt: now,
    });

    const walletCol = walletDb.collection('wallets');
    const walletSeeds: Omit<WalletSeed, 'id'>[] = [
      { name: 'Vi Tien Mat', type: 'CASH', initialBalance: 4_000_000 },
      { name: 'The Tin Dung', type: 'CARD', initialBalance: 12_000_000 },
      { name: 'Vi MoMo', type: 'MOMO', initialBalance: 3_000_000 },
    ];

    const walletInsert = await walletCol.insertMany(
      walletSeeds.map((wallet) => ({
        user_id: userId,
        wallet_type: wallet.type,
        wallet_name: wallet.name,
        balance: toDecimal(wallet.initialBalance),
        processed_transaction_ids: [],
        status: 1,
        version: 0,
        createdAt: now,
        updatedAt: now,
      })),
    );

    const wallets: WalletSeed[] = walletSeeds.map((wallet, index) => ({
      ...wallet,
      id: walletInsert.insertedIds[index],
    }));

    const categories = await ensureCategories(transactionDb, userId);
    const generated = createTransactions({ userId, wallets, categories });

    await transactionDb.collection('transactions').insertMany(generated.transactions, { ordered: true });

    const walletDeltas = new Map<string, number>();
    wallets.forEach((wallet) => walletDeltas.set(wallet.id.toString(), wallet.initialBalance));

    for (const tx of generated.transactions) {
      const current = walletDeltas.get(tx.wallet_id) ?? 0;
      const amount = Number(tx.amount.toString());
      walletDeltas.set(tx.wallet_id, tx.transaction_type === 'INCOME' ? current + amount : current - amount);
    }

    await Promise.all(
      wallets.map((wallet) =>
        walletCol.updateOne(
          { _id: wallet.id },
          {
            $set: {
              balance: toDecimal(walletDeltas.get(wallet.id.toString()) ?? wallet.initialBalance),
              updatedAt: now,
            },
          },
        ),
      ),
    );

    const summary: SeedSummary = {
      account: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
      period: {
        from: '2024-05-03',
        to: '2026-05-03',
      },
      counts: {
        transactions: generated.transactions.length,
        wallets: wallets.length,
        categories: Object.keys(categories).length,
      },
      expected: {
        totalBalance: generated.summary.totalBalance,
        totalIncome: generated.summary.totalIncome,
        totalExpense: generated.summary.totalExpense,
        totalExpense2025: generated.summary.totalExpense2025,
        foodExpenseApr2026: generated.summary.foodExpenseApr2026,
      },
    };

    if (writeSummaryFile) {
      await fs.promises.writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2), 'utf8');
    }

    return summary;
  } finally {
    await Promise.allSettled([
      connections.identityClient.close(),
      connections.walletClient.close(),
      connections.transactionClient.close(),
    ]);
  }
}

if (require.main === module) {
  seedData({ writeSummaryFile: true })
    .then((summary) => {
      console.log('[seed] completed');
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error) => {
      console.error('[seed] failed');
      console.error(error);
      process.exitCode = 1;
    });
}
