import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { LibraryCalculationService } from '../services/libraryCalculationService';
import { roundCurrency } from '../services/calculationService';

// Zod schemas
const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  author: z.string().min(1, 'Author is required').max(150),
  isbn: z.string().min(3, 'Valid ISBN is required').max(30),
  category: z.string().min(1, 'Category is required').max(80),
  totalCopies: z.number().int().min(1, 'Total copies must be at least 1'),
});

const updateBookSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  author: z.string().min(1).max(150).optional(),
  isbn: z.string().min(3).max(30).optional(),
  category: z.string().min(1).max(80).optional(),
  totalCopies: z.number().int().min(1).optional(),
});

const issueBookSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
  studentId: z.string().min(1, 'Student ID is required'),
  dueDate: z.string().optional(),
  notes: z.string().max(255).optional(),
});

const returnBookSchema = z.object({
  returnDate: z.string().optional(),
  notes: z.string().max(255).optional(),
});

const waiveFineSchema = z.object({
  reason: z.string().max(255).optional(),
});

export class LibraryController {
  // =========================================================================
  // CATALOG MANAGEMENT
  // =========================================================================

  static async getAllBooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, category, availableOnly } = req.query;

      const where: any = {};

      if (search) {
        const q = String(search).trim();
        where.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { author: { contains: q, mode: 'insensitive' } },
          { isbn: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ];
      }

      if (category && String(category) !== 'ALL') {
        where.category = String(category);
      }

      if (availableOnly === 'true') {
        where.availableCopies = { gt: 0 };
      }

      const books = await prisma.book.findMany({
        where,
        orderBy: { title: 'asc' },
        include: {
          _count: {
            select: {
              issues: {
                where: { returnDate: null },
              },
            },
          },
        },
      });

      const formatted = books.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        isbn: b.isbn,
        category: b.category,
        totalCopies: b.totalCopies,
        availableCopies: b.availableCopies,
        issuedCopies: b.totalCopies - b.availableCopies,
        activeLoansCount: b._count.issues,
        addedAt: b.addedAt,
      }));

      res.status(200).json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  static async getBookById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const book = await prisma.book.findUnique({
        where: { id },
        include: {
          issues: {
            where: { returnDate: null },
            include: {
              student: {
                select: { id: true, name: true, rollNumber: true, class: true, section: true },
              },
              issuedByUser: {
                select: { name: true, email: true },
              },
            },
          },
        },
      });

      if (!book) {
        res.status(404).json({ success: false, message: 'Book not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          ...book,
          issuedCopies: book.totalCopies - book.availableCopies,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async createBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createBookSchema.parse(req.body);

      const existing = await prisma.book.findUnique({
        where: { isbn: parsed.isbn.trim() },
      });
      if (existing) {
        res.status(409).json({ success: false, message: 'A book with this ISBN already exists' });
        return;
      }

      const book = await prisma.book.create({
        data: {
          title: parsed.title.trim(),
          author: parsed.author.trim(),
          isbn: parsed.isbn.trim(),
          category: parsed.category.trim(),
          totalCopies: parsed.totalCopies,
          availableCopies: parsed.totalCopies,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Book added to library catalog successfully',
        data: book,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = updateBookSchema.parse(req.body);

      const book = await prisma.book.findUnique({ where: { id } });
      if (!book) {
        res.status(404).json({ success: false, message: 'Book not found' });
        return;
      }

      if (parsed.isbn && parsed.isbn !== book.isbn) {
        const conflict = await prisma.book.findUnique({
          where: { isbn: parsed.isbn.trim() },
        });
        if (conflict) {
          res.status(409).json({ success: false, message: 'A book with this ISBN already exists' });
          return;
        }
      }

      let newAvailable = book.availableCopies;
      if (parsed.totalCopies !== undefined) {
        const issuedCopies = book.totalCopies - book.availableCopies;
        if (parsed.totalCopies < issuedCopies) {
          res.status(400).json({
            success: false,
            message: `Cannot reduce total copies below currently issued copies (${issuedCopies})`,
          });
          return;
        }
        const delta = parsed.totalCopies - book.totalCopies;
        newAvailable = Math.max(0, book.availableCopies + delta);
      }

      const updated = await prisma.book.update({
        where: { id },
        data: {
          ...(parsed.title ? { title: parsed.title.trim() } : {}),
          ...(parsed.author ? { author: parsed.author.trim() } : {}),
          ...(parsed.isbn ? { isbn: parsed.isbn.trim() } : {}),
          ...(parsed.category ? { category: parsed.category.trim() } : {}),
          ...(parsed.totalCopies !== undefined ? { totalCopies: parsed.totalCopies, availableCopies: newAvailable } : {}),
        },
      });

      res.status(200).json({
        success: true,
        message: 'Book updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const activeIssues = await prisma.bookIssue.count({
        where: { bookId: id, returnDate: null },
      });
      if (activeIssues > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot delete book with ${activeIssues} active issued copies. All copies must be returned first.`,
        });
        return;
      }

      await prisma.bookIssue.deleteMany({ where: { bookId: id } });
      await prisma.book.delete({ where: { id } });

      res.status(200).json({
        success: true,
        message: 'Book removed from library catalog successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // CIRCULATION DESK: ISSUE & RETURN WORKFLOWS
  // =========================================================================

  static async issueBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = issueBookSchema.parse(req.body);
      const staffUserId = req.user!.userId;

      // 1. Verify student exists and is active
      const student = await prisma.student.findUnique({
        where: { id: parsed.studentId },
      });
      if (!student) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }
      if (student.status !== 'ACTIVE') {
        res.status(400).json({
          success: false,
          message: `Cannot issue books to student with status ${student.status}. Only ACTIVE students are eligible.`,
        });
        return;
      }

      // 2. Prevent duplicate active issue of the same book
      const existingActiveIssue = await prisma.bookIssue.findFirst({
        where: {
          studentId: parsed.studentId,
          bookId: parsed.bookId,
          returnDate: null,
        },
      });
      if (existingActiveIssue) {
        res.status(409).json({
          success: false,
          message: 'Student already has an active issued copy of this book. Duplicate issues are prohibited.',
        });
        return;
      }

      // 3. Compute default due date (issueDate + 14 days)
      const now = new Date();
      let dueDate: Date;
      if (parsed.dueDate) {
        dueDate = new Date(parsed.dueDate);
      } else {
        dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      }

      // 4. Atomic transaction with row locking on Book
      const result = await prisma.$transaction(
        async (tx) => {
          // Lock the book row for atomic copy validation
          await tx.$executeRaw`SELECT id FROM "Book" WHERE id = ${parsed.bookId} FOR UPDATE`;

          const book = await tx.book.findUnique({
            where: { id: parsed.bookId },
          });

          if (!book) {
            throw new Error('BOOK_NOT_FOUND');
          }

          if (book.availableCopies <= 0) {
            throw new Error('NO_COPIES_AVAILABLE');
          }

          // Decrement available copies
          const updatedBook = await tx.book.update({
            where: { id: parsed.bookId },
            data: { availableCopies: { decrement: 1 } },
          });

          // Create the BookIssue record
          const issue = await tx.bookIssue.create({
            data: {
              bookId: parsed.bookId,
              studentId: parsed.studentId,
              issuedByUserId: staffUserId,
              issueDate: now,
              dueDate,
              status: 'ISSUED',
              notes: parsed.notes || null,
            },
            include: {
              book: true,
              student: true,
            },
          });

          return { issue, remainingCopies: updatedBook.availableCopies };
        },
        { maxWait: 15000, timeout: 30000 }
      );

      res.status(201).json({
        success: true,
        message: 'Book issued successfully',
        data: result.issue,
      });
    } catch (err: any) {
      if (err.message === 'BOOK_NOT_FOUND') {
        res.status(404).json({ success: false, message: 'Book not found' });
        return;
      }
      if (err.message === 'NO_COPIES_AVAILABLE') {
        res.status(400).json({
          success: false,
          message: 'No available copies left for this book. Cannot issue.',
        });
        return;
      }
      next(err);
    }
  }

  static async returnBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = returnBookSchema.parse(req.body);

      const issue = await prisma.bookIssue.findUnique({
        where: { id },
        include: { book: true, student: true },
      });

      if (!issue) {
        res.status(404).json({ success: false, message: 'Book issue record not found' });
        return;
      }

      if (issue.returnDate) {
        res.status(400).json({ success: false, message: 'This book has already been marked as returned' });
        return;
      }

      const returnDate = parsed.returnDate ? new Date(parsed.returnDate) : new Date();

      // Shared calculation function for overdue fine
      const fineCalc = LibraryCalculationService.calculateOverdueFine(issue.dueDate, returnDate);
      const fineAmount = fineCalc.fineAmount;
      const fineStatus = fineAmount > 0 ? 'PENDING' : null;

      // Atomic transaction: increment availableCopies & finalize return
      const updatedIssue = await prisma.$transaction(
        async (tx) => {
          await tx.book.update({
            where: { id: issue.bookId },
            data: { availableCopies: { increment: 1 } },
          });

          const resIssue = await tx.bookIssue.update({
            where: { id },
            data: {
              returnDate,
              status: 'RETURNED',
              fineAmount: fineAmount > 0 ? fineAmount : null,
              fineStatus,
              notes: parsed.notes ? `${issue.notes ? issue.notes + ' | ' : ''}${parsed.notes}` : issue.notes,
            },
            include: {
              book: true,
              student: true,
            },
          });

          return resIssue;
        },
        { maxWait: 15000, timeout: 30000 }
      );

      res.status(200).json({
        success: true,
        message: 'Book returned successfully',
        data: {
          issue: updatedIssue,
          daysOverdue: fineCalc.daysOverdue,
          fineAssessed: fineAmount,
          fineStatus,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // FINE MANAGEMENT: PAY & WAIVE
  // =========================================================================

  static async payFine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const issue = await prisma.bookIssue.findUnique({ where: { id } });
      if (!issue) {
        res.status(404).json({ success: false, message: 'Issue record not found' });
        return;
      }

      if (!issue.fineAmount || issue.fineAmount <= 0) {
        res.status(400).json({ success: false, message: 'No fine is associated with this record' });
        return;
      }

      if (issue.fineStatus === 'PAID') {
        res.status(400).json({ success: false, message: 'Fine has already been paid' });
        return;
      }

      if (issue.fineStatus === 'WAIVED') {
        res.status(400).json({ success: false, message: 'Fine was already waived and cannot be paid' });
        return;
      }

      const updated = await prisma.bookIssue.update({
        where: { id },
        data: {
          fineStatus: 'PAID',
          finePaidAt: new Date(),
        },
      });

      res.status(200).json({
        success: true,
        message: `Fine of ₹${updated.fineAmount} recorded as PAID successfully`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async waiveFine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Server-side enforcement: Admin only
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Forbidden: Only Administrators can waive overdue fines. Clerks are not permitted to waive fines.',
        });
        return;
      }

      const { id } = req.params;
      const parsed = waiveFineSchema.parse(req.body);

      const issue = await prisma.bookIssue.findUnique({ where: { id } });
      if (!issue) {
        res.status(404).json({ success: false, message: 'Issue record not found' });
        return;
      }

      if (!issue.fineAmount || issue.fineAmount <= 0) {
        res.status(400).json({ success: false, message: 'No fine is associated with this record' });
        return;
      }

      if (issue.fineStatus === 'PAID') {
        res.status(400).json({ success: false, message: 'Fine has already been paid and cannot be waived' });
        return;
      }

      if (issue.fineStatus === 'WAIVED') {
        res.status(400).json({ success: false, message: 'Fine has already been waived' });
        return;
      }

      const updated = await prisma.bookIssue.update({
        where: { id },
        data: {
          fineStatus: 'WAIVED',
          fineWaivedAt: new Date(),
          notes: parsed.reason ? `${issue.notes ? issue.notes + ' | ' : ''}Waived: ${parsed.reason}` : issue.notes,
        },
      });

      res.status(200).json({
        success: true,
        message: `Fine of ₹${updated.fineAmount} waived successfully by Administrator`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // OVERDUE TRACKER & REPORTS
  // =========================================================================

  static async getOverdueIssues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();

      const overdueLoans = await prisma.bookIssue.findMany({
        where: {
          returnDate: null,
          dueDate: { lt: now },
        },
        include: {
          book: true,
          student: {
            select: {
              id: true,
              name: true,
              rollNumber: true,
              class: true,
              section: true,
              contactNumber: true,
              guardianName: true,
              guardianContact: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      const formatted = overdueLoans.map((loan) => {
        const calc = LibraryCalculationService.calculateOverdueFine(loan.dueDate, now);
        return {
          id: loan.id,
          bookId: loan.bookId,
          title: loan.book.title,
          author: loan.book.author,
          isbn: loan.book.isbn,
          studentId: loan.studentId,
          studentName: loan.student.name,
          rollNumber: loan.student.rollNumber,
          class: loan.student.class,
          section: loan.student.section,
          contactNumber: loan.student.contactNumber,
          guardianContact: loan.student.guardianContact,
          issueDate: loan.issueDate,
          dueDate: loan.dueDate,
          daysOverdue: calc.daysOverdue,
          accruedFine: calc.fineAmount,
          fineStatus: loan.fineStatus,
        };
      });

      res.status(200).json({
        success: true,
        data: formatted,
        count: formatted.length,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getLibraryReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const kpis = await LibraryCalculationService.getLibraryKPIs();

      // Recent returned history
      const recentReturns = await prisma.bookIssue.findMany({
        where: { returnDate: { not: null } },
        include: {
          book: { select: { title: true, isbn: true } },
          student: { select: { name: true, rollNumber: true, class: true } },
        },
        orderBy: { returnDate: 'desc' },
        take: 20,
      });

      // Active issues
      const activeIssues = await prisma.bookIssue.findMany({
        where: { returnDate: null },
        include: {
          book: { select: { title: true, isbn: true, category: true } },
          student: { select: { name: true, rollNumber: true, class: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 30,
      });

      const now = new Date();
      const activeFormatted = activeIssues.map((item) => {
        const calc = LibraryCalculationService.calculateOverdueFine(item.dueDate, now);
        return {
          id: item.id,
          title: item.book.title,
          isbn: item.book.isbn,
          category: item.book.category,
          studentName: item.student.name,
          rollNumber: item.student.rollNumber,
          class: item.student.class,
          issueDate: item.issueDate,
          dueDate: item.dueDate,
          isOverdue: calc.daysOverdue > 0,
          daysOverdue: calc.daysOverdue,
          accruedFine: calc.fineAmount,
          fineStatus: item.fineStatus,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          kpis,
          activeIssues: activeFormatted,
          recentReturns,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async exportLibraryCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const issues = await prisma.bookIssue.findMany({
        include: {
          book: true,
          student: true,
          issuedByUser: { select: { name: true } },
        },
        orderBy: { issueDate: 'desc' },
      });

      const now = new Date();

      const headers = [
        'Issue ID',
        'Book Title',
        'Author',
        'ISBN',
        'Category',
        'Student Name',
        'Roll Number',
        'Class',
        'Section',
        'Issue Date',
        'Due Date',
        'Return Date',
        'Status',
        'Days Overdue',
        'Fine Amount (INR)',
        'Fine Status',
        'Issued By',
      ];

      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = issues.map((i) => {
        const effectiveReturn = i.returnDate ? i.returnDate : now;
        const calc = LibraryCalculationService.calculateOverdueFine(i.dueDate, effectiveReturn);

        let fine = i.fineAmount || 0;
        if (!i.returnDate && calc.daysOverdue > 0 && !i.fineAmount) {
          fine = calc.fineAmount;
        }

        return [
          escapeCSV(i.id),
          escapeCSV(i.book.title),
          escapeCSV(i.book.author),
          escapeCSV(i.book.isbn),
          escapeCSV(i.book.category),
          escapeCSV(i.student.name),
          escapeCSV(i.student.rollNumber),
          escapeCSV(i.student.class),
          escapeCSV(i.student.section),
          escapeCSV(i.issueDate.toISOString().split('T')[0]),
          escapeCSV(i.dueDate.toISOString().split('T')[0]),
          escapeCSV(i.returnDate ? i.returnDate.toISOString().split('T')[0] : 'ACTIVE LOAN'),
          escapeCSV(i.status),
          escapeCSV(calc.daysOverdue),
          escapeCSV(fine.toFixed(2)),
          escapeCSV(i.fineStatus || 'NONE'),
          escapeCSV(i.issuedByUser?.name || 'Staff'),
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="library_report_${now.toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvContent);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // STUDENT SELF-SERVICE
  // =========================================================================

  static async getMyLibrary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'STUDENT') {
        res.status(403).json({ success: false, message: 'Access restricted to students' });
        return;
      }

      const student = await prisma.student.findUnique({
        where: { userId: req.user.userId },
      });

      if (!student) {
        res.status(404).json({ success: false, message: 'Student record not found for authenticated user' });
        return;
      }

      const summary = await LibraryCalculationService.getStudentLibrarySummary(student.id);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }
}
