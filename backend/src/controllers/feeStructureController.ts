import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';

const feeStructureSchema = z.object({
  class: z.string().min(1, 'Class is required').max(50),
  batch: z.string().min(1, 'Batch is required').max(50),
  academicYear: z.string().min(1, 'Academic Year is required').max(20),
  feeHead: z.enum(['Tuition', 'Hostel', 'Transport', 'Exam', 'LateFee', 'Other']),
  amount: z.number().positive('Amount must be positive').finite().max(10000000, 'Amount cannot exceed 10,000,000'),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
});

export class FeeStructureController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { class: className, batch, academicYear } = req.query;

      const structures = await prisma.feeStructure.findMany({
        where: {
          ...(className ? { class: String(className) } : {}),
          ...(batch ? { batch: String(batch) } : {}),
          ...(academicYear ? { academicYear: String(academicYear) } : {}),
        },
        include: {
          _count: {
            select: { feeAssignments: true },
          },
        },
        orderBy: [{ academicYear: 'desc' }, { class: 'asc' }, { dueDate: 'asc' }],
      });

      res.status(200).json({ success: true, data: structures });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const structure = await prisma.feeStructure.findUnique({
        where: { id },
        include: {
          feeAssignments: {
            include: {
              student: true,
            },
          },
        },
      });

      if (!structure) {
        res.status(404).json({ success: false, message: 'Fee structure not found' });
        return;
      }

      res.status(200).json({ success: true, data: structure });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = feeStructureSchema.parse(req.body);

      const created = await prisma.feeStructure.create({
        data: {
          class: parsed.class.trim(),
          batch: parsed.batch.trim(),
          academicYear: parsed.academicYear.trim(),
          feeHead: parsed.feeHead,
          amount: parsed.amount,
          dueDate: new Date(parsed.dueDate),
        },
      });

      res.status(201).json({ success: true, message: 'Fee structure created successfully', data: created });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = feeStructureSchema.partial().parse(req.body);

      const existing = await prisma.feeStructure.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, message: 'Fee structure not found' });
        return;
      }

      const updated = await prisma.feeStructure.update({
        where: { id },
        data: {
          ...(parsed.class ? { class: parsed.class.trim() } : {}),
          ...(parsed.batch ? { batch: parsed.batch.trim() } : {}),
          ...(parsed.academicYear ? { academicYear: parsed.academicYear.trim() } : {}),
          ...(parsed.feeHead ? { feeHead: parsed.feeHead } : {}),
          ...(parsed.amount !== undefined ? { amount: parsed.amount } : {}),
          ...(parsed.dueDate ? { dueDate: new Date(parsed.dueDate) } : {}),
        },
      });

      res.status(200).json({ success: true, message: 'Fee structure updated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const assignmentCount = await prisma.feeAssignment.count({
        where: { feeStructureId: id },
      });

      if (assignmentCount > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot delete: Fee structure is assigned to ${assignmentCount} student(s). Unassign first.`,
        });
        return;
      }

      await prisma.feeStructure.delete({ where: { id } });
      res.status(200).json({ success: true, message: 'Fee structure deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}
