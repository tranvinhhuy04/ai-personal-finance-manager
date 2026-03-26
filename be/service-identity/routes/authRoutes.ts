import { Router } from 'express';
import * as authController from '../controllers/authController';
import verifyToken from '../middlewares/verifyToken';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', verifyToken, authController.profile);

export default router;
