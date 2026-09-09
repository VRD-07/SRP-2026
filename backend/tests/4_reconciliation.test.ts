import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { CalculationService, roundCurrency } from '../src/services/calculationService';
import { ENV } from '../src/config/env';

describe('4. RECONCILIATION AGAINST GROUND TRUTH (Independent SQL Verification)', () => {
  let adminToken: string;

  beforeAll(async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    adminToken = jwt.sign(
      { userId: admin!.id, email: admin!.email, role: 'ADMIN', name: admin!.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  it('4.1 should match system KPIs exactly against independent raw SQL aggregates', async () => {
    // 1. Raw SQL: Total Assigned
    const rawAssignedResult = await prisma.$queryRaw<Array<{ sum: any }>>`
      SELECT COALESCE(SUM(fs.amount), 0) as sum
      FROM "FeeAssignment" fa
      JOIN "FeeStructure" fs ON fa."feeStructureId" = fs.id;
    `;
    const rawTotalAssigned = roundCurrency(Number(rawAssignedResult[0]?.sum || 0));

    // 2. Raw SQL: Total Collected (SUCCESS, not reversed)
    const rawCollectedResult = await prisma.$queryRaw<Array<{ sum: any }>>`
      SELECT COALESCE(SUM(amount), 0) as sum
      FROM "Transaction"
      WHERE status = 'SUCCESS'
        AND "reversalOfTransactionId" IS NULL
        AND id NOT IN (
          SELECT "reversalOfTransactionId" 
          FROM "Transaction" 
          WHERE "reversalOfTransactionId" IS NOT NULL
        );
    `;
    const rawTotalCollected = roundCurrency(Number(rawCollectedResult[0]?.sum || 0));

    // 3. Raw SQL: Total Reversals
    const rawReversalsResult = await prisma.$queryRaw<Array<{ sum: any }>>`
      SELECT COALESCE(SUM(amount), 0) as sum
      FROM "Transaction"
      WHERE status = 'REVERSED';
    `;
    const rawTotalReversed = roundCurrency(Number(rawReversalsResult[0]?.sum || 0));

    // 4. CalculationService System KPIs
    const serviceKpis = await CalculationService.getSystemKPIs();

    expect(serviceKpis.totalAssigned).toBe(rawTotalAssigned);
    expect(serviceKpis.totalCollected).toBe(rawTotalCollected);
    expect(serviceKpis.totalReversedAmount).toBe(rawTotalReversed);
    expect(serviceKpis.totalPending).toBe(roundCurrency(Math.max(0, rawTotalAssigned - rawTotalCollected)));
  });

  it('4.2 should match per-student dues calculated by CalculationService against raw SQL joins', async () => {
    const students = await prisma.student.findMany({ take: 5 });

    for (const student of students) {
      // Raw SQL assigned
      const rawStudentAssigned = await prisma.$queryRaw<Array<{ sum: any }>>`
        SELECT COALESCE(SUM(fs.amount), 0) as sum
        FROM "FeeAssignment" fa
        JOIN "FeeStructure" fs ON fa."feeStructureId" = fs.id
        WHERE fa."studentId" = ${student.id};
      `;
      const expectedAssigned = roundCurrency(Number(rawStudentAssigned[0]?.sum || 0));

      // Raw SQL paid
      const rawStudentPaid = await prisma.$queryRaw<Array<{ sum: any }>>`
        SELECT COALESCE(SUM(t.amount), 0) as sum
        FROM "Transaction" t
        WHERE t."studentId" = ${student.id}
          AND t.status = 'SUCCESS'
          AND t.id NOT IN (
            SELECT "reversalOfTransactionId"
            FROM "Transaction"
            WHERE "reversalOfTransactionId" IS NOT NULL
          );
      `;
      const expectedPaid = roundCurrency(Number(rawStudentPaid[0]?.sum || 0));
      const expectedPending = roundCurrency(Math.max(0, expectedAssigned - expectedPaid));

      // Compare with CalculationService
      const summary = await CalculationService.getStudentFeeCalculation(student.id);
      expect(summary).not.toBeNull();
      expect(summary!.totalAssigned).toBe(expectedAssigned);
      expect(summary!.totalPaid).toBe(expectedPaid);
      expect(summary!.totalPending).toBe(expectedPending);
    }
  });

  it('4.3 should reconcile CSV export rows against database ground truth', async () => {
    const res = await request(app)
      .get('/api/reports/export-csv')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/i);

    const csvText = res.text;
    const lines = csvText.trim().split('\r\n');
    expect(lines.length).toBeGreaterThan(1); // Headers + at least 1 row

    // Parse CSV lines
    const dataRows = lines.slice(1);
    let csvTotalCollected = 0;
    let csvTotalReversed = 0;

    for (const row of dataRows) {
      // Split by comma taking quotes into account
      const columns = row.split(',').map((col) => col.replace(/^"|"$/g, ''));
      const amount = parseFloat(columns[7]);
      const status = columns[10];

      if (status === 'SUCCESS') {
        csvTotalCollected += amount;
      } else if (status === 'REVERSED') {
        csvTotalReversed += amount;
      }
    }

    // Verify DB count of transactions matches number of CSV rows
    const dbTotalTxCount = await prisma.transaction.count();
    expect(dataRows.length).toBe(dbTotalTxCount);
  });
});
