import { Router } from 'express';
import { FeeStructureController } from '../controllers/feeStructureController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Read operations: Admin and Clerk can view fee structures
router.get('/', authenticateToken, requireRole(['ADMIN', 'CLERK']), FeeStructureController.getAll);
router.get('/:id', authenticateToken, requireRole(['ADMIN', 'CLERK']), FeeStructureController.getById);

// Write operations: Strictly Admin only
router.post('/', authenticateToken, requireRole(['ADMIN']), FeeStructureController.create);
router.put('/:id', authenticateToken, requireRole(['ADMIN']), FeeStructureController.update);
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), FeeStructureController.delete);

export default router;
