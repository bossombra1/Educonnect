import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();
router.get('/', authenticate, requireAdmin(), settingsController.getSettings);
router.put('/', authenticate, requireAdmin(), settingsController.updateSettings);
router.post('/logo', authenticate, requireAdmin(), uploadMiddleware.single('file'), settingsController.uploadEstablishmentLogo);
router.delete('/logo', authenticate, requireAdmin(), settingsController.removeEstablishmentLogo);
export default router;
