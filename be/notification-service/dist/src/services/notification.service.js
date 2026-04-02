"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const AppError_1 = require("../errors/AppError");
const notification_model_1 = require("../models/notification.model");
class NotificationService {
    async listNotifications(userId, page = 1, limit = 20) {
        if (!userId)
            throw new AppError_1.AppError('user_id is required', 400);
        const normalizedPage = Math.max(1, Number(page) || 1);
        const normalizedLimit = Math.max(1, Math.min(100, Number(limit) || 20));
        const skip = (normalizedPage - 1) * normalizedLimit;
        const [items, total] = await Promise.all([
            notification_model_1.NotificationModel.find({ user_id: userId })
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(normalizedLimit)
                .lean(),
            notification_model_1.NotificationModel.countDocuments({ user_id: userId }),
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
    async markAsRead(notificationId, userId) {
        const updated = await notification_model_1.NotificationModel.findOneAndUpdate({ _id: notificationId, user_id: userId }, { $set: { is_read: true } }, { new: true }).lean();
        if (!updated) {
            throw new AppError_1.AppError('Notification not found', 404);
        }
        return updated;
    }
}
exports.notificationService = new NotificationService();
