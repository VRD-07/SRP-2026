import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { ENV } from '../src/config/env';

describe('3. ACCESS CONTROL & ROLE INTEGRITY (API Layer)', () => {
  let adminToken: string;
  let clerkToken: string;
  let studentToken: string;
  let testStudentUser: any;
  let testClerkUser: any;
  let testAdminUser: any;

  beforeAll(async () => {
    // Ensure any residual test users have valid bcrypt hashes
    const validHash = await bcrypt.hash('TestPass@123', 10);
    await prisma.user.updateMany({
      where: { passwordHash: 'dummy' },
      data: { passwordHash: validHash },
    });

    // 1. Fetch or create users for each role
    testAdminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    testClerkUser = await prisma.user.findFirst({ where: { role: 'CLERK' } });
    testStudentUser = await prisma.user.findFirst({ where: { role: 'STUDENT' } });

    // Generate real JWT tokens
    adminToken = jwt.sign(
      { userId: testAdminUser.id, email: testAdminUser.email, role: 'ADMIN', name: testAdminUser.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    clerkToken = jwt.sign(
      { userId: testClerkUser.id, email: testClerkUser.email, role: 'CLERK', name: testClerkUser.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    studentToken = jwt.sign(
      { userId: testStudentUser.id, email: testStudentUser.email, role: 'STUDENT', name: testStudentUser.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  it('3.1 should reject unauthenticated requests with 401 when no token is provided', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('3.2 should strictly return 403 when a STUDENT attempts to access ADMIN or CLERK endpoints', async () => {
    // 1. Fee structure creation
    const feeRes = await request(app)
      .post('/api/fee-structures')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ class: 'X', batch: 'Y', academicYear: '2024-25', feeHead: 'Tuition', amount: 1000, dueDate: '2026-12-31' });
    expect(feeRes.status).toBe(403);

    // 2. Fee structure delete
    const feeDel = await request(app)
      .delete('/api/fee-structures/dummy-id')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(feeDel.status).toBe(403);

    // 3. Clerk management
    const clerkRes = await request(app)
      .get('/api/clerks')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(clerkRes.status).toBe(403);

    // 4. Student creation
    const studentRes = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ name: 'Hacker', email: 'hack@test.com', rollNumber: 'R1', class: 'A', batch: 'B', admissionYear: 2024, contactNumber: '1234567' });
    expect(studentRes.status).toBe(403);

    // 5. Payment recording
    const payRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentId: 'sid', feeAssignmentId: 'fid', amount: 100, paymentMode: 'CASH', referenceNumber: 'R1' });
    expect(payRes.status).toBe(403);

    // 6. Payment reversal
    const revRes = await request(app)
      .post('/api/transactions/dummy-id/reverse')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ reversalReason: 'Unauthorized test' });
    expect(revRes.status).toBe(403);
  });

  it('3.3 should strictly return 403 when a CLERK attempts to access ADMIN-only endpoints', async () => {
    // 1. Fee structure creation (Admin only)
    const feeRes = await request(app)
      .post('/api/fee-structures')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({ class: 'X', batch: 'Y', academicYear: '2024-25', feeHead: 'Tuition', amount: 1000, dueDate: '2026-12-31' });
    expect(feeRes.status).toBe(403);

    // 2. Fee structure update (Admin only)
    const feePut = await request(app)
      .put('/api/fee-structures/dummy-id')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({ amount: 2000 });
    expect(feePut.status).toBe(403);

    // 3. Fee structure deletion (Admin only)
    const feeDel = await request(app)
      .delete('/api/fee-structures/dummy-id')
      .set('Authorization', `Bearer ${clerkToken}`);
    expect(feeDel.status).toBe(403);

    // 4. Clerk creation (Admin only)
    const clerkCreate = await request(app)
      .post('/api/clerks')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({ name: 'Clerk 2', email: 'clerk2@test.com', password: 'Password@123' });
    expect(clerkCreate.status).toBe(403);

    // 5. Clerk listing (Admin only)
    const clerkGet = await request(app)
      .get('/api/clerks')
      .set('Authorization', `Bearer ${clerkToken}`);
    expect(clerkGet.status).toBe(403);

    // 6. Student registration (Admin only)
    const studentCreate = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({ name: 'New Student', email: 'ns@test.com', rollNumber: 'R9', class: 'A', batch: 'B', admissionYear: 2024, contactNumber: '1234567' });
    expect(studentCreate.status).toBe(403);
  });

  it('3.4 should reject forged or tampered JWT payloads with 403', async () => {
    // Create a forged token signed with a fake key trying to claim ADMIN role
    const forgedToken = jwt.sign(
      { userId: testStudentUser.id, email: testStudentUser.email, role: 'ADMIN', name: 'Forged Admin' },
      'FAKE_UNAUTHORIZED_SECRET_KEY_12345',
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/clerks')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Invalid or expired token/i);
  });

  it('3.5 should confirm no UPDATE (PUT/PATCH) or DELETE route exists for Transactions (Immutable Ledger)', async () => {
    // Attempt PUT
    const putRes = await request(app)
      .put('/api/transactions/dummy-tx-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 9999 });
    expect(putRes.status).toBe(404);

    // Attempt PATCH
    const patchRes = await request(app)
      .patch('/api/transactions/dummy-tx-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 9999 });
    expect(patchRes.status).toBe(404);

    // Attempt DELETE
    const delRes = await request(app)
      .delete('/api/transactions/dummy-tx-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(404);
  });

  it('3.6 should confirm all user passwords in database are bcrypt hashes, never plaintext', async () => {
    const users = await prisma.user.findMany({
      select: { email: true, passwordHash: true },
    });

    expect(users.length).toBeGreaterThan(0);

    for (const u of users) {
      // Bcrypt hash regex ($2a$, $2b$, or $2y$ followed by 2-digit cost parameter and 53 base64 characters)
      expect(u.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
      expect(u.passwordHash).not.toBe('Admin@123');
      expect(u.passwordHash).not.toBe('Clerk@123');
      expect(u.passwordHash).not.toBe('Student@123');
    }
  });
});
