"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeStructureController = void 0;
const zod_1 = require("zod");
const db_1 = require("../config/db");
const feeStructureSchema = zod_1.z.object({
    class: zod_1.z.string().min(1, 'Class is required').max(50),
    batch: zod_1.z.string().min(1, 'Batch is required').max(50),
    academicYear: zod_1.z.string().min(1, 'Academic Year is required').max(20),
    feeHead: zod_1.z.enum(['Tuition', 'Hostel', 'Transport', 'Exam', 'LateFee', 'Other']),
    amount: zod_1.z.number().positive('Amount must be positive').finite().max(10000000, 'Amount cannot exceed 10,000,000'),
    dueDate: zod_1.z.string().datetime().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
});
class FeeStructureController {
    static async getAll(req, res, next) {
        try {
            const { class: className, batch, academicYear } = req.query;
            const structures = await db_1.prisma.feeStructure.findMany({
                where: {
                    ...(className ? { class: String(className) } : {}),
                    ...(batch ? { batch: String(batch) } : {}),
                    ...(academicYear ? { academicYear: String(academicYear) } : {}),
                },
                include: {
                    _count: {
                        select: { feeAssignments: true },
                    },
                },
                orderBy: [{ academicYear: 'desc' }, { class: 'asc' }, { dueDate: 'asc' }],
            });
            res.status(200).json({ success: true, data: structures });
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const { id } = req.params;
            const structure = await db_1.prisma.feeStructure.findUnique({
                where: { id },
                include: {
                    feeAssignments: {
                        include: {
                            student: true,
                        },
                    },
                },
            });
            if (!structure) {
                res.status(404).json({ success: false, message: 'Fee structure not found' });
                return;
            }
            res.status(200).json({ success: true, data: structure });
        }
        catch (err) {
            next(err);
        }
    }
    static async create(req, res, next) {
        try {
            const parsed = feeStructureSchema.parse(req.body);
            const created = await db_1.prisma.feeStructure.create({
                data: {
                    class: parsed.class.trim(),
                    batch: parsed.batch.trim(),
                    academicYear: parsed.academicYear.trim(),
                    feeHead: parsed.feeHead,
                    amount: parsed.amount,
                    dueDate: new Date(parsed.dueDate),
                },
            });
            res.status(201).json({ success: true, message: 'Fee structure created successfully', data: created });
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            const parsed = feeStructureSchema.partial().parse(req.body);
            const existing = await db_1.prisma.feeStructure.findUnique({ where: { id } });
            if (!existing) {
                res.status(404).json({ success: false, message: 'Fee structure not found' });
                return;
            }
            const updated = await db_1.prisma.feeStructure.update({
                where: { id },
                data: {
                    ...(parsed.class ? { class: parsed.class.trim() } : {}),
                    ...(parsed.batch ? { batch: parsed.batch.trim() } : {}),
                    ...(parsed.academicYear ? { academicYear: parsed.academicYear.trim() } : {}),
                    ...(parsed.feeHead ? { feeHead: parsed.feeHead } : {}),
                    ...(parsed.amount !== undefined ? { amount: parsed.amount } : {}),
                    ...(parsed.dueDate ? { dueDate: new Date(parsed.dueDate) } : {}),
                },
            });
            res.status(200).json({ success: true, message: 'Fee structure updated successfully', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static async delete(req, res, next) {
        try {
            const { id } = req.params;
            const assignmentCount = await db_1.prisma.feeAssignment.count({
                where: { feeStructureId: id },
            });
            if (assignmentCount > 0) {
                res.status(400).json({
                    success: false,
                    message: `Cannot delete: Fee structure is assigned to ${assignmentCount} student(s). Unassign first.`,
                });
                return;
            }
            await db_1.prisma.feeStructure.delete({ where: { id } });
            res.status(200).json({ success: true, message: 'Fee structure deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.FeeStructureController = FeeStructureController;
