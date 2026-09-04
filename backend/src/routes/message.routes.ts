import { Router } from 'express';
import * as messageController from '../controllers/message.controller.js';
import * as messageRecipientPreviewController from '../controllers/message-recipient-preview.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireMobileUser } from '../middleware/rbac.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();

router.get('/', authenticate, messageController.getMessages);
router.get('/history', authenticate, requireAdmin(), messageController.getMessageHistory);
router.get('/history/:id', authenticate, requireAdmin(), messageController.getMessageHistoryDetail);
router.get('/unread-count', authenticate, requireMobileUser(), messageController.getUnreadCount);
router.post('/recipients/preview', authenticate, requireAdmin(), messageRecipientPreviewController.previewRecipients);
router.get('/:id/recipients', authenticate, requireAdmin(), messageController.getMessageRecipients);
router.get('/:id/recipient-stats', authenticate, requireAdmin(), messageController.getMessageRecipientStats);
router.get('/:id', authenticate, messageController.getMessageById);
router.get('/:id/statistics', authenticate, requireAdmin(), messageController.getMessageStatistics);
router.post('/', authenticate, requireAdmin(), uploadMiddleware.array('attachments', 5), messageController.sendMessage);
router.post('/schedule', authenticate, requireAdmin(), uploadMiddleware.array('attachments', 5), messageController.scheduleMessage);
router.post('/:id/read', authenticate, requireMobileUser(), messageController.markAsRead);
router.post('/:id/acknowledge', authenticate, requireMobileUser(), messageController.acknowledgeMessage);
router.patch('/:id/cancel', authenticate, requireAdmin(), messageController.cancelScheduledMessage);

export default router;
