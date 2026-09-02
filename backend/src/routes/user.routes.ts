import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

router.get('/', authenticate, requireAdmin(), userController.getAllUsers);
router.get('/search', authenticate, requireAdmin(), userController.searchUsers);
router.get('/:id', authenticate, requireAdmin(), userController.getUserById);
router.post('/', authenticate, requireAdmin(), userController.createUser);
router.put('/:id', authenticate, requireAdmin(), userController.updateUser);
router.delete('/:id', authenticate, requireAdmin(), userController.deleteUser);
router.get('/students/list', authenticate, requireAdmin(), userController.getStudents);
router.get('/parents/list', authenticate, requireAdmin(), userController.getParents);
router.get('/staff/list', authenticate, requireAdmin(), userController.getStaff);

export default router;
