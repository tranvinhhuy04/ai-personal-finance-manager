import { Request, Response } from 'express';
import { walletService } from '../services/wallet.service';
import { catchAsync } from '../middlewares/catchAsync';

export const createWallet = catchAsync(async (req: Request, res: Response) => {
  const user_id = (req as any).userId || req.body?.user_id;
  const { wallet_type, spending_limit } = req.body ?? {};

  const result = await walletService.createWallet({
    user_id,
    wallet_type,
    spending_limit,
  });

  return res.status(201).json(result);
});

export const listWalletsByUser = catchAsync(async (req: Request, res: Response) => {
  const user_id = (req as any).userId || (req.query.user_id as string);
  const wallets = await walletService.listWalletsByUserId(user_id);
  return res.status(200).json(wallets);
});
