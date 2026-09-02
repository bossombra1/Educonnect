import { Router } from 'express';
import * as scheduledMessageController from '../controllers/scheduled-message.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET / - list all scheduled messages (admin only)
router.get('/', requireRole('ADMIN', 'SUPER_ADMIN'), scheduledMessageController.list);

// GET /:id - get one scheduled message (admin only)
router.get('/:id', requireRole('ADMIN', 'SUPER_ADMIN'), scheduledMessageController.getById);

// PUT /:id - update a scheduled message (admin only, audited)
router.put(
  '/:id',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  auditLog('UPDATE_SCHEDULED_MESSAGE', 'scheduled_message'),
  scheduledMessageController.update
);

// DELETE /:id - delete a scheduled message (admin only, audited)
router.delete(
  '/:id',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  auditLog('DELETE_SCHEDULED_MESSAGE', 'scheduled_message'),
  scheduledMessageController.remove
);

// POST /:id/process - trigger immediate processing (admin only, audited)
router.post(
  '/:id/process',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  auditLog('PROCESS_SCHEDULED_MESSAGE', 'scheduled_message'),
  scheduledMessageController.processNow
);

export default router;
