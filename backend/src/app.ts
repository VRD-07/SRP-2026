import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ENV } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/authRoutes';
import feeStructureRoutes from './routes/feeStructureRoutes';
import studentRoutes from './routes/studentRoutes';
import clerkRoutes from './routes/clerkRoutes';
import transactionRoutes from './routes/transactionRoutes';
import reportRoutes from './routes/reportRoutes';
import teacherRoutes from './routes/teacherRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import libraryRoutes from './routes/libraryRoutes';

const app = express();

// CORS configuration
const allowedOrigins = ENV.CORS_ORIGIN
  ? ENV.CORS_ORIGIN.split(',').map((o: string) => o.trim().replace(/\/$/, ''))
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, UptimeRobot, server-to-server)
      if (!origin) return callback(null, true);

      // Allow all in development mode
      if (ENV.NODE_ENV === 'development') {
        return callback(null, true);
      }

      // In production, verify against configured allowed origins
      const isAllowed = allowedOrigins.some((allowed: string) => {
        return allowed === '*' || allowed === origin;
      });

      if (isAllowed) {
        return callback(null, true);
      } else {
        return callback(new Error(`CORS error: Origin ${origin} not allowed by Access-Control-Allow-Origin.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else if (ENV.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoints (supports both /api/health and /health)
const healthCheckHandler = (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'College Fees Management ERP - API',
    environment: ENV.NODE_ENV,
    uptime: Math.floor(process.uptime()),
  });
};

app.get('/api/health', healthCheckHandler);
app.get('/health', healthCheckHandler);

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/fee-structures', feeStructureRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/clerks', clerkRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/library', libraryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
