import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Only log unexpected server errors or in development
  if (process.env.NODE_ENV !== 'test') {
    console.error('API Error:', err);
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    const fields = err.meta?.target || 'field';
    res.status(409).json({
      success: false,
      message: `A record with this ${Array.isArray(fields) ? fields.join(', ') : fields} already exists.`,
    });
    return;
  }

  // Prisma record not found (P2025)
  if (err.code === 'P2025') {
    res.status(404).json({
      success: false,
      message: err.meta?.cause || 'Requested record was not found.',
    });
    return;
  }

  let statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Map known domain / validation messages to appropriate HTTP status codes
  if (statusCode === 500) {
    if (
      message.includes('exceeds remaining due') ||
      message.includes('must be greater than zero') ||
      message.includes('required') ||
      message.includes('Invalid') ||
      message.includes('does not belong to this student')
    ) {
      statusCode = 400;
    } else if (
      message.includes('Duplicate payment detected') ||
      message.includes('already reversed') ||
      message.includes('already exists')
    ) {
      statusCode = 409;
    } else if (message.includes('not found')) {
      statusCode = 404;
    } else if (message.includes('Access denied') || message.includes('restricted')) {
      statusCode = 403;
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
