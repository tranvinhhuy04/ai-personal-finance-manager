import { Schema, model, Types } from 'mongoose';

export interface IWallet {
  _id: Types.ObjectId;
  userId: string;
  walletType: 'CARD' | 'MOMO' | 'ZALOPAY' | 'CASH';
  walletName: string;
  balance: Types.Decimal128;
  spendingLimit: Types.Decimal128 | null;
  status: number; // 1: Active, 0: Inactive, 2: Blocked
  version: number; // For optimistic locking
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    walletType: {
      type: String,
      enum: ['CARD', 'MOMO', 'ZALOPAY', 'CASH'],
      required: true,
      index: true,
    },
    walletName: {
      type: String,
      required: true,
    },
    balance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
    },
    spendingLimit: {
      type: Schema.Types.Decimal128,
      default: null,
    },
    status: {
      type: Number,
      enum: [0, 1, 2],
      default: 1,
      index: true,
    },
    version: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
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

// Compound index for user wallets query
walletSchema.index({ userId: 1, status: 1 });

export default model<IWallet>('Wallet', walletSchema);
