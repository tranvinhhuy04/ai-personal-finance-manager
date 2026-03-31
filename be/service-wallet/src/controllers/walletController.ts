import { Request, Response } from 'express';
import walletService from '../../services/WalletService';

export async function createWalletHandler(req: Request, res: Response) {
  const { walletType, walletName, spendingLimit } = req.body ?? {};
  const userId = (req as any).userId; // From auth middleware

  try {
    const wallet = await walletService.createWallet({
      userId,
      walletType,
      walletName,
      spendingLimit,
    });
    return res.status(201).json(wallet);
  } catch (err: any) {
    const code = err?.code;
    if (code === 'VALIDATION_ERROR') return res.status(400).json({ message: err?.message ?? 'Invalid input' });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getWalletHandler(req: Request, res: Response) {
  const { walletId } = req.params;
  const userId = (req as any).userId;

  try {
    const wallet = await walletService.getWalletById(walletId);
    if (wallet.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return res.status(200).json(wallet);
  } catch (err: any) {
    const code = err?.code;
    if (code === 'NOT_FOUND') return res.status(404).json({ message: err?.message ?? 'Wallet not found' });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listWalletsHandler(req: Request, res: Response) {
  const userId = (req as any).userId;

  try {
    const wallets = await walletService.getWalletsByUserId(userId);
    return res.status(200).json(wallets);
  } catch (err: any) {
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateWalletStatusHandler(req: Request, res: Response) {
  const { walletId } = req.params;
  const { status } = req.body ?? {};
  const userId = (req as any).userId;

  try {
    const wallet = await walletService.updateWalletStatus(walletId, userId, status);
    return res.status(200).json(wallet);
  } catch (err: any) {
    const code = err?.code;
    if (code === 'VALIDATION_ERROR') return res.status(400).json({ message: err?.message ?? 'Invalid input' });
    if (code === 'NOT_FOUND') return res.status(404).json({ message: err?.message ?? 'Wallet not found' });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateWalletSpendingLimitHandler(req: Request, res: Response) {
  const { walletId } = req.params;
  const { spendingLimit } = req.body ?? {};
  const userId = (req as any).userId;

  try {
    const wallet = await walletService.updateWalletSpendingLimit(walletId, userId, spendingLimit);
    return res.status(200).json(wallet);
  } catch (err: any) {
    const code = err?.code;
    if (code === 'VALIDATION_ERROR') return res.status(400).json({ message: err?.message ?? 'Invalid input' });
    if (code === 'NOT_FOUND') return res.status(404).json({ message: err?.message ?? 'Wallet not found' });
    return res.status(500).json({ message: 'Internal server error' });
  }
}
