import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db';

const teacherCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email is required').max(150),
  employeeId: z.string().min(2, 'Employee ID is required').max(50),
  subjectsTaught: z.array(z.string().min(1)).min(1, 'At least one subject is required'),
  classesAssigned: z.array(
    z.object({
      class: z.string().min(1, 'Class is required'),
      section: z.string().min(1, 'Section is required'),
    })
  ).min(1, 'At least one class and section assignment is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

const teacherUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(150).optional(),
  employeeId: z.string().min(2).max(50).optional(),
  subjectsTaught: z.array(z.string().min(1)).optional(),
  classesAssigned: z.array(
    z.object({
      class: z.string().min(1),
      section: z.string().min(1),
    })
  ).optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100),
});

export class TeacherController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search } = req.query;

      const teachers = await prisma.teacher.findMany({
        where: search
          ? {
              OR: [
                { employeeId: { contains: String(search), mode: 'insensitive' } },
                { user: { name: { contains: String(search), mode: 'insensitive' } } },
                { user: { email: { contains: String(search), mode: 'insensitive' } } },
              ],
            }
          : {},
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
        orderBy: { employeeId: 'asc' },
      });

      const formatted = teachers.map((t) => ({
        id: t.id,
        userId: t.userId,
        name: t.user.name,
        email: t.user.email,
        employeeId: t.employeeId,
        subjectsTaught: t.subjectsTaught,
        classesAssigned: t.classesAssigned,
        isActive: t.user.isActive,
        createdAt: t.createdAt,
      }));

      res.status(200).json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const teacher = await prisma.teacher.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      });

      if (!teacher) {
        res.status(404).json({ success: false, message: 'Teacher not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: teacher.id,
          userId: teacher.userId,
          name: teacher.user.name,
          email: teacher.user.email,
          employeeId: teacher.employeeId,
          subjectsTaught: teacher.subjectsTaught,
          classesAssigned: teacher.classesAssigned,
          isActive: teacher.user.isActive,
          createdAt: teacher.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = teacherCreateSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: parsed.email.toLowerCase().trim() },
      });
      if (existingUser) {
        res.status(409).json({ success: false, message: 'Email is already registered' });
        return;
      }

      const existingEmployee = await prisma.teacher.findUnique({
        where: { employeeId: parsed.employeeId.trim() },
      });
      if (existingEmployee) {
        res.status(409).json({ success: false, message: 'Employee ID is already registered' });
        return;
      }

      const rawPassword = parsed.password || 'Teacher@123';
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: parsed.name.trim(),
            email: parsed.email.toLowerCase().trim(),
            passwordHash,
            role: 'TEACHER',
            isActive: true,
          },
        });

        const teacher = await tx.teacher.create({
          data: {
            userId: user.id,
            employeeId: parsed.employeeId.trim(),
            subjectsTaught: parsed.subjectsTaught,
            classesAssigned: parsed.classesAssigned,
          },
        });

        return { user, teacher };
      }, { maxWait: 15000, timeout: 30000 });

      res.status(201).json({
        success: true,
        message: 'Teacher created successfully',
        data: {
          id: result.teacher.id,
          userId: result.user.id,
          name: result.user.name,
          email: result.user.email,
          employeeId: result.teacher.employeeId,
          subjectsTaught: result.teacher.subjectsTaught,
          classesAssigned: result.teacher.classesAssigned,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = teacherUpdateSchema.parse(req.body);

      const teacher = await prisma.teacher.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!teacher) {
        res.status(404).json({ success: false, message: 'Teacher not found' });
        return;
      }

      if (parsed.email && parsed.email.toLowerCase().trim() !== teacher.user.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: parsed.email.toLowerCase().trim() },
        });
        if (emailExists) {
          res.status(409).json({ success: false, message: 'Email is already registered by another user' });
          return;
        }
      }

      if (parsed.employeeId && parsed.employeeId.trim() !== teacher.employeeId) {
        const empExists = await prisma.teacher.findUnique({
          where: { employeeId: parsed.employeeId.trim() },
        });
        if (empExists) {
          res.status(409).json({ success: false, message: 'Employee ID is already in use' });
          return;
        }
      }

      await prisma.$transaction(async (tx) => {
        if (parsed.name || parsed.email) {
          await tx.user.update({
            where: { id: teacher.userId },
            data: {
              ...(parsed.name ? { name: parsed.name.trim() } : {}),
              ...(parsed.email ? { email: parsed.email.toLowerCase().trim() } : {}),
            },
          });
        }

        await tx.teacher.update({
          where: { id },
          data: {
            ...(parsed.employeeId ? { employeeId: parsed.employeeId.trim() } : {}),
            ...(parsed.subjectsTaught ? { subjectsTaught: parsed.subjectsTaught } : {}),
            ...(parsed.classesAssigned ? { classesAssigned: parsed.classesAssigned } : {}),
          },
        });
      }, { maxWait: 15000, timeout: 30000 });

      res.status(200).json({ success: true, message: 'Teacher updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);

      const teacher = await prisma.teacher.findUnique({ where: { id } });
      if (!teacher) {
        res.status(404).json({ success: false, message: 'Teacher not found' });
        return;
      }

      await prisma.user.update({
        where: { id: teacher.userId },
        data: { isActive },
      });

      res.status(200).json({
        success: true,
        message: `Teacher account ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { newPassword } = resetPasswordSchema.parse(req.body);

      const teacher = await prisma.teacher.findUnique({ where: { id } });
      if (!teacher) {
        res.status(404).json({ success: false, message: 'Teacher not found' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: teacher.userId },
        data: { passwordHash },
      });

      res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async getMyAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'TEACHER') {
        res.status(403).json({ success: false, message: 'Access restricted to teachers' });
        return;
      }

      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.userId },
      });

      if (!teacher) {
        res.status(404).json({ success: false, message: 'Teacher record not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: teacher.id,
          employeeId: teacher.employeeId,
          subjectsTaught: teacher.subjectsTaught,
          classesAssigned: teacher.classesAssigned,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
