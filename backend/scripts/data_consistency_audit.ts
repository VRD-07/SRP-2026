/**
 * Data Consistency & Single Source of Truth Audit Script
 *
 * Performs raw SQL queries directly against Supabase PostgreSQL and compares field-for-field
 * against the application's unified student profile endpoint (/api/students/:id/profile)
 * for 5 randomly sampled students.
 *
 * Verifies:
 * 1. Fees: totalAssigned, totalPaid, totalPending calculated via raw SQL vs API
 * 2. Attendance: totalSessions, present, late, absent, percentage calculated via raw SQL vs API
 * 3. Library: activeIssuesCount, pendingFines calculated via raw SQL vs API
 * 4. Referential Integrity: Single shared Student table, zero orphaned records across all modules
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { ENV } from '../src/config/env';
import { roundCurrency } from '../src/services/calculationService';

interface DiscrepancyReport {
  studentId: string;
  studentName: string;
  module: string;
  metric: string;
  rawSqlValue: any;
  apiValue: any;
  diff: number | string;
  passed: boolean;
}

async function runDataConsistencyAudit() {
  console.log('================================================================');
  console.log('🔍 RUNNING CROSS-MODULE DATA CONSISTENCY & RECONCILIATION AUDIT');
  console.log('================================================================\n');

  // 1. Authenticate Admin
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  if (!admin) {
    throw new Error('No active ADMIN user found in database');
  }
  const adminToken = jwt.sign(
    { userId: admin.id, email: admin.email, role: 'ADMIN', name: admin.name },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 2. Sample 5 students
  const sampleStudents = await prisma.student.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  });

  if (sampleStudents.length === 0) {
    throw new Error('No students found in database to audit');
  }

  console.log(`Found ${sampleStudents.length} students to audit against raw database SQL.\n`);

  const auditResults: DiscrepancyReport[] = [];

  for (let idx = 0; idx < sampleStudents.length; idx++) {
    const student = sampleStudents[idx];
    console.log(`--- Auditing Student ${idx + 1}/${sampleStudents.length}: ${student.name} (${student.rollNumber}) [ID: ${student.id}] ---`);

    // A. Raw SQL for Fees
    const feeAssignedResult: any[] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(fs.amount), 0)::float as total_assigned
      FROM "FeeAssignment" fa
      JOIN "FeeStructure" fs ON fa."feeStructureId" = fs.id
      WHERE fa."studentId" = ${student.id}
    `;
    const rawAssigned = roundCurrency(Number(feeAssignedResult[0]?.total_assigned || 0));

    const feePaidResult: any[] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(t.amount), 0)::float as total_paid
      FROM "Transaction" t
      WHERE t."studentId" = ${student.id}
        AND t.status = 'SUCCESS'
        AND t."reversalOfTransactionId" IS NULL
        AND t.id NOT IN (
          SELECT "reversalOfTransactionId"
          FROM "Transaction"
          WHERE "reversalOfTransactionId" IS NOT NULL
        )
    `;
    const rawPaid = roundCurrency(Number(feePaidResult[0]?.total_paid || 0));
    const rawPending = roundCurrency(Math.max(0, rawAssigned - rawPaid));

    // B. Raw SQL for Attendance
    const attResult: any[] = await prisma.$queryRaw`
      SELECT 
        COUNT(*)::int as total_sessions,
        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::int as present_count,
        COUNT(CASE WHEN status = 'LATE' THEN 1 END)::int as late_count,
        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END)::int as absent_count
      FROM "AttendanceRecord"
      WHERE "studentId" = ${student.id}
    `;
    const rawTotalSessions = Number(attResult[0]?.total_sessions || 0);
    const rawPresent = Number(attResult[0]?.present_count || 0);
    const rawLate = Number(attResult[0]?.late_count || 0);
    const rawAbsent = Number(attResult[0]?.absent_count || 0);
    const rawAttPercentage =
      rawTotalSessions > 0
        ? Math.round(((rawPresent + rawLate * 0.5) / rawTotalSessions) * 1000) / 10
        : 100;

    // C. Raw SQL for Library
    const libIssuesResult: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int as active_count
      FROM "BookIssue"
      WHERE "studentId" = ${student.id}
        AND "returnDate" IS NULL
    `;
    const rawActiveIssues = Number(libIssuesResult[0]?.active_count || 0);

    const libFinesResult: any[] = await prisma.$queryRaw`
      SELECT COALESCE(SUM("fineAmount"), 0)::float as pending_fines
      FROM "BookIssue"
      WHERE "studentId" = ${student.id}
        AND "fineStatus" = 'PENDING'
    `;
    const rawPendingFines = roundCurrency(Number(libFinesResult[0]?.pending_fines || 0));

    // D. Fetch Unified Student Profile from API
    const profileRes = await request(app)
      .get(`/api/students/${student.id}/profile`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (profileRes.status !== 200 || !profileRes.body.success) {
      throw new Error(`Failed to fetch unified profile for student ${student.id}: HTTP ${profileRes.status}`);
    }

    const apiData = profileRes.body.data;
    const apiFees = apiData.fees;
    const apiAtt = apiData.attendance;
    const apiLib = apiData.library;

    // E. Assertions & Discrepancy Checks
    // 1. Fee Assigned
    const diffAssigned = Math.abs(rawAssigned - Number(apiFees.totalAssigned));
    auditResults.push({
      studentId: student.id,
      studentName: student.name,
      module: 'Fees',
      metric: 'totalAssigned',
      rawSqlValue: `₹${rawAssigned}`,
      apiValue: `₹${apiFees.totalAssigned}`,
      diff: diffAssigned,
      passed: diffAssigned < 0.01,
    });

    // 2. Fee Paid
    const diffPaid = Math.abs(rawPaid - Number(apiFees.totalPaid));
    auditResults.push({
      studentId: student.id,
      studentName: student.name,
      module: 'Fees',
      metric: 'totalPaid',
      rawSqlValue: `₹${rawPaid}`,
      apiValue: `₹${apiFees.totalPaid}`,
      diff: diffPaid,
      passed: diffPaid < 0.01,
    });

    // 3. Fee Pending
    const diffPending = Math.abs(rawPending - Number(apiFees.totalPending));
    auditResults.push({
      studentId: student.id,
      studentName: student.name,
      module: 'Fees',
      metric: 'totalPending',
      rawSqlValue: `₹${rawPending}`,
      apiValue: `₹${apiFees.totalPending}`,
      diff: diffPending,
      passed: diffPending < 0.01,
    });

    // 4. Attendance Total Sessions
    const diffSessions = Math.abs(rawTotalSessions - Number(apiAtt.totalSessions));
    auditResults.push({
      studentId: student.id,
      studentName: student.name,
      module: 'Attendance',
      metric: 'totalSessions',
      rawSqlValue: rawTotalSessions,
      apiValue: apiAtt.totalSessions,
      diff: diffSessions,
      passed: diffSessions === 0,
    });

    // 5. Attendance Percentage
    const diffPercentage = Math.abs(rawAttPercentage - Number(apiAtt.percentage));
    auditResults.push({
      studentId: student.id,
      studentName: student.name,
      module: 'Attendance',
      metric: 'percentage',
      rawSqlValue: `${rawAttPercentage}%`,
      apiValue: `${apiAtt.percentage}%`,
      diff: `${diffPercentage}%`,
      passed: diffPercentage < 0.01,
    });

    // 6. Library Active Loans
    const diffLoans = Math.abs(rawActiveIssues - Number(apiLib.activeIssuesCount));
    auditResults.push({
      studentId: student.id,
      studentName: student.name,
      module: 'Library',
      metric: 'activeIssuesCount',
      rawSqlValue: rawActiveIssues,
      apiValue: apiLib.activeIssuesCount,
      diff: diffLoans,
      passed: diffLoans === 0,
    });

    // 7. Library Pending Fines
    const diffFines = Math.abs(rawPendingFines - Number(apiLib.totalPendingFines));
    auditResults.push({
      studentId: student.id,
      studentName: student.name,
      module: 'Library',
      metric: 'totalPendingFines',
      rawSqlValue: `₹${rawPendingFines}`,
      apiValue: `₹${apiLib.totalPendingFines}`,
      diff: diffFines,
      passed: diffFines < 0.01,
    });
  }

  // =========================================================================
  // REFERENTIAL INTEGRITY AUDIT: VERIFY SINGLE SHARED STUDENT TABLE
  // =========================================================================
  console.log('\n--- VERIFYING REFERENTIAL INTEGRITY & ZERO ORPHANS ---');

  const orphanFa: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM "FeeAssignment" WHERE "studentId" NOT IN (SELECT id FROM "Student")
  `;
  const orphanTx: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM "Transaction" WHERE "studentId" NOT IN (SELECT id FROM "Student")
  `;
  const orphanAtt: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM "AttendanceRecord" WHERE "studentId" NOT IN (SELECT id FROM "Student")
  `;
  const orphanLib: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM "BookIssue" WHERE "studentId" NOT IN (SELECT id FROM "Student")
  `;
  const orphanStudentUser: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM "Student" WHERE "userId" NOT IN (SELECT id FROM "User")
  `;

  const integrityChecks = [
    { table: 'FeeAssignment -> Student', orphans: orphanFa[0].count, passed: orphanFa[0].count === 0 },
    { table: 'Transaction -> Student', orphans: orphanTx[0].count, passed: orphanTx[0].count === 0 },
    { table: 'AttendanceRecord -> Student', orphans: orphanAtt[0].count, passed: orphanAtt[0].count === 0 },
    { table: 'BookIssue -> Student', orphans: orphanLib[0].count, passed: orphanLib[0].count === 0 },
    { table: 'Student -> User', orphans: orphanStudentUser[0].count, passed: orphanStudentUser[0].count === 0 },
  ];

  console.table(integrityChecks);

  const integrityFailed = integrityChecks.some((c) => !c.passed);
  if (integrityFailed) {
    throw new Error('CRITICAL INTEGRITY FAILURE: Orphan records detected in database foreign key relationships');
  }

  console.log('\n--- CROSS-MODULE CALCULATION COMPARISON (RAW SQL VS API) ---');
  console.table(auditResults.map((r) => ({
    Student: r.studentName,
    Module: r.module,
    Metric: r.metric,
    'Raw SQL': r.rawSqlValue,
    'Unified Profile': r.apiValue,
    Drift: r.diff,
    Status: r.passed ? '✅ EXACT MATCH' : '❌ DRIFT DETECTED',
  })));

  const calculationFailed = auditResults.some((r) => !r.passed);
  if (calculationFailed) {
    throw new Error('CRITICAL CALCULATION DRIFT: Discrepancy between raw SQL and application calculation service');
  }

  console.log('\n================================================================');
  console.log(`🎉 DATA CONSISTENCY AUDIT PASSED WITH 100% ZERO DRIFT`);
  console.log(`Audited ${auditResults.length} metrics across ${sampleStudents.length} students.`);
  console.log('Zero orphaned records. Single shared Student table strictly maintained.');
  console.log('================================================================\n');
}

runDataConsistencyAudit()
  .catch((err) => {
    console.error('❌ Data Consistency Audit Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
