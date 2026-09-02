import { Router } from 'express';
import * as classController from '../controllers/class.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

router.get('/', authenticate, requireAdmin(), classController.getClasses);
router.post('/', authenticate, requireAdmin(), classController.createClass);
router.put('/:id', authenticate, requireAdmin(), classController.updateClass);
router.delete('/:id', authenticate, requireAdmin(), classController.deleteClass);

export default router;
