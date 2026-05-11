import { AppError } from '../../errors/AppError';
import CategoryModel from '../../models/category.model';

function normalizeCategoryType(input: unknown): 'INCOME' | 'EXPENSE' | undefined {
  if (input === undefined || input === null || input === '') {
    return undefined;
  }

  const normalized = String(input).trim().toUpperCase();
  if (normalized !== 'INCOME' && normalized !== 'EXPENSE') {
    throw new AppError('category_type must be INCOME or EXPENSE', 400);
  }

  return normalized as 'INCOME' | 'EXPENSE';
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toCategoryResponse(category: any) {
  const userId = category.userId ?? category.user_id ?? '';
  const categoryType = category.categoryType ?? category.category_type ?? 'EXPENSE';
  const parentId = category.parentId ?? category.parent_id ?? null;
  const isSystem = Boolean(category.isSystem ?? category.is_system);

  return {
    id: category._id.toString(),
    _id: category._id.toString(),
    userId,
    user_id: userId,
    name: category.name,
    categoryType,
    category_type: categoryType,
    parentId,
    parent_id: parentId,
    isSystem,
    is_system: isSystem,
    status: Number(category.status ?? 1),
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

class CategoryService {
  async getCategories(
    requestUserId: string,
    params: { category_type?: unknown; include_inactive?: unknown } = {}
  ) {
    const categoryType = normalizeCategoryType(params.category_type);
    const includeInactive = String(params.include_inactive ?? '0') === '1';

    const clauses: Array<Record<string, unknown>> = [
      {
        $or: [
          { userId: requestUserId },
          { user_id: requestUserId },
          { isSystem: true },
          { is_system: true },
          { userId: 'SYSTEM' },
          { user_id: 'SYSTEM' },
        ],
      },
    ];

    if (!includeInactive) {
      clauses.push({ status: 1 });
    }

    if (categoryType) {
      clauses.push({
        $or: [
          { categoryType },
          { category_type: categoryType },
        ],
      });
    }

    const filter = clauses.length === 1 ? clauses[0] : { $and: clauses };

    const categories = await CategoryModel.find(filter)
      .sort({ isSystem: -1, is_system: -1, createdAt: -1, name: 1 })
      .lean();

    return categories.map(toCategoryResponse);
  }

  async listCategories(
    requestUserId: string,
    params: { category_type?: unknown; include_inactive?: unknown } = {}
  ) {
    return this.getCategories(requestUserId, params);
  }

  async createCategory(
    requestUserId: string,
    payload: { name?: unknown; category_type?: unknown; categoryType?: unknown; parent_id?: unknown; parentId?: unknown }
  ) {
    const name = String(payload.name ?? '').trim();
    const categoryType = normalizeCategoryType(payload.category_type ?? payload.categoryType);
    const parentId = (payload.parent_id ?? payload.parentId ?? null) as string | null;

    if (!name) {
      throw new AppError('name is required', 400);
    }

    if (!categoryType) {
      throw new AppError('category_type is required', 400);
    }

    const duplicate = await CategoryModel.findOne({
      userId: requestUserId,
      name: new RegExp(`^${escapeRegExp(name)}$`, 'i'),
      categoryType,
      status: 1,
    }).lean();

    if (duplicate) {
      throw new AppError('Category already exists for this transaction type', 409);
    }

    const created = await CategoryModel.create({
      userId: requestUserId,
      name,
      categoryType,
      parentId,
      isSystem: false,
      status: 1,
    });

    return toCategoryResponse(created);
  }

  async updateCategory(
    categoryId: string,
    requestUserId: string,
    payload: { name?: unknown; category_type?: unknown; categoryType?: unknown; parent_id?: unknown; parentId?: unknown; status?: unknown }
  ) {
    const category = await CategoryModel.findOne({
      _id: categoryId,
      userId: requestUserId,
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (category.isSystem) {
      throw new AppError('System categories cannot be edited', 403);
    }

    const nextName = payload.name !== undefined ? String(payload.name).trim() : category.name;
    const nextType = payload.category_type !== undefined || payload.categoryType !== undefined
      ? normalizeCategoryType(payload.category_type ?? payload.categoryType)
      : category.categoryType;

    if (!nextName) {
      throw new AppError('name cannot be empty', 400);
    }

    const duplicate = await CategoryModel.findOne({
      _id: { $ne: categoryId },
      userId: requestUserId,
      name: new RegExp(`^${escapeRegExp(nextName)}$`, 'i'),
      categoryType: nextType,
      status: 1,
    }).lean();

    if (duplicate) {
      throw new AppError('Another category with the same name already exists', 409);
    }

    category.name = nextName;
    category.categoryType = nextType ?? category.categoryType;
    category.parentId = (payload.parent_id ?? payload.parentId ?? category.parentId ?? null) as string | null;

    if (payload.status !== undefined) {
      category.status = Number(payload.status) === 0 ? 0 : 1;
    }

    await category.save();
    return toCategoryResponse(category);
  }

  async deleteCategory(categoryId: string, requestUserId: string) {
    const category = await CategoryModel.findOne({
      _id: categoryId,
      userId: requestUserId,
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (category.isSystem) {
      throw new AppError('System categories cannot be deleted', 403);
    }

    category.status = 0;
    await category.save();

    return { success: true, id: categoryId };
  }
}

export const categoryService = new CategoryService();
