import mongoose, { Schema } from 'mongoose';

export interface ITransaction {
  _id: mongoose.Types.ObjectId;
  user_id: string | null;
  wallet_id: string;
  category_id: string | null;
  amount: mongoose.Types.Decimal128;
  transaction_type: 'INCOME' | 'EXPENSE';
  currency: string;
  description: string | null;
  occurred_at: Date;
  source: 'MANUAL' | 'INVOICE_CONFIRMATION' | 'RECURRING' | 'SAVING';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  idempotency_key: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    user_id: {
      type: String,
      default: null,
      index: true,
    },
    wallet_id: {
      type: String,
      required: true,
      index: true,
    },
    category_id: {
      type: String,
      default: null,
      index: true,
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    transaction_type: {
      type: String,
      enum: ['INCOME', 'EXPENSE'],
      required: true,
    },
    currency: {
      type: String,
      default: 'VND',
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    occurred_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    source: {
      type: String,
      enum: ['MANUAL', 'INVOICE_CONFIRMATION', 'RECURRING', 'SAVING'],
      default: 'MANUAL',
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
      default: 'PENDING',
      index: true,
    },
    idempotency_key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

transactionSchema.index({ user_id: 1, occurred_at: -1 });
transactionSchema.index({ wallet_id: 1, occurred_at: -1 });
transactionSchema.index({ idempotency_key: 1 }, { unique: true });

export const TransactionModel = mongoose.model<ITransaction>('transactions', transactionSchema);
