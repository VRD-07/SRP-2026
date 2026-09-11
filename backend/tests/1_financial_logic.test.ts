import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { CalculationService, roundCurrency } from '../src/services/calculationService';
import { TransactionService } from '../src/services/transactionService';
import { prisma } from '../src/config/db';

describe('1. FINANCIAL LOGIC & EDGE CASES', () => {
  let testStudent: any;
  let feeStructure: any;
  let feeAssignment: any;
  let testClerk: any;

  beforeAll(async () => {
    const validHash = await bcrypt.hash('TestPass@123', 10);

    // 1. Fetch or create a test clerk
    testClerk = await prisma.user.findFirst({
      where: { role: 'CLERK' },
    });
    if (!testClerk) {
      testClerk = await prisma.user.create({
        data: {
          name: 'Test Clerk Fin',
          email: `testclerk_${Date.now()}@college.edu`,
          passwordHash: validHash,
          role: 'CLERK',
        },
      });
    }

    // 2. Create isolated test student
    const testUser = await prisma.user.create({
      data: {
        name: 'Financial Test Student',
        email: `finstudent_${Date.now()}@college.edu`,
        passwordHash: validHash,
        role: 'STUDENT',
      },
    });

    testStudent = await prisma.student.create({
      data: {
        userId: testUser.id,
        rollNumber: `ROLL-FIN-${Date.now()}`,
        name: 'Financial Test Student',
        class: 'B.Tech CS',
        batch: '2024-2028',
        admissionYear: 2024,
        contactNumber: '+919999999991',
      },
    });

    // 3. Create a unique fee structure of ₹10,000.50
    feeStructure = await prisma.feeStructure.create({
      data: {
        class: 'B.Tech CS',
        batch: '2024-2028',
        academicYear: '2024-25',
        feeHead: 'Tuition',
        amount: 10000.50,
        dueDate: new Date('2026-12-31'),
      },
    });

    // 4. Assign fee structure to student
    feeAssignment = await prisma.feeAssignment.create({
      data: {
        studentId: testStudent.id,
        feeStructureId: feeStructure.id,
      },
    });
  });

  it('1.1 should correctly round decimal amounts and prevent precision drift', () => {
    // Test floating point drift e.g. 0.1 + 0.2
    const sum = 0.1 + 0.2;
    expect(sum).not.toBe(0.3); // IEEE 754 drift: 0.30000000000000004
    expect(roundCurrency(sum)).toBe(0.3);

    // Decimal amounts
    const base = 10000.50;
    const payment = 3333.33;
    const balance = roundCurrency(base - payment);
    expect(balance).toBe(6667.17);
  });

  it('1.2 should strictly reject zero and negative payment amounts', async () => {
    // Zero amount
    await expect(
      TransactionService.recordPayment({
        studentId: testStudent.id,
        feeAssignmentId: feeAssignment.id,
        amount: 0,
        paymentMode: 'CASH',
        referenceNumber: 'REF-ZERO-01',
        recordedByClerkId: testClerk.id,
      })
    ).rejects.toThrow(/greater than zero/i);

    // Negative amount
    await expect(
      TransactionService.recordPayment({
        studentId: testStudent.id,
        feeAssignmentId: feeAssignment.id,
        amount: -500,
        paymentMode: 'CASH',
        referenceNumber: 'REF-NEG-01',
        recordedByClerkId: testClerk.id,
      })
    ).rejects.toThrow(/greater than zero/i);
  });

  it('1.3 should record an underpayment and update pending dues accurately with 2-decimal precision', async () => {
    const paymentAmount = 4000.50;
    const tx = await TransactionService.recordPayment({
      studentId: testStudent.id,
      feeAssignmentId: feeAssignment.id,
      amount: paymentAmount,
      paymentMode: 'CASH',
      referenceNumber: `REF-UNDER-${Date.now()}`,
      recordedByClerkId: testClerk.id,
    });

    expect(tx).toBeDefined();
    expect(tx.status).toBe('SUCCESS');
    expect(tx.amount).toBe(paymentAmount);

    const summary = await CalculationService.getStudentFeeCalculation(testStudent.id);
    expect(summary).not.toBeNull();
    expect(summary!.totalAssigned).toBe(10000.50);
    expect(summary!.totalPaid).toBe(4000.50);
    expect(summary!.totalPending).toBe(6000.00);
    expect(summary!.heads[0].status).toBe('PARTIAL');
  });

  it('1.4 should strictly reject overpayment unless allowOverpaymentOverride flag is set', async () => {
    // Attempt to pay ₹15,000.00 (which strictly exceeds the ₹10,000.50 total fee) without override
    await expect(
      TransactionService.recordPayment({
        studentId: testStudent.id,
        feeAssignmentId: feeAssignment.id,
        amount: 15000.00,
        paymentMode: 'CASH',
        referenceNumber: `REF-OVER-${Date.now()}`,
        recordedByClerkId: testClerk.id,
        allowOverpaymentOverride: false,
      })
    ).rejects.toThrow(/exceeds remaining due/i);

    // Now attempt with allowOverpaymentOverride = true
    const overrideTx = await TransactionService.recordPayment({
      studentId: testStudent.id,
      feeAssignmentId: feeAssignment.id,
      amount: 12000.00,
      paymentMode: 'CASH',
      referenceNumber: `REF-OVERRIDE-${Date.now()}`,
      recordedByClerkId: testClerk.id,
      allowOverpaymentOverride: true,
    });

    expect(overrideTx).toBeDefined();
    expect(overrideTx.status).toBe('SUCCESS');
  });

  it('1.5 should prevent duplicate fee structure assignment from double-counting dues', async () => {
    // Attempt to assign the exact same feeStructureId to testStudent
    try {
      await prisma.feeAssignment.create({
        data: {
          studentId: testStudent.id,
          feeStructureId: feeStructure.id,
        },
      });
    } catch (err: any) {
      // Prisma unique constraint violation (P2002) is expected and enforced
      expect(err.code).toBe('P2002');
    }

    // Verify student fee assignments still count 1 for this structure
    const assignments = await prisma.feeAssignment.findMany({
      where: {
        studentId: testStudent.id,
        feeStructureId: feeStructure.id,
      },
    });
    expect(assignments.length).toBe(1);
  });

  it('1.6 should reverse a transaction: restore due amount, exclude from total collected, and keep audit history', async () => {
    const validHash = await bcrypt.hash('TestPass@123', 10);
    const revUser = await prisma.user.create({
      data: {
        name: 'Reversal Student',
        email: `revstudent_${Date.now()}@college.edu`,
        passwordHash: validHash,
        role: 'STUDENT',
      },
    });
    const revStudent = await prisma.student.create({
      data: {
        userId: revUser.id,
        rollNumber: `ROLL-REV-${Date.now()}`,
        name: 'Reversal Student',
        class: 'B.Tech CS',
        batch: '2024-2028',
        admissionYear: 2024,
        contactNumber: '+919999999992',
      },
    });
    const revAssignment = await prisma.feeAssignment.create({
      data: {
        studentId: revStudent.id,
        feeStructureId: feeStructure.id,
      },
    });

    // Make payment of 5000.00
    const paymentTx = await TransactionService.recordPayment({
      studentId: revStudent.id,
      feeAssignmentId: revAssignment.id,
      amount: 5000.00,
      paymentMode: 'CHEQUE',
      referenceNumber: `CHQ-${Date.now()}`,
      recordedByClerkId: testClerk.id,
    });

    let summaryBefore = await CalculationService.getStudentFeeCalculation(revStudent.id);
    expect(summaryBefore!.totalPaid).toBe(5000.00);
    expect(summaryBefore!.totalPending).toBe(5000.50);

    // Reverse the payment
    const reversalVoucher = await TransactionService.reverseTransaction({
      transactionId: paymentTx.id,
      reversalReason: 'Cheque bounced by clearing house',
      recordedByClerkId: testClerk.id,
    });

    expect(reversalVoucher.status).toBe('REVERSED');
    expect(reversalVoucher.reversalOfTransactionId).toBe(paymentTx.id);
    expect(reversalVoucher.receiptNumber).toMatch(/^REV-\d{6}-\d{5}$/);

    // Verify student dues have been restored
    let summaryAfter = await CalculationService.getStudentFeeCalculation(revStudent.id);
    expect(summaryAfter!.totalPaid).toBe(0);
    expect(summaryAfter!.totalPending).toBe(10000.50);
    expect(summaryAfter!.totalReversals).toBe(5000.00);

    // Verify cannot reverse an already reversed transaction
    await expect(
      TransactionService.reverseTransaction({
        transactionId: paymentTx.id,
        reversalReason: 'Second reversal attempt',
        recordedByClerkId: testClerk.id,
      })
    ).rejects.toThrow(/already reversed/i);
  });

  it('1.7 should handle a student with zero fee structures gracefully', async () => {
    const validHash = await bcrypt.hash('TestPass@123', 10);
    const zeroUser = await prisma.user.create({
      data: {
        name: 'Zero Assignment Student',
        email: `zero_${Date.now()}@college.edu`,
        passwordHash: validHash,
        role: 'STUDENT',
      },
    });
    const zeroStudent = await prisma.student.create({
      data: {
        userId: zeroUser.id,
        rollNumber: `ROLL-ZERO-${Date.now()}`,
        name: 'Zero Assignment Student',
        class: 'MBA',
        batch: '2024-2026',
        admissionYear: 2024,
        contactNumber: '+919999999993',
      },
    });

    const summary = await CalculationService.getStudentFeeCalculation(zeroStudent.id);
    expect(summary).not.toBeNull();
    expect(summary!.totalAssigned).toBe(0);
    expect(summary!.totalPaid).toBe(0);
    expect(summary!.totalPending).toBe(0);
    expect(summary!.totalReversals).toBe(0);
    expect(summary!.heads).toEqual([]);
    expect(summary!.hasOverdue).toBe(false);
  });

  it('1.8 should handle a student with 50+ micropayment transactions correctly and performantly', async () => {
    const validHash = await bcrypt.hash('TestPass@123', 10);
    const scaleUser = await prisma.user.create({
      data: {
        name: 'Scale Student',
        email: `scale_${Date.now()}@college.edu`,
        passwordHash: validHash,
        role: 'STUDENT',
      },
    });
    const scaleStudent = await prisma.student.create({
      data: {
        userId: scaleUser.id,
        rollNumber: `ROLL-SCALE-${Date.now()}`,
        name: 'Scale Student',
        class: 'B.Tech CS',
        batch: '2024-2028',
        admissionYear: 2024,
        contactNumber: '+919999999994',
      },
    });
    const scaleStructure = await prisma.feeStructure.create({
      data: {
        class: 'B.Tech CS',
        batch: '2024-2028',
        academicYear: '2024-25',
        feeHead: 'Exam',
        amount: 5000.00,
        dueDate: new Date('2026-12-31'),
      },
    });
    const scaleAssignment = await prisma.feeAssignment.create({
      data: {
        studentId: scaleStudent.id,
        feeStructureId: scaleStructure.id,
      },
    });

    // Create 50 micropayments of ₹100.00 directly via createMany for performance
    const records = [];
    for (let i = 1; i <= 50; i++) {
      records.push({
        studentId: scaleStudent.id,
        feeAssignmentId: scaleAssignment.id,
        amount: 100.00,
        paymentMode: 'CASH' as const,
        referenceNumber: `MICRO-${i}-${Date.now()}`,
        recordedByClerkId: testClerk.id,
        receiptNumber: `RCP-SCALE-${Date.now()}-${String(i).padStart(3, '0')}`,
        status: 'SUCCESS' as const,
      });
    }

    await prisma.transaction.createMany({ data: records });

    const startTime = Date.now();
    const summary = await CalculationService.getStudentFeeCalculation(scaleStudent.id);
    const durationMs = Date.now() - startTime;

    expect(summary).not.toBeNull();
    expect(summary!.totalAssigned).toBe(5000.00);
    expect(summary!.totalPaid).toBe(5000.00);
    expect(summary!.totalPending).toBe(0);
    expect(summary!.heads[0].status).toBe('PAID');
    expect(durationMs).toBeLessThan(15000); // Efficient execution over cloud DB WAN
  });
});
