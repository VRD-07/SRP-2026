console.log('====================================================');
console.log('🟢 [BOOT] Starting College ERP Backend Node process...');
console.log(`🟢 [BOOT] Node version: ${process.version}, Platform: ${process.platform}, PID: ${process.pid}`);
console.log(`🟢 [BOOT] PORT env: "${process.env.PORT || 'NOT_SET'}", NODE_ENV: "${process.env.NODE_ENV || 'NOT_SET'}"`);
console.log('====================================================');

import app from './app';
import { ENV } from './config/env';
import { prisma } from './config/db';

const PORT = Number(process.env.PORT) || ENV.PORT || 5000;
const HOST = '0.0.0.0';

process.on('uncaughtException', (err) => {
  console.error('💥 [CRITICAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

try {
  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 [READY] College ERP Backend successfully listening on http://${HOST}:${PORT}`);
    console.log(`⚡ [READY] Environment: ${ENV.NODE_ENV}`);
    console.log(`🩺 [READY] Health check endpoint: http://${HOST}:${PORT}/api/health`);

    // Asynchronous non-blocking database ping
    prisma.$queryRaw`SELECT 1`
      .then(() => {
        console.log('✅ [DB] PostgreSQL Database connection established successfully via Prisma');
      })
      .catch((dbError: any) => {
        console.error('⚠️ [DB] Warning: PostgreSQL initial ping failed (server is still running and serving requests):', dbError?.message || dbError);
      });
  });

  server.on('error', (serverError: any) => {
    console.error('💥 [FATAL] HTTP server error on bind:', serverError);
  });
} catch (startupError) {
  console.error('💥 [FATAL] Exception during app.listen():', startupError);
  process.exit(1);
}

export default app;
