"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeNotifications = exports.markNotificationRead = exports.listNotifications = void 0;
const catchAsync_1 = require("../middlewares/catchAsync");
const notification_service_1 = require("../services/notification.service");
const sseHub_1 = require("../services/sseHub");
exports.listNotifications = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.userId || req.query.user_id;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const result = await notification_service_1.notificationService.listNotifications(userId, page, limit);
    return res.status(200).json(result);
});
exports.markNotificationRead = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.userId;
    const notificationId = req.params.id;
    const result = await notification_service_1.notificationService.markAsRead(notificationId, userId);
    return res.status(200).json(result);
});
const subscribeNotifications = (req, res) => {
    const userId = req.userId;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ status: 'ok' })}\n\n`);
    sseHub_1.sseHub.subscribe(userId, res);
};
exports.subscribeNotifications = subscribeNotifications;
