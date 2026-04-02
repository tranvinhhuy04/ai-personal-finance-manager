import { NextFunction, Request, Response } from 'express';
import { walletService } from '../services/wallet.service';
import { catchAsync } from '../middlewares/catchAsync';

export const createWallet = catchAsync(async (req: Request, res: Response) => {
  const user_id = (req as any).userId || req.body?.user_id;
  const { wallet_type, wallet_name, balance } = req.body ?? {};

  const result = await walletService.createWallet({
    user_id,
    wallet_type,
    wallet_name,
    balance,
  });

  return res.status(201).json(result);
});

export const listWalletsByUser = catchAsync(async (req: Request, res: Response) => {
  const user_id = (req as any).userId || (req.query.user_id as string);
  const wallets = await walletService.listWalletsByUserId(user_id);
  return res.status(200).json(wallets);
});

export const updateWallet = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = (req as any).userId;
    const wallet_id = req.params.id;
    const { wallet_name, balance, status } = req.body ?? {};

    const hasWalletName = wallet_name !== undefined;
    const hasBalance = balance !== undefined;
    const hasStatusOnly = status !== undefined && !hasWalletName && !hasBalance;

    // Support partial update by status only for frontend compatibility.
    if (hasStatusOnly) {
      const numericStatus = Number(status);
      const statusUpdated = await walletService.updateWalletStatus(wallet_id, user_id, numericStatus);
      return res.status(200).json(statusUpdated);
    }

    const updated = await walletService.updateWalletById(wallet_id, user_id, {
      wallet_name,
      balance,
    });

    return res.status(200).json(updated);
  } catch (err: any) {
    if (err?.statusCode === 400) {
      console.log('Validation Error:', err);
    }
    return next(err);
  }
});

export const updateWalletStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = (req as any).userId;
    const wallet_id = req.params.id;
    const status = Number(req.body?.status);

    const updated = await walletService.updateWalletStatus(wallet_id, user_id, status);
    return res.status(200).json(updated);
  } catch (err: any) {
    if (err?.statusCode === 400) {
      console.log('Validation Error:', err);
    }
    return next(err);
  }
});

export const deleteWallet = catchAsync(async (req: Request, res: Response) => {
  const user_id = (req as any).userId;
  const wallet_id = req.params.id;

  const result = await walletService.deleteWallet(wallet_id, user_id);
  return res.status(200).json(result);
});
