import { Router } from 'express';
import requireAuth from '../../middlewares/requireAuth';
import { createTransaction } from '../controllers/transaction.controller';

const router = Router();

router.use(requireAuth);
router.post('/transactions', createTransaction);

export default router;
