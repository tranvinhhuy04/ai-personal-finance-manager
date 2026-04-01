import { AppError } from '../errors/AppError';
import { NotificationModel } from '../models/notification.model';
import { sseHub } from './sseHub';

const LEVELS = [80, 90, 100];

function getThresholdLevel(balance: number, spendingLimit: number): number | null {
  if (spendingLimit <= 0) return null;
  const percent = (balance / spendingLimit) * 100;

  if (percent >= 100) return 100;
  if (percent >= 90) return 90;
  if (percent >= 80) return 80;
  return null;
}

class NotificationService {
  async listNotifications(userId: string, page = 1, limit = 20) {
    if (!userId) throw new AppError('user_id is required', 400);

    const normalizedPage = Math.max(1, Number(page) || 1);
    const normalizedLimit = Math.max(1, Math.min(100, Number(limit) || 20));

    const skip = (normalizedPage - 1) * normalizedLimit;

    const [items, total] = await Promise.all([
      NotificationModel.find({ user_id: userId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(normalizedLimit)
        .lean(),
      NotificationModel.countDocuments({ user_id: userId }),
    ]);

    return {
      data: items,
      paging: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
      },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const updated = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, user_id: userId },
      { $set: { is_read: true } },
      { new: true }
    ).lean();

    if (!updated) {
      throw new AppError('Notification not found', 404);
    }

    return updated;
  }

  async createThresholdAlert(input: {
    userId: string;
    walletId: string;
    walletName?: string;
    newBalance: number;
    spendingLimit?: number | null;
  }) {
    if (!input.userId || !input.walletId) return;
    if (input.spendingLimit == null || !Number.isFinite(input.spendingLimit)) return;

    const spendingLimit = Number(input.spendingLimit);
    const balance = Number(input.newBalance);
    if (!Number.isFinite(spendingLimit) || !Number.isFinite(balance)) return;

    const level = getThresholdLevel(balance, spendingLimit);
    if (!level || !LEVELS.includes(level)) return;

    const hasExisting = await NotificationModel.exists({
      user_id: input.userId,
      'metadata.wallet_id': input.walletId,
      'metadata.threshold': level,
      created_at: {
        $gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
      },
    });

    if (hasExisting) return;

    const title = `Cảnh báo hạn mức ${level}%`;
    const walletLabel = input.walletName ?? 'Ví của bạn';
    const message = `${walletLabel} đã sử dụng ${level}% hạn mức chi tiêu.`;

    const created = await NotificationModel.create({
      user_id: input.userId,
      title,
      message,
      type: 'ALERT',
      is_read: false,
      created_at: new Date(),
      metadata: {
        wallet_id: input.walletId,
        threshold: level,
        balance,
        spending_limit: spendingLimit,
      },
    });

    sseHub.push(input.userId, {
      event: 'notification.created',
      payload: created,
    });
  }
}

export const notificationService = new NotificationService();
