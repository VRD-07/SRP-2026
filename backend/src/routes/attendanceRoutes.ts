import { Router } from 'express';
import { AttendanceController } from '../controllers/attendanceController';
import { authenticateToken } from '../middleware/auth';
import { requireRole, requireTeacherClassAccess } from '../middleware/rbac';

const router = Router();

// Student self-service read-only attendance
router.get(
  '/my-attendance',
  authenticateToken,
  requireRole(['STUDENT']),
  AttendanceController.getMyAttendance
);

// Admin-only Attendance Reports & CSV Export
router.get(
  '/reports/export',
  authenticateToken,
  requireRole(['ADMIN']),
  AttendanceController.exportAdminReportsCsv
);
router.get(
  '/reports',
  authenticateToken,
  requireRole(['ADMIN']),
  AttendanceController.getAdminReports
);

// Teacher-specific Attendance Roster & Marking
router.get(
  '/roster',
  authenticateToken,
  requireRole(['TEACHER']),
  requireTeacherClassAccess,
  AttendanceController.getRoster
);

router.post(
  '/mark',
  authenticateToken,
  requireRole(['TEACHER']),
  requireTeacherClassAccess,
  AttendanceController.markAttendance
);

// Session viewing (Teacher for assigned sessions, Admin for all)
router.get(
  '/sessions',
  authenticateToken,
  requireRole(['TEACHER', 'ADMIN']),
  AttendanceController.getSessions
);

router.get(
  '/sessions/:id',
  authenticateToken,
  requireRole(['TEACHER', 'ADMIN']),
  AttendanceController.getSessionById
);

// Session editing (Teacher only, verified by class access)
router.put(
  '/sessions/:sessionId',
  authenticateToken,
  requireRole(['TEACHER']),
  requireTeacherClassAccess,
  AttendanceController.updateSession
);

export default router;
