import { Router } from 'express';
import * as importController from '../controllers/import.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { uploadMemory } from '../middleware/upload.js';

const router = Router();

router.get('/students/template', authenticate, requireAdmin(), importController.downloadStudentsTemplate);
router.post('/students', authenticate, requireAdmin(), uploadMemory.single('file'), importController.importStudents);
router.get('/history', authenticate, requireAdmin(), importController.getImportHistory);

export default router;
