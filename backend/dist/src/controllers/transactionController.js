"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const zod_1 = require("zod");
const db_1 = require("../config/db");
const transactionService_1 = require("../services/transactionService");
const receiptPdfService_1 = require("../services/receiptPdfService");
const recordPaymentSchema = zod_1.z.object({
    studentId: zod_1.z.string().min(1, 'Student ID is required').max(100),
    feeAssignmentId: zod_1.z.string().min(1, 'Fee Assignment ID is required').max(100),
    amount: zod_1.z.number().positive('Amount must be greater than zero').finite(),
    paymentMode: zod_1.z.enum(['CASH', 'CHEQUE', 'DD', 'ONLINE_PLACEHOLDER']),
    referenceNumber: zod_1.z.string().min(1, 'Reference number is required').max(100),
    allowOverpaymentOverride: zod_1.z.boolean().optional(),
});
const reverseTransactionSchema = zod_1.z.object({
    reversalReason: zod_1.z.string().min(3, 'Reversal reason must be at least 3 characters').max(500),
});
class TransactionController {
    /**
     * Records a payment inside an atomic transaction.
     */
    static async recordPayment(req, res, next) {
        try {
            const parsed = recordPaymentSchema.parse(req.body);
            const clerkUserId = req.user.userId;
            const transaction = await transactionService_1.TransactionService.recordPayment({
                ...parsed,
                recordedByClerkId: clerkUserId,
            });
            res.status(201).json({
                success: true,
                message: `Payment of ₹${transaction.amount.toLocaleString('en-IN')} recorded successfully under receipt ${transaction.receiptNumber}`,
                data: transaction,
            });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * Retrieves transaction history with rich filtering.
     */
    static async getAll(req, res, next) {
        try {
            const { studentId, rollNumber, receiptNumber, clerkId, status, startDate, endDate, myRecordsOnly, } = req.query;
            // If clerk requested "myRecordsOnly" or if forced
            const filterClerkId = myRecordsOnly === 'true' && req.user?.role === 'CLERK'
                ? req.user.userId
                : clerkId
                    ? String(clerkId)
                    : undefined;
            const transactions = await db_1.prisma.transaction.findMany({
                where: {
                    ...(studentId ? { studentId: String(studentId) } : {}),
                    ...(status ? { status: status } : {}),
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
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * Retrieves single transaction details.
     */
    static async getById(req, res, next) {
        try {
            const { id } = req.params;
            const transaction = await db_1.prisma.transaction.findUnique({
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
                const student = await db_1.prisma.student.findUnique({ where: { userId: req.user.userId } });
                if (student?.id !== transaction.studentId) {
                    res.status(403).json({ success: false, message: 'Access denied to this transaction' });
                    return;
                }
            }
            res.status(200).json({ success: true, data: transaction });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * Generates and downloads a real, vector-rendered PDF receipt.
     */
    static async downloadReceiptPdf(req, res, next) {
        try {
            const { id } = req.params;
            const transaction = await db_1.prisma.transaction.findUnique({
                where: { id },
                include: { student: true },
            });
            if (!transaction) {
                res.status(404).json({ success: false, message: 'Transaction not found' });
                return;
            }
            // If user is student, verify ownership
            if (req.user?.role === 'STUDENT') {
                const student = await db_1.prisma.student.findUnique({ where: { userId: req.user.userId } });
                if (student?.id !== transaction.studentId) {
                    res.status(403).json({ success: false, message: 'Access denied to this receipt' });
                    return;
                }
            }
            const pdfBytes = await receiptPdfService_1.ReceiptPdfService.generateReceiptPdf(id);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Receipt_${transaction.receiptNumber}.pdf"`);
            res.setHeader('Content-Length', pdfBytes.length);
            res.send(Buffer.from(pdfBytes));
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * Reverses a transaction via an immutable compensating entry.
     */
    static async reverse(req, res, next) {
        try {
            const { id } = req.params;
            const { reversalReason } = reverseTransactionSchema.parse(req.body);
            const clerkUserId = req.user.userId;
            const reversalTx = await transactionService_1.TransactionService.reverseTransaction({
                transactionId: id,
                reversalReason,
                recordedByClerkId: clerkUserId,
            });
            res.status(200).json({
                success: true,
                message: `Transaction reversed successfully under voucher ${reversalTx.receiptNumber}`,
                data: reversalTx,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.TransactionController = TransactionController;
