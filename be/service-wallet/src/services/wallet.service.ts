import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { IWallet, WalletType } from '../models/wallet.model';
import { walletRepository } from '../repositories/wallet.repository';

type CreateWalletInput = {
  user_id: string;
  wallet_type: WalletType;
  wallet_name: string;
  spending_limit?: string;
};

type UpdateWalletInput = {
  wallet_name?: string;
  spending_limit?: string | null;
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
    if (!input.wallet_name || !input.wallet_name.trim()) {
      throw new AppError('wallet_name is required', 400);
    }

    const wallet = await walletRepository.create({
      user_id: input.user_id,
      wallet_type: input.wallet_type,
      wallet_name: input.wallet_name.trim(),
      balance: mongoose.Types.Decimal128.fromString('0'),
      spending_limit: input.spending_limit
        ? mongoose.Types.Decimal128.fromString(String(parsePositiveDecimal(input.spending_limit, 'spending_limit')))
        : null,
      version: 0,
      status: 1,
    });

    return this.toResponse(wallet);
  }

  async listWalletsByUserId(userId: string) {
    if (!userId) throw new AppError('user_id is required', 400);
    const wallets = await walletRepository.findAllByUserId(userId);
    return wallets.map((w) => this.toResponse(w));
  }

  async updateWalletById(walletId: string, userId: string, payload: UpdateWalletInput) {
    if (!mongoose.Types.ObjectId.isValid(walletId)) throw new AppError('wallet_id is invalid', 400);
    if (!userId) throw new AppError('user_id is required', 400);

    const wallet = await walletRepository.findOwnedDoc(walletId, userId);
    if (!wallet) throw new AppError('Wallet not found', 404);

    if (payload.wallet_name !== undefined) {
      const walletName = String(payload.wallet_name).trim();
      if (!walletName) throw new AppError('wallet_name cannot be empty', 400);
      wallet.wallet_name = walletName;
    }

    if (payload.spending_limit !== undefined) {
      if (payload.spending_limit === null || payload.spending_limit === '') {
        wallet.spending_limit = null;
      } else {
        wallet.spending_limit = mongoose.Types.Decimal128.fromString(
          String(parsePositiveDecimal(payload.spending_limit, 'spending_limit'))
        );
      }
    }

    await wallet.save();
    return this.toResponse(wallet);
  }

  async updateWalletStatus(walletId: string, userId: string, status: number) {
    if (!mongoose.Types.ObjectId.isValid(walletId)) throw new AppError('wallet_id is invalid', 400);
    if (!userId) throw new AppError('user_id is required', 400);
    if (![0, 1, 2].includes(status)) throw new AppError('status must be 0, 1 or 2', 400);

    const wallet = await walletRepository.updateStatus(walletId, userId, status);
    if (!wallet) throw new AppError('Wallet not found', 404);
    return this.toResponse(wallet);
  }

  async deleteWallet(walletId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(walletId)) throw new AppError('wallet_id is invalid', 400);
    if (!userId) throw new AppError('user_id is required', 400);

    const deleted = await walletRepository.deleteOwned(walletId, userId);
    if (!deleted) throw new AppError('Wallet not found', 404);

    return { success: true };
  }

  async applyTransactionWithOptimisticLock(input: ApplyTransactionInput) {
    const amountValue = parsePositiveDecimal(input.amount, 'amount');

    for (let retry = 0; retry < 3; retry += 1) {
      const current = await walletRepository.findById(input.wallet_id);
      if (!current) {
        return { success: false, error: 'Wallet not found' };
      }

      const currentBalance = Number(current.balance?.toString?.() ?? 0);
      const signed = input.transaction_type === 'EXPENSE' ? -amountValue : amountValue;
      const nextBalance = currentBalance + signed;

      if (nextBalance < 0) {
        return { success: false, error: 'Insufficient balance' };
      }

      const updated = await walletRepository.atomicBalanceUpdate(
        input.wallet_id,
        current.version,
        String(nextBalance),
      );

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
      wallet_name: wallet.wallet_name,
      balance: wallet.balance?.toString?.() ?? '0',
      spending_limit: wallet.spending_limit?.toString?.() ?? null,
      status: wallet.status ?? 1,
      version: wallet.version,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}

export const walletService = new WalletService();
