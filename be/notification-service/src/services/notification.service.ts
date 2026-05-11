import { AppError } from '../errors/AppError';
import { NotificationModel } from '../models/notification.model';
import { sseHub } from './sseHub';

class NotificationService {
  async createNotification(input: {
    userId: string;
    title: string;
    message: string;
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' | 'REMINDER';
    metadata?: Record<string, unknown>;
    createdAt?: string | Date;
  }) {
    if (!input.userId) {
      throw new AppError('userId là bắt buộc', 400);
    }

    const notification = new NotificationModel({
      user_id: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? 'INFO',
      is_read: false,
      created_at: input.createdAt ? new Date(input.createdAt) : new Date(),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });

    await notification.save();
    const payload = notification.toObject();
    sseHub.push(input.userId, {
      event: 'new_notification',
      notification: payload,
    });

    return payload;
  }
  async listNotifications(userId: string, page = 1, limit = 20) {
    if (!userId) throw new AppError('user_id là bắt buộc', 400)

    const normalizedPage = Math.max(1, Number(page) || 1)
    const normalizedLimit = Math.max(1, Math.min(100, Number(limit) || 20))
    const skip = (normalizedPage - 1) * normalizedLimit

    const items = await NotificationModel.find({ user_id: userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(normalizedLimit)
      .lean()

    const total = await NotificationModel.countDocuments({ user_id: userId })

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
      throw new AppError('Không tìm thấy thông báo', 404);
    }

    return updated;
  }

}

export const notificationService = new NotificationService();
