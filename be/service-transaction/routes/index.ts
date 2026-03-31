import { Router } from 'express';
import requireAuth from '../middlewares/requireAuth';
import {
  createCategoryHandler,
  listCategoriesHandler,
  createTransactionHandler,
  getTransactionHandler,
  listTransactionsHandler,
  listWalletTransactionsHandler,
} from '../src/controllers/transactionController';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Category endpoints
router.post('/categories', createCategoryHandler);
router.get('/categories', listCategoriesHandler);

// Transaction endpoints
router.post('/transactions', createTransactionHandler);
router.get('/transactions', listTransactionsHandler);
router.get('/transactions/:transactionId', getTransactionHandler);
router.get('/wallets/:walletId/transactions', listWalletTransactionsHandler);

export default router;
