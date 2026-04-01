import mongoose, { Schema } from 'mongoose';

export interface ITransaction {
  _id: mongoose.Types.ObjectId;
  wallet_id: string;
  amount: mongoose.Types.Decimal128;
  transaction_type: 'INCOME' | 'EXPENSE';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  idempotency_key: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    wallet_id: {
      type: String,
      required: true,
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
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
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

transactionSchema.index({ idempotency_key: 1 }, { unique: true });

export const TransactionModel = mongoose.model<ITransaction>('transactions', transactionSchema);
