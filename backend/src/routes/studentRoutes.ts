import { Router } from 'express';
import { StudentController } from '../controllers/studentController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Student self-service route
router.get('/me', authenticateToken, requireRole(['STUDENT']), StudentController.getMyProfile);

// Admin & Clerk student access
router.get('/', authenticateToken, requireRole(['ADMIN', 'CLERK']), StudentController.getAll);
router.get('/:id', authenticateToken, requireRole(['ADMIN', 'CLERK']), StudentController.getById);

// Admin-only management
router.post('/', authenticateToken, requireRole(['ADMIN']), StudentController.create);
router.put('/:id', authenticateToken, requireRole(['ADMIN']), StudentController.update);
router.post('/:id/assignments', authenticateToken, requireRole(['ADMIN']), StudentController.assignFeeStructures);

export default router;
