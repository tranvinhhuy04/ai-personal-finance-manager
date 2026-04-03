import mongoose, { Schema } from 'mongoose';

export type SavingType = 'SAVING' | 'INVESTMENT';
export type SavingStatus = 'ACTIVE' | 'SETTLED';

export interface ISaving {
  _id: mongoose.Types.ObjectId;
  user_id: string;
  name: string;
  type: SavingType;
  target_amount: mongoose.Types.Decimal128 | null;
  current_amount: mongoose.Types.Decimal128;
  start_date: Date;
  end_date: Date | null;
  status: SavingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const savingSchema = new Schema<ISaving>(
  {
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['SAVING', 'INVESTMENT'],
      required: true,
      default: 'SAVING',
      index: true,
    },
    target_amount: {
      type: Schema.Types.Decimal128,
      default: null,
    },
    current_amount: {
      type: Schema.Types.Decimal128,
      required: true,
      default: () => mongoose.Types.Decimal128.fromString('0'),
    },
    start_date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    end_date: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SETTLED'],
      required: true,
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

savingSchema.index({ user_id: 1, type: 1, status: 1, end_date: 1 });

export const SavingModel = mongoose.model<ISaving>('savings', savingSchema);
