import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { LibraryController } from '../controllers/libraryController';
import { LibraryCalculationService } from '../services/libraryCalculationService';
import { prisma } from '../config/db';

const router = Router();

// Enforce authentication on all library routes
router.use(authenticateToken);

// =========================================================================
// CATALOG MANAGEMENT
// =========================================================================
// Browsing catalog is open to Admin, Clerk, and Student (Teachers excluded: 403)
router.get('/books', requireRole(['ADMIN', 'CLERK', 'STUDENT']), LibraryController.getAllBooks);
router.get('/books/:id', requireRole(['ADMIN', 'CLERK', 'STUDENT']), LibraryController.getBookById);

// Catalog CRUD restricted to Administrator
router.post('/books', requireRole(['ADMIN']), LibraryController.createBook);
router.put('/books/:id', requireRole(['ADMIN']), LibraryController.updateBook);
router.delete('/books/:id', requireRole(['ADMIN']), LibraryController.deleteBook);

// =========================================================================
// CIRCULATION DESK: ISSUE & RETURN
// =========================================================================
// Issuing and returning books can be performed by Admin and Clerk
router.post('/issue', requireRole(['ADMIN', 'CLERK']), LibraryController.issueBook);
router.post('/return/:id', requireRole(['ADMIN', 'CLERK']), LibraryController.returnBook);

// =========================================================================
// FINE MANAGEMENT
// =========================================================================
// Fine payment: Admin and Clerk can record fine payment
router.post('/issues/:id/pay-fine', requireRole(['ADMIN', 'CLERK']), LibraryController.payFine);

// Fine waiver: STRICTLY ADMINISTRATOR ONLY (Clerk receives 403 Forbidden)
router.post('/issues/:id/waive-fine', requireRole(['ADMIN']), LibraryController.waiveFine);

// =========================================================================
// OVERDUE TRACKER & REPORTS
// =========================================================================
// Overdue tracking is accessible to Admin and Clerk
router.get('/overdue', requireRole(['ADMIN', 'CLERK']), LibraryController.getOverdueIssues);

// Institutional Reports & CSV export are Admin-only
router.get('/reports', requireRole(['ADMIN']), LibraryController.getLibraryReports);
router.get('/export', requireRole(['ADMIN']), LibraryController.exportLibraryCSV);

// =========================================================================
// STUDENT SELF-SERVICE & ISOLATION
// =========================================================================
// Authenticated student fetches personal library record
router.get('/my-books', requireRole(['STUDENT']), LibraryController.getMyLibrary);

// Specific student library summary with strict ownership check
router.get(
  '/students/:studentId/summary',
  requireRole(['ADMIN', 'CLERK', 'STUDENT']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { studentId } = req.params;

      // If requested by a student, enforce that they can only view their own record
      if (req.user?.role === 'STUDENT') {
        const studentOwn = await prisma.student.findUnique({
          where: { userId: req.user.userId },
        });

        if (!studentOwn || studentOwn.id !== studentId) {
          res.status(403).json({
            success: false,
            message: 'Forbidden: You can only view your own library records. Accessing other students is prohibited.',
          });
          return;
        }
      }

      const summary = await LibraryCalculationService.getStudentLibrarySummary(studentId);
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
