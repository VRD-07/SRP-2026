import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export type UserRole = 'ADMIN' | 'CLERK' | 'STUDENT' | 'TEACHER';

export const requireRole = (allowedRoles: Array<UserRole>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Your role is ${req.user.role}`,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware ensuring a Teacher can only access or mark attendance
 * for the class and section combinations explicitly assigned to them by Admin.
 */
export const requireTeacherClassAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Only teachers are checked against classesAssigned.
    if (req.user.role !== 'TEACHER') {
      res.status(403).json({ success: false, message: 'Only Teachers can perform this action' });
      return;
    }

    let targetClass = (req.body?.class || req.query?.class) as string | undefined;
    let targetSection = (req.body?.section || req.query?.section) as string | undefined;

    // If session ID is provided in route params, look up the class and section from AttendanceSession
    if ((!targetClass || !targetSection) && req.params.sessionId) {
      const session = await prisma.attendanceSession.findUnique({
        where: { id: req.params.sessionId },
      });
      if (!session) {
        res.status(404).json({ success: false, message: 'Attendance session not found' });
        return;
      }
      targetClass = session.class;
      targetSection = session.section;
    }

    if (!targetClass || !targetSection) {
      res.status(400).json({ success: false, message: 'Class and section are required' });
      return;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.userId },
    });

    if (!teacher) {
      res.status(403).json({ success: false, message: 'Teacher profile not found' });
      return;
    }

    const assigned = (Array.isArray(teacher.classesAssigned)
      ? teacher.classesAssigned
      : []) as Array<{ class: string; section: string }>;

    const hasAccess = assigned.some(
      (a) =>
        a.class?.toLowerCase().trim() === targetClass!.toLowerCase().trim() &&
        a.section?.toLowerCase().trim() === targetSection!.toLowerCase().trim()
    );

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: `Forbidden: You are not assigned to ${targetClass} Section ${targetSection}`,
      });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
};

