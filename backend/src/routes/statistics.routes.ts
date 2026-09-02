import { Router } from 'express';
import * as statisticsController from '../controllers/statistics.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

router.get('/dashboard', authenticate, requireAdmin(), statisticsController.getDashboard);
router.get('/messages', authenticate, requireAdmin(), statisticsController.getExportStats);

export default router;
