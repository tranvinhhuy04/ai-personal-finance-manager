import { Router } from 'express';
import requireAuth from '../middlewares/requireAuth';
import {
  createWalletHandler,
  getWalletHandler,
  listWalletsHandler,
  updateWalletStatusHandler,
  updateWalletSpendingLimitHandler,
} from '../src/controllers/walletController';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Wallet CRUD
router.post('/wallets', createWalletHandler);
router.get('/wallets', listWalletsHandler);
router.get('/wallets/:walletId', getWalletHandler);
router.patch('/wallets/:walletId/status', updateWalletStatusHandler);
router.patch('/wallets/:walletId/spending-limit', updateWalletSpendingLimitHandler);

export default router;
