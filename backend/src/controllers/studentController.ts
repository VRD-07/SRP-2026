import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db';
import { CalculationService } from '../services/calculationService';
import { LibraryCalculationService } from '../services/libraryCalculationService';

const studentCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email is required').max(150),
  rollNumber: z.string().min(2, 'Roll number is required').max(50),
  class: z.string().min(1, 'Class is required').max(50),
  batch: z.string().min(1, 'Batch is required').max(50),
  section: z.string().min(1).max(20).optional().default('A'),
  admissionYear: z.number().int().min(2000).max(2100),
  contactNumber: z.string().min(7, 'Contact number is required').max(20),
  admissionDate: z.string().optional().nullable(),
  admissionNumber: z.string().max(50).optional().nullable(),
  guardianName: z.string().max(100).optional().nullable(),
  guardianContact: z.string().max(20).optional().nullable(),
  guardianRelation: z.string().max(50).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  documentsSubmitted: z.any().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED']).optional().default('ACTIVE'),
  password: z.string().min(6, 'Default password must be at least 6 characters').max(100).optional(),
});

const assignFeeSchema = z.object({
  feeStructureIds: z.array(z.string().min(1).max(100)).min(1, 'At least one fee structure ID is required'),
});

export class StudentController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, class: className, section, status } = req.query;

      const students = await prisma.student.findMany({
        where: {
          ...(className ? { class: String(className) } : {}),
          ...(section ? { section: String(section) } : {}),
          ...(status ? { status: status as any } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: String(search), mode: 'insensitive' } },
                  { rollNumber: { contains: String(search), mode: 'insensitive' } },
                  { admissionNumber: { contains: String(search), mode: 'insensitive' } },
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
          admissionNumber: s.admissionNumber,
          name: s.name,
          class: s.class,
          batch: s.batch,
          section: s.section,
          admissionYear: s.admissionYear,
          admissionDate: s.admissionDate,
          contactNumber: s.contactNumber,
          guardianName: s.guardianName,
          guardianContact: s.guardianContact,
          guardianRelation: s.guardianRelation,
          dateOfBirth: s.dateOfBirth,
          gender: s.gender,
          address: s.address,
          documentsSubmitted: s.documentsSubmitted,
          photoUrl: s.photoUrl,
          status: s.status,
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

      const admissionNum = parsed.admissionNumber?.trim() || `ADM-${parsed.rollNumber.trim()}`;
      const existingAdm = await prisma.student.findUnique({
        where: { admissionNumber: admissionNum },
      });
      if (existingAdm) {
        res.status(409).json({ success: false, message: 'Admission number is already registered' });
        return;
      }

      const rawPassword = parsed.password || 'Student@123';
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      // Pre-fetch matching fee structures outside transaction
      const matchingStructures = await prisma.feeStructure.findMany({
        where: {
          class: parsed.class.trim(),
          batch: parsed.batch.trim(),
        },
      });

      const result = await prisma.$transaction(
        async (tx) => {
          const user = await tx.user.create({
            data: {
              name: parsed.name.trim(),
              email: parsed.email.toLowerCase().trim(),
              passwordHash,
              role: 'STUDENT',
              isActive: parsed.status !== 'INACTIVE',
            },
          });

          const student = await tx.student.create({
            data: {
              userId: user.id,
              rollNumber: parsed.rollNumber.trim(),
              name: parsed.name.trim(),
              class: parsed.class.trim(),
              batch: parsed.batch.trim(),
              section: parsed.section ? parsed.section.trim() : 'A',
              admissionYear: parsed.admissionYear,
              contactNumber: parsed.contactNumber.trim(),
              admissionNumber: admissionNum,
              admissionDate: parsed.admissionDate ? new Date(parsed.admissionDate) : new Date(),
              guardianName: parsed.guardianName ? parsed.guardianName.trim() : null,
              guardianContact: parsed.guardianContact ? parsed.guardianContact.trim() : null,
              guardianRelation: parsed.guardianRelation ? parsed.guardianRelation.trim() : null,
              dateOfBirth: parsed.dateOfBirth ? new Date(parsed.dateOfBirth) : null,
              gender: parsed.gender ? parsed.gender.trim() : null,
              address: parsed.address ? parsed.address.trim() : null,
              documentsSubmitted: parsed.documentsSubmitted || null,
              photoUrl: parsed.photoUrl || null,
              status: parsed.status || 'ACTIVE',
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
        },
        { maxWait: 15000, timeout: 30000 }
      );

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
        if (parsed.name || parsed.email || parsed.status !== undefined) {
          await tx.user.update({
            where: { id: student.userId },
            data: {
              ...(parsed.name ? { name: parsed.name.trim() } : {}),
              ...(parsed.email ? { email: parsed.email.toLowerCase().trim() } : {}),
              ...(parsed.status ? { isActive: parsed.status !== 'INACTIVE' } : {}),
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
            ...(parsed.section !== undefined ? { section: parsed.section ? parsed.section.trim() : 'A' } : {}),
            ...(parsed.admissionYear ? { admissionYear: parsed.admissionYear } : {}),
            ...(parsed.contactNumber ? { contactNumber: parsed.contactNumber.trim() } : {}),
            ...(parsed.admissionNumber !== undefined ? { admissionNumber: parsed.admissionNumber ? parsed.admissionNumber.trim() : null } : {}),
            ...(parsed.admissionDate !== undefined ? { admissionDate: parsed.admissionDate ? new Date(parsed.admissionDate) : null } : {}),
            ...(parsed.guardianName !== undefined ? { guardianName: parsed.guardianName ? parsed.guardianName.trim() : null } : {}),
            ...(parsed.guardianContact !== undefined ? { guardianContact: parsed.guardianContact ? parsed.guardianContact.trim() : null } : {}),
            ...(parsed.guardianRelation !== undefined ? { guardianRelation: parsed.guardianRelation ? parsed.guardianRelation.trim() : null } : {}),
            ...(parsed.dateOfBirth !== undefined ? { dateOfBirth: parsed.dateOfBirth ? new Date(parsed.dateOfBirth) : null } : {}),
            ...(parsed.gender !== undefined ? { gender: parsed.gender ? parsed.gender.trim() : null } : {}),
            ...(parsed.address !== undefined ? { address: parsed.address ? parsed.address.trim() : null } : {}),
            ...(parsed.documentsSubmitted !== undefined ? { documentsSubmitted: parsed.documentsSubmitted } : {}),
            ...(parsed.photoUrl !== undefined ? { photoUrl: parsed.photoUrl } : {}),
            ...(parsed.status !== undefined ? { status: parsed.status } : {}),
          },
        });
      }, { maxWait: 15000, timeout: 30000 });

      res.status(200).json({ success: true, message: 'Student details updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = z
        .object({
          status: z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED']),
        })
        .parse(req.body);

      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.student.update({
          where: { id },
          data: { status },
        });

        if (status === 'INACTIVE') {
          await tx.user.update({
            where: { id: student.userId },
            data: { isActive: false },
          });
        } else if (status === 'ACTIVE') {
          await tx.user.update({
            where: { id: student.userId },
            data: { isActive: true },
          });
        }
      }, { maxWait: 15000, timeout: 30000 });

      res.status(200).json({ success: true, message: `Student status updated to ${status}` });
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

  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      let studentId = id;
      if (id === 'me' || !id) {
        if (!req.user || req.user.role !== 'STUDENT') {
          res.status(400).json({ success: false, message: 'Invalid student profile identifier' });
          return;
        }
        const studentOwn = await prisma.student.findUnique({
          where: { userId: req.user.userId },
        });
        if (!studentOwn) {
          res.status(404).json({ success: false, message: 'Student profile not linked to user' });
          return;
        }
        studentId = studentOwn.id;
      } else if (req.user?.role === 'STUDENT') {
        const studentOwn = await prisma.student.findUnique({
          where: { userId: req.user.userId },
        });
        if (!studentOwn || studentOwn.id !== id) {
          res.status(403).json({ success: false, message: 'Forbidden: You can only view your own profile' });
          return;
        }
      }

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { email: true, isActive: true } },
        },
      });

      if (!student) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }

      // Reusing existing Fees module calculation logic
      const feeSummary = await CalculationService.getStudentFeeCalculation(studentId);

      // Reusing Attendance module records
      const attendanceRecords = await prisma.attendanceRecord.findMany({
        where: { studentId },
        include: {
          session: {
            include: {
              markedByTeacher: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { session: { date: 'desc' } },
      });

      const totalSessions = attendanceRecords.length;
      const presentCount = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
      const absentCount = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
      const lateCount = attendanceRecords.filter((r) => r.status === 'LATE').length;
      const attendancePercentage =
        totalSessions > 0
          ? Math.round(((presentCount + lateCount * 0.5) / totalSessions) * 1000) / 10
          : 100;

      // Reusing Library module calculation logic
      const librarySummary = await LibraryCalculationService.getStudentLibrarySummary(studentId);

      res.status(200).json({
        success: true,
        data: {
          student,
          fees: feeSummary,
          attendance: {
            totalSessions,
            presentCount,
            absentCount,
            lateCount,
            percentage: attendancePercentage,
            recentRecords: attendanceRecords.slice(0, 15).map((r) => ({
              id: r.id,
              date: r.session.date,
              status: r.status,
              remarks: r.remarks,
              markedBy: r.session.markedByTeacher.name,
              class: r.session.class,
              section: r.session.section,
            })),
          },
          library: librarySummary,
        },
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
