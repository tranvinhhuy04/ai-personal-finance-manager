import mongoose, { Schema } from 'mongoose';

type AggregateByCategory = {
  category_id: string;
  category_name: string;
  total_amount: number;
  transaction_count: number;
};

type AggregateByWallet = {
  wallet_id: string;
  wallet_name: string;
  total_amount: number;
  transaction_count: number;
};

export interface IMonthlyAggregate {
  _id: mongoose.Types.ObjectId;
  user_id: string;
  month: string;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  byCategory: AggregateByCategory[];
  byWallet: AggregateByWallet[];
  generatedAt: Date;
  sourceVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const byCategorySchema = new Schema<AggregateByCategory>(
  {
    category_id: { type: String, required: true },
    category_name: { type: String, required: true, default: 'Unknown' },
    total_amount: { type: Number, required: true, default: 0 },
    transaction_count: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const byWalletSchema = new Schema<AggregateByWallet>(
  {
    wallet_id: { type: String, required: true },
    wallet_name: { type: String, required: true, default: 'Wallet' },
    total_amount: { type: Number, required: true, default: 0 },
    transaction_count: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const monthlyAggregateSchema = new Schema<IMonthlyAggregate>(
  {
    user_id: { type: String, required: true, index: true },
    month: { type: String, required: true, index: true },
    totalIncome: { type: Number, required: true, default: 0 },
    totalExpense: { type: Number, required: true, default: 0 },
    netCashFlow: { type: Number, required: true, default: 0 },
    byCategory: { type: [byCategorySchema], default: [] },
    byWallet: { type: [byWalletSchema], default: [] },
    generatedAt: { type: Date, required: true, default: Date.now },
    sourceVersion: { type: Number, required: true, default: 0 },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

monthlyAggregateSchema.index({ user_id: 1, month: 1 }, { unique: true });
monthlyAggregateSchema.index({ user_id: 1, generatedAt: -1 });

export const MonthlyAggregateModel = mongoose.model<IMonthlyAggregate>(
  'monthly_aggregates',
  monthlyAggregateSchema
);
