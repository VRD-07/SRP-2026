"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Please enter a valid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
class AuthController {
    static async login(req, res, next) {
        try {
            const { email, password } = loginSchema.parse(req.body);
            const user = await db_1.prisma.user.findUnique({
                where: { email: email.toLowerCase().trim() },
                include: {
                    student: true,
                },
            });
            if (!user) {
                res.status(401).json({ success: false, message: 'Invalid email or password' });
                return;
            }
            if (!user.isActive) {
                res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact Admin.' });
                return;
            }
            const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
            if (!isMatch) {
                res.status(401).json({ success: false, message: 'Invalid email or password' });
                return;
            }
            const tokenPayload = {
                userId: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
            };
            const token = jsonwebtoken_1.default.sign(tokenPayload, env_1.ENV.JWT_SECRET, {
                expiresIn: (env_1.ENV.JWT_EXPIRES_IN || '1d'),
            });
            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        studentId: user.student?.id || null,
                        studentRollNumber: user.student?.rollNumber || null,
                    },
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async me(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const user = await db_1.prisma.user.findUnique({
                where: { id: req.user.userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                    student: {
                        select: {
                            id: true,
                            rollNumber: true,
                            name: true,
                            class: true,
                            batch: true,
                            contactNumber: true,
                        },
                    },
                },
            });
            if (!user) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }
            res.status(200).json({
                success: true,
                data: user,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;
