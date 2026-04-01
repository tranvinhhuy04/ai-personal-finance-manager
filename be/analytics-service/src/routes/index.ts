import { Router } from 'express';
import requireAuth from '../middlewares/requireAuth';
import { getDashboard } from '../controllers/analytics.controller';

const router = Router();

router.use(requireAuth);
router.get('/dashboard', getDashboard);

export default router;
