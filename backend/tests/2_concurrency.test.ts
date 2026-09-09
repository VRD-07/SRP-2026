import { describe, it, expect, beforeAll, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { ENV } from '../src/config/env';
import { TransactionService } from '../src/services/transactionService';
import { CalculationService } from '../src/services/calculationService';
import { prisma } from '../src/config/db';

describe('2. CONCURRENCY & CRASH SAFETY', () => {
  let testClerk: any;
  let concurrentStudent: any;
  let concurrentStructure: any;
  let concurrentAssignment: any;

  beforeAll(async () => {
    const validHash = await bcrypt.hash('TestPass@123', 10);

    testClerk = await prisma.user.findFirst({ where: { role: 'CLERK' } });
    if (!testClerk) {
      testClerk = await prisma.user.create({
        data: {
          name: 'Concurrent Clerk',
          email: `conc_clerk_${Date.now()}@college.edu`,
          passwordHash: validHash,
          role: 'CLERK',
        },
      });
    }

    const concUser = await prisma.user.create({
      data: {
        name: 'Concurrent Student',
        email: `conc_student_${Date.now()}@college.edu`,
        passwordHash: validHash,
        role: 'STUDENT',
      },
    });

    concurrentStudent = await prisma.student.create({
      data: {
        userId: concUser.id,
        rollNumber: `ROLL-CONC-${Date.now()}`,
        name: 'Concurrent Student',
        class: 'B.Tech CS',
        batch: '2024-2028',
        admissionYear: 2024,
        contactNumber: '+919999999995',
      },
    });

    concurrentStructure = await prisma.feeStructure.create({
      data: {
        class: 'B.Tech CS',
        batch: '2024-2028',
        academicYear: '2024-25',
        feeHead: 'Tuition',
        amount: 5000.00, // Total fee is ₹5,000
        dueDate: new Date('2026-12-31'),
      },
    });

    concurrentAssignment = await prisma.feeAssignment.create({
      data: {
        studentId: concurrentStudent.id,
        feeStructureId: concurrentStructure.id,
      },
    });
  });

  it('2.1 should prevent race conditions and overpayment under simultaneous concurrent payment requests', async () => {
    // Total due is ₹5,000. We fire two simultaneous requests of ₹4,000 each with different reference numbers.
    // Without row locking, both would see balance ₹5,000, pass validation, and record ₹8,000 total!
    // With row locking (SELECT ... FOR UPDATE), the first locks the row, leaves balance ₹1,000, and the second fails with overpayment!
    const req1 = TransactionService.recordPayment({
      studentId: concurrentStudent.id,
      feeAssignmentId: concurrentAssignment.id,
      amount: 4000.00,
      paymentMode: 'CASH',
      referenceNumber: `CONC-REQ-1-${Date.now()}`,
      recordedByClerkId: testClerk.id,
    });

    const req2 = TransactionService.recordPayment({
      studentId: concurrentStudent.id,
      feeAssignmentId: concurrentAssignment.id,
      amount: 4000.00,
      paymentMode: 'CASH',
      referenceNumber: `CONC-REQ-2-${Date.now()}`,
      recordedByClerkId: testClerk.id,
    });

    const results = await Promise.allSettled([req1, req2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one should succeed, and one should be rejected due to overpayment
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Assert rejection reason
    const reason = (rejected[0] as PromiseRejectedResult).reason.message;
    expect(reason).toMatch(/exceeds remaining due/i);

    // Verify student's total paid is strictly ₹4,000 and NOT ₹8,000
    const summary = await CalculationService.getStudentFeeCalculation(concurrentStudent.id);
    expect(summary!.totalPaid).toBe(4000.00);
    expect(summary!.totalPending).toBe(1000.00);
  });

  it('2.2 should prevent duplicate transactions upon rapid double-click submissions (Idempotency)', async () => {
    const doubleClickRef = `DBL-CLICK-${Date.now()}`;

    // First click
    const firstCall = await TransactionService.recordPayment({
      studentId: concurrentStudent.id,
      feeAssignmentId: concurrentAssignment.id,
      amount: 500.00,
      paymentMode: 'CASH',
      referenceNumber: doubleClickRef,
      recordedByClerkId: testClerk.id,
    });

    expect(firstCall.status).toBe('SUCCESS');

    // Immediate second click with identical payload
    await expect(
      TransactionService.recordPayment({
        studentId: concurrentStudent.id,
        feeAssignmentId: concurrentAssignment.id,
        amount: 500.00,
        paymentMode: 'CASH',
        referenceNumber: doubleClickRef,
        recordedByClerkId: testClerk.id,
      })
    ).rejects.toThrow(/Duplicate payment detected/i);

    // Verify only 1 transaction was created with this reference
    const count = await prisma.transaction.count({
      where: { referenceNumber: doubleClickRef },
    });
    expect(count).toBe(1);
  });

  it('2.3 should roll back completely and leave zero orphaned records on mid-write failure inside $transaction', async () => {
    const rollbackRef = `ROLLBACK-TEST-${Date.now()}`;

    try {
      await prisma.$transaction(async (tx) => {
        // Step 1: Create a transaction
        await tx.transaction.create({
          data: {
            studentId: concurrentStudent.id,
            feeAssignmentId: concurrentAssignment.id,
            amount: 250.00,
            paymentMode: 'CASH',
            referenceNumber: rollbackRef,
            recordedByClerkId: testClerk.id,
            receiptNumber: `RCP-TEST-FAIL-${Date.now()}`,
            status: 'SUCCESS',
          },
        });

        // Step 2: Simulate crash or mid-write failure
        throw new Error('SIMULATED_DATABASE_CRASH_MID_TRANSACTION');
      });
    } catch (err: any) {
      expect(err.message).toBe('SIMULATED_DATABASE_CRASH_MID_TRANSACTION');
    }

    // Verify no half-written transaction persisted in the database
    const orphanedTx = await prisma.transaction.findFirst({
      where: { referenceNumber: rollbackRef },
    });
    expect(orphanedTx).toBeNull();
  });

  it('2.4 should generate strictly unique receipt numbers across parallel concurrent calls via atomic sequence', async () => {
    // Generate 10 receipt numbers concurrently
    const promises = Array.from({ length: 10 }).map(() =>
      prisma.$transaction(async (tx) => {
        return await TransactionService.generateReceiptNumber(tx, false);
      })
    );

    const receiptNumbers = await Promise.all(promises);

    // Verify count and uniqueness
    expect(receiptNumbers.length).toBe(10);
    const uniqueSet = new Set(receiptNumbers);
    expect(uniqueSet.size).toBe(10); // Zero collisions!

    // Verify format
    for (const r of receiptNumbers) {
      expect(r).toMatch(/^RCP-\d{6}-\d{5}$/);
    }
  });

  it('2.5 should fully roll back and return a 500-level error without hanging or partial writes on dropped DB connection (ECONNRESET) mid-transaction', async () => {
    const droppedConnRef = `ECONNRESET-TEST-${Date.now()}`;
    const clerkToken = jwt.sign(
      { userId: testClerk.id, email: testClerk.email, role: 'CLERK', name: testClerk.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Record initial paid amount for baseline comparison
    const summaryBefore = await CalculationService.getStudentFeeCalculation(concurrentStudent.id);
    const initialPaid = summaryBefore!.totalPaid;

    // Spy on prisma.$transaction to simulate an actual socket termination / ECONNRESET mid-write
    const originalTransaction = prisma.$transaction.bind(prisma);
    const transactionSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any, options?: any) => {
      return await originalTransaction(async (tx) => {
        // Intercept tx.transaction.create to simulate dropped connection (ECONNRESET)
        tx.transaction.create = (async () => {
          const econnError: any = new Error('read ECONNRESET: Connection to PostgreSQL server terminated unexpectedly');
          econnError.code = 'ECONNRESET';
          econnError.syscall = 'read';
          throw econnError;
        }) as any;

        return await callback(tx);
      }, options);
    });

    const startTime = Date.now();
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({
        studentId: concurrentStudent.id,
        feeAssignmentId: concurrentAssignment.id,
        amount: 200.00,
        paymentMode: 'CASH',
        referenceNumber: droppedConnRef,
      });
    const durationMs = Date.now() - startTime;

    transactionSpy.mockRestore();

    // 1. Assert client receives a clear 500-level HTTP error (never 200 or 400)
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/ECONNRESET|terminated unexpectedly/i);

    // 2. Assert the request terminated promptly and did NOT hang (completed in under 5 seconds)
    expect(durationMs).toBeLessThan(5000);

    // 3. Confirm zero partial or orphaned records were persisted in the database
    const orphanedTx = await prisma.transaction.findFirst({
      where: { referenceNumber: droppedConnRef },
    });
    expect(orphanedTx).toBeNull();

    // 4. Confirm student dues remained exactly at the pre-transaction baseline (zero partial writes)
    const summaryAfter = await CalculationService.getStudentFeeCalculation(concurrentStudent.id);
    expect(summaryAfter!.totalPaid).toBe(initialPaid);
  });
});
