"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
// Route imports
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const feeStructureRoutes_1 = __importDefault(require("./routes/feeStructureRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const clerkRoutes_1 = __importDefault(require("./routes/clerkRoutes"));
const transactionRoutes_1 = __importDefault(require("./routes/transactionRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow localhost, local network, and production origins
        callback(null, true);
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
if (env_1.ENV.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else if (env_1.ENV.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('combined'));
}
// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'online',
        timestamp: new Date().toISOString(),
        service: 'College Fees Management ERP - API',
    });
});
// Mount Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/fee-structures', feeStructureRoutes_1.default);
app.use('/api/students', studentRoutes_1.default);
app.use('/api/clerks', clerkRoutes_1.default);
app.use('/api/transactions', transactionRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `API Route not found: ${req.method} ${req.originalUrl}`,
    });
});
// Centralized error handler
app.use(errorHandler_1.errorHandler);
exports.default = app;
