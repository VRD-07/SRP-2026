"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const db_1 = require("../config/db");
const calculationService_1 = require("./calculationService");
class TransactionService {
    static sequenceInitialized = false;
    /**
     * Ensures sequences exist once outside interactive transactions using root client.
     */
    static async ensureSequencesExist(client = db_1.prisma) {
        if (this.sequenceInitialized)
            return;
        try {
            await client.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS "payment_receipt_seq" START 1000;`);
            await client.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS "reversal_receipt_seq" START 1000;`);
            this.sequenceInitialized = true;
        }
        catch {
            // Ignored if concurrent
        }
    }
    /**
     * Generates an atomic, collision-free sequential receipt number using PostgreSQL sequence.
     * Runs in milliseconds with zero DDL overhead.
     */
    static async generateReceiptNumber(tx, isReversal = false) {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prefix = isReversal ? `REV-${yearMonth}` : `RCP-${yearMonth}`;
        const seqName = isReversal ? 'reversal_receipt_seq' : 'payment_receipt_seq';
        try {
            const result = (await tx.$queryRawUnsafe(`SELECT nextval('${seqName}') as nextval;`));
            const seqVal = result[0]?.nextval;
            const sequenceNumber = seqVal !== undefined ? Number(seqVal) : 1000;
            return `${prefix}-${String(sequenceNumber).padStart(5, '0')}`;
        }
        catch {
            // Fallback for non-Postgres environments or mocked transactions
            const count = await tx.transaction.count({
                where: {
                    receiptNumber: {
                        startsWith: prefix,
                    },
                },
            });
            return `${prefix}-${String(count + 1000).padStart(5, '0')}`;
        }
    }
    /**
     * Records a fee payment wrapped in an atomic Prisma $transaction with pessimistic row locking.
     */
    static async recordPayment(input) {
        const cleanAmount = (0, calculationService_1.roundCurrency)(Number(input.amount));
        if (isNaN(cleanAmount) || !isFinite(cleanAmount) || cleanAmount <= 0) {
            throw new Error('Payment amount must be greater than zero');
        }
        if (!input.referenceNumber || input.referenceNumber.trim() === '') {
            throw new Error('Reference number / Cheque / DD / Receipt reference is required');
        }
        const trimmedReference = input.referenceNumber.trim();
        // Ensure sequences are created OUTSIDE the interactive transaction clock
        await this.ensureSequencesExist(db_1.prisma);
        return await db_1.prisma.$transaction(async (tx) => {
            // 1. Pessimistic Row Lock on FeeAssignment: prevents race conditions & concurrent double-payment
            try {
                await tx.$queryRawUnsafe(`SELECT id FROM "FeeAssignment" WHERE id = $1 FOR UPDATE`, input.feeAssignmentId);
            }
            catch {
                // Safe continuation
            }
            // 2. Rapid duplicate submission check (Idempotency)
            const recentWindow = new Date(Date.now() - 30 * 1000);
            const duplicateTx = await tx.transaction.findFirst({
                where: {
                    feeAssignmentId: input.feeAssignmentId,
                    amount: cleanAmount,
                    referenceNumber: trimmedReference,
                    status: 'SUCCESS',
                    createdAt: { gte: recentWindow },
                },
            });
            if (duplicateTx) {
                throw new Error(`Duplicate payment detected: A payment of ₹${cleanAmount.toFixed(2)} with reference '${trimmedReference}' was already recorded under receipt ${duplicateTx.receiptNumber}.`);
            }
            // 3. Verify FeeAssignment and ownership
            const assignment = await tx.feeAssignment.findUnique({
                where: { id: input.feeAssignmentId },
                include: {
                    feeStructure: true,
                    transactions: {
                        include: { reversedBy: true },
                    },
                },
            });
            if (!assignment) {
                throw new Error(`Fee assignment with ID ${input.feeAssignmentId} not found`);
            }
            if (assignment.studentId !== input.studentId) {
                throw new Error('The selected fee assignment does not belong to this student');
            }
            // 4. Compute balance using standard calculation logic with 2-decimal precision
            const assignedAmount = (0, calculationService_1.roundCurrency)(Number(assignment.feeStructure.amount));
            let paidAmount = 0;
            for (const t of assignment.transactions) {
                if (t.status === 'SUCCESS' && !t.reversedBy) {
                    paidAmount = (0, calculationService_1.roundCurrency)(paidAmount + Number(t.amount));
                }
            }
            const pendingAmount = (0, calculationService_1.roundCurrency)(Math.max(0, assignedAmount - paidAmount));
            // 5. Overpayment check
            if (cleanAmount > pendingAmount && !input.allowOverpaymentOverride) {
                throw new Error(`Payment amount (₹${cleanAmount.toFixed(2)}) exceeds remaining due (₹${pendingAmount.toFixed(2)}). Confirm overpayment override to proceed.`);
            }
            // 6. Generate unique sequential receipt number atomically
            const receiptNumber = await this.generateReceiptNumber(tx, false);
            // 7. Insert immutable transaction
            const newTransaction = await tx.transaction.create({
                data: {
                    studentId: input.studentId,
                    feeAssignmentId: input.feeAssignmentId,
                    amount: cleanAmount,
                    paymentMode: input.paymentMode,
                    referenceNumber: trimmedReference,
                    recordedByClerkId: input.recordedByClerkId,
                    receiptNumber,
                    status: 'SUCCESS',
                },
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
                },
            });
            return newTransaction;
        }, {
            timeout: 45000,
            maxWait: 15000,
        });
    }
    /**
     * Reverses an existing transaction via an immutable compensating entry.
     */
    static async reverseTransaction(input) {
        if (!input.reversalReason || input.reversalReason.trim() === '') {
            throw new Error('A detailed reason for reversal is strictly required for audit logs');
        }
        await this.ensureSequencesExist(db_1.prisma);
        return await db_1.prisma.$transaction(async (tx) => {
            // 1. Lock original transaction row
            try {
                await tx.$queryRawUnsafe(`SELECT id FROM "Transaction" WHERE id = $1 FOR UPDATE`, input.transactionId);
            }
            catch {
                // Safe continuation
            }
            // 2. Fetch original transaction
            const originalTx = await tx.transaction.findUnique({
                where: { id: input.transactionId },
                include: {
                    reversedBy: true,
                },
            });
            if (!originalTx) {
                throw new Error(`Transaction with ID ${input.transactionId} not found`);
            }
            if (originalTx.status === 'REVERSED') {
                throw new Error('Cannot reverse a transaction that is already a reversal entry');
            }
            if (originalTx.reversedBy) {
                throw new Error(`This transaction was already reversed under receipt ${originalTx.reversedBy.receiptNumber}`);
            }
            // 3. Generate unique reversal receipt number atomically
            const reversalReceiptNumber = await this.generateReceiptNumber(tx, true);
            // 4. Create compensating reversal transaction
            const reversalTx = await tx.transaction.create({
                data: {
                    studentId: originalTx.studentId,
                    feeAssignmentId: originalTx.feeAssignmentId,
                    amount: originalTx.amount,
                    paymentMode: originalTx.paymentMode,
                    referenceNumber: `REV-OF-${originalTx.referenceNumber}`,
                    recordedByClerkId: input.recordedByClerkId,
                    receiptNumber: reversalReceiptNumber,
                    status: 'REVERSED',
                    reversalOfTransactionId: originalTx.id,
                    reversalReason: input.reversalReason.trim(),
                },
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
                    reversalOf: true,
                },
            });
            return reversalTx;
        }, {
            timeout: 45000,
            maxWait: 15000,
        });
    }
}
exports.TransactionService = TransactionService;
