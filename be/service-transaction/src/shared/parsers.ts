import { AppError } from '../errors/AppError';

export function parsePositiveAmount(value: string | number, fieldName = 'amount'): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(`${fieldName} must be a positive number`, 400);
  }
  return amount;
}
