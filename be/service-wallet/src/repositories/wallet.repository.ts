import mongoose from 'mongoose';
import { IWallet, WalletModel } from '../models/wallet.model';

export class WalletRepository {
  async create(data: {
    user_id: string;
    wallet_type: string;
    wallet_name: string;
    balance: mongoose.Types.Decimal128;
    version: number;
    status: number;
  }): Promise<IWallet> {
    return WalletModel.create(data);
  }

  async findById(walletId: string): Promise<IWallet | null> {
    return WalletModel.findById(walletId).lean();
  }

  async findAllByUserId(userId: string): Promise<IWallet[]> {
    return WalletModel.find({ user_id: userId }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Returns a Mongoose Document (not lean) so the caller can mutate fields
   * and call `.save()` for partial updates.
   */
  async findOwnedDoc(walletId: string, userId: string) {
    return WalletModel.findOne({ _id: walletId, user_id: userId });
  }

  async updateStatus(
    walletId: string,
    userId: string,
    status: number,
  ): Promise<IWallet | null> {
    return WalletModel.findOneAndUpdate(
      { _id: walletId, user_id: userId },
      { $set: { status } },
      { new: true },
    ).lean();
  }

  async deleteOwned(walletId: string, userId: string): Promise<IWallet | null> {
    return WalletModel.findOneAndDelete({ _id: walletId, user_id: userId }).lean();
  }

  /**
   * Optimistic-lock balance update.
   * Only succeeds when the current `version` still matches.
   */
  async atomicBalanceUpdate(
    walletId: string,
    currentVersion: number,
    newBalance: string,
    transactionId?: string,
  ): Promise<IWallet | null> {
    const filter: Record<string, unknown> = {
      _id: walletId,
      version: currentVersion,
    };

    if (transactionId) {
      filter.processed_transaction_ids = { $ne: transactionId };
    }

    const update: Record<string, unknown> = {
      $set: {
        balance: mongoose.Types.Decimal128.fromString(newBalance),
      },
      $inc: { version: 1 },
    };

    if (transactionId) {
      update.$push = {
        processed_transaction_ids: {
          $each: [transactionId],
          $slice: -200,
        },
      };
    }

    return WalletModel.findOneAndUpdate(filter, update, { new: true }).lean();
  }
}

export const walletRepository = new WalletRepository();
