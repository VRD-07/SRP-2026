import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db';
import { CalculationService } from '../services/calculationService';

const studentCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email is required').max(150),
  rollNumber: z.string().min(2, 'Roll number is required').max(50),
  class: z.string().min(1, 'Class is required').max(50),
  batch: z.string().min(1, 'Batch is required').max(50),
  admissionYear: z.number().int().min(2000).max(2100),
  contactNumber: z.string().min(7, 'Contact number is required').max(20),
  password: z.string().min(6, 'Default password must be at least 6 characters').max(100).optional(),
});

const assignFeeSchema = z.object({
  feeStructureIds: z.array(z.string().min(1).max(100)).min(1, 'At least one fee structure ID is required'),
});

export class StudentController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, class: className } = req.query;

      const students = await prisma.student.findMany({
        where: {
          ...(className ? { class: String(className) } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: String(search), mode: 'insensitive' } },
                  { rollNumber: { contains: String(search), mode: 'insensitive' } },
                  { user: { email: { contains: String(search), mode: 'insensitive' } } },
                ],
              }
            : {}),
        },
        include: {
          user: {
            select: { email: true, isActive: true },
          },
          feeAssignments: {
            include: {
              feeStructure: true,
              transactions: {
                include: { reversedBy: true },
              },
            },
          },
        },
        orderBy: { rollNumber: 'asc' },
      });

      // Augment each student with real-time calculated financial summary
      const augmented = students.map((s) => {
        let totalAssigned = 0;
        let totalPaid = 0;

        for (const fa of s.feeAssignments) {
          totalAssigned += Number(fa.feeStructure.amount);
          for (const tx of fa.transactions) {
            if (tx.status === 'SUCCESS' && !tx.reversedBy) {
              totalPaid += Number(tx.amount);
            }
          }
        }

        const totalPending = Math.max(0, totalAssigned - totalPaid);

        return {
          id: s.id,
          userId: s.userId,
          rollNumber: s.rollNumber,
          name: s.name,
          class: s.class,
          batch: s.batch,
          admissionYear: s.admissionYear,
          contactNumber: s.contactNumber,
          email: s.user.email,
          isActive: s.user.isActive,
          totalAssigned,
          totalPaid,
          totalPending,
          feeAssignmentsCount: s.feeAssignments.length,
        };
      });

      res.status(200).json({ success: true, data: augmented });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const calculation = await CalculationService.getStudentFeeCalculation(id);
      if (!calculation) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }

      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          user: {
            select: { email: true, isActive: true },
          },
          transactions: {
            include: {
              feeAssignment: {
                include: { feeStructure: true },
              },
              recordedByClerk: {
                select: { id: true, name: true, email: true },
              },
              reversedBy: true,
              reversalOf: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          student,
          summary: calculation,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = studentCreateSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: parsed.email.toLowerCase().trim() },
      });
      if (existingUser) {
        res.status(409).json({ success: false, message: 'Email is already registered' });
        return;
      }

      const existingRoll = await prisma.student.findUnique({
        where: { rollNumber: parsed.rollNumber.trim() },
      });
      if (existingRoll) {
        res.status(409).json({ success: false, message: 'Roll number is already registered' });
        return;
      }

      const rawPassword = parsed.password || 'Student@123';
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: parsed.name.trim(),
            email: parsed.email.toLowerCase().trim(),
            passwordHash,
            role: 'STUDENT',
            isActive: true,
          },
        });

        const student = await tx.student.create({
          data: {
            userId: user.id,
            rollNumber: parsed.rollNumber.trim(),
            name: parsed.name.trim(),
            class: parsed.class.trim(),
            batch: parsed.batch.trim(),
            admissionYear: parsed.admissionYear,
            contactNumber: parsed.contactNumber.trim(),
          },
        });

        // Automatically assign matching class/batch fee structures if any exist
        const matchingStructures = await tx.feeStructure.findMany({
          where: {
            class: parsed.class.trim(),
            batch: parsed.batch.trim(),
          },
        });

        if (matchingStructures.length > 0) {
          await tx.feeAssignment.createMany({
            data: matchingStructures.map((fs) => ({
              studentId: student.id,
              feeStructureId: fs.id,
            })),
            skipDuplicates: true,
          });
        }

        return { user, student, assignedCount: matchingStructures.length };
      });

      res.status(201).json({
        success: true,
        message: 'Student registered successfully and fee structures auto-assigned',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = studentCreateSchema.partial().parse(req.body);

      const student = await prisma.student.findUnique({ where: { id }, include: { user: true } });
      if (!student) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }

      await prisma.$transaction(async (tx) => {
        if (parsed.name || parsed.email) {
          await tx.user.update({
            where: { id: student.userId },
            data: {
              ...(parsed.name ? { name: parsed.name.trim() } : {}),
              ...(parsed.email ? { email: parsed.email.toLowerCase().trim() } : {}),
            },
          });
        }

        await tx.student.update({
          where: { id },
          data: {
            ...(parsed.name ? { name: parsed.name.trim() } : {}),
            ...(parsed.rollNumber ? { rollNumber: parsed.rollNumber.trim() } : {}),
            ...(parsed.class ? { class: parsed.class.trim() } : {}),
            ...(parsed.batch ? { batch: parsed.batch.trim() } : {}),
            ...(parsed.admissionYear ? { admissionYear: parsed.admissionYear } : {}),
            ...(parsed.contactNumber ? { contactNumber: parsed.contactNumber.trim() } : {}),
          },
        });
      });

      res.status(200).json({ success: true, message: 'Student details updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async assignFeeStructures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { feeStructureIds } = assignFeeSchema.parse(req.body);

      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }

      await prisma.feeAssignment.createMany({
        data: feeStructureIds.map((fsId) => ({
          studentId: id,
          feeStructureId: fsId,
        })),
        skipDuplicates: true,
      });

      const updatedSummary = await CalculationService.getStudentFeeCalculation(id);

      res.status(200).json({
        success: true,
        message: 'Fee structures assigned successfully',
        data: updatedSummary,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'STUDENT') {
        res.status(403).json({ success: false, message: 'Access restricted to students' });
        return;
      }

      const student = await prisma.student.findUnique({
        where: { userId: req.user.userId },
      });

      if (!student) {
        res.status(404).json({ success: false, message: 'Student record not linked to this user' });
        return;
      }

      const summary = await CalculationService.getStudentFeeCalculation(student.id);

      const transactions = await prisma.transaction.findMany({
        where: { studentId: student.id },
        include: {
          feeAssignment: {
            include: { feeStructure: true },
          },
          recordedByClerk: {
            select: { id: true, name: true, email: true },
          },
          reversedBy: true,
          reversalOf: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: {
          student,
          summary,
          transactions,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
