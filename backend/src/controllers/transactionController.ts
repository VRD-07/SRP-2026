import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { TransactionService } from '../services/transactionService';
import { ReceiptPdfService } from '../services/receiptPdfService';

const recordPaymentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required').max(100),
  feeAssignmentId: z.string().min(1, 'Fee Assignment ID is required').max(100),
  amount: z.number().positive('Amount must be greater than zero').finite(),
  paymentMode: z.enum(['CASH', 'CHEQUE', 'DD', 'ONLINE_PLACEHOLDER']),
  referenceNumber: z.string().min(1, 'Reference number is required').max(100),
  allowOverpaymentOverride: z.boolean().optional(),
});

const reverseTransactionSchema = z.object({
  reversalReason: z.string().min(3, 'Reversal reason must be at least 3 characters').max(500),
});

export class TransactionController {
  /**
   * Records a payment inside an atomic transaction.
   */
  static async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = recordPaymentSchema.parse(req.body);
      const clerkUserId = req.user!.userId;

      const transaction = await TransactionService.recordPayment({
        ...parsed,
        recordedByClerkId: clerkUserId,
      });

      res.status(201).json({
        success: true,
        message: `Payment of ₹${transaction.amount.toLocaleString('en-IN')} recorded successfully under receipt ${transaction.receiptNumber}`,
        data: transaction,
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Retrieves transaction history with rich filtering.
   */
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        studentId,
        rollNumber,
        receiptNumber,
        clerkId,
        status,
        startDate,
        endDate,
        myRecordsOnly,
      } = req.query;

      // If clerk requested "myRecordsOnly" or if forced
      const filterClerkId =
        myRecordsOnly === 'true' && req.user?.role === 'CLERK'
          ? req.user.userId
          : clerkId
          ? String(clerkId)
          : undefined;

      const transactions = await prisma.transaction.findMany({
        where: {
          ...(studentId ? { studentId: String(studentId) } : {}),
          ...(status ? { status: status as 'SUCCESS' | 'REVERSED' } : {}),
          ...(receiptNumber ? { receiptNumber: { contains: String(receiptNumber), mode: 'insensitive' } } : {}),
          ...(filterClerkId ? { recordedByClerkId: filterClerkId } : {}),
          ...(rollNumber
            ? {
                student: {
                  rollNumber: { contains: String(rollNumber), mode: 'insensitive' },
                },
              }
            : {}),
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
          student: {
            select: { id: true, name: true, rollNumber: true, class: true, batch: true },
          },
          feeAssignment: {
            include: {
              feeStructure: true,
            },
          },
          recordedByClerk: {
            select: { id: true, name: true, email: true, role: true },
          },
          reversedBy: {
            select: { id: true, receiptNumber: true, createdAt: true, reversalReason: true },
          },
          reversalOf: {
            select: { id: true, receiptNumber: true, amount: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({ success: true, data: transactions });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves single transaction details.
   */
  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          student: true,
          feeAssignment: {
            include: {
              feeStructure: true,
            },
          },
          recordedByClerk: {
            select: { id: true, name: true, email: true, role: true },
          },
          reversedBy: true,
          reversalOf: true,
        },
      });

      if (!transaction) {
        res.status(404).json({ success: false, message: 'Transaction not found' });
        return;
      }

      // If user is a student, ensure they can only view their own transaction
      if (req.user?.role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { userId: req.user.userId } });
        if (student?.id !== transaction.studentId) {
          res.status(403).json({ success: false, message: 'Access denied to this transaction' });
          return;
        }
      }

      res.status(200).json({ success: true, data: transaction });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Generates and downloads a real, vector-rendered PDF receipt.
   */
  static async downloadReceiptPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: { student: true },
      });

      if (!transaction) {
        res.status(404).json({ success: false, message: 'Transaction not found' });
        return;
      }

      // If user is student, verify ownership
      if (req.user?.role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { userId: req.user.userId } });
        if (student?.id !== transaction.studentId) {
          res.status(403).json({ success: false, message: 'Access denied to this receipt' });
          return;
        }
      }

      const pdfBytes = await ReceiptPdfService.generateReceiptPdf(id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Receipt_${transaction.receiptNumber}.pdf"`
      );
      res.setHeader('Content-Length', pdfBytes.length);

      res.send(Buffer.from(pdfBytes));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reverses a transaction via an immutable compensating entry.
   */
  static async reverse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reversalReason } = reverseTransactionSchema.parse(req.body);
      const clerkUserId = req.user!.userId;

      const reversalTx = await TransactionService.reverseTransaction({
        transactionId: id,
        reversalReason,
        recordedByClerkId: clerkUserId,
      });

      res.status(200).json({
        success: true,
        message: `Transaction reversed successfully under voucher ${reversalTx.receiptNumber}`,
        data: reversalTx,
      });
    } catch (err) {
      next(err);
    }
  }
}
