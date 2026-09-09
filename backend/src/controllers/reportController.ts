import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { CalculationService } from '../services/calculationService';

export class ReportController {
  /**
   * Real-time executive dashboard reports with charts data.
   */
  static async getOverviewReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { academicYear, class: className, startDate, endDate } = req.query;

      const dateFilter = {
        ...(startDate ? { startDate: new Date(String(startDate)) } : {}),
        ...(endDate ? { endDate: new Date(String(endDate)) } : {}),
      };

      // 1. High-level KPIs from shared calculation engine
      const kpis = await CalculationService.getSystemKPIs({
        academicYear: academicYear ? String(academicYear) : undefined,
        class: className ? String(className) : undefined,
        ...dateFilter,
      });

      // 2. Breakdown by Fee Head
      const feeHeads = ['Tuition', 'Hostel', 'Transport', 'Exam', 'LateFee', 'Other'] as const;
      const headSummary = await Promise.all(
        feeHeads.map(async (head) => {
          const assignments = await prisma.feeAssignment.findMany({
            where: {
              feeStructure: {
                feeHead: head,
                ...(academicYear ? { academicYear: String(academicYear) } : {}),
                ...(className ? { class: String(className) } : {}),
              },
            },
            include: {
              feeStructure: true,
              transactions: {
                include: { reversedBy: true },
              },
            },
          });

          let assigned = 0;
          let collected = 0;

          for (const fa of assignments) {
            assigned += Number(fa.feeStructure.amount);
            for (const tx of fa.transactions) {
              if (tx.status === 'SUCCESS' && !tx.reversedBy) {
                collected += Number(tx.amount);
              }
            }
          }

          return {
            head,
            assigned,
            collected,
            pending: Math.max(0, assigned - collected),
          };
        })
      );

      // 3. Class-wise breakdown
      const classesList = await prisma.student.findMany({
        distinct: ['class'],
        select: { class: true },
      });

      const classSummary = await Promise.all(
        classesList.map(async (c) => {
          const assignments = await prisma.feeAssignment.findMany({
            where: {
              feeStructure: {
                class: c.class,
                ...(academicYear ? { academicYear: String(academicYear) } : {}),
              },
            },
            include: {
              feeStructure: true,
              transactions: {
                include: { reversedBy: true },
              },
            },
          });

          let assigned = 0;
          let collected = 0;

          for (const fa of assignments) {
            assigned += Number(fa.feeStructure.amount);
            for (const tx of fa.transactions) {
              if (tx.status === 'SUCCESS' && !tx.reversedBy) {
                collected += Number(tx.amount);
              }
            }
          }

          return {
            className: c.class,
            assigned,
            collected,
            pending: Math.max(0, assigned - collected),
          };
        })
      );

      // 4. Time-series collection trends (last 30 days or filtered range)
      const transactions = await prisma.transaction.findMany({
        where: {
          status: 'SUCCESS',
          reversedBy: null, // Only non-reversed successful transactions
          ...(dateFilter.startDate || dateFilter.endDate
            ? {
                createdAt: {
                  ...(dateFilter.startDate ? { gte: dateFilter.startDate } : {}),
                  ...(dateFilter.endDate ? { lte: dateFilter.endDate } : {}),
                },
              }
            : {}),
        },
        select: {
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      const trendMap = new Map<string, number>();
      for (const tx of transactions) {
        const dateStr = tx.createdAt.toISOString().split('T')[0];
        trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + Number(tx.amount));
      }

      const timelineTrends = Array.from(trendMap.entries()).map(([date, amount]) => ({
        date,
        amount,
      }));

      res.status(200).json({
        success: true,
        data: {
          kpis,
          feeHeadDistribution: headSummary,
          classDistribution: classSummary,
          timelineTrends,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Exports real-time transactions and dues to an RFC4180-compliant CSV.
   */
  static async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { class: className, startDate, endDate, status } = req.query;

      const transactions = await prisma.transaction.findMany({
        where: {
          ...(status ? { status: status as any } : {}),
          ...(className ? { student: { class: String(className) } } : {}),
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate ? { gte: new Date(String(startDate)) } : {}),
                  ...(endDate ? { lte: new Date(String(endDate)) } : {}),
                },
              }
            : {}),
        },
        include: {
          student: true,
          feeAssignment: {
            include: { feeStructure: true },
          },
          recordedByClerk: true,
          reversedBy: true,
          reversalOf: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const headers = [
        'Receipt Number',
        'Date',
        'Roll Number',
        'Student Name',
        'Class',
        'Batch',
        'Fee Head',
        'Amount (INR)',
        'Payment Mode',
        'Reference No',
        'Status',
        'Recorded By',
        'Reversal Note',
      ];

      const rows = transactions.map((t) => {
        const dateStr = new Date(t.createdAt).toISOString().replace('T', ' ').substring(0, 19);
        const escape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

        return [
          escape(t.receiptNumber),
          escape(dateStr),
          escape(t.student.rollNumber),
          escape(t.student.name),
          escape(t.student.class),
          escape(t.student.batch),
          escape(t.feeAssignment.feeStructure.feeHead),
          escape(t.amount.toFixed(2)),
          escape(t.paymentMode),
          escape(t.referenceNumber),
          escape(t.status),
          escape(t.recordedByClerk.name),
          escape(t.reversalReason || (t.reversedBy ? `Reversed by ${t.reversedBy.receiptNumber}` : '')),
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\r\n');

      const fileName = `Fee_Collection_Report_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(csvContent);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Pending dues list endpoint for clerk & admin.
   */
  static async getPendingDues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { class: className, search } = req.query;

      const dues = await CalculationService.getStudentsWithOutstandingDues({
        class: className ? String(className) : undefined,
        search: search ? String(search) : undefined,
      });

      res.status(200).json({ success: true, data: dues });
    } catch (err) {
      next(err);
    }
  }
}
