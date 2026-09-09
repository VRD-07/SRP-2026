import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Overview and trends - Admin and Clerk
router.get('/overview', authenticateToken, requireRole(['ADMIN', 'CLERK']), ReportController.getOverviewReport);

// Outstanding dues list - Admin and Clerk
router.get('/dues', authenticateToken, requireRole(['ADMIN', 'CLERK']), ReportController.getPendingDues);

// CSV Export - Admin (and Clerk if needed)
router.get('/export-csv', authenticateToken, requireRole(['ADMIN', 'CLERK']), ReportController.exportCsv);

export default router;
