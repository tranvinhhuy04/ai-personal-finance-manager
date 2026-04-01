import { Router } from 'express';
import requireAuth from '../middlewares/requireAuth';
import {
  listNotifications,
  markNotificationRead,
  subscribeNotifications,
} from '../controllers/notification.controller';

const router = Router();

router.use(requireAuth);
router.get('/', listNotifications);
router.put('/:id/read', markNotificationRead);
router.get('/stream', subscribeNotifications);

export default router;
