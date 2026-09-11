import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/db';
import { ENV } from '../config/env';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
          student: true,
          teacher: true,
        },
      });

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact Admin.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
        return;
      }

      const tokenPayload: any = {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };

      if (user.role === 'TEACHER' && user.teacher) {
        tokenPayload.teacherId = user.teacher.id;
      }

      const token = jwt.sign(tokenPayload, ENV.JWT_SECRET, {
        expiresIn: (ENV.JWT_EXPIRES_IN || '1d') as any,
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            studentId: user.student?.id || null,
            studentRollNumber: user.student?.rollNumber || null,
            teacherId: user.teacher?.id || null,
            employeeId: user.teacher?.employeeId || null,
            classesAssigned: user.teacher?.classesAssigned || null,
            subjectsTaught: user.teacher?.subjectsTaught || null,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          student: {
            select: {
              id: true,
              rollNumber: true,
              name: true,
              class: true,
              batch: true,
              contactNumber: true,
            },
          },
          teacher: {
            select: {
              id: true,
              employeeId: true,
              subjectsTaught: true,
              classesAssigned: true,
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Current password and new password are required' });
        return;
      }

      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Incorrect current password' });
        return;
      }

      const saltRounds = 10;
      const newHash = await bcrypt.hash(newPassword, saltRounds);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });

      res.status(200).json({
        success: true,
        message: 'Password updated successfully. Please use your new password on next login.',
      });
    } catch (err) {
      next(err);
    }
  }
}
