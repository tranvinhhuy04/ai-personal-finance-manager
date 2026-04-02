import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import CategoryModel from '../models/category.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SYSTEM_USER_ID = process.env.SYSTEM_CATEGORY_USER_ID || '000000000000000000000000';

const DEFAULT_SYSTEM_CATEGORIES = [
  { name: 'Luong', categoryType: 'INCOME' as const },
  { name: 'Thuong', categoryType: 'INCOME' as const },
  { name: 'Dau tu', categoryType: 'INCOME' as const },
  { name: 'Thu khac', categoryType: 'INCOME' as const },
  { name: 'An uong', categoryType: 'EXPENSE' as const },
  { name: 'Di chuyen', categoryType: 'EXPENSE' as const },
  { name: 'Mua sam', categoryType: 'EXPENSE' as const },
  { name: 'Hoa don', categoryType: 'EXPENSE' as const },
  { name: 'Giai tri', categoryType: 'EXPENSE' as const },
  { name: 'Chi khac', categoryType: 'EXPENSE' as const },
];

async function seedSystemCategories() {
  if (!process.env.MONGO_URI_TRANSACTION) {
    process.env.MONGO_URI_TRANSACTION = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  }

  if (!process.env.MONGO_URI_TRANSACTION) {
    throw new Error('Missing DB uri: set MONGO_URI_TRANSACTION or MONGODB_URI');
  }

  await connectDB();

  let inserted = 0;
  let updated = 0;

  for (const category of DEFAULT_SYSTEM_CATEGORIES) {
    const result = await CategoryModel.updateOne(
      {
        userId: SYSTEM_USER_ID,
        name: category.name,
        categoryType: category.categoryType,
        isSystem: true,
      },
      {
        $set: {
          status: 1,
          parentId: null,
        },
        $setOnInsert: {
          userId: SYSTEM_USER_ID,
          name: category.name,
          categoryType: category.categoryType,
          isSystem: true,
        },
      },
      { upsert: true }
    );

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
