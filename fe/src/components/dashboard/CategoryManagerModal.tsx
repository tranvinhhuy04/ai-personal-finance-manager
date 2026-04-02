import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Settings2, Tag, Trash2, X } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useTransactionStore } from '@/store/useFinanceStore';
import type { Category, TransactionDirection } from '@/types/finance';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type NoticeState = {
  type: 'success' | 'error';
  message: string;
} | null;

const TAB_LABELS: Record<TransactionDirection, string> = {
  EXPENSE: 'Chi tiêu',
  INCOME: 'Thu nhập',
};

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    isLoading,
    isFetchingCategories,
    categoryError,
  } = useTransactionStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<TransactionDirection>('EXPENSE');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryType: 'EXPENSE' as TransactionDirection,
  });

  const loadCategories = useCallback(async () => {
    try {
      const data = await apiClient.getCategories();
      console.log('Fetched Categories:', data);
      setCategories(Array.isArray(data) ? data : []);
      await fetchCategories();
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
      throw error;
    }
  }, [fetchCategories]);

  useEffect(() => {
    if (!isOpen) {
      setEditingCategory(null);
      setFormData({ name: '', categoryType: 'EXPENSE' });
      setNotice(null);
      return;
    }

    void loadCategories().catch(() => {
      setNotice({ type: 'error', message: 'Không thể tải danh sách danh mục.' });
    });
  }, [isOpen, loadCategories]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const visibleCategories = useMemo(() => {
    return categories.filter((category) => {
      const categoryType = (category.categoryType ?? (category as unknown as { category_type?: TransactionDirection }).category_type ?? '').toUpperCase();
      return category.status === 1 && categoryType === activeTab;
    });
  }, [activeTab, categories]);

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({ name: '', categoryType: activeTab });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setActiveTab(category.categoryType);
    setFormData({
      name: category.name,
      categoryType: category.categoryType,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const name = formData.name.trim();
    if (!name) {
      setNotice({ type: 'error', message: 'Vui lòng nhập tên danh mục.' });
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name,
          categoryType: formData.categoryType,
        });
        setNotice({ type: 'success', message: 'Đã cập nhật danh mục.' });
      } else {
        await createCategory({
          name,
          categoryType: formData.categoryType,
        });
        setNotice({ type: 'success', message: 'Đã thêm danh mục mới.' });
      }

      await loadCategories();
      setActiveTab(formData.categoryType);
      resetForm();
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'Lưu danh mục thất bại.',
      });
    }
  };

  const handleDelete = async (category: Category) => {
    if (category.isSystem) {
      setNotice({ type: 'error', message: 'Danh mục hệ thống không thể xóa.' });
      return;
    }

    const confirmed = window.confirm(`Xóa danh mục "${category.name}"?`);
    if (!confirmed) return;

    try {
      await deleteCategory(category.id);
      await loadCategories();
      if (editingCategory?.id === category.id) {
        resetForm();
      }
      setNotice({ type: 'success', message: 'Đã xóa danh mục.' });
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'Xóa danh mục thất bại.',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Settings2 className="h-5 w-5 text-emerald-600" />
              Quản lý danh mục
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Thêm, sửa hoặc ẩn danh mục để dùng ngay trong form ghi nhận giao dịch.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl bg-gray-100 p-1">
              {(['EXPENSE', 'INCOME'] as TransactionDirection[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    if (!editingCategory) {
                      setFormData((prev) => ({ ...prev, categoryType: tab }));
                    }
                  }}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">
                  Danh sách danh mục {TAB_LABELS[activeTab].toLowerCase()}
                </p>
                {isFetchingCategories && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
              </div>

              <div className="max-h-[420px] overflow-y-auto p-3">
                {visibleCategories.length > 0 ? (
                  <div className="space-y-2">
                    {visibleCategories.map((category) => {
                      const categoryType = category.categoryType ?? (category as unknown as { category_type?: TransactionDirection }).category_type ?? 'EXPENSE';

                      return (
                        <div
                          key={category.id}
                          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-emerald-600" />
                              <p className="truncate font-medium text-gray-900">{category.name}</p>
                              {category.isSystem && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                  SYSTEM
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">{TAB_LABELS[categoryType]}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(category)}
                              disabled={category.isSystem}
                              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(category)}
                              disabled={category.isSystem}
                              className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
                    Chưa có danh mục nào trong nhóm này.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Danh mục mới sẽ xuất hiện ngay trong dropdown của form tạo giao dịch.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tên danh mục</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="VD: Ăn uống, Lương, Thưởng..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Loại danh mục</label>
                <select
                  value={formData.categoryType}
                  onChange={(event) => {
                    const nextType = event.target.value as TransactionDirection;
                    setFormData((prev) => ({ ...prev, categoryType: nextType }));
                    setActiveTab(nextType);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="EXPENSE">Chi tiêu</option>
                  <option value="INCOME">Thu nhập</option>
                </select>
              </div>

              {(notice || categoryError) && (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    (notice?.type ?? 'error') === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {notice?.message ?? categoryError}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingCategory ? (
                    <Pencil className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingCategory ? 'Lưu thay đổi' : 'Thêm danh mục'}
                </button>

                {editingCategory && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
