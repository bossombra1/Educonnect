import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// Mobile/user notifications.
router.get('/', authenticate, notificationController.getNotifications);
router.post('/register-token', authenticate, notificationController.registerFcmToken);

// Admin notification management, explicitly scoped to the authenticated establishment.
router.get('/admin', authenticate, requireAdmin(), notificationController.getAdminNotifications);
router.get('/stats', authenticate, requireAdmin(), notificationController.getAdminStats);
router.post('/send', authenticate, requireAdmin(), notificationController.sendAdminNotification);

export default router;
