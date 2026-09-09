import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db';

const clerkCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export class ClerkController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clerks = await prisma.user.findMany({
        where: { role: 'CLERK' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { recordedTransactions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({ success: true, data: clerks });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = clerkCreateSchema.parse(req.body);

      const existing = await prisma.user.findUnique({
        where: { email: parsed.email.toLowerCase().trim() },
      });

      if (existing) {
        res.status(409).json({ success: false, message: 'Email is already registered' });
        return;
      }

      const passwordHash = await bcrypt.hash(parsed.password, 10);

      const clerk = await prisma.user.create({
        data: {
          name: parsed.name.trim(),
          email: parsed.email.toLowerCase().trim(),
          passwordHash,
          role: 'CLERK',
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Clerk account created successfully',
        data: clerk,
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const clerk = await prisma.user.findUnique({ where: { id } });
      if (!clerk || clerk.role !== 'CLERK') {
        res.status(404).json({ success: false, message: 'Clerk account not found' });
        return;
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: !clerk.isActive },
        select: { id: true, name: true, email: true, isActive: true },
      });

      res.status(200).json({
        success: true,
        message: `Clerk account ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { newPassword } = resetPasswordSchema.parse(req.body);

      const clerk = await prisma.user.findUnique({ where: { id } });
      if (!clerk || clerk.role !== 'CLERK') {
        res.status(404).json({ success: false, message: 'Clerk account not found' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id },
        data: { passwordHash },
      });

      res.status(200).json({
        success: true,
        message: `Password reset successfully for ${clerk.name}`,
      });
    } catch (err) {
      next(err);
    }
  }
}
