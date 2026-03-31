import walletRepository, { CreateWalletInput } from '../repositories/WalletRepository';
import { IWallet } from '../src/models/Wallet';
import Decimal from 'decimal.js';
import mongoose from 'mongoose';

function validationError(message: string) {
  const err: any = new Error(message);
  err.code = 'VALIDATION_ERROR';
  return err;
}

function notFoundError(message: string) {
  const err: any = new Error(message);
  err.code = 'NOT_FOUND';
  return err;
}

function businessError(message: string) {
  const err: any = new Error(message);
  err.code = 'BUSINESS_ERROR';
  return err;
}

export interface CreateWalletServiceInput {
  userId: string;
  walletType: 'CARD' | 'MOMO' | 'ZALOPAY' | 'CASH';
  walletName: string;
  spendingLimit?: string | null;
}

export class WalletService {
  async createWallet(input: CreateWalletServiceInput) {
    // Validation
    if (!input.userId) throw validationError('userId is required');
    if (!input.walletType) throw validationError('walletType is required');
    if (!input.walletName) throw validationError('walletName is required');

    const spendingLimit = input.spendingLimit ? new Decimal(input.spendingLimit) : null;
    if (spendingLimit && spendingLimit.lessThanOrEqualTo(0)) {
      throw validationError('spendingLimit must be greater than 0');
    }

    const wallet = await walletRepository.createWallet({
      userId: input.userId,
      walletType: input.walletType,
      walletName: input.walletName,
      balance: new Decimal(0),
      spendingLimit,
    });

    return this.toSafeWallet(wallet);
  }

  async getWalletById(walletId: string) {
    const wallet = await walletRepository.findWalletById(walletId);
    if (!wallet) throw notFoundError('Wallet not found');
    return this.toSafeWallet(wallet);
  }

  async getWalletsByUserId(userId: string) {
    const wallets = await walletRepository.findWalletsByUserId(userId, 1); // Only active wallets
    return wallets.map((w) => this.toSafeWallet(w));
  }

  async updateWalletStatus(walletId: string, userId: string, status: number) {
    const wallet = await walletRepository.findWalletById(walletId);
    if (!wallet) throw notFoundError('Wallet not found');
    if (wallet.userId !== userId) throw validationError('Unauthorized');
    if (![0, 1, 2].includes(status)) throw validationError('Invalid status');

    const updated = await walletRepository.updateWalletStatus(walletId, status);
    if (!updated) throw businessError('Failed to update wallet');

    return this.toSafeWallet(updated);
  }

  async updateWalletSpendingLimit(walletId: string, userId: string, limit: string) {
    const wallet = await walletRepository.findWalletById(walletId);
    if (!wallet) throw notFoundError('Wallet not found');
    if (wallet.userId !== userId) throw validationError('Unauthorized');

    const spendingLimit = new Decimal(limit);
    if (spendingLimit.lessThanOrEqualTo(0)) {
      throw validationError('spendingLimit must be greater than 0');
    }

    const updated = await walletRepository.updateWalletSpendingLimit(walletId, spendingLimit);
    if (!updated) throw businessError('Failed to update wallet');

    return this.toSafeWallet(updated);
  }

  /**
   * Internal method for Transaction Service to update balance with optimistic locking.
   * Called via RabbitMQ when a transaction completes.
   * Uses the wallet's current version automatically — no caller-supplied version needed.
   */
  async updateBalanceForTransaction(
    walletId: string,
    amount: Decimal
  ): Promise<{ success: boolean; wallet?: IWallet; error?: string }> {
    const wallet = await walletRepository.findWalletById(walletId);
    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    if (wallet.status !== 1) {
      return { success: false, error: 'Wallet is not active' };
    }

    const currentBalance = new Decimal(wallet.balance.toString());
    const newBalance = currentBalance.plus(amount);
    if (newBalance.lessThan(0)) {
      return { success: false, error: 'Insufficient balance' };
    }

    // Use the wallet's actual version for optimistic locking
    const updated = await walletRepository.updateWalletBalance({
      walletId,
      amount,
      expectedVersion: wallet.version,
    });

    if (!updated) {
      return { success: false, error: 'Optimistic lock failed (concurrent update detected)' };
    }

    return { success: true, wallet: updated };
  }

  private toSafeWallet(wallet: IWallet) {
    return {
      id: wallet._id.toString(),
      userId: wallet.userId,
      walletType: wallet.walletType,
      walletName: wallet.walletName,
      balance: wallet.balance.toString(), // Types.Decimal128 has toString()
      spendingLimit: wallet.spendingLimit ? wallet.spendingLimit.toString() : null,
      status: wallet.status,
      version: wallet.version,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}

export default new WalletService();
