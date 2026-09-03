import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();
router.get('/', authenticate, requireAdmin(), settingsController.getSettings);
router.put('/', authenticate, requireAdmin(), settingsController.updateSettings);
export default router;
