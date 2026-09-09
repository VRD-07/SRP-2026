"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculationService = exports.roundCurrency = void 0;
const db_1 = require("../config/db");
const roundCurrency = (val) => {
    return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
};
exports.roundCurrency = roundCurrency;
/**
 * Single Shared Calculation Service - The definitive source of truth for all monetary calculations.
 * Reused by:
 * - Admin, Clerk, and Student Dashboards
 * - Receipts & Payment processing
 * - Pending dues lists and Financial reports
 */
class CalculationService {
    /**
     * Helper function to safely round any monetary value to 2 decimal places.
     */
    static round(val) {
        return (0, exports.roundCurrency)(val);
    }
    /**
     * Calculates the exact financial standing for a single student.
     */
    static async getStudentFeeCalculation(studentId) {
        const student = await db_1.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                feeAssignments: {
                    include: {
                        feeStructure: true,
                        transactions: {
                            include: {
                                reversedBy: true,
                            },
                        },
                    },
                },
            },
        });
        if (!student)
            return null;
        let totalAssigned = 0;
        let totalPaid = 0;
        let totalReversals = 0;
        let nextDueDate = null;
        let hasOverdue = false;
        const now = new Date();
        const heads = student.feeAssignments.map((assignment) => {
            const assignedAmount = (0, exports.roundCurrency)(Number(assignment.feeStructure.amount));
            totalAssigned = (0, exports.roundCurrency)(totalAssigned + assignedAmount);
            // Filter successful transactions that have NOT been reversed
            let headPaid = 0;
            let headReversed = 0;
            for (const tx of assignment.transactions) {
                if (tx.status === 'SUCCESS') {
                    if (tx.reversedBy) {
                        // This transaction was reversed; count towards reversals
                        headReversed = (0, exports.roundCurrency)(headReversed + Number(tx.amount));
                    }
                    else {
                        // Valid active payment
                        headPaid = (0, exports.roundCurrency)(headPaid + Number(tx.amount));
                    }
                }
            }
            totalPaid = (0, exports.roundCurrency)(totalPaid + headPaid);
            totalReversals = (0, exports.roundCurrency)(totalReversals + headReversed);
            const pendingAmount = (0, exports.roundCurrency)(Math.max(0, assignedAmount - headPaid));
            const isOverdue = pendingAmount > 0 && new Date(assignment.feeStructure.dueDate) < now;
            if (isOverdue)
                hasOverdue = true;
            if (pendingAmount > 0) {
                if (!nextDueDate || assignment.feeStructure.dueDate < nextDueDate) {
                    nextDueDate = assignment.feeStructure.dueDate;
                }
            }
            let status = 'UNPAID';
            if (pendingAmount <= 0) {
                status = 'PAID';
            }
            else if (isOverdue) {
                status = 'OVERDUE';
            }
            else if (headPaid > 0) {
                status = 'PARTIAL';
            }
            else {
                status = 'UNPAID';
            }
            return {
                feeAssignmentId: assignment.id,
                feeStructureId: assignment.feeStructure.id,
                feeHead: assignment.feeStructure.feeHead,
                class: assignment.feeStructure.class,
                batch: assignment.feeStructure.batch,
                academicYear: assignment.feeStructure.academicYear,
                assignedAmount,
                paidAmount: headPaid,
                pendingAmount,
                dueDate: assignment.feeStructure.dueDate.toISOString(),
                isOverdue,
                status,
            };
        });
        const totalPending = (0, exports.roundCurrency)(Math.max(0, totalAssigned - totalPaid));
        return {
            studentId: student.id,
            rollNumber: student.rollNumber,
            name: student.name,
            class: student.class,
            batch: student.batch,
            totalAssigned: (0, exports.roundCurrency)(totalAssigned),
            totalPaid: (0, exports.roundCurrency)(totalPaid),
            totalPending,
            totalReversals: (0, exports.roundCurrency)(totalReversals),
            nextDueDate: nextDueDate ? nextDueDate.toISOString() : null,
            hasOverdue,
            heads,
        };
    }
    /**
     * Calculates the exact financial standing for a specific fee assignment.
     */
    static async getFeeAssignmentBalance(feeAssignmentId) {
        const assignment = await db_1.prisma.feeAssignment.findUnique({
            where: { id: feeAssignmentId },
            include: {
                feeStructure: true,
                transactions: {
                    include: {
                        reversedBy: true,
                    },
                },
            },
        });
        if (!assignment) {
            throw new Error(`FeeAssignment with ID ${feeAssignmentId} not found`);
        }
        const assignedAmount = (0, exports.roundCurrency)(Number(assignment.feeStructure.amount));
        let paidAmount = 0;
        for (const tx of assignment.transactions) {
            if (tx.status === 'SUCCESS' && !tx.reversedBy) {
                paidAmount = (0, exports.roundCurrency)(paidAmount + Number(tx.amount));
            }
        }
        const pendingAmount = (0, exports.roundCurrency)(Math.max(0, assignedAmount - paidAmount));
        return {
            assignmentId: assignment.id,
            studentId: assignment.studentId,
            assignedAmount,
            paidAmount,
            pendingAmount,
        };
    }
    /**
     * Real-time global system KPIs and financial aggregates.
     */
    static async getSystemKPIs(filter) {
        // 1. Total assigned fees
        const feeAssignments = await db_1.prisma.feeAssignment.findMany({
            where: {
                feeStructure: {
                    ...(filter?.academicYear ? { academicYear: filter.academicYear } : {}),
                    ...(filter?.class ? { class: filter.class } : {}),
                },
            },
            include: {
                feeStructure: true,
            },
        });
        const totalAssigned = (0, exports.roundCurrency)(feeAssignments.reduce((acc, curr) => acc + Number(curr.feeStructure.amount), 0));
        // 2. Transactions
        const transactions = await db_1.prisma.transaction.findMany({
            where: {
                ...(filter?.startDate || filter?.endDate
                    ? {
                        createdAt: {
                            ...(filter?.startDate ? { gte: filter.startDate } : {}),
                            ...(filter?.endDate ? { lte: filter.endDate } : {}),
                        },
                    }
                    : {}),
                student: {
                    ...(filter?.class ? { class: filter.class } : {}),
                },
            },
            include: {
                reversedBy: true,
            },
        });
        let totalCollected = 0;
        let totalReversedAmount = 0;
        for (const tx of transactions) {
            if (tx.status === 'SUCCESS') {
                if (tx.reversedBy) {
                    totalReversedAmount = (0, exports.roundCurrency)(totalReversedAmount + Number(tx.amount));
                }
                else {
                    totalCollected = (0, exports.roundCurrency)(totalCollected + Number(tx.amount));
                }
            }
        }
        const totalPending = (0, exports.roundCurrency)(Math.max(0, totalAssigned - totalCollected));
        const collectionRatePercentage = totalAssigned > 0 ? Number(((totalCollected / totalAssigned) * 100).toFixed(2)) : 0;
        // Students with pending dues
        const students = await db_1.prisma.student.findMany({
            where: {
                ...(filter?.class ? { class: filter.class } : {}),
            },
            include: {
                feeAssignments: {
                    include: {
                        feeStructure: true,
                        transactions: {
                            include: { reversedBy: true },
                        },
                    },
                },
            },
        });
        let studentsWithDues = 0;
        for (const student of students) {
            let stAssigned = 0;
            let stPaid = 0;
            for (const fa of student.feeAssignments) {
                stAssigned = (0, exports.roundCurrency)(stAssigned + Number(fa.feeStructure.amount));
                for (const tx of fa.transactions) {
                    if (tx.status === 'SUCCESS' && !tx.reversedBy) {
                        stPaid = (0, exports.roundCurrency)(stPaid + Number(tx.amount));
                    }
                }
            }
            if (stAssigned > stPaid) {
                studentsWithDues++;
            }
        }
        return {
            totalAssigned,
            totalCollected,
            totalPending,
            totalReversedAmount,
            collectionRatePercentage,
            totalStudents: students.length,
            studentsWithDues,
        };
    }
    /**
     * Pending dues list across students for Clerk & Admin views.
     */
    static async getStudentsWithOutstandingDues(filter) {
        const students = await db_1.prisma.student.findMany({
            where: {
                ...(filter?.class ? { class: filter.class } : {}),
                ...(filter?.search
                    ? {
                        OR: [
                            { name: { contains: filter.search, mode: 'insensitive' } },
                            { rollNumber: { contains: filter.search, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            include: {
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
        const results = [];
        for (const student of students) {
            let totalAssigned = 0;
            let totalPaid = 0;
            let totalReversals = 0;
            let nextDueDate = null;
            let hasOverdue = false;
            const now = new Date();
            const heads = student.feeAssignments.map((assignment) => {
                const assignedAmount = (0, exports.roundCurrency)(Number(assignment.feeStructure.amount));
                totalAssigned = (0, exports.roundCurrency)(totalAssigned + assignedAmount);
                let headPaid = 0;
                let headReversed = 0;
                for (const tx of assignment.transactions) {
                    if (tx.status === 'SUCCESS') {
                        if (tx.reversedBy) {
                            headReversed = (0, exports.roundCurrency)(headReversed + Number(tx.amount));
                        }
                        else {
                            headPaid = (0, exports.roundCurrency)(headPaid + Number(tx.amount));
                        }
                    }
                }
                totalPaid = (0, exports.roundCurrency)(totalPaid + headPaid);
                totalReversals = (0, exports.roundCurrency)(totalReversals + headReversed);
                const pendingAmount = (0, exports.roundCurrency)(Math.max(0, assignedAmount - headPaid));
                const isOverdue = pendingAmount > 0 && new Date(assignment.feeStructure.dueDate) < now;
                if (isOverdue)
                    hasOverdue = true;
                if (pendingAmount > 0) {
                    if (!nextDueDate || assignment.feeStructure.dueDate < nextDueDate) {
                        nextDueDate = assignment.feeStructure.dueDate;
                    }
                }
                let status = 'UNPAID';
                if (pendingAmount <= 0) {
                    status = 'PAID';
                }
                else if (isOverdue) {
                    status = 'OVERDUE';
                }
                else if (headPaid > 0) {
                    status = 'PARTIAL';
                }
                else {
                    status = 'UNPAID';
                }
                return {
                    feeAssignmentId: assignment.id,
                    feeStructureId: assignment.feeStructure.id,
                    feeHead: assignment.feeStructure.feeHead,
                    class: assignment.feeStructure.class,
                    batch: assignment.feeStructure.batch,
                    academicYear: assignment.feeStructure.academicYear,
                    assignedAmount,
                    paidAmount: headPaid,
                    pendingAmount,
                    dueDate: assignment.feeStructure.dueDate.toISOString(),
                    isOverdue,
                    status,
                };
            });
            const totalPending = (0, exports.roundCurrency)(Math.max(0, totalAssigned - totalPaid));
            if (totalPending > 0) {
                results.push({
                    studentId: student.id,
                    rollNumber: student.rollNumber,
                    name: student.name,
                    class: student.class,
                    batch: student.batch,
                    totalAssigned: (0, exports.roundCurrency)(totalAssigned),
                    totalPaid: (0, exports.roundCurrency)(totalPaid),
                    totalPending,
                    totalReversals: (0, exports.roundCurrency)(totalReversals),
                    nextDueDate: nextDueDate ? nextDueDate.toISOString() : null,
                    hasOverdue,
                    heads,
                });
            }
        }
        return results;
    }
}
exports.CalculationService = CalculationService;
