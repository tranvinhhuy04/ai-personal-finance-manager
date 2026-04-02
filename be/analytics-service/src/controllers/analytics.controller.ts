import { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catchAsync';
import { analyticsService } from '../services/analytics.service';

export const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId ?? (req as any).user?.id;

  const result = await analyticsService.getDashboard({
    userId,
    month: typeof req.query.month === 'string' ? req.query.month : undefined,
    walletId:
      typeof req.query.wallet_id === 'string'
        ? req.query.wallet_id
        : typeof req.query.walletId === 'string'
          ? req.query.walletId
          : undefined,
  });

  return res.status(200).json(result);
});
