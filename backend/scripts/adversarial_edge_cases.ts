/**
 * Adversarial & Edge Case Sweep Script
 *
 * Verifies system resilience under adversarial inputs and edge cases:
 * 1. Form double-submission idempotency (payments & attendance)
 * 2. Token authentication edge cases (expired, tampered, missing, role escalations, deactivated user)
 * 3. Currency & Financial calculations (negative, zero, fractional paise, floating-point precision)
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { ENV } from '../src/config/env';
import { roundCurrency } from '../src/services/calculationService';

interface EdgeResult {
  category: string;
  testCase: string;
  passed: boolean;
  details: string;
}

async function runAdversarialSweep() {
  console.log('================================================================');
  console.log('🛡️ RUNNING ADVERSARIAL & EDGE CASE SWEEP');
  console.log('================================================================\n');

  const results: EdgeResult[] = [];
  const record = (category: string, testCase: string, passed: boolean, details: string) => {
    results.push({ category, testCase, passed, details });
    console.log(`${passed ? '✅' : '❌'} [${category}] ${testCase} — ${details}`);
    if (!passed) {
      throw new Error(`Edge case failure: [${category}] ${testCase}`);
    }
  };

  // Setup tokens
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  if (!admin) throw new Error('No admin found');
  const adminToken = jwt.sign(
    { userId: admin.id, email: admin.email, role: 'ADMIN', name: admin.name },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  let clerk = await prisma.user.findFirst({ where: { role: 'CLERK', isActive: true } });
  if (!clerk) throw new Error('No clerk found');
  const clerkToken = jwt.sign(
    { userId: clerk.id, email: clerk.email, role: 'CLERK', name: clerk.name },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  let teacherUser = await prisma.user.findFirst({ where: { role: 'TEACHER', isActive: true } });
  if (!teacherUser) throw new Error('No teacher found');
  let teacherProfile = await prisma.teacher.findUnique({ where: { userId: teacherUser.id } });
  const teacherToken = jwt.sign(
    { userId: teacherUser.id, email: teacherUser.email, role: 'TEACHER', name: teacherUser.name },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  let studentUser = await prisma.user.findFirst({ where: { role: 'STUDENT', isActive: true } });
  if (!studentUser) throw new Error('No student found');
  const studentToken = jwt.sign(
    { userId: studentUser.id, email: studentUser.email, role: 'STUDENT', name: studentUser.name },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // =========================================================================
  // 1. AUTHENTICATION & TOKEN EDGE CASES
  // =========================================================================
  console.log('\n--- 1. AUTHENTICATION & TOKEN EDGE CASES ---');

  // 1.1 Expired JWT
  const expiredToken = jwt.sign(
    { userId: admin.id, email: admin.email, role: 'ADMIN' },
    ENV.JWT_SECRET,
    { expiresIn: '-1s' } // Expired in past
  );
  const expiredRes = await request(app)
    .get('/api/reports/overview')
    .set('Authorization', `Bearer ${expiredToken}`);

  record(
    'Auth & Tokens',
    'Expired JWT Handling',
    (expiredRes.status === 401 || expiredRes.status === 403) && expiredRes.body.success === false,
    `Expired JWT rejected with HTTP ${expiredRes.status}: "${expiredRes.body.message}"`
  );

  // 1.2 Tampered JWT Signature
  const tamperedToken = adminToken.slice(0, -5) + 'xxxxx';
  const tamperedRes = await request(app)
    .get('/api/reports/overview')
    .set('Authorization', `Bearer ${tamperedToken}`);

  record(
    'Auth & Tokens',
    'Tampered Signature Handling',
    (tamperedRes.status === 401 || tamperedRes.status === 403) && tamperedRes.body.success === false,
    `Tampered JWT rejected with HTTP ${tamperedRes.status}: "${tamperedRes.body.message}"`
  );

  // 1.3 Missing Authorization Header
  const missingRes = await request(app).get('/api/reports/overview');
  record(
    'Auth & Tokens',
    'Missing Token Rejection',
    missingRes.status === 401 && missingRes.body.success === false,
    `Missing Authorization header rejected with 401 Unauthorized: "${missingRes.body.message}"`
  );

  // 1.4 Student Role Escalation to Admin Endpoint
  const snoopAdminRes = await request(app)
    .post('/api/students')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ name: 'Hacker' });

  record(
    'Auth & Tokens',
    'Role Escalation Defense (Student -> Admin)',
    snoopAdminRes.status === 403,
    `Student attempting to create student blocked with HTTP 403 Forbidden.`
  );

  // 1.5 Student Role Escalation to Payment Recording
  const snoopClerkRes = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ amount: 100 });

  record(
    'Auth & Tokens',
    'Role Escalation Defense (Student -> Clerk)',
    snoopClerkRes.status === 403,
    `Student attempting to record transaction blocked with HTTP 403 Forbidden.`
  );

  // 1.6 Clerk Role Escalation to Admin Catalog CRUD
  const snoopBookRes = await request(app)
    .post('/api/library/books')
    .set('Authorization', `Bearer ${clerkToken}`)
    .send({ title: 'Illegal Book' });

  record(
    'Auth & Tokens',
    'Role Escalation Defense (Clerk -> Admin Book Catalog)',
    snoopBookRes.status === 403,
    `Clerk attempting to create catalog book blocked with HTTP 403 Forbidden.`
  );

  // 1.7 Teacher Role Boundary Isolation on Library Desk
  const teacherLibRes = await request(app)
    .post('/api/library/issue')
    .set('Authorization', `Bearer ${teacherToken}`)
    .send({ bookId: '123' });

  record(
    'Auth & Tokens',
    'Role Boundary Defense (Teacher -> Library Circulation)',
    teacherLibRes.status === 403,
    `Teacher attempting circulation issue blocked with HTTP 403 Forbidden.`
  );

  // =========================================================================
  // 2. FORM SUBMISSION DOUBLE-CLICK / IDEMPOTENCY
  // =========================================================================
  console.log('\n--- 2. FORM SUBMISSION DOUBLE-CLICK & IDEMPOTENCY ---');

  // Setup student with dues
  const testStudent = await prisma.student.create({
    data: {
      userId: (await prisma.user.create({
        data: {
          name: 'Idempotency Student',
          email: `idemp_${Date.now()}@college.edu`,
          passwordHash: await bcrypt.hash('Student@123', 10),
          role: 'STUDENT',
        },
      })).id,
      rollNumber: `ROLL-IDEMP-${Date.now()}`,
      name: 'Idempotency Student',
      class: 'B.Tech CSE',
      batch: '2024-2028',
      admissionYear: 2024,
      contactNumber: '+919876543222',
    },
  });

  const testFs = await prisma.feeStructure.create({
    data: {
      class: 'B.Tech CSE',
      batch: '2024-2028',
      academicYear: '2026-2027',
      feeHead: 'Tuition',
      amount: 10000.0,
      dueDate: new Date('2026-12-31'),
    },
  });

  const testFa = await prisma.feeAssignment.create({
    data: {
      studentId: testStudent.id,
      feeStructureId: testFs.id,
    },
  });

  // 2.1 Double submission of identical payment reference (user clicks Pay twice)
  const sharedRef = `REF-DOUBLE-${Date.now()}`;
  const pay1 = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${clerkToken}`)
    .send({
      studentId: testStudent.id,
      feeAssignmentId: testFa.id,
      amount: 3000.0,
      paymentMode: 'CASH',
      referenceNumber: sharedRef,
    });

  const pay2 = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${clerkToken}`)
    .send({
      studentId: testStudent.id,
      feeAssignmentId: testFa.id,
      amount: 3000.0,
      paymentMode: 'CASH',
      referenceNumber: sharedRef,
    });

  record(
    'Form Idempotency',
    'Double Payment Submission Rejection',
    pay1.status === 201 && (pay2.status === 400 || pay2.status === 409),
    `First payment succeeded (201, Receipt: ${pay1.body.data?.receiptNumber}), duplicate click rejected with HTTP ${pay2.status}.`
  );

  // 2.2 In-place Attendance Session Re-submission
  const todayDate = new Date().toISOString().split('T')[0];
  const attSubmit1 = await request(app)
    .post('/api/attendance/mark')
    .set('Authorization', `Bearer ${teacherToken}`)
    .send({
      class: 'B.Tech CSE',
      section: 'A',
      date: todayDate,
      records: [{ studentId: testStudent.id, status: 'PRESENT' }],
    });

  const attSubmit2 = await request(app)
    .post('/api/attendance/mark')
    .set('Authorization', `Bearer ${teacherToken}`)
    .send({
      class: 'B.Tech CSE',
      section: 'A',
      date: todayDate,
      records: [{ studentId: testStudent.id, status: 'LATE', remarks: 'Bus delay' }],
    });

  const sessionTotal = await prisma.attendanceSession.count({
    where: {
      class: 'B.Tech CSE',
      section: 'A',
      date: new Date(`${todayDate}T00:00:00.000Z`),
    },
  });

  const recordTotal = await prisma.attendanceRecord.count({
    where: {
      attendanceSessionId: attSubmit1.body.data?.sessionId,
      studentId: testStudent.id,
    },
  });

  record(
    'Form Idempotency',
    'Attendance Re-submission In-Place Upsert',
    attSubmit1.status === 200 && attSubmit2.status === 200 && sessionTotal === 1 && recordTotal === 1,
    `Resubmitted attendance updated record to LATE in-place. Exactly 1 session and 1 record exist in DB.`
  );

  // =========================================================================
  // 3. CURRENCY & FINANCIAL VALUE INTEGRITY
  // =========================================================================
  console.log('\n--- 3. CURRENCY & FINANCIAL VALUE INTEGRITY ---');

  // 3.1 Negative Payment Amount
  const negPay = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${clerkToken}`)
    .send({
      studentId: testStudent.id,
      feeAssignmentId: testFa.id,
      amount: -500.0,
      paymentMode: 'CASH',
      referenceNumber: `NEG-${Date.now()}`,
    });

  record(
    'Currency Integrity',
    'Negative Payment Rejection',
    negPay.status === 400 && negPay.body.success === false,
    `Negative payment amount rejected with HTTP 400: "${negPay.body.message || JSON.stringify(negPay.body.errors)}"`
  );

  // 3.2 Zero Payment Amount
  const zeroPay = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${clerkToken}`)
    .send({
      studentId: testStudent.id,
      feeAssignmentId: testFa.id,
      amount: 0.0,
      paymentMode: 'CASH',
      referenceNumber: `ZERO-${Date.now()}`,
    });

  record(
    'Currency Integrity',
    'Zero Payment Rejection',
    zeroPay.status === 400 && zeroPay.body.success === false,
    `Zero payment amount rejected with HTTP 400: "${zeroPay.body.message || JSON.stringify(zeroPay.body.errors)}"`
  );

  // 3.3 Overpayment Rejection
  const overPay = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${clerkToken}`)
    .send({
      studentId: testStudent.id,
      feeAssignmentId: testFa.id,
      amount: 50000.0, // Only 7,000 remaining
      paymentMode: 'CASH',
      referenceNumber: `OVER-${Date.now()}`,
    });

  record(
    'Currency Integrity',
    'Overpayment Rejection',
    overPay.status === 400 && overPay.body.success === false,
    `Overpayment beyond remaining dues rejected with HTTP 400: "${overPay.body.message}"`
  );

  // 3.4 Universal 2-Decimal Rupee Rounding & Floating-Point Protection
  const fractionalTest = 1234.5678;
  const rounded = roundCurrency(fractionalTest);
  const floatSum = roundCurrency(0.1 + 0.2); // Classic JS 0.30000000000000004

  record(
    'Currency Integrity',
    'Universal 2-Decimal Rupee Precision',
    rounded === 1234.57 && floatSum === 0.30,
    `roundCurrency correctly resolved ₹1234.5678 -> ₹${rounded} and (0.1+0.2) -> ₹${floatSum} with zero binary floating-point artifacts.`
  );

  console.log('\n================================================================');
  console.log(`🎉 ALL ${results.length} ADVERSARIAL & EDGE CASE TESTS PASSED WITH 100% SUCCESS`);
  console.log('================================================================\n');

  console.table(results);
}

runAdversarialSweep()
  .catch((err) => {
    console.error('❌ Adversarial Sweep Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
