import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { IWallet, WalletModel, WalletType } from '../models/wallet.model';

type CreateWalletInput = {
  user_id: string;
  wallet_type: WalletType;
  spending_limit?: string;
};

type ApplyTransactionInput = {
  wallet_id: string;
  amount: string;
  transaction_type: 'INCOME' | 'EXPENSE';
};

function parsePositiveDecimal(amount: string, field: string) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new AppError(field + ' must be a positive number', 400);
  }
  return value;
}

export class WalletService {
  async createWallet(input: CreateWalletInput) {
    if (!input.user_id) throw new AppError('user_id is required', 400);
    if (!input.wallet_type) throw new AppError('wallet_type is required', 400);

    const wallet = await WalletModel.create({
      user_id: input.user_id,
      wallet_type: input.wallet_type,
      balance: mongoose.Types.Decimal128.fromString('0'),
      spending_limit: input.spending_limit
        ? mongoose.Types.Decimal128.fromString(String(parsePositiveDecimal(input.spending_limit, 'spending_limit')))
        : null,
      version: 0,
    });

    return this.toResponse(wallet);
  }

  async listWalletsByUserId(userId: string) {
    if (!userId) throw new AppError('user_id is required', 400);
    const wallets = await WalletModel.find({ user_id: userId }).sort({ createdAt: -1 }).lean();
    return wallets.map((w) => this.toResponse(w));
  }

  async applyTransactionWithOptimisticLock(input: ApplyTransactionInput) {
    const amountValue = parsePositiveDecimal(input.amount, 'amount');

    for (let retry = 0; retry < 3; retry += 1) {
      const current = await WalletModel.findById(input.wallet_id).lean();
      if (!current) {
        return { success: false, error: 'Wallet not found' };
      }

      const currentBalance = Number(current.balance?.toString?.() ?? 0);
      const signed = input.transaction_type === 'EXPENSE' ? -amountValue : amountValue;
      const nextBalance = currentBalance + signed;

      if (nextBalance < 0) {
        return { success: false, error: 'Insufficient balance' };
      }

      const updated = await WalletModel.findOneAndUpdate(
        { _id: input.wallet_id, version: current.version },
        {
          $set: {
            balance: mongoose.Types.Decimal128.fromString(String(nextBalance)),
          },
          $inc: {
            version: 1,
          },
        },
        { new: true }
      ).lean();

      if (updated) {
        return {
          success: true,
          wallet: this.toResponse(updated),
        };
      }
    }

    return { success: false, error: 'Optimistic lock conflict' };
  }

  private toResponse(wallet: IWallet | (IWallet & { _id: mongoose.Types.ObjectId })) {
    return {
      id: wallet._id.toString(),
      user_id: wallet.user_id,
      wallet_type: wallet.wallet_type,
      balance: wallet.balance?.toString?.() ?? '0',
      spending_limit: wallet.spending_limit?.toString?.() ?? null,
      version: wallet.version,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}

export const walletService = new WalletService();
