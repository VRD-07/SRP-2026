"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const db_1 = require("../config/db");
const clerkCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Valid email is required'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
const resetPasswordSchema = zod_1.z.object({
    newPassword: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
class ClerkController {
    static async getAll(req, res, next) {
        try {
            const clerks = await db_1.prisma.user.findMany({
                where: { role: 'CLERK' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    _count: {
                        select: { recordedTransactions: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            res.status(200).json({ success: true, data: clerks });
        }
        catch (err) {
            next(err);
        }
    }
    static async create(req, res, next) {
        try {
            const parsed = clerkCreateSchema.parse(req.body);
            const existing = await db_1.prisma.user.findUnique({
                where: { email: parsed.email.toLowerCase().trim() },
            });
            if (existing) {
                res.status(409).json({ success: false, message: 'Email is already registered' });
                return;
            }
            const passwordHash = await bcryptjs_1.default.hash(parsed.password, 10);
            const clerk = await db_1.prisma.user.create({
                data: {
                    name: parsed.name.trim(),
                    email: parsed.email.toLowerCase().trim(),
                    passwordHash,
                    role: 'CLERK',
                    isActive: true,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                },
            });
            res.status(201).json({
                success: true,
                message: 'Clerk account created successfully',
                data: clerk,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async toggleStatus(req, res, next) {
        try {
            const { id } = req.params;
            const clerk = await db_1.prisma.user.findUnique({ where: { id } });
            if (!clerk || clerk.role !== 'CLERK') {
                res.status(404).json({ success: false, message: 'Clerk account not found' });
                return;
            }
            const updated = await db_1.prisma.user.update({
                where: { id },
                data: { isActive: !clerk.isActive },
                select: { id: true, name: true, email: true, isActive: true },
            });
            res.status(200).json({
                success: true,
                message: `Clerk account ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async resetPassword(req, res, next) {
        try {
            const { id } = req.params;
            const { newPassword } = resetPasswordSchema.parse(req.body);
            const clerk = await db_1.prisma.user.findUnique({ where: { id } });
            if (!clerk || clerk.role !== 'CLERK') {
                res.status(404).json({ success: false, message: 'Clerk account not found' });
                return;
            }
            const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
            await db_1.prisma.user.update({
                where: { id },
                data: { passwordHash },
            });
            res.status(200).json({
                success: true,
                message: `Password reset successfully for ${clerk.name}`,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ClerkController = ClerkController;
