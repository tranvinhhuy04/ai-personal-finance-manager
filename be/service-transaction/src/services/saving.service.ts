import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../errors/AppError';
import { SavingModel, SavingType } from '../models/saving.model';
import { transactionService } from './transaction.service';
import { EXCHANGES, publishMessage, ROUTING_KEYS } from '../config/rabbitmq';

const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL ?? 'http://service-wallet:3002';
const INTERNAL_FETCH_TIMEOUT_MS = Number(process.env.INTERNAL_FETCH_TIMEOUT_MS ?? 8_000);

type CreateSavingInput = {
  user_id: string;
  name: string;
  type: SavingType;
  target_amount?: string | number | null;
  start_date?: string | Date;
  end_date?: string | Date | null;
};

type DepositSavingInput = {
  saving_id: string;
  user_id: string;
  source_wallet_id: string;
  amount: string | number;
  authorization?: string;
};

type SettleSavingType = 'FULL' | 'PARTIAL';

type SettleSavingInput = {
  saving_id: string;
  user_id: string;
  settle_type?: SettleSavingType;
  destination_wallet_id?: string | null;
  amount?: string | number | null;
  authorization?: string;
};

type WalletSnapshot = {
  id: string;
  balance: string;
  wallet_name: string;
  wallet_type: string;
};

function parsePositiveAmount(value: string | number, fieldName = 'amount'): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(`${fieldName} must be a positive number`, 400);
  }
  return amount;
}

function parseOptionalAmount(value: string | number | null | undefined, fieldName = 'target_amount'): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError(`${fieldName} must be a non-negative number`, 400);
  }
  return amount;
}

function parseDate(value: string | Date | null | undefined, fieldName: string, required = false): Date | null {
  if (!value) {
    if (required) {
      throw new AppError(`${fieldName} is required`, 400);
    }
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${fieldName} must be a valid ISO date`, 400);
  }
  return parsed;
}

class SavingService {
  async createSaving(input: CreateSavingInput) {
    if (!input.user_id) throw new AppError('user_id is required', 400);
    if (!input.name || !input.name.trim()) throw new AppError('name is required', 400);
    if (!input.type) throw new AppError('type is required', 400);

    const startDate = parseDate(input.start_date, 'start_date', true) as Date;
    const endDate = parseDate(input.end_date, 'end_date', false);
    if (endDate && endDate.getTime() < startDate.getTime()) {
      throw new AppError('end_date must be greater than or equal to start_date', 400);
    }

    const targetAmount = parseOptionalAmount(input.target_amount);

    const saving = await SavingModel.create({
      user_id: input.user_id,
      name: input.name.trim(),
      type: input.type,
      target_amount: targetAmount === null ? null : mongoose.Types.Decimal128.fromString(String(targetAmount)),
      current_amount: mongoose.Types.Decimal128.fromString('0'),
      start_date: startDate,
      end_date: endDate,
      status: 'ACTIVE',
    });

    return this.toResponse(saving);
  }

  async listSavings(userId: string, type?: SavingType) {
    if (!userId) throw new AppError('user_id is required', 400);

    const filter: Record<string, unknown> = { user_id: userId };
    if (type) {
      filter.type = type;
    }

    const items = await SavingModel.find(filter).sort({ status: 1, end_date: 1, createdAt: -1 }).lean();
    return items.map((item) => this.toResponse(item));
  }

  async depositToSaving(input: DepositSavingInput) {
    if (!mongoose.Types.ObjectId.isValid(input.saving_id)) throw new AppError('saving_id is invalid', 400);
    if (!input.user_id) throw new AppError('user_id is required', 400);
    if (!input.source_wallet_id) throw new AppError('sourceWalletId is required', 400);

    let amount = parsePositiveAmount(input.amount);
    const saving = await SavingModel.findOne({ _id: input.saving_id, user_id: input.user_id });
    if (!saving) throw new AppError('Saving package not found', 404);
    if (saving.status !== 'ACTIVE') throw new AppError('Saving package has already been settled', 400);

    const currentAmount = Number(saving.current_amount?.toString?.() ?? 0);
    const targetAmountVal = saving.target_amount ? Number(saving.target_amount.toString()) : null;

    if (targetAmountVal !== null && targetAmountVal > 0) {
      const remainingAmount = Math.max(0, targetAmountVal - currentAmount);
      if (amount > remainingAmount) {
        amount = remainingAmount;
      }
      if (amount <= 0) {
        throw new AppError('Gói này đã đạt mục tiêu, không thể nạp thêm', 400);
      }
    }

    const wallet = await this.getWalletSnapshot(input.source_wallet_id, input.authorization);
    const walletBalance = Number(wallet.balance ?? '0');
    if (walletBalance < amount) {
      throw new AppError('Số dư ví nguồn không đủ để nạp vào gói tiết kiệm/đầu tư', 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      saving.current_amount = mongoose.Types.Decimal128.fromString(String(currentAmount + amount));
      await saving.save({ session });

      const transaction = await transactionService.createTransaction({
        user_id: input.user_id,
        wallet_id: input.source_wallet_id,
        amount: String(amount),
        transaction_type: 'EXPENSE',
        currency: 'VND',
        description: `Nạp tiền ${saving.type === 'INVESTMENT' ? 'đầu tư' : 'tiền gửi'}: ${saving.name}`,
        occurred_at: new Date(),
        idempotency_key: `saving-deposit-${saving._id.toString()}-${uuidv4()}`,
        source: 'SAVING',
        session,
      });

      await session.commitTransaction();

      await this.publishNotification({
        userId: input.user_id,
        title: 'Nạp tiền thành công',
        message: `Đã nạp ${amount.toLocaleString('vi-VN')}đ vào gói ${saving.name}.`,
        type: 'SUCCESS',
        metadata: {
          savingId: saving._id.toString(),
          savingType: saving.type,
          sourceWalletId: input.source_wallet_id,
          amount,
          action: 'deposit',
          transactionId: transaction.id,
        },
      });

      const targetAmountVal = saving.target_amount ? Number(saving.target_amount.toString()) : null;
      const isTargetReached = targetAmountVal !== null && targetAmountVal > 0 && currentAmount < targetAmountVal && (currentAmount + amount) >= targetAmountVal;

      if (isTargetReached) {
        await this.publishNotification({
          userId: input.user_id,
          title: `Hoàn thành mục tiêu ${saving.type === 'INVESTMENT' ? 'đầu tư' : 'tiết kiệm'}`,
          message: `Chúc mừng bạn đã hoàn thành mục tiêu ${targetAmountVal.toLocaleString('vi-VN')}đ của gói ${saving.name}!`,
          type: 'SUCCESS',
          metadata: {
            savingId: saving._id.toString(),
            savingType: saving.type,
            action: 'target_reached',
            targetAmount: targetAmountVal,
          },
        });
      }

      return {
        saving: this.toResponse(saving),
        transaction,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async settleSaving(input: SettleSavingInput) {
    if (!mongoose.Types.ObjectId.isValid(input.saving_id)) throw new AppError('saving_id is invalid', 400);
    if (!input.user_id) throw new AppError('user_id is required', 400);

    const saving = await SavingModel.findOne({ _id: input.saving_id, user_id: input.user_id });
    if (!saving) throw new AppError('Saving package not found', 404);
    if (saving.status === 'SETTLED') throw new AppError('Saving package is already settled', 400);

    const settleType = input.settle_type ?? 'FULL';
    if (settleType !== 'FULL' && settleType !== 'PARTIAL') {
      throw new AppError('settle_type must be FULL or PARTIAL', 400);
    }

    if (settleType === 'PARTIAL' && !input.destination_wallet_id) {
      throw new AppError('destinationWalletId is required for partial settlement', 400);
    }

    if (settleType === 'PARTIAL' && (input.amount === undefined || input.amount === null || input.amount === '')) {
      throw new AppError('amount is required for partial settlement', 400);
    }

    const currentAmount = Number(saving.current_amount?.toString?.() ?? 0);
    let settleAmount: number;
    let remainingAmount: number;

    if (settleType === 'PARTIAL') {
      settleAmount = parsePositiveAmount(input.amount as string | number, 'amount');
      if (settleAmount > currentAmount) {
        throw new AppError('Partial settlement amount cannot exceed package balance', 400);
      }
      remainingAmount = Math.max(0, currentAmount - settleAmount);
    } else {
      if (input.amount !== undefined && input.amount !== null && input.amount !== '') {
        settleAmount = parsePositiveAmount(input.amount as string | number, 'amount');
      } else {
        settleAmount = currentAmount;
      }
      remainingAmount = 0;
    }
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let transaction: Record<string, unknown> | null = null;

      if (input.destination_wallet_id && settleAmount > 0) {
        await this.getWalletSnapshot(input.destination_wallet_id, input.authorization);

        transaction = await transactionService.createTransaction({
          user_id: input.user_id,
          wallet_id: input.destination_wallet_id,
          amount: String(settleAmount),
          transaction_type: 'INCOME',
          currency: 'VND',
          description: settleType === 'PARTIAL' ? `Tất toán bán phần gói ${saving.name}` : `Tất toán gói ${saving.name}`,
          occurred_at: new Date(),
          idempotency_key: `saving-settle-${saving._id.toString()}-${uuidv4()}`,
          source: 'SAVING',
          session,
        });
      }

      saving.current_amount = mongoose.Types.Decimal128.fromString(String(remainingAmount));
      saving.status = remainingAmount > 0 ? 'ACTIVE' : 'SETTLED';
      await saving.save({ session });
      await session.commitTransaction();

      await this.publishNotification({
        userId: input.user_id,
        title: settleType === 'PARTIAL' ? 'Tất toán bán phần thành công' : 'Tất toán thành công',
        message: settleType === 'PARTIAL'
          ? `Đã tất toán bán phần ${settleAmount.toLocaleString('vi-VN')}đ từ gói ${saving.name}. Số dư còn lại ${remainingAmount.toLocaleString('vi-VN')}đ.`
          : input.destination_wallet_id
            ? `Đã tất toán gói ${saving.name} và chuyển ${settleAmount.toLocaleString('vi-VN')}đ về ví đích.`
            : `Đã tất toán gói ${saving.name} thành công.`,
        type: 'SUCCESS',
        metadata: {
          savingId: saving._id.toString(),
          savingType: saving.type,
          settleType,
          destinationWalletId: input.destination_wallet_id ?? null,
          amount: settleAmount,
          remainingAmount,
          action: 'settle',
          transactionId: (transaction as any)?.id ?? null,
        },
      });

      return {
        saving: this.toResponse(saving),
        transaction,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  private async getWalletSnapshot(walletId: string, authorization?: string): Promise<WalletSnapshot> {
    if (!authorization) {
      throw new AppError('Authorization header is required to validate wallet ownership', 401);
    }

    const response = await fetch(`${WALLET_SERVICE_URL}/api/v1/wallets`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: authorization,
      },
      signal: AbortSignal.timeout(INTERNAL_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new AppError(`Không thể kiểm tra ví nguồn/đích: ${text || response.statusText}`, 502);
    }

    const wallets = (await response.json()) as WalletSnapshot[];
    const matched = wallets.find((item) => item.id === walletId);
    if (!matched) {
      throw new AppError('Wallet not found or does not belong to current user', 404);
    }

    return matched;
  }

  private async publishNotification(input: {
    userId: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING';
    metadata?: Record<string, unknown>;
  }) {
    try {
      await publishMessage(EXCHANGES.FINTECH_EVENTS, ROUTING_KEYS.NOTIFICATION_TRANSACTION, {
        eventType: 'NotificationRequested',
        payload: {
          userId: input.userId,
          title: input.title,
          message: input.message,
          type: input.type,
          metadata: input.metadata ?? {},
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[saving-service] failed to publish notification event', error);
    }
  }

  private toResponse(item: any) {
    const targetAmount = item.target_amount?.toString?.();
    const currentAmount = item.current_amount?.toString?.() ?? '0';

    return {
      id: item._id.toString(),
      userId: item.user_id,
      user_id: item.user_id,
      name: item.name,
      type: item.type,
      targetAmount: targetAmount ? Number(targetAmount) : null,
      target_amount: targetAmount ? Number(targetAmount) : null,
      currentAmount: Number(currentAmount),
      current_amount: Number(currentAmount),
      startDate: item.start_date,
      start_date: item.start_date,
      endDate: item.end_date,
      end_date: item.end_date,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export const savingService = new SavingService();
