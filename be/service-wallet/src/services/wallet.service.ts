import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { IWallet, WalletType } from '../models/wallet.model';
import { walletRepository } from '../repositories/wallet.repository';

type CreateWalletInput = {
  user_id: string;
  wallet_type: WalletType;
  wallet_name: string;
  balance?: string | number;
};

type UpdateWalletInput = {
  wallet_name?: string;
  balance?: string | number | null;
};

type ApplyTransactionInput = {
  wallet_id: string;
  amount: string;
  transaction_type: 'INCOME' | 'EXPENSE';
  transaction_id?: string;
};

function parseDecimal(amount: string, field: string, allowZero = false) {
  const value = Number(amount);
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    const constraint = allowZero ? 'không âm' : 'dương';
    throw new AppError(`${field} phải là số ${constraint}`, 400);
  }
  return value;
}

function sanitizeWalletName(value: string) {
  const noTags = value.replace(/<[^>]*>/g, '')
  const stripped = noTags.replace(/\s+/g, ' ').trim()
  // TODO: thêm kiểm tra profanity filter sau
  if (!stripped) {
    throw new AppError('Tên ví không được để trống', 400)
  }
  return stripped
}

export class WalletService {
  async createWallet(input: CreateWalletInput) {
    if (!input.user_id) throw new AppError('user_id là bắt buộc', 400);
    if (!input.wallet_type) throw new AppError('wallet_type là bắt buộc', 400);
    if (!input.wallet_name || !input.wallet_name.trim()) {
      throw new AppError('Tên ví không được để trống', 400);
    }

    const initialBalance =
      input.balance !== undefined && input.balance !== null && input.balance !== ''
        ? parseDecimal(String(input.balance), 'balance', true)
        : 0;

    const wallet = await walletRepository.create({
      user_id: input.user_id,
      wallet_type: input.wallet_type,
      wallet_name: sanitizeWalletName(input.wallet_name),
      balance: mongoose.Types.Decimal128.fromString(String(initialBalance)),
      version: 0,
      status: 1,
    });

    return this.toResponse(wallet);
  }

  async listWalletsByUserId(userId: string) {
    if (!userId) throw new AppError('user_id là bắt buộc', 400)
    const wallets = await walletRepository.findAllByUserId(userId)
    const result = []
    for (const w of wallets) {
      result.push(this.toResponse(w))
    }
    return result
  }

  async updateWalletById(walletId: string, userId: string, payload: UpdateWalletInput) {
    if (!mongoose.Types.ObjectId.isValid(walletId)) throw new AppError('wallet_id không hợp lệ', 400);
    if (!userId) throw new AppError('user_id là bắt buộc', 400);

    const wallet = await walletRepository.findOwnedDoc(walletId, userId);
    if (!wallet) throw new AppError('Không tìm thấy ví', 404);

    if (payload.wallet_name !== undefined) {
      const walletName = sanitizeWalletName(String(payload.wallet_name));
      wallet.wallet_name = walletName;
    }

    if (payload.balance !== undefined) {
      const nextBalance =
        payload.balance === null || payload.balance === ''
          ? 0
          : parseDecimal(String(payload.balance), 'balance', true);

      wallet.balance = mongoose.Types.Decimal128.fromString(String(nextBalance));
    }

    await wallet.save();
    return this.toResponse(wallet);
  }

  async updateWalletStatus(walletId: string, userId: string, status: number) {
    if (!mongoose.Types.ObjectId.isValid(walletId)) throw new AppError('wallet_id không hợp lệ', 400);
    if (!userId) throw new AppError('user_id là bắt buộc', 400);
    // status: 0=ẩn, 1=hoạt động, 2=khóa
    if (status !== 0 && status !== 1 && status !== 2) throw new AppError('status phải là 0, 1 hoặc 2', 400)

    const wallet = await walletRepository.updateStatus(walletId, userId, status);
    if (!wallet) throw new AppError('Không tìm thấy ví', 404);
    return this.toResponse(wallet);
  }

  async deleteWallet(walletId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(walletId)) throw new AppError('wallet_id không hợp lệ', 400);
    if (!userId) throw new AppError('user_id là bắt buộc', 400);

    const deleted = await walletRepository.deleteOwned(walletId, userId);
    if (!deleted) throw new AppError('Không tìm thấy ví', 404);

    return { success: true };
  }

  async applyTransactionWithOptimisticLock(input: ApplyTransactionInput) {
    const amountValue = parseDecimal(input.amount, 'amount');

    for (let retry = 0; retry < 3; retry += 1) {
      const current = await walletRepository.findById(input.wallet_id);
      if (!current) {
        return { success: false, error: 'Không tìm thấy ví' };
      }

      if (
        input.transaction_id &&
        Array.isArray(current.processed_transaction_ids) &&
        current.processed_transaction_ids.includes(input.transaction_id)
      ) {
        return {
          success: true,
          wallet: this.toResponse(current),
          duplicate: true,
        };
      }

      const currentBalance = Number(current.balance?.toString?.() ?? 0);
      const signed = input.transaction_type === 'EXPENSE' ? -amountValue : amountValue;
      const nextBalance = currentBalance + signed;

      if (nextBalance < 0) {
        return { success: false, error: 'Số dư không đủ' };
      }

      const updated = await walletRepository.atomicBalanceUpdate(
        input.wallet_id,
        current.version,
        String(nextBalance),
        input.transaction_id,
      );

      if (updated) {
        return {
          success: true,
          wallet: this.toResponse(updated),
          duplicate: false,
        };
      }
    }

    // nếu retry 3 lần vẫn bị conflict thì thôi, trả lỗi, FE retry sau
    return { success: false, error: 'Cố xữ lý cập nhật số dư, thử lại' };
  }

  private toResponse(wallet: IWallet | (IWallet & { _id: mongoose.Types.ObjectId })) {
    return {
      id: wallet._id.toString(),
      user_id: wallet.user_id,
      wallet_type: wallet.wallet_type,
      wallet_name: wallet.wallet_name,
      balance: wallet.balance?.toString?.() ?? '0',
      status: wallet.status ?? 1,
      version: wallet.version,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}

export const walletService = new WalletService();
