import app from './app';
import { ENV } from './config/env';
import { prisma } from './config/db';

const PORT = ENV.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 College Fees ERP Backend running on http://localhost:${PORT}`);
  console.log(`⚡ Environment: ${ENV.NODE_ENV}`);
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ PostgreSQL Database connection established successfully via Prisma');
  } catch (error) {
    console.error('❌ Database connection check failed on startup:', error);
  }
});

export default app;
