import { Schema, model, Types } from 'mongoose';

export interface ICategory {
  _id: Types.ObjectId;
  userId: string;
  name: string;
  categoryType: 'INCOME' | 'EXPENSE';
  parentId?: string | null;
  isSystem: boolean;
  status: 0 | 1;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    categoryType: {
      type: String,
      enum: ['INCOME', 'EXPENSE'],
      required: true,
      index: true,
    },
    parentId: {
      type: String,
      default: null,
    },
    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
    collection: 'categories',
  }
);

categorySchema.index({ userId: 1, categoryType: 1, status: 1, name: 1 });

export const CategoryModel = model<ICategory>('categories', categorySchema);
export default CategoryModel;
