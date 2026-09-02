import { Router } from 'express';
import * as groupController from '../controllers/group.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

router.get('/', authenticate, requireAdmin(), groupController.getGroups);
router.get('/:id', authenticate, requireAdmin(), groupController.getGroupById);
router.get('/:id/members', authenticate, requireAdmin(), groupController.getGroupMembers);
router.post('/', authenticate, requireAdmin(), groupController.createGroup);
router.put('/:id', authenticate, requireAdmin(), groupController.updateGroup);
router.delete('/:id', authenticate, requireAdmin(), groupController.deleteGroup);

export default router;
