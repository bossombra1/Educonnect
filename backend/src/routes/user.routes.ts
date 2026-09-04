import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import * as userLifecycleController from '../controllers/user-lifecycle.controller.js';
import { getStudentsByParent, getParentsByStudent, linkParentStudent, unlinkParentStudent, getStudentProfile } from '../controllers/parent-students.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

router.get('/', authenticate, requireAdmin(), userController.getAllUsers);
router.get('/list', authenticate, requireAdmin(), userController.getAllUsers);
router.get('/search', authenticate, requireAdmin(), userController.searchUsers);
router.get('/students/list', authenticate, requireAdmin(), userController.getStudents);
router.get('/students/by-parent/:parentId', authenticate, requireAdmin(), getStudentsByParent);
router.get('/students/:studentId/profile', authenticate, requireAdmin(), getStudentProfile);
router.get('/parents/by-student/:studentId', authenticate, requireAdmin(), getParentsByStudent);
router.post('/parent-student', authenticate, requireAdmin(), linkParentStudent);
router.delete('/parent-student/:parentId/:studentId', authenticate, requireAdmin(), unlinkParentStudent);
router.get('/parents/list', authenticate, requireAdmin(), userController.getParents);
router.get('/staff/list', authenticate, requireAdmin(), userController.getStaff);

// Cycle de vie : ces routes doivent rester avant /:id.
router.post('/:id/reactivate', authenticate, requireAdmin(), userLifecycleController.reactivateUser);
router.delete('/:id/permanent', authenticate, requireAdmin(), userLifecycleController.permanentlyDeleteUser);

router.get('/:id', authenticate, requireAdmin(), userController.getUserById);
router.post('/', authenticate, requireAdmin(), userController.createUser);
router.put('/:id', authenticate, requireAdmin(), userController.updateUser);
router.delete('/:id', authenticate, requireAdmin(), userController.deleteUser);

export default router;
