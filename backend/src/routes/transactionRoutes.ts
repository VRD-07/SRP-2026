import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// 1. Download PDF receipt - Accessible by Admin, Clerk, and Student (ownership checked in controller)
router.get('/:id/receipt', authenticateToken, TransactionController.downloadReceiptPdf);

// 2. Query transactions - Admin, Clerk, and Student
router.get('/', authenticateToken, TransactionController.getAll);
router.get('/:id', authenticateToken, TransactionController.getById);

// 3. Record payment - Strictly Admin and Clerk only
router.post('/', authenticateToken, requireRole(['ADMIN', 'CLERK']), TransactionController.recordPayment);

// 4. Reverse transaction - Strictly Admin and Clerk only (immutable audit compensating entry)
router.post('/:id/reverse', authenticateToken, requireRole(['ADMIN', 'CLERK']), TransactionController.reverse);

// NOTE: Strictly NO PUT, PATCH, or DELETE routes exist for the Transaction resource.
// Transactions are immutable at the API layer.

export default router;
