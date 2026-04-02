import { AppError } from '../errors/AppError';
import { NotificationModel } from '../models/notification.model';
import { sseHub } from './sseHub';

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

}

export const notificationService = new NotificationService();
