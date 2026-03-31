import { Schema, model, Types } from 'mongoose';

export interface ICategory {
  _id: Types.ObjectId;
  userId: string;
  name: string;
  categoryType: 'INCOME' | 'EXPENSE';
  parentId?: string | null;
  isSystem: boolean;
  status: number; // 1: Active, 0: Inactive
  createdAt: Date;
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
    },
    categoryType: {
      type: String,
      enum: ['INCOME', 'EXPENSE'],
      required: true,
    },
    parentId: {
      type: String,
      default: null,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

export default model<ICategory>('Category', categorySchema);
