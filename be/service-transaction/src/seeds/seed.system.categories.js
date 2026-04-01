const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

const { connectDB } = require('../../config/db');
const Category = require('../models/category.model');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SYSTEM_USER_ID = new mongoose.Types.ObjectId(
  process.env.SYSTEM_CATEGORY_USER_ID || '000000000000000000000000'
);

const DEFAULT_SYSTEM_CATEGORIES = [
  { name: 'Luong', category_type: 'INCOME' },
  { name: 'Thuong', category_type: 'INCOME' },
  { name: 'Dau tu', category_type: 'INCOME' },
  { name: 'Thu khac', category_type: 'INCOME' },
  { name: 'An uong', category_type: 'EXPENSE' },
  { name: 'Di chuyen', category_type: 'EXPENSE' },
  { name: 'Mua sam', category_type: 'EXPENSE' },
  { name: 'Hoa don', category_type: 'EXPENSE' },
  { name: 'Giai tri', category_type: 'EXPENSE' },
  { name: 'Chi khac', category_type: 'EXPENSE' },
];

async function seedSystemCategories() {
  if (!process.env.MONGO_URI_TRANSACTION) {
    process.env.MONGO_URI_TRANSACTION =
      process.env.MONGODB_URI || process.env.MONGO_URI || '';
  }

  if (!process.env.MONGO_URI_TRANSACTION) {
    throw new Error('Missing DB uri: set MONGO_URI_TRANSACTION or MONGODB_URI');
  }

  await connectDB();

  let inserted = 0;
  let updated = 0;

  for (const category of DEFAULT_SYSTEM_CATEGORIES) {
    const filter = {
      user_id: SYSTEM_USER_ID,
      name: category.name,
      category_type: category.category_type,
      is_system: true,
    };

    const update = {
      $set: {
        status: 1,
        parent_id: null,
      },
      $setOnInsert: {
        user_id: SYSTEM_USER_ID,
        name: category.name,
        category_type: category.category_type,
        is_system: true,
      },
    };

    const result = await Category.updateOne(filter, update, { upsert: true });

    if (result.upsertedCount > 0) {
      inserted += 1;
    } else if (result.modifiedCount > 0) {
      updated += 1;
    }
  }

  console.log('[seed][categories] done');
  console.log('[seed][categories] inserted =', inserted);
  console.log('[seed][categories] updated =', updated);
  console.log('[seed][categories] total defaults =', DEFAULT_SYSTEM_CATEGORIES.length);
}

seedSystemCategories()
  .catch((error) => {
    console.error('[seed][categories] failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
