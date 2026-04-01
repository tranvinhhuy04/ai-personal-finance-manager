import { Router } from 'express';
import requireAuth from '../../middlewares/requireAuth';
import {
	createWallet,
	deleteWallet,
	listWalletsByUser,
	updateWallet,
	updateWalletStatus,
} from '../controllers/wallet.controller';

const router = Router();

router.use(requireAuth);
router.post('/', createWallet);
router.get('/', listWalletsByUser);
router.put('/:id', updateWallet);
router.put('/:id/status', updateWalletStatus);
router.delete('/:id', deleteWallet);

export default router;
