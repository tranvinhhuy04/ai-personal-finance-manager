import mongoose, { Schema } from 'mongoose';

export type WalletType = 'CARD' | 'MOMO' | 'ZALOPAY' | 'CASH';

export interface IWallet {
  _id: mongoose.Types.ObjectId;
  user_id: string;
  wallet_type: WalletType;
  balance: mongoose.Types.Decimal128;
  spending_limit: mongoose.Types.Decimal128 | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    wallet_type: {
      type: String,
      enum: ['CARD', 'MOMO', 'ZALOPAY', 'CASH'],
      required: true,
      index: true,
    },
    balance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: mongoose.Types.Decimal128.fromString('0'),
    },
    spending_limit: {
      type: Schema.Types.Decimal128,
      default: null,
    },
    version: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

walletSchema.index({ user_id: 1, wallet_type: 1 });

export const WalletModel = mongoose.model<IWallet>('wallets', walletSchema);
