import { Router } from 'express';
import { ClerkController } from '../controllers/clerkController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Strictly Admin-only routes
router.use(authenticateToken, requireRole(['ADMIN']));

router.get('/', ClerkController.getAll);
router.post('/', ClerkController.create);
router.patch('/:id/toggle', ClerkController.toggleStatus);
router.post('/:id/reset-password', ClerkController.resetPassword);

export default router;
