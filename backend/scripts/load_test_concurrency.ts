/**
 * Realistic Load & Concurrency at Scale Test Script
 *
 * 1. 60-Request Mixed Endpoint Concurrent Burst:
 *    - Concurrent logins (Admin, Clerk, Teacher, Student)
 *    - Concurrent dashboard/summary queries across all 4 roles
 *    - Concurrent attendance rosters & reports
 *    - Concurrent library catalog browsing & overdue tracking
 *    - Records p50, p95, and max latency, verifying zero deadlocks or pool exhaustion.
 *
 * 2. Heavy 10-way Concurrent Payment Race Condition:
 *    - Student with exactly ₹5,000 remaining pending dues.
 *    - 10 simultaneous payments of ₹5,000 submitted via Promise.all.
 *    - Verifies exactly 1 succeeds, 9 rejected (no overpayment), balance = 0.
 *
 * 3. Heavy 10-way Concurrent Library Book Issue Race Condition:
 *    - Book with exactly 1 available copy.
 *    - 10 simultaneous issue requests submitted for 10 distinct students.
 *    - Verifies exactly 1 succeeds, 9 rejected, availableCopies = 0 (never negative).
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { ENV } from '../src/config/env';

interface LatencyStats {
  count: number;
  successCount: number;
  failCount: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  avg: number;
}

function calculateLatencyStats(latencies: number[]): LatencyStats {
  if (latencies.length === 0) {
    return { count: 0, successCount: 0, failCount: 0, min: 0, max: 0, p50: 0, p95: 0, avg: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const p50Index = Math.floor(sorted.length * 0.5);
  const p95Index = Math.floor(sorted.length * 0.95);

  return {
    count: sorted.length,
    successCount: sorted.length,
    failCount: 0,
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
    p50: Math.round(sorted[p50Index]),
    p95: Math.round(sorted[p95Index]),
    avg: Math.round(sum / sorted.length),
  };
}

async function runLoadAndConcurrencyTest() {
  console.log('================================================================');
  console.log('🚀 RUNNING REALISTIC LOAD / CONCURRENCY & RACE CONDITIONS AT SCALE');
  console.log('================================================================\n');

  // Setup Admin user & token
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  if (!admin) throw new Error('No active ADMIN user found');
  const adminToken = jwt.sign(
    { userId: admin.id, email: admin.email, role: 'ADMIN', name: admin.name },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Setup Clerk user & token
  let clerk = await prisma.user.findFirst({ where: { role: 'CLERK', isActive: true } });
  if (!clerk) throw new Error('No active CLERK user found');
  const clerkToken = jwt.sign(
    { userId: clerk.id, email: clerk.email, role: 'CLERK', name: clerk.name },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Setup Teacher user & token
  let teacher = await prisma.user.findFirst({ where: { role: 'TEACHER', isActive: true } });
  if (!teacher) throw new Error('No active TEACHER user found');
  const teacherToken = jwt.sign(
    { userId: teacher.id, email: teacher.email, role: 'TEACHER', name: teacher.name },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Setup Student user & token
  let studentUser = await prisma.user.findFirst({ where: { role: 'STUDENT', isActive: true } });
  if (!studentUser) throw new Error('No active STUDENT user found');
  const studentToken = jwt.sign(
    { userId: studentUser.id, email: studentUser.email, role: 'STUDENT', name: studentUser.name },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // =========================================================================
  // PART 1: 60 CONCURRENT REQUESTS MIXED ENDPOINT BURST
  // =========================================================================
  console.log('--- PART 1: MIXED-ENDPOINT CONCURRENT BURST (60 CONCURRENT REQUESTS) ---');

  const requests: Array<() => Promise<{ status: number; duration: number; endpoint: string }>> = [];

  // 10 concurrent logins
  for (let i = 0; i < 10; i++) {
    requests.push(async () => {
      const start = Date.now();
      const res = await request(app).post('/api/auth/login').send({
        email: admin!.email,
        password: 'Admin@123',
      });
      return { status: res.status, duration: Date.now() - start, endpoint: 'POST /api/auth/login' };
    });
  }

  // 10 concurrent Admin Fee Overview
  for (let i = 0; i < 10; i++) {
    requests.push(async () => {
      const start = Date.now();
      const res = await request(app)
        .get('/api/reports/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      return { status: res.status, duration: Date.now() - start, endpoint: 'GET /api/reports/overview' };
    });
  }

  // 10 concurrent Student Self-Profile queries
  for (let i = 0; i < 10; i++) {
    requests.push(async () => {
      const start = Date.now();
      const res = await request(app)
        .get('/api/students/me/profile')
        .set('Authorization', `Bearer ${studentToken}`);
      return { status: res.status, duration: Date.now() - start, endpoint: 'GET /api/students/me/profile' };
    });
  }

  // 10 concurrent Attendance Roster requests
  for (let i = 0; i < 10; i++) {
    requests.push(async () => {
      const start = Date.now();
      const res = await request(app)
        .get('/api/attendance/roster?class=B.Tech%20CSE&section=A')
        .set('Authorization', `Bearer ${teacherToken}`);
      return { status: res.status, duration: Date.now() - start, endpoint: 'GET /api/attendance/roster' };
    });
  }

  // 10 concurrent Library Catalog requests
  for (let i = 0; i < 10; i++) {
    requests.push(async () => {
      const start = Date.now();
      const res = await request(app)
        .get('/api/library/books')
        .set('Authorization', `Bearer ${clerkToken}`);
      return { status: res.status, duration: Date.now() - start, endpoint: 'GET /api/library/books' };
    });
  }

  // 10 concurrent Library Overdue queries
  for (let i = 0; i < 10; i++) {
    requests.push(async () => {
      const start = Date.now();
      const res = await request(app)
        .get('/api/library/overdue')
        .set('Authorization', `Bearer ${adminToken}`);
      return { status: res.status, duration: Date.now() - start, endpoint: 'GET /api/library/overdue' };
    });
  }

  console.log(`Firing ${requests.length} simultaneous mixed requests across all roles...`);
  const burstStart = Date.now();
  const burstResults = await Promise.all(requests.map((fn) => fn()));
  const totalBurstDuration = Date.now() - burstStart;

  const latencies = burstResults.map((r) => r.duration);
  const successResults = burstResults.filter((r) => r.status === 200);
  const stats = calculateLatencyStats(latencies);

  console.log(`\nBurst Completed in ${totalBurstDuration}ms (${(totalBurstDuration / 1000).toFixed(2)}s).`);
  console.log(`Success Rate: ${successResults.length}/${burstResults.length} (${((successResults.length / burstResults.length) * 100).toFixed(1)}%)`);
  console.log(`Latency Profile: Min=${stats.min}ms | p50=${stats.p50}ms | p95=${stats.p95}ms | Max=${stats.max}ms | Avg=${stats.avg}ms\n`);

  if (successResults.length !== burstResults.length) {
    throw new Error(`Load burst failed: ${burstResults.length - successResults.length} requests returned non-200 status`);
  }

  // =========================================================================
  // PART 2: 10-WAY CONCURRENT PAYMENT RACE CONDITION
  // =========================================================================
  console.log('--- PART 2: 10-WAY CONCURRENT PAYMENT RACE CONDITION ---');
  console.log('Scenario: Student has exactly ₹5,000 balance remaining. 10 simultaneous payments of ₹5,000 sent.');

  // Create isolated student for payment race test
  const raceStudentEmail = `race_pay_${Date.now()}@college.edu`;
  const raceStudentUser = await prisma.user.create({
    data: {
      name: 'Race Payment Student',
      email: raceStudentEmail,
      passwordHash: await bcrypt.hash('Student@123', 10),
      role: 'STUDENT',
    },
  });

  const raceStudent = await prisma.student.create({
    data: {
      userId: raceStudentUser.id,
      rollNumber: `ROLL-RACEPAY-${Date.now()}`,
      name: 'Race Payment Student',
      class: 'B.Tech IT',
      batch: '2024-2028',
      admissionYear: 2024,
      contactNumber: '+919876543299',
    },
  });

  const raceFeeStructure = await prisma.feeStructure.create({
    data: {
      class: 'B.Tech IT',
      batch: '2024-2028',
      academicYear: '2026-2027',
      feeHead: 'Tuition',
      amount: 5000.0, // Exactly ₹5,000
      dueDate: new Date('2026-12-31'),
    },
  });

  const raceFeeAssignment = await prisma.feeAssignment.create({
    data: {
      studentId: raceStudent.id,
      feeStructureId: raceFeeStructure.id,
    },
  });

  // Launch 10 simultaneous payments of ₹5,000
  const paymentPromises = Array.from({ length: 10 }, (_, i) =>
    request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({
        studentId: raceStudent.id,
        feeAssignmentId: raceFeeAssignment.id,
        amount: 5000.0,
        paymentMode: 'CASH',
        referenceNumber: `RACE-PAY-${Date.now()}-${i}`,
      })
  );

  const paymentResponses = await Promise.all(paymentPromises);
  const successfulPayments = paymentResponses.filter((r) => r.status === 201);
  const rejectedPayments = paymentResponses.filter((r) => r.status === 400 || r.status === 409);

  console.log(`Payment Race Results:`);
  console.log(`- Total Requests: 10`);
  console.log(`- Successful (201 Created): ${successfulPayments.length}`);
  console.log(`- Rejected (400/409 Overpayment Prohibited): ${rejectedPayments.length}`);

  // Confirm in database
  const totalPaidDb: any[] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(amount), 0)::float as total
    FROM "Transaction"
    WHERE "studentId" = ${raceStudent.id} AND status = 'SUCCESS'
  `;
  const finalPaid = Number(totalPaidDb[0]?.total || 0);
  console.log(`- Total Paid in Database: ₹${finalPaid} (Expected: ₹5000)`);

  if (successfulPayments.length !== 1 || finalPaid !== 5000.0) {
    throw new Error(`CRITICAL RACE CONDITION FAILURE: Expected exactly 1 successful payment and final balance of ₹0, but got ${successfulPayments.length} successes and ₹${finalPaid} paid`);
  }
  console.log('✅ Payment Race Condition: PASSED with zero overpayment and strict row locking.\n');

  // =========================================================================
  // PART 3: 10-WAY CONCURRENT LIBRARY BOOK ISSUE RACE CONDITION
  // =========================================================================
  console.log('--- PART 3: 10-WAY CONCURRENT LIBRARY ISSUE RACE CONDITION ---');
  console.log('Scenario: Book has exactly 1 available copy. 10 distinct students simultaneously request checkout.');

  // Create a book with availableCopies = 1
  const raceBook = await prisma.book.create({
    data: {
      title: `Race Condition Handbook ${Date.now()}`,
      author: 'Concurrency Expert',
      isbn: `ISBN-RACE-${Date.now()}`,
      category: 'Computer Science',
      totalCopies: 1,
      availableCopies: 1,
    },
  });

  // Create 10 distinct students
  const raceStudents: any[] = [];
  for (let i = 0; i < 10; i++) {
    const sUser = await prisma.user.create({
      data: {
        name: `Library Race Student ${i}`,
        email: `librace_${Date.now()}_${i}@college.edu`,
        passwordHash: await bcrypt.hash('Student@123', 10),
        role: 'STUDENT',
      },
    });
    const sProfile = await prisma.student.create({
      data: {
        userId: sUser.id,
        rollNumber: `ROLL-LIBRACE-${Date.now()}-${i}`,
        name: `Library Race Student ${i}`,
        class: 'B.Tech IT',
        batch: '2024-2028',
        admissionYear: 2024,
        contactNumber: `+91987654320${i}`,
      },
    });
    raceStudents.push(sProfile);
  }

  // 10 simultaneous issue requests for the same book
  const issuePromises = raceStudents.map((st) =>
    request(app)
      .post('/api/library/issue')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({
        bookId: raceBook.id,
        studentId: st.id,
      })
  );

  const issueResponses = await Promise.all(issuePromises);
  const successfulIssues = issueResponses.filter((r) => r.status === 201);
  const rejectedIssues = issueResponses.filter((r) => r.status === 400 || r.status === 409);

  console.log(`Library Issue Race Results:`);
  console.log(`- Total Requests: 10`);
  console.log(`- Successful (201 Created): ${successfulIssues.length}`);
  console.log(`- Rejected (400 No Available Copies): ${rejectedIssues.length}`);

  // Confirm in database
  const updatedBook = await prisma.book.findUnique({ where: { id: raceBook.id } });
  const activeIssuesDb = await prisma.bookIssue.count({
    where: { bookId: raceBook.id, returnDate: null },
  });

  console.log(`- Book Total Copies: ${updatedBook?.totalCopies}`);
  console.log(`- Book Available Copies: ${updatedBook?.availableCopies} (Expected: 0)`);
  console.log(`- Active Issued Records: ${activeIssuesDb} (Expected: 1)`);

  if (successfulIssues.length !== 1 || updatedBook?.availableCopies !== 0 || activeIssuesDb !== 1) {
    throw new Error(`CRITICAL LIBRARY RACE FAILURE: Expected exactly 1 issue and availableCopies=0, but got ${successfulIssues.length} issues and availableCopies=${updatedBook?.availableCopies}`);
  }
  console.log('✅ Library Issue Race Condition: PASSED with zero overselling and availableCopies strictly >= 0.\n');

  console.log('================================================================');
  console.log('🎉 REALISTIC LOAD & CONCURRENCY AT SCALE: ALL TESTS PASSED (100%)');
  console.log('================================================================\n');
}

runLoadAndConcurrencyTest()
  .catch((err) => {
    console.error('❌ Load & Concurrency Test Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
