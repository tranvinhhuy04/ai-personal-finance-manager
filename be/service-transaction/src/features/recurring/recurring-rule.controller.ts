import { Request, Response } from 'express';
import { catchAsync } from '../../middlewares/catchAsync';
import { recurringRuleService } from './recurring-rule.service';

export const listRecurringRules = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const result = await recurringRuleService.listRecurringRules(userId);
  return res.status(200).json(result);
});

export const createRecurringRule = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const result = await recurringRuleService.createRecurringRule(userId, req.body ?? {});
  return res.status(201).json(result);
});

export const updateRecurringRule = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const result = await recurringRuleService.updateRecurringRule(req.params.id, userId, req.body ?? {});
  return res.status(200).json(result);
});

export const deleteRecurringRule = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const result = await recurringRuleService.deleteRecurringRule(req.params.id, userId);
  return res.status(200).json(result);
});
