import mongoose, { Schema, model, Types } from 'mongoose';

export interface ITransaction {
  _id: Types.ObjectId;
  walletId: string;
  userId: string;
  categoryId: string;
  transactionType: 'INCOME' | 'EXPENSE';
  amount: Types.Decimal128;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  description?: string;
  occurredAt: Date;
  idempotencyKey: string;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    walletId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    categoryId: {
      type: String,
      required: true,
    },
    transactionType: {
      type: String,
      enum: ['INCOME', 'EXPENSE'],
      required: true,
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'VND',
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
      required: true,
      default: 'PENDING',
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    occurredAt: {
      type: Date,
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
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

// Indexes for efficient querying
transactionSchema.index({ userId: 1, occurredAt: -1 });
transactionSchema.index({ walletId: 1, occurredAt: -1 });
transactionSchema.index({ status: 1 });

export default model<ITransaction>('Transaction', transactionSchema);
