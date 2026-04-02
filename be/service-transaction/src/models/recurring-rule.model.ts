import mongoose, { Schema } from 'mongoose';

export type RecurringFrequency = 'WEEKLY' | 'MONTHLY';
export type RecurringRuleStatus = 'ACTIVE' | 'PAUSED';

export interface IRecurringRule {
  _id: mongoose.Types.ObjectId;
  user_id: string;
  wallet_id: string;
  category_id: string | null;
  transaction_type: 'INCOME' | 'EXPENSE';
  amount: mongoose.Types.Decimal128;
  currency: string;
  frequency: RecurringFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  note: string | null;
  status: RecurringRuleStatus;
  last_run_on: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const recurringRuleSchema = new Schema<IRecurringRule>(
  {
    user_id: {
      type: String,
      required: true,
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
    transaction_type: {
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
      default: 'VND',
      trim: true,
    },
    frequency: {
      type: String,
      enum: ['WEEKLY', 'MONTHLY'],
      required: true,
      index: true,
    },
    day_of_week: {
      type: Number,
      min: 0,
      max: 6,
      default: null,
    },
    day_of_month: {
      type: Number,
      min: 1,
      max: 31,
      default: null,
    },
    note: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED'],
      default: 'ACTIVE',
      index: true,
    },
    last_run_on: {
      type: String,
      default: null,
    },
  },
  {
    versionKey: false,
    timestamps: true,
    collection: 'recurring_rules',
  }
);

recurringRuleSchema.index({ status: 1, frequency: 1 });
recurringRuleSchema.index({ user_id: 1, wallet_id: 1 });

export const RecurringRuleModel = mongoose.model<IRecurringRule>('recurring_rules', recurringRuleSchema);
