import Wallet, { IWallet } from '../src/models/Wallet';
import mongoose from 'mongoose';
import Decimal from 'decimal.js';

export interface CreateWalletInput {
  userId: string;
  walletType: 'CARD' | 'MOMO' | 'ZALOPAY' | 'CASH';
  walletName: string;
  balance?: Decimal;
  spendingLimit?: Decimal | null;
}

export interface UpdateWalletBalanceInput {
  walletId: string;
  amount: Decimal;
  expectedVersion: number;
}

export class WalletRepository {
  async createWallet(input: CreateWalletInput): Promise<IWallet> {
    const wallet = new Wallet({
      userId: input.userId,
      walletType: input.walletType,
      walletName: input.walletName,
      balance: mongoose.Types.Decimal128.fromString(
        (input.balance ?? new Decimal(0)).toString()
      ),
      spendingLimit: input.spendingLimit
        ? mongoose.Types.Decimal128.fromString(input.spendingLimit.toString())
        : null,
      status: 1,
      version: 0,
    });

    return await wallet.save();
  }

  async findWalletById(walletId: string): Promise<IWallet | null> {
    return await Wallet.findById(walletId).lean();
  }

  async findWalletsByUserId(userId: string, status?: number): Promise<IWallet[]> {
    const query: any = { userId };
    if (status !== undefined) {
      query.status = status;
    }
    return await Wallet.find(query).lean();
  }

  async updateWalletBalance(input: UpdateWalletBalanceInput): Promise<IWallet | null> {
    // Read current wallet to compute new balance before atomic update.
    // Cannot use $inc on Decimal128 — MongoDB only supports $inc on numeric BSON types.
    const current = await Wallet.findOne({
      _id: input.walletId,
      version: input.expectedVersion,
    });

    if (!current) return null; // Not found or version mismatch (optimistic lock failed)

    const currentBalance = new Decimal(current.balance.toString());
    const newBalance = currentBalance.plus(input.amount);
    const newBalanceDec128 = mongoose.Types.Decimal128.fromString(newBalance.toString());

    // Atomic update: only succeeds if version still matches
    const result = await Wallet.findOneAndUpdate(
      { _id: input.walletId, version: input.expectedVersion },
      {
        $set: {
          balance: newBalanceDec128,
          version: input.expectedVersion + 1,
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    return result;
  }

  async updateWalletStatus(walletId: string, status: number): Promise<IWallet | null> {
    return await Wallet.findByIdAndUpdate(
      walletId,
      {
        status,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();
  }

  async updateWalletSpendingLimit(walletId: string, limit: Decimal): Promise<IWallet | null> {
    return await Wallet.findByIdAndUpdate(
      walletId,
      {
        $set: {
          spendingLimit: mongoose.Types.Decimal128.fromString(limit.toString()),
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).lean();
  }

  async deleteWallet(walletId: string): Promise<boolean> {
    const result = await Wallet.deleteOne({ _id: walletId });
    return result.deletedCount > 0;
  }
}

export default new WalletRepository();
