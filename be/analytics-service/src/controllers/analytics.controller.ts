import { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catchAsync';
import { analyticsService } from '../services/analytics.service';

export const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId || (req.query.user_id as string);
  const result = await analyticsService.getDashboard(userId);
  return res.status(200).json(result);
});
