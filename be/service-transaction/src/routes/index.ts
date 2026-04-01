import { Router } from 'express';
import requireAuth from '../../middlewares/requireAuth';
import { createTransaction, listTransactions } from '../controllers/transaction.controller';

const router = Router();

router.use(requireAuth);
router.post('/', createTransaction);
router.get('/', listTransactions);

export default router;
