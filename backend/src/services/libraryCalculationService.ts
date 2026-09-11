import { prisma } from '../config/db';
import { roundCurrency } from './calculationService';

export const FINE_RATE_PER_DAY = 2.0; // ₹2/day overdue

export interface OverdueCalculationResult {
  daysOverdue: number;
  fineAmount: number;
}

export interface StudentLibrarySummary {
  activeIssuesCount: number;
  overdueIssuesCount: number;
  totalPendingFines: number;
  totalPaidFines: number;
  totalWaivedFines: number;
  activeIssues: Array<{
    id: string;
    bookId: string;
    title: string;
    author: string;
    isbn: string;
    category: string;
    issueDate: Date;
    dueDate: Date;
    isOverdue: boolean;
    daysOverdue: number;
    accruedFine: number;
    fineStatus: string | null;
  }>;
  history: Array<{
    id: string;
    bookId: string;
    title: string;
    author: string;
    isbn: string;
    issueDate: Date;
    dueDate: Date;
    returnDate: Date | null;
    status: string;
    fineAmount: number | null;
    fineStatus: string | null;
  }>;
}

export class LibraryCalculationService {
  /**
   * Calculates days overdue and resulting fine based on dueDate and comparison date (returnDate or now).
   * Reused across all library modules, student profile, issue details, and reports.
   */
  static calculateOverdueFine(
    dueDateInput: Date | string,
    compareDateInput: Date | string = new Date()
  ): OverdueCalculationResult {
    const due = new Date(dueDateInput);
    const compare = new Date(compareDateInput);

    if (isNaN(due.getTime()) || isNaN(compare.getTime())) {
      return { daysOverdue: 0, fineAmount: 0 };
    }

    // Compare on UTC calendar day boundary
    const dueMidnight = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()));
    const compareMidnight = new Date(Date.UTC(compare.getUTCFullYear(), compare.getUTCMonth(), compare.getUTCDate()));

    const diffMs = compareMidnight.getTime() - dueMidnight.getTime();
    if (diffMs <= 0) {
      return { daysOverdue: 0, fineAmount: 0 };
    }

    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const fineAmount = roundCurrency(daysOverdue * FINE_RATE_PER_DAY);
    return { daysOverdue, fineAmount };
  }

  /**
   * Builds the comprehensive library summary for a given student.
   * Dynamically calculates accrued fines for active overdue books as well as finalized return fines.
   */
  static async getStudentLibrarySummary(studentId: string): Promise<StudentLibrarySummary> {
    const issues = await prisma.bookIssue.findMany({
      where: { studentId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true,
            category: true,
          },
        },
      },
      orderBy: { issueDate: 'desc' },
    });

    const now = new Date();
    let totalPendingFines = 0;
    let totalPaidFines = 0;
    let totalWaivedFines = 0;

    const activeIssues: StudentLibrarySummary['activeIssues'] = [];
    const history: StudentLibrarySummary['history'] = [];

    for (const item of issues) {
      if (!item.returnDate) {
        // Active unreturned issue
        const calc = this.calculateOverdueFine(item.dueDate, now);
        const isOverdue = calc.daysOverdue > 0;

        let activeFine = 0;
        if (item.fineStatus === 'PAID') {
          totalPaidFines = roundCurrency(totalPaidFines + (item.fineAmount || 0));
        } else if (item.fineStatus === 'WAIVED') {
          totalWaivedFines = roundCurrency(totalWaivedFines + (item.fineAmount || 0));
        } else {
          // Unpaid: either already recorded fine or live accrued
          activeFine =
            item.fineAmount !== null && item.fineAmount !== undefined
              ? item.fineAmount
              : calc.fineAmount;
          totalPendingFines = roundCurrency(totalPendingFines + activeFine);
        }

        activeIssues.push({
          id: item.id,
          bookId: item.bookId,
          title: item.book.title,
          author: item.book.author,
          isbn: item.book.isbn,
          category: item.book.category,
          issueDate: item.issueDate,
          dueDate: item.dueDate,
          isOverdue,
          daysOverdue: calc.daysOverdue,
          accruedFine: activeFine,
          fineStatus: item.fineStatus,
        });
      } else {
        // Returned issue
        if (item.fineStatus === 'PAID') {
          totalPaidFines = roundCurrency(totalPaidFines + (item.fineAmount || 0));
        } else if (item.fineStatus === 'WAIVED') {
          totalWaivedFines = roundCurrency(totalWaivedFines + (item.fineAmount || 0));
        } else if (item.fineStatus === 'PENDING' && (item.fineAmount || 0) > 0) {
          totalPendingFines = roundCurrency(totalPendingFines + (item.fineAmount || 0));
        }

        history.push({
          id: item.id,
          bookId: item.bookId,
          title: item.book.title,
          author: item.book.author,
          isbn: item.book.isbn,
          issueDate: item.issueDate,
          dueDate: item.dueDate,
          returnDate: item.returnDate,
          status: item.status,
          fineAmount: item.fineAmount,
          fineStatus: item.fineStatus,
        });
      }
    }

    const overdueIssuesCount = activeIssues.filter((i) => i.isOverdue).length;

    return {
      activeIssuesCount: activeIssues.length,
      overdueIssuesCount,
      totalPendingFines: roundCurrency(totalPendingFines),
      totalPaidFines: roundCurrency(totalPaidFines),
      totalWaivedFines: roundCurrency(totalWaivedFines),
      activeIssues,
      history,
    };
  }

  /**
   * Aggregates institutional Library KPIs for administrative dashboards and reports.
   */
  static async getLibraryKPIs() {
    const totalBooks = await prisma.book.count();
    const copyStats = await prisma.book.aggregate({
      _sum: { totalCopies: true, availableCopies: true },
    });

    const totalCopies = copyStats._sum.totalCopies || 0;
    const availableCopies = copyStats._sum.availableCopies || 0;
    const issuedCopies = Math.max(0, totalCopies - availableCopies);

    const now = new Date();
    const activeIssues = await prisma.bookIssue.findMany({
      where: { returnDate: null },
      select: { id: true, dueDate: true, fineAmount: true, fineStatus: true },
    });

    let activeOverdueCount = 0;
    let liveAccruedFines = 0;

    for (const issue of activeIssues) {
      const calc = this.calculateOverdueFine(issue.dueDate, now);
      if (calc.daysOverdue > 0) {
        activeOverdueCount++;
        if (issue.fineStatus !== 'PAID' && issue.fineStatus !== 'WAIVED') {
          liveAccruedFines = roundCurrency(liveAccruedFines + calc.fineAmount);
        }
      }
    }

    // Fines recorded from returned or assessed issues
    const paidAgg = await prisma.bookIssue.aggregate({
      where: { fineStatus: 'PAID' },
      _sum: { fineAmount: true },
    });
    const totalFinesCollected = roundCurrency(paidAgg._sum.fineAmount || 0);

    const pendingReturnedAgg = await prisma.bookIssue.aggregate({
      where: { fineStatus: 'PENDING', returnDate: { not: null } },
      _sum: { fineAmount: true },
    });
    const pendingFinalizedFines = roundCurrency(pendingReturnedAgg._sum.fineAmount || 0);
    const totalFinesPending = roundCurrency(pendingFinalizedFines + liveAccruedFines);

    return {
      totalBooks,
      totalCopies,
      availableCopies,
      issuedCopies,
      activeOverdueCount,
      totalFinesCollected,
      totalFinesPending,
    };
  }
}
