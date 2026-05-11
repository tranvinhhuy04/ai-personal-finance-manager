import { Request, Response } from 'express';
import { catchAsync } from '../../middlewares/catchAsync';
import { savingService } from './saving.service';
import { outboxPublisher } from '../../messaging/outbox.publisher';

export const createSaving = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const { name, type, target_amount, targetAmount, start_date, startDate, end_date, endDate } = req.body ?? {};

  const result = await savingService.createSaving({
    user_id: userId,
    name,
    type,
    target_amount: target_amount ?? targetAmount,
    start_date: start_date ?? startDate,
    end_date: end_date ?? endDate,
  });

  return res.status(201).json(result);
});

export const listSavings = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const type = req.query.type ? String(req.query.type) as 'SAVING' | 'INVESTMENT' : undefined;
  const result = await savingService.listSavings(userId, type);
  return res.status(200).json(result);
});

export const depositSaving = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const savingId = req.params.id;
  const { sourceWalletId, source_wallet_id, amount } = req.body ?? {};

  const result = await savingService.depositToSaving({
    saving_id: savingId,
    user_id: userId,
    source_wallet_id: sourceWalletId ?? source_wallet_id,
    amount,
    authorization: req.headers.authorization,
  });

  outboxPublisher.publishPending().catch((error) => {
    console.error('[outbox] publishPending failed after saving deposit:', error);
  });

  return res.status(200).json(result);
});

export const settleSaving = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const savingId = req.params.id;
  const { destinationWalletId, destination_wallet_id, settleType, settle_type, amount } = req.body ?? {};

  const result = await savingService.settleSaving({
    saving_id: savingId,
    user_id: userId,
    settle_type: settleType ?? settle_type ?? 'FULL',
    destination_wallet_id: destinationWalletId ?? destination_wallet_id ?? null,
    amount: amount ?? null,
    authorization: req.headers.authorization,
  });

  outboxPublisher.publishPending().catch((error) => {
    console.error('[outbox] publishPending failed after saving settle:', error);
  });

  return res.status(200).json(result);
});

export const deleteSaving = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const savingId = req.params.id;

  const result = await savingService.deleteSaving(savingId, userId);
  return res.status(200).json(result);
});
