import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';

const markAttendanceSchema = z.object({
  class: z.string().min(1, 'Class is required'),
  section: z.string().min(1, 'Section is required'),
  date: z.string().min(1, 'Date is required'),
  subjectId: z.string().optional().nullable(),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1, 'Student ID is required'),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
        remarks: z.string().max(255).optional().nullable(),
      })
    )
    .min(1, 'At least one student record is required'),
});

const updateSessionSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: z.string().min(1, 'Student ID is required'),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
        remarks: z.string().max(255).optional().nullable(),
      })
    )
    .min(1, 'At least one student record is required'),
});

// Helper to normalize a date string to midnight UTC Date
export function normalizeDate(dateInput: string | Date): Date {
  const d = new Date(dateInput);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

export class AttendanceController {
  /**
   * Fetch active students for a class and section,
   * along with existing attendance session & records if already marked for that day.
   */
  static async getRoster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { class: className, section, date } = req.query;

      if (!className || !section) {
        res.status(400).json({ success: false, message: 'Class and section are required' });
        return;
      }

      const targetDate = date ? normalizeDate(String(date)) : normalizeDate(new Date());

      // Fetch active students in class and section
      const students = await prisma.student.findMany({
        where: {
          class: String(className),
          section: String(section),
          status: 'ACTIVE',
        },
        orderBy: { rollNumber: 'asc' },
        select: {
          id: true,
          rollNumber: true,
          name: true,
          photoUrl: true,
          status: true,
        },
      });

      // Check if session already exists for that day
      const existingSession = await prisma.attendanceSession.findUnique({
        where: {
          class_section_date: {
            class: String(className),
            section: String(section),
            date: targetDate,
          },
        },
        include: {
          records: true,
          markedByTeacher: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          date: targetDate,
          class: className,
          section,
          students,
          isAlreadyMarked: !!existingSession,
          existingSession: existingSession
            ? {
                id: existingSession.id,
                date: existingSession.date,
                markedBy: existingSession.markedByTeacher.name,
                records: existingSession.records,
              }
            : null,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark attendance for a class/section on a given date.
   * If a session already exists for this (class, section, date),
   * it updates the existing session and records (no duplicate sessions created).
   */
  static async markAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'TEACHER') {
        res.status(403).json({ success: false, message: 'Only Teachers can mark attendance' });
        return;
      }

      const parsed = markAttendanceSchema.parse(req.body);
      const sessionDate = normalizeDate(parsed.date);

      const result = await prisma.$transaction(async (tx) => {
        // Upsert AttendanceSession to ensure unique [class, section, date]
        let session = await tx.attendanceSession.findUnique({
          where: {
            class_section_date: {
              class: parsed.class.trim(),
              section: parsed.section.trim(),
              date: sessionDate,
            },
          },
        });

        if (session) {
          session = await tx.attendanceSession.update({
            where: { id: session.id },
            data: {
              markedByTeacherId: req.user!.userId,
              subjectId: parsed.subjectId || session.subjectId,
            },
          });
        } else {
          session = await tx.attendanceSession.create({
            data: {
              class: parsed.class.trim(),
              section: parsed.section.trim(),
              date: sessionDate,
              markedByTeacherId: req.user!.userId,
              subjectId: parsed.subjectId || null,
            },
          });
        }

        // Upsert each student record to guarantee @@unique([attendanceSessionId, studentId])
        for (const record of parsed.records) {
          await tx.attendanceRecord.upsert({
            where: {
              attendanceSessionId_studentId: {
                attendanceSessionId: session.id,
                studentId: record.studentId,
              },
            },
            update: {
              status: record.status,
              remarks: record.remarks || null,
            },
            create: {
              attendanceSessionId: session.id,
              studentId: record.studentId,
              status: record.status,
              remarks: record.remarks || null,
            },
          });
        }

        return session;
      }, { maxWait: 15000, timeout: 30000 });

      res.status(200).json({
        success: true,
        message: 'Attendance saved successfully',
        data: {
          sessionId: result.id,
          class: result.class,
          section: result.section,
          date: result.date,
          recordsCount: parsed.records.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List past attendance sessions with filters.
   * Teachers see sessions for their assigned classes.
   * Admin can see all sessions.
   */
  static async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { class: className, section, startDate, endDate } = req.query;

      let whereClause: any = {};

      if (className) whereClause.class = String(className);
      if (section) whereClause.section = String(section);

      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date.gte = normalizeDate(String(startDate));
        if (endDate) whereClause.date.lte = normalizeDate(String(endDate));
      }

      // If teacher, optionally scope to teacher's marked sessions or assigned classes
      if (req.user?.role === 'TEACHER') {
        const teacher = await prisma.teacher.findUnique({
          where: { userId: req.user.userId },
        });

        if (teacher) {
          const assigned = (Array.isArray(teacher.classesAssigned)
            ? teacher.classesAssigned
            : []) as Array<{ class: string; section: string }>;

          if (assigned.length > 0 && !className) {
            whereClause.OR = assigned.map((a) => ({
              class: a.class,
              section: a.section,
            }));
          }
        }
      }

      const sessions = await prisma.attendanceSession.findMany({
        where: whereClause,
        include: {
          markedByTeacher: {
            select: { id: true, name: true, email: true },
          },
          records: {
            select: { status: true },
          },
        },
        orderBy: { date: 'desc' },
      });

      const formatted = sessions.map((s) => {
        const total = s.records.length;
        const present = s.records.filter((r) => r.status === 'PRESENT').length;
        const absent = s.records.filter((r) => r.status === 'ABSENT').length;
        const late = s.records.filter((r) => r.status === 'LATE').length;

        return {
          id: s.id,
          class: s.class,
          section: s.section,
          date: s.date,
          markedBy: s.markedByTeacher.name,
          markedByTeacherId: s.markedByTeacherId,
          total,
          present,
          absent,
          late,
        };
      });

      res.status(200).json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single session by ID with all student records.
   */
  static async getSessionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const session = await prisma.attendanceSession.findUnique({
        where: { id },
        include: {
          markedByTeacher: {
            select: { id: true, name: true, email: true },
          },
          records: {
            include: {
              student: {
                select: { id: true, name: true, rollNumber: true, photoUrl: true },
              },
            },
            orderBy: { student: { rollNumber: 'asc' } },
          },
        },
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'Attendance session not found' });
        return;
      }

      res.status(200).json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Edit existing attendance session records (Teacher only).
   */
  static async updateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'TEACHER') {
        res.status(403).json({ success: false, message: 'Only Teachers can edit attendance' });
        return;
      }

      const { id } = req.params;
      const parsed = updateSessionSchema.parse(req.body);

      const session = await prisma.attendanceSession.findUnique({ where: { id } });
      if (!session) {
        res.status(404).json({ success: false, message: 'Attendance session not found' });
        return;
      }

      await prisma.$transaction(async (tx) => {
        for (const record of parsed.records) {
          await tx.attendanceRecord.upsert({
            where: {
              attendanceSessionId_studentId: {
                attendanceSessionId: id,
                studentId: record.studentId,
              },
            },
            update: {
              status: record.status,
              remarks: record.remarks || null,
            },
            create: {
              attendanceSessionId: id,
              studentId: record.studentId,
              status: record.status,
              remarks: record.remarks || null,
            },
          });
        }
      });

      res.status(200).json({ success: true, message: 'Attendance updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin Attendance Reports across all classes.
   */
  static async getAdminReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { class: className, section, startDate, endDate } = req.query;

      // Filter active students
      const students = await prisma.student.findMany({
        where: {
          ...(className ? { class: String(className) } : {}),
          ...(section ? { section: String(section) } : {}),
          status: 'ACTIVE',
        },
        orderBy: [{ class: 'asc' }, { section: 'asc' }, { rollNumber: 'asc' }],
      });

      // Filter date range for records
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = normalizeDate(String(startDate));
      if (endDate) dateFilter.lte = normalizeDate(String(endDate));

      const studentIds = students.map((s) => s.id);
      const allRecords =
        studentIds.length > 0
          ? await prisma.attendanceRecord.findMany({
              where: {
                studentId: { in: studentIds },
                session: {
                  ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
                },
              },
              select: {
                studentId: true,
                status: true,
              },
            })
          : [];

      const recordsByStudent = new Map<string, Array<{ studentId: string; status: any }>>();
      for (const rec of allRecords) {
        let list = recordsByStudent.get(rec.studentId);
        if (!list) {
          list = [];
          recordsByStudent.set(rec.studentId, list);
        }
        list.push(rec);
      }

      const report = students.map((student) => {
        const records = recordsByStudent.get(student.id) || [];
        const total = records.length;
        const present = records.filter((r) => r.status === 'PRESENT').length;
        const absent = records.filter((r) => r.status === 'ABSENT').length;
        const late = records.filter((r) => r.status === 'LATE').length;
        const percentage =
          total > 0
            ? Math.round(((present + late * 0.5) / total) * 1000) / 10
            : 100;

        return {
          studentId: student.id,
          rollNumber: student.rollNumber,
          name: student.name,
          class: student.class,
          section: student.section,
          total,
          present,
          absent,
          late,
          percentage,
        };
      });

      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Export Admin Attendance Reports as CSV.
   */
  static async exportAdminReportsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { class: className, section, startDate, endDate } = req.query;

      const students = await prisma.student.findMany({
        where: {
          ...(className ? { class: String(className) } : {}),
          ...(section ? { section: String(section) } : {}),
          status: 'ACTIVE',
        },
        orderBy: [{ class: 'asc' }, { section: 'asc' }, { rollNumber: 'asc' }],
      });

      const dateFilter: any = {};
      if (startDate) dateFilter.gte = normalizeDate(String(startDate));
      if (endDate) dateFilter.lte = normalizeDate(String(endDate));

      const studentIds = students.map((s) => s.id);
      const allRecords =
        studentIds.length > 0
          ? await prisma.attendanceRecord.findMany({
              where: {
                studentId: { in: studentIds },
                session: {
                  ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
                },
              },
              select: {
                studentId: true,
                status: true,
              },
            })
          : [];

      const recordsByStudent = new Map<string, Array<{ studentId: string; status: any }>>();
      for (const rec of allRecords) {
        let list = recordsByStudent.get(rec.studentId);
        if (!list) {
          list = [];
          recordsByStudent.set(rec.studentId, list);
        }
        list.push(rec);
      }

      let csv = 'Roll Number,Student Name,Class,Section,Total Sessions,Present,Absent,Late,Attendance %\n';

      for (const student of students) {
        const records = recordsByStudent.get(student.id) || [];
        const total = records.length;
        const present = records.filter((r) => r.status === 'PRESENT').length;
        const absent = records.filter((r) => r.status === 'ABSENT').length;
        const late = records.filter((r) => r.status === 'LATE').length;
        const percentage =
          total > 0
            ? Math.round(((present + late * 0.5) / total) * 1000) / 10
            : 100;

        csv += `"${student.rollNumber}","${student.name}","${student.class}","${student.section}",${total},${present},${absent},${late},${percentage}%\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="attendance-report-${Date.now()}.csv"`
      );
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Read-only "My Attendance" view for the logged-in Student.
   */
  static async getMyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'STUDENT') {
        res.status(403).json({ success: false, message: 'Access restricted to students' });
        return;
      }

      const student = await prisma.student.findUnique({
        where: { userId: req.user.userId },
      });

      if (!student) {
        res.status(404).json({ success: false, message: 'Student profile not linked to user' });
        return;
      }

      const records = await prisma.attendanceRecord.findMany({
        where: { studentId: student.id },
        include: {
          session: {
            include: {
              markedByTeacher: { select: { name: true } },
            },
          },
        },
        orderBy: { session: { date: 'desc' } },
      });

      const total = records.length;
      const present = records.filter((r) => r.status === 'PRESENT').length;
      const absent = records.filter((r) => r.status === 'ABSENT').length;
      const late = records.filter((r) => r.status === 'LATE').length;
      const percentage =
        total > 0
          ? Math.round(((present + late * 0.5) / total) * 1000) / 10
          : 100;

      const history = records.map((r) => ({
        id: r.id,
        date: r.session.date,
        class: r.session.class,
        section: r.session.section,
        status: r.status,
        remarks: r.remarks,
        teacher: r.session.markedByTeacher.name,
      }));

      res.status(200).json({
        success: true,
        data: {
          student: {
            id: student.id,
            name: student.name,
            rollNumber: student.rollNumber,
            class: student.class,
            section: student.section,
          },
          summary: {
            totalSessions: total,
            present,
            absent,
            late,
            percentage,
          },
          history,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
