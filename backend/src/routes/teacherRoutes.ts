import { Router } from 'express';
import { TeacherController } from '../controllers/teacherController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Teacher self-service assignments route
router.get('/me/assignments', authenticateToken, requireRole(['TEACHER']), TeacherController.getMyAssignments);

// Admin-only teacher management
router.get('/', authenticateToken, requireRole(['ADMIN']), TeacherController.getAll);
router.get('/:id', authenticateToken, requireRole(['ADMIN']), TeacherController.getById);
router.post('/', authenticateToken, requireRole(['ADMIN']), TeacherController.create);
router.put('/:id', authenticateToken, requireRole(['ADMIN']), TeacherController.update);
router.patch('/:id/status', authenticateToken, requireRole(['ADMIN']), TeacherController.updateStatus);
router.post('/:id/reset-password', authenticateToken, requireRole(['ADMIN']), TeacherController.resetPassword);

export default router;
