const mongoose = require('mongoose');
const Category = require('../models/category.model');

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function ensureObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createAppError(fieldName + ' is invalid', 400);
  }
  return new mongoose.Types.ObjectId(value);
}

function normalizeCategoryType(categoryType) {
  if (categoryType == null) {
    return null;
  }

  const normalized = String(categoryType).trim().toUpperCase();
  if (normalized !== 'INCOME' && normalized !== 'EXPENSE') {
    throw createAppError('category_type must be INCOME or EXPENSE', 400);
  }

  return normalized;
}

async function createCategory(input, requestUserId) {
  const userObjectId = ensureObjectId(requestUserId, 'user_id');
  const name = String(input.name || '').trim();
  const categoryType = normalizeCategoryType(input.category_type);

  if (!name) {
    throw createAppError('name is required', 400);
  }

  if (!categoryType) {
    throw createAppError('category_type is required', 400);
  }

  let parentId = null;
  if (input.parent_id) {
    parentId = ensureObjectId(input.parent_id, 'parent_id');
  }

  const created = await Category.create({
    user_id: userObjectId,
    name,
    category_type: categoryType,
    parent_id: parentId,
    is_system: false,
    status: 1,
  });

  return created;
}

async function getCategories(params, requestUserId) {
  const userObjectId = ensureObjectId(requestUserId, 'user_id');
  const categoryType = normalizeCategoryType(params.category_type);

  const filter = {
    $or: [
      { is_system: true },
      { user_id: userObjectId },
    ],
  };

  if (categoryType) {
    filter.category_type = categoryType;
  }

  return Category.find(filter).sort({ is_system: -1, category_type: 1, name: 1, createdAt: -1 });
}

async function updateCategory(categoryId, payload, requestUserId) {
  const categoryObjectId = ensureObjectId(categoryId, 'category_id');
  const userObjectId = ensureObjectId(requestUserId, 'user_id');

  const category = await Category.findOne({
    _id: categoryObjectId,
    user_id: userObjectId,
    is_system: false,
  });

  if (!category) {
    throw createAppError('Category not found or not allowed', 404);
  }

  if (payload.name !== undefined) {
    const name = String(payload.name).trim();
    if (!name) {
      throw createAppError('name cannot be empty', 400);
    }
    category.name = name;
  }

  if (payload.category_type !== undefined) {
    category.category_type = normalizeCategoryType(payload.category_type);
  }

  if (payload.parent_id !== undefined) {
    category.parent_id = payload.parent_id ? ensureObjectId(payload.parent_id, 'parent_id') : null;
  }

  if (payload.status !== undefined) {
    const nextStatus = Number(payload.status);
    if (!Number.isFinite(nextStatus)) {
      throw createAppError('status must be a number', 400);
    }
    category.status = nextStatus;
  }

  await category.save();
  return category;
}

async function deleteCategory(categoryId, requestUserId) {
  const categoryObjectId = ensureObjectId(categoryId, 'category_id');
  const userObjectId = ensureObjectId(requestUserId, 'user_id');

  const deleted = await Category.findOneAndDelete({
    _id: categoryObjectId,
    user_id: userObjectId,
    is_system: false,
  });

  if (!deleted) {
    throw createAppError('Category not found or not allowed', 404);
  }

  return { success: true };
}

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
};
