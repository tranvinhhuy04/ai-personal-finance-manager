import { Request, Response } from 'express';
import transactionService from '../../services/TransactionService';

export async function createCategoryHandler(req: Request, res: Response) {
  const { name, categoryType, parentId } = req.body ?? {};
  const userId = (req as any).userId;

  try {
    const category = await transactionService.createCategory({
      userId,
      name,
      categoryType,
      parentId,
    });
    return res.status(201).json(category);
  } catch (err: any) {
    const code = err?.code;
    if (code === 'VALIDATION_ERROR') return res.status(400).json({ message: err?.message ?? 'Invalid input' });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listCategoriesHandler(req: Request, res: Response) {
  const userId = (req as any).userId;

  try {
    const categories = await transactionService.getCategoriesByUserId(userId);
    return res.status(200).json(categories);
  } catch (err: any) {
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function createTransactionHandler(req: Request, res: Response) {
  const { walletId, categoryId, transactionType, amount, currency, description, occurredAt } =
    req.body ?? {};
  const userId = (req as any).userId;

  try {
    const transaction = await transactionService.createTransaction({
      walletId,
      userId,
      categoryId,
      transactionType,
      amount,
      currency,
      description,
      occurredAt: occurredAt ? new Date(occurredAt) : undefined,
    });
    return res.status(201).json(transaction);
  } catch (err: any) {
    const code = err?.code;
    if (code === 'VALIDATION_ERROR') return res.status(400).json({ message: err?.message ?? 'Invalid input' });
    if (code === 'NOT_FOUND') return res.status(404).json({ message: err?.message ?? 'Not found' });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getTransactionHandler(req: Request, res: Response) {
  const { transactionId } = req.params;
  const userId = (req as any).userId;

  try {
    const transaction = await transactionService.getTransactionById(transactionId);
    if (transaction.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return res.status(200).json(transaction);
  } catch (err: any) {
    const code = err?.code;
    if (code === 'NOT_FOUND') return res.status(404).json({ message: err?.message ?? 'Transaction not found' });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listTransactionsHandler(req: Request, res: Response) {
  const userId = (req as any).userId;
  const limit = Math.min(parseInt((req.query.limit as string) || '50'), 100);
  const skip = parseInt((req.query.skip as string) || '0');

  try {
    const transactions = await transactionService.getTransactionsByUserId(userId, limit, skip);
    return res.status(200).json(transactions);
  } catch (err: any) {
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listWalletTransactionsHandler(req: Request, res: Response) {
  const { walletId } = req.params;
  const userId = (req as any).userId;
  const limit = Math.min(parseInt((req.query.limit as string) || '50'), 100);
  const skip = parseInt((req.query.skip as string) || '0');

  try {
    const transactions = await transactionService.getTransactionsByWalletId(
      walletId,
      limit,
      skip
    );

    // Verify wallet belongs to user (basic ownership check)
    if (transactions.length > 0 && transactions[0].userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.status(200).json(transactions);
  } catch (err: any) {
    return res.status(500).json({ message: 'Internal server error' });
  }
}
