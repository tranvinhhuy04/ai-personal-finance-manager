'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../service-identity/.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../service-wallet/.env'), override: false });
require('dotenv').config({ path: require('path').resolve(__dirname, '../service-transaction/.env'), override: false });

const { MongoClient, Decimal128, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const IDENTITY_URI  = process.env.MONGO_URI;
const WALLET_URI    = process.env.MONGO_URI_WALLET;
const TX_URI        = process.env.MONGO_URI_TRANSACTION;

const USER = { email: 'hihihi@gmail.com', password: '12345678', fullName: 'Nguyễn Minh Huy' };

function dec(v) { return Decimal128.fromString(String(Math.round(Number(v)))); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function chance(p) { return Math.random() < p; }

function dateAt(y, m, d, h = 9, mi = 0) {
  return new Date(y, m - 1, d, h, mi, rand(0, 59));
}
function rh(date, s, e) {
  const d = new Date(date);
  d.setHours(rand(s, e), rand(0, 59), rand(0, 59), 0);
  return d;
}
function isWeekend(d) { const wd = d.getDay(); return wd === 0 || wd === 6; }
function fmMonth(d) { return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }

// salary grows over 5 years
function salaryForYear(year) {
  const base = { 2021: 10_000_000, 2022: 12_000_000, 2023: 14_000_000, 2024: 16_000_000, 2025: 19_000_000, 2026: 22_000_000 };
  return base[year] || 10_000_000;
}

function buildTx(userId, walletId, catId, amount, type, desc, date) {
  return {
    user_id: userId,
    wallet_id: walletId,
    category_id: catId,
    amount: dec(amount),
    transaction_type: type,
    type,
    currency: 'VND',
    description: desc,
    occurred_at: date,
    transaction_date: date,
    source: 'MANUAL',
    status: 'COMPLETED',
    idempotency_key: uuidv4(),
    createdAt: date,
    updatedAt: date,
  };
}

async function main() {
  const iClient = new MongoClient(IDENTITY_URI);
  const wClient = new MongoClient(WALLET_URI);
  const tClient = new MongoClient(TX_URI);

  try {
    await Promise.all([iClient.connect(), wClient.connect(), tClient.connect()]);
    console.log('✓ Connected to all 3 MongoDB databases');

    const authDb   = iClient.db('fintech_identity-service');
    const walletDb = wClient.db('fintech_wallet-service');
    const txDb     = tClient.db('fintech_transaction-service');

    // ── 1. USER ────────────────────────────────────────────────────────────────
    console.log('\n── 1/5  User');
    const usersCol    = authDb.collection('users');
    const settingsCol = authDb.collection('usersettings');
    const existingUsers = await usersCol.find({ email: USER.email }).toArray();
    if (existingUsers.length > 0) {
      const ids = existingUsers.map(u => u._id);
      await settingsCol.deleteMany({ userId: { $in: ids } });
      await usersCol.deleteMany({ email: USER.email });
      console.log(`  ⚠ Removed ${existingUsers.length} existing user(s)`);
    }

    const passwordHash = await bcrypt.hash(USER.password, 10);
    const userCreatedAt = dateAt(2021, 1, 10);
    const userResult = await usersCol.insertOne({
      email: USER.email, passwordHash, fullName: USER.fullName,
      phone: '0901234567', status: 1,
      createdAt: userCreatedAt, updatedAt: userCreatedAt,
    });
    const userId = userResult.insertedId.toString();
    await settingsCol.updateOne(
      { userId: userResult.insertedId },
      { $set: { twoFactorEnabled: false, theme: 'dark', preferredCurrency: 'VND', locale: 'vi-VN', updatedAt: userCreatedAt } },
      { upsert: true }
    );
    console.log(`  ✓ userId = ${userId}`);

    // ── 2. WALLETS ─────────────────────────────────────────────────────────────
    console.log('\n── 2/5  Wallets');
    const walletsCol = walletDb.collection('wallets');
    await walletsCol.deleteMany({ user_id: userId });

    const walletCreatedAt = dateAt(2021, 1, 10);
    const wInserted = await walletsCol.insertMany([
      { user_id: userId, wallet_type: 'CARD',    wallet_name: 'Vietcombank',  balance: dec(32_000_000), processed_transaction_ids: [], status: 1, version: 0, createdAt: walletCreatedAt, updatedAt: walletCreatedAt },
      { user_id: userId, wallet_type: 'CASH',    wallet_name: 'Tiền mặt',    balance: dec(3_500_000),  processed_transaction_ids: [], status: 1, version: 0, createdAt: walletCreatedAt, updatedAt: walletCreatedAt },
      { user_id: userId, wallet_type: 'MOMO',    wallet_name: 'Ví MoMo',     balance: dec(1_200_000),  processed_transaction_ids: [], status: 1, version: 0, createdAt: walletCreatedAt, updatedAt: walletCreatedAt },
      { user_id: userId, wallet_type: 'ZALOPAY', wallet_name: 'ZaloPay',     balance: dec(800_000),    processed_transaction_ids: [], status: 1, version: 0, createdAt: walletCreatedAt, updatedAt: walletCreatedAt },
    ]);
    const wIds = Object.values(wInserted.insertedIds).map(id => id.toString());
    const [bankId, cashId, momoId, zaloId] = wIds;
    console.log(`  ✓ 4 wallets created: CARD(${bankId}), CASH, MOMO, ZALOPAY`);

    // ── 3. CATEGORIES ─────────────────────────────────────────────────────────
    console.log('\n── 3/5  Categories');
    const catsCol = txDb.collection('categories');
    const catNames = ['Lương','Thưởng','Đầu tư','Tiết kiệm về','Ăn uống','Mua sắm','Hóa đơn','Di chuyển','Sức khỏe','Giải trí','Giáo dục','Du lịch','Nhà ở'];
    await catsCol.deleteMany({ userId, name: { $in: catNames } });

    const now = new Date();
    const cInserted = await catsCol.insertMany([
      { userId, name: 'Lương',        categoryType: 'INCOME',  parentId: null, isSystem: false, status: 1, createdAt: now, updatedAt: now },
      { userId, name: 'Thưởng',       categoryType: 'INCOME',  parentId: null, isSystem: false, status: 1, createdAt: now, updatedAt: now },
      { userId, name: 'Đầu tư',       categoryType: 'INCOME',  parentId: null, isSystem: false, status: 1, createdAt: now, updatedAt: now },
      { userId, name: 'Tiết kiệm về', categoryType: 'INCOME',  parentId: null, isSystem: false, status: 1, createdAt: now, updatedAt: now },
      { userId, name: 'Ăn uống',      categoryType: 'EXPENSE', parentId: null, isSystem: false, status: 1, createdAt: now, updatedAt: now },
      { userId, name: 'Mua sắm',      categoryType: 'EXPENSE', parentId: null, isSystem: false, status: 1, createdAt: now, updatedAt: now },
      { userId, name: 'Hóa đơn',      categoryType: 'EXPENSE', parentId: null, isSystem: false, status: 1, createdAt: now, updatedAt: now },
      { userId, name: 'Di chuyển',    categoryType: 'EXPENSE', parentId: null, isSystem: false, status: 1, createdAt: now, updatedAt: now },
      { userId, name: 'Sức khỏe',     categoryType: 'EXPENSE', parentId: null, isSystem: false, status: 1, createdAt: now, updatedAt: now },
      { userId, name: 'Giải trí',     categoryType: 'EXPENSE', parentId: null, isSystem: false, status: 1, createdAt: now, updatedAt: now },
      { userId, name: 'Giáo dục',     categoryType: 'EXPENSE', parentId: null, isSystem: false, status: 1, createdAt: now, updatedAt: now },
      { userId, name: 'Du lịch',      categoryType: 'EXPENSE', parentId: null, isSystem: false, status: 1, createdAt: now, updatedAt: now },
      { userId, name: 'Nhà ở',        categoryType: 'EXPENSE', parentId: null, isSystem: false, status: 1, createdAt: now, updatedAt: now },
    ]);
    const cIds = Object.values(cInserted.insertedIds).map(id => id.toString());
    const cats = {
      salary: cIds[0], bonus: cIds[1], invest: cIds[2], savingReturn: cIds[3],
      food: cIds[4], shopping: cIds[5], bills: cIds[6], transport: cIds[7],
      health: cIds[8], entertainment: cIds[9], education: cIds[10], travel: cIds[11], housing: cIds[12],
    };
    console.log(`  ✓ 13 categories created`);

    // ── 4. SAVINGS ─────────────────────────────────────────────────────────────
    console.log('\n── 4/5  Savings');
    const savingsCol = txDb.collection('savings');
    await savingsCol.deleteMany({ user_id: userId });

    await savingsCol.insertMany([
      {
        user_id: userId, name: 'Quỹ khẩn cấp', type: 'SAVING',
        target_amount: dec(50_000_000), current_amount: dec(50_000_000),
        start_date: dateAt(2021, 3, 1), end_date: dateAt(2022, 12, 31), status: 'SETTLED',
        createdAt: dateAt(2021, 3, 1), updatedAt: dateAt(2022, 12, 31),
      },
      {
        user_id: userId, name: 'Mua laptop mới', type: 'SAVING',
        target_amount: dec(25_000_000), current_amount: dec(25_000_000),
        start_date: dateAt(2022, 1, 1), end_date: dateAt(2022, 8, 30), status: 'SETTLED',
        createdAt: dateAt(2022, 1, 1), updatedAt: dateAt(2022, 8, 30),
      },
      {
        user_id: userId, name: 'Du lịch Nhật Bản', type: 'SAVING',
        target_amount: dec(40_000_000), current_amount: dec(40_000_000),
        start_date: dateAt(2022, 9, 1), end_date: dateAt(2023, 9, 30), status: 'SETTLED',
        createdAt: dateAt(2022, 9, 1), updatedAt: dateAt(2023, 9, 30),
      },
      {
        user_id: userId, name: 'Cổ phiếu VNM & VIC', type: 'INVESTMENT',
        target_amount: dec(100_000_000), current_amount: dec(78_000_000),
        start_date: dateAt(2023, 1, 5), end_date: null, status: 'ACTIVE',
        createdAt: dateAt(2023, 1, 5), updatedAt: now,
      },
      {
        user_id: userId, name: 'Tiết kiệm mua nhà', type: 'SAVING',
        target_amount: dec(500_000_000), current_amount: dec(145_000_000),
        start_date: dateAt(2024, 1, 1), end_date: null, status: 'ACTIVE',
        createdAt: dateAt(2024, 1, 1), updatedAt: now,
      },
    ]);
    console.log(`  ✓ 5 savings/investments created`);

    // ── 5. RECURRING RULES ────────────────────────────────────────────────────
    console.log('\n── 5a  Recurring rules');
    const recurringCol = txDb.collection('recurring_rules');
    await recurringCol.deleteMany({ user_id: userId });

    await recurringCol.insertMany([
      {
        user_id: userId, wallet_id: bankId, category_id: cats.bills,
        transaction_type: 'EXPENSE', amount: dec(1_200_000), currency: 'VND',
        frequency: 'MONTHLY', day_of_week: null, day_of_month: 15,
        note: 'Tiền điện tự động hàng tháng', status: 'ACTIVE',
        last_run_on: '2026-04-15', createdAt: dateAt(2021, 2, 1), updatedAt: now,
      },
      {
        user_id: userId, wallet_id: bankId, category_id: cats.bills,
        transaction_type: 'EXPENSE', amount: dec(200_000), currency: 'VND',
        frequency: 'MONTHLY', day_of_week: null, day_of_month: 20,
        note: 'Tiền internet FPT', status: 'ACTIVE',
        last_run_on: '2026-04-20', createdAt: dateAt(2021, 4, 1), updatedAt: now,
      },
      {
        user_id: userId, wallet_id: bankId, category_id: cats.housing,
        transaction_type: 'EXPENSE', amount: dec(4_500_000), currency: 'VND',
        frequency: 'MONTHLY', day_of_week: null, day_of_month: 1,
        note: 'Thuê nhà hàng tháng', status: 'ACTIVE',
        last_run_on: '2026-04-01', createdAt: dateAt(2021, 1, 10), updatedAt: now,
      },
    ]);
    console.log(`  ✓ 3 recurring rules created`);

    // ── 6. TRANSACTIONS ───────────────────────────────────────────────────────
    console.log('\n── 5b  Transactions (5 years — may take a moment)');
    const txCol = txDb.collection('transactions');
    await txCol.deleteMany({ user_id: userId });

    const transactions = [];
    const startYear = 2021;
    const endDate   = new Date(); // today

    // Year profiles: spending habits evolve
    const yearProfile = (year) => ({
      foodDaily:     { min: year <= 2022 ? 40_000 : 60_000, max: year <= 2022 ? 120_000 : 200_000 },
      shoppingWeek:  { min: year <= 2022 ? 300_000 : 500_000, max: year <= 2022 ? 1_500_000 : 3_000_000 },
      rentAmt:       year <= 2021 ? 3_500_000 : year <= 2023 ? 4_000_000 : 4_500_000,
      electricAmt:   { min: 700_000, max: year <= 2023 ? 1_200_000 : 1_800_000 },
      transportAmt:  { min: 20_000, max: year <= 2022 ? 80_000 : 150_000 },
    });

    // Iterate day-by-day from Jan 1, 2021 to today
    const cursor = new Date(2021, 0, 1); // Jan 1, 2021
    while (cursor <= endDate) {
      const d   = new Date(cursor);
      const yr  = d.getFullYear();
      const mo  = d.getMonth() + 1;
      const day = d.getDate();
      const p   = yearProfile(yr);
      const salary = salaryForYear(yr);

      // ── SALARY on the 5th
      if (day === 5) {
        transactions.push(buildTx(userId, bankId, cats.salary, salary, 'INCOME',
          `Lương tháng ${fmMonth(d)}`, rh(d, 8, 10)));
      }

      // ── RENT on the 1st
      if (day === 1) {
        transactions.push(buildTx(userId, bankId, cats.housing, p.rentAmt, 'EXPENSE',
          `Tiền thuê nhà tháng ${fmMonth(d)}`, rh(d, 8, 12)));
      }

      // ── ELECTRICITY on the 15th
      if (day === 15) {
        const eAmt = rand(p.electricAmt.min, p.electricAmt.max);
        transactions.push(buildTx(userId, bankId, cats.bills, eAmt, 'EXPENSE',
          `Tiền điện tháng ${fmMonth(d)}`, rh(d, 17, 21)));
      }

      // ── INTERNET on the 20th
      if (day === 20) {
        transactions.push(buildTx(userId, bankId, cats.bills, 200_000, 'EXPENSE',
          `Tiền internet FPT tháng ${fmMonth(d)}`, rh(d, 9, 11)));
      }

      // ── PHONE BILL on the 10th
      if (day === 10) {
        transactions.push(buildTx(userId, momoId, cats.bills, rand(100_000, 150_000), 'EXPENSE',
          `Nạp tiền điện thoại tháng ${fmMonth(d)}`, rh(d, 10, 14)));
      }

      // ── BONUS quarterly (March, June, Sep, Dec on 28th)
      if (day === 28 && [3, 6, 9, 12].includes(mo)) {
        const bAmt = rand(Math.round(salary * 0.5), salary * 2);
        transactions.push(buildTx(userId, bankId, cats.bonus, bAmt, 'INCOME',
          pick(['Thưởng KPI quý', 'Thưởng hiệu suất', 'Hoa hồng dự án']), rh(d, 9, 15)));
      }

      // ── FOOD: daily with probability
      if (chance(0.75)) {
        const wallet = chance(0.5) ? cashId : momoId;
        transactions.push(buildTx(userId, wallet, cats.food,
          rand(p.foodDaily.min, p.foodDaily.max), 'EXPENSE',
          pick(['Ăn sáng bún bò','Cơm văn phòng','Ăn tối gia đình','Grab Food','Bữa trưa phở','Cơm tấm Sài Gòn','Ăn sáng bánh mì','Bún riêu']),
          rh(d, 7, 20)));
      }

      // ── COFFEE / drinks 50%
      if (chance(0.5)) {
        const wallet = chance(0.6) ? cashId : momoId;
        transactions.push(buildTx(userId, wallet, cats.food,
          rand(30_000, 80_000), 'EXPENSE',
          pick(['Cafe sáng Highlands','Trà sữa','Cafe chiều','Nước ép','Cafe take-away']),
          rh(d, 7, 16)));
      }

      // ── TRANSPORT weekdays
      if (!isWeekend(d) && chance(0.45)) {
        const wallet = chance(0.5) ? cashId : zaloId;
        transactions.push(buildTx(userId, wallet, cats.transport,
          rand(p.transportAmt.min, p.transportAmt.max), 'EXPENSE',
          pick(['Grab đi làm','Xe buýt','Gửi xe','Đổ xăng','Uber đêm']),
          rh(d, 6, 20)));
      }

      // ── SHOPPING weekends
      if (isWeekend(d) && chance(0.4)) {
        const wallet = chance(0.3) ? cashId : bankId;
        transactions.push(buildTx(userId, wallet, cats.shopping,
          rand(p.shoppingWeek.min, p.shoppingWeek.max), 'EXPENSE',
          pick(['Vinmart cuối tuần','Mua quần áo ZARA','Shopee','Tiki mua đồ','Lazada','Siêu thị BigC','Mua đồ gia dụng']),
          rh(d, 10, 20)));
      }

      // ── ENTERTAINMENT weekends
      if (isWeekend(d) && chance(0.25)) {
        transactions.push(buildTx(userId, momoId, cats.entertainment,
          rand(80_000, 400_000), 'EXPENSE',
          pick(['Xem phim CGV','Karaoke cuối tuần','Netflix','Spotify','Game online','Bowling']),
          rh(d, 14, 22)));
      }

      // ── HEALTH monthly ~1 visit
      if (day === 12 && chance(0.3)) {
        transactions.push(buildTx(userId, bankId, cats.health,
          rand(150_000, 800_000), 'EXPENSE',
          pick(['Khám sức khỏe định kỳ','Mua thuốc','Phòng gym tháng','Nha khoa','Vitamin & thực phẩm chức năng']),
          rh(d, 8, 17)));
      }

      // ── EDUCATION sporadic
      if (day === 1 && chance(0.15)) {
        transactions.push(buildTx(userId, bankId, cats.education,
          rand(500_000, 3_000_000), 'EXPENSE',
          pick(['Học lập trình online','Khóa tiếng Anh','Udemy course','Mua sách chuyên ngành','Workshop kỹ năng']),
          rh(d, 9, 18)));
      }

      // ── TRAVEL 1–2 trips/year (big amounts in Jan, Jul, Sep)
      if ([1, 7, 9].includes(mo) && day === 20 && chance(0.45)) {
        const tAmt = rand(2_000_000, yr >= 2023 ? 15_000_000 : 8_000_000);
        transactions.push(buildTx(userId, bankId, cats.travel, tAmt, 'EXPENSE',
          pick(['Vé máy bay','Khách sạn Đà Nẵng','Tour du lịch Phú Quốc','Vé tàu đi Hội An','Vé máy bay Bangkok','Khách sạn Đà Lạt']),
          rh(d, 9, 14)));
      }

      // ── INVESTMENT top-up quarterly (from 2023 onward)
      if (yr >= 2023 && day === 5 && [1, 4, 7, 10].includes(mo)) {
        transactions.push(buildTx(userId, bankId, cats.invest,
          rand(3_000_000, 8_000_000), 'EXPENSE',
          pick(['Mua cổ phiếu VNM','Mua cổ phiếu VIC','Nạp quỹ đầu tư','ETF VNFIN']),
          rh(d, 9, 11)));
      }

      // ── SAVINGS deposit monthly (from 2024 onward)
      if (yr >= 2024 && day === 6) {
        transactions.push(buildTx(userId, bankId, cats.bills,
          rand(2_000_000, 5_000_000), 'EXPENSE',
          'Gửi tiết kiệm mua nhà', rh(d, 9, 10)));
      }

      // ── Random extra income (freelance, reward) ~5%/day
      if (chance(0.05)) {
        transactions.push(buildTx(userId, bankId, cats.bonus,
          rand(500_000, 5_000_000), 'INCOME',
          pick(['Hoàn tiền cashback','Freelance dự án phụ','Bán hàng online','Thưởng giới thiệu','Hoàn tiền bảo hiểm']),
          rh(d, 10, 18)));
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    // Sort by date
    transactions.sort((a, b) => a.occurred_at - b.occurred_at);

    // Batch insert (500 at a time)
    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < transactions.length; i += BATCH) {
      const batch = transactions.slice(i, i + BATCH);
      await txCol.insertMany(batch, { ordered: false });
      inserted += batch.length;
      process.stdout.write(`\r  Inserted ${inserted}/${transactions.length} transactions...`);
    }

    console.log(`\n  ✓ ${transactions.length} transactions inserted`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log('  SEED COMPLETE');
    console.log(`  email    : ${USER.email}`);
    console.log(`  password : ${USER.password}`);
    console.log(`  userId   : ${userId}`);
    console.log(`  Wallets  : 4 (CARD/CASH/MOMO/ZALOPAY)`);
    console.log(`  Categories: 13`);
    console.log(`  Savings  : 5`);
    console.log(`  Recurring: 3`);
    console.log(`  Transactions: ${transactions.length} (5 years)`);
    console.log('═'.repeat(60));

  } finally {
    await Promise.allSettled([iClient.close(), wClient.close(), tClient.close()]);
  }
}

main().catch(err => {
  console.error('\n✗ Seed failed:', err.message ?? err);
  process.exit(1);
});
