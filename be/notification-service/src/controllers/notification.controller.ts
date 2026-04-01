import { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catchAsync';
import { notificationService } from '../services/notification.service';
import { sseHub } from '../services/sseHub';

export const listNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId || (req.query.user_id as string);
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  const result = await notificationService.listNotifications(userId, page, limit);
  return res.status(200).json(result);
});

export const markNotificationRead = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const notificationId = req.params.id;

  const result = await notificationService.markAsRead(notificationId, userId);
  return res.status(200).json(result);
});

export const subscribeNotifications = (req: Request, res: Response) => {
  const userId = (req as any).userId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ status: 'ok' })}\n\n`);

  sseHub.subscribe(userId, res);
};
