import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, notificationController.getNotifications);
router.post('/register-token', authenticate, notificationController.registerFcmToken);

export default router;
