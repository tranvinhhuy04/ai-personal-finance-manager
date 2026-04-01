import { Router } from 'express';
import requireAuth from '../../middlewares/requireAuth';
import { createWallet, listWalletsByUser } from '../controllers/wallet.controller';

const router = Router();

router.use(requireAuth);
router.post('/', createWallet);
router.get('/', listWalletsByUser);

export default router;
