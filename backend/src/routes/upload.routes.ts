import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();

router.post('/', authenticate, requireAdmin(), uploadMiddleware.single('file'), uploadController.uploadFile);
router.delete('/:filename', authenticate, requireAdmin(), uploadController.deleteFile);

export default router;
