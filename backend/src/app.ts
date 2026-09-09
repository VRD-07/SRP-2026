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

const app = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost, local network, and production origins
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else if (ENV.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
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
app.use('/api/auth', authRoutes);
app.use('/api/fee-structures', feeStructureRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/clerks', clerkRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);

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
