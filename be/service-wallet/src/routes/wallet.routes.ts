import { Router } from 'express';
import requireAuth from '../../middlewares/requireAuth';
import { createWallet, listWalletsByUser } from '../controllers/wallet.controller';

const router = Router();

router.use(requireAuth);
router.post('/wallets', createWallet);
router.get('/wallets', listWalletsByUser);

export default router;
