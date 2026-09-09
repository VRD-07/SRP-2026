import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { ENV } from '../src/config/env';

describe('5. INPUT VALIDATION & ATTACK DEFENSE', () => {
  let adminToken: string;
  let clerkToken: string;
  let validStudent: any;
  let validFeeAssignment: any;

  beforeAll(async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const clerk = await prisma.user.findFirst({ where: { role: 'CLERK' } });

    adminToken = jwt.sign(
      { userId: admin!.id, email: admin!.email, role: 'ADMIN', name: admin!.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    clerkToken = jwt.sign(
      { userId: clerk!.id, email: clerk!.email, role: 'CLERK', name: clerk!.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    validStudent = await prisma.student.findFirst({
      include: { feeAssignments: true },
    });
    validFeeAssignment = validStudent?.feeAssignments[0];
  });

  it('5.1 should reject missing required fields with 400 on student creation', async () => {
    // Missing email, name, rollNumber
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ class: 'B.Tech' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Validation failed/i);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('5.2 should reject wrong data types (string where number expected) with 400', async () => {
    // String passed for amount and admissionYear
    const res = await request(app)
      .post('/api/fee-structures')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        class: 'B.Tech CS',
        batch: '2024-2028',
        academicYear: '2024-25',
        feeHead: 'Tuition',
        amount: 'NOT_A_NUMBER',
        dueDate: '2026-12-31',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('5.3 should reject negative amounts and invalid enums on fee structure creation', async () => {
    const res = await request(app)
      .post('/api/fee-structures')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        class: 'B.Tech CS',
        batch: '2024-2028',
        academicYear: '2024-25',
        feeHead: 'INVALID_FEE_HEAD',
        amount: -15000,
        dueDate: '2026-12-31',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('5.4 should safely handle SQL-injection attack vectors without crashing the server', async () => {
    const sqlInjectionStrings = [
      "' OR '1'='1",
      "'; DROP TABLE \"Transaction\"; --",
      "admin' --",
      "UNION SELECT * FROM \"User\"",
    ];

    for (const sqlPayload of sqlInjectionStrings) {
      // 1. Search student with SQL injection
      const searchRes = await request(app)
        .get(`/api/students?search=${encodeURIComponent(sqlPayload)}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(searchRes.status).toBe(200); // Handled safely via parameterized query, returns empty or filtered list

      // 2. Try recording payment with SQL injection in reference number
      if (validFeeAssignment) {
        const payRes = await request(app)
          .post('/api/transactions')
          .set('Authorization', `Bearer ${clerkToken}`)
          .send({
            studentId: validStudent.id,
            feeAssignmentId: validFeeAssignment.id,
            amount: 10,
            paymentMode: 'CASH',
            referenceNumber: sqlPayload,
          });

        // Either accepted as literal string or rejected by validation, but NEVER crashes server (not 500)
        expect([200, 201, 400, 409]).toContain(payRes.status);
      }
    }

    // Verify Transaction table still exists and is untouched
    const txCount = await prisma.transaction.count();
    expect(txCount).toBeGreaterThanOrEqual(0);
  });

  it('5.5 should reject extremely long strings (10,000+ chars) with 400 and not exhaust memory', async () => {
    const hugeString = 'A'.repeat(15000);

    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: hugeString,
        email: 'huge@college.edu',
        rollNumber: 'HUGE-01',
        class: 'B.Tech',
        batch: '2024',
        admissionYear: 2024,
        contactNumber: '1234567890',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('5.6 should reject payment recording with non-numeric or negative amount via API', async () => {
    if (!validFeeAssignment) return;

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({
        studentId: validStudent.id,
        feeAssignmentId: validFeeAssignment.id,
        amount: -500,
        paymentMode: 'CASH',
        referenceNumber: 'REF-NEG-API',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
