import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();

router.post('/', authenticate, uploadMiddleware.single('file'), uploadController.uploadFile);
router.delete('/:filename', authenticate, uploadController.deleteFile);

export default router;
