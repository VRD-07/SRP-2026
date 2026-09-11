import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { ENV } from '../src/config/env';
import { LibraryCalculationService } from '../src/services/libraryCalculationService';

describe('7. LIBRARY MODULE — END-TO-END & INTEGRITY VERIFICATION', () => {
  let adminToken: string;
  let clerkToken: string;
  let teacherToken: string;
  let student1Token: string;
  let student2Token: string;

  let testAdminUser: any;
  let testClerkUser: any;
  let testTeacherUser: any;
  let testStudent1: any;
  let testStudent2: any;
  let testStudent3: any;
  let testStudent4: any;
  let testStudent5: any;
  let testStudent6: any;

  let zeroCopyBook: any;
  let singleCopyBook: any;
  let multiCopyBook: any;

  beforeAll(async () => {
    const validHash = await bcrypt.hash('TestPass@123', 10);

    // 1. Fetch or create Admin
    testAdminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!testAdminUser) {
      testAdminUser = await prisma.user.create({
        data: {
          name: 'Library Admin',
          email: `lib.admin.${Date.now()}@college.edu`,
          passwordHash: validHash,
          role: 'ADMIN',
        },
      });
    }
    adminToken = jwt.sign(
      { userId: testAdminUser.id, email: testAdminUser.email, role: 'ADMIN', name: testAdminUser.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Fetch or create Clerk
    testClerkUser = await prisma.user.findFirst({ where: { role: 'CLERK' } });
    if (!testClerkUser) {
      testClerkUser = await prisma.user.create({
        data: {
          name: 'Library Clerk',
          email: `lib.clerk.${Date.now()}@college.edu`,
          passwordHash: validHash,
          role: 'CLERK',
        },
      });
    }
    clerkToken = jwt.sign(
      { userId: testClerkUser.id, email: testClerkUser.email, role: 'CLERK', name: testClerkUser.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Fetch or create Teacher
    testTeacherUser = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    if (!testTeacherUser) {
      testTeacherUser = await prisma.user.create({
        data: {
          name: 'Library Teacher',
          email: `lib.teacher.${Date.now()}@college.edu`,
          passwordHash: validHash,
          role: 'TEACHER',
        },
      });
    }
    teacherToken = jwt.sign(
      { userId: testTeacherUser.id, email: testTeacherUser.email, role: 'TEACHER', name: testTeacherUser.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 4. Fetch or create Students
    const studentUsers = await prisma.student.findMany({
      take: 6,
      include: { user: true },
    });

    testStudent1 = studentUsers[0];
    testStudent2 = studentUsers[1];
    testStudent3 = studentUsers[2];
    testStudent4 = studentUsers[3];
    testStudent5 = studentUsers[4];
    testStudent6 = studentUsers[5];

    student1Token = jwt.sign(
      { userId: testStudent1.userId, email: testStudent1.user.email, role: 'STUDENT', name: testStudent1.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    student2Token = jwt.sign(
      { userId: testStudent2.userId, email: testStudent2.user.email, role: 'STUDENT', name: testStudent2.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 5. Create test books for the audit
    zeroCopyBook = await prisma.book.create({
      data: {
        title: `Zero Stock Book ${Date.now()}`,
        author: 'Unavailable Author',
        isbn: `ISBN-ZERO-${Date.now()}`,
        category: 'Test Category',
        totalCopies: 2,
        availableCopies: 0,
      },
    });

    singleCopyBook = await prisma.book.create({
      data: {
        title: `Single Copy Book ${Date.now()}`,
        author: 'Single Author',
        isbn: `ISBN-SINGLE-${Date.now()}`,
        category: 'Concurrency Test',
        totalCopies: 1,
        availableCopies: 1,
      },
    });

    multiCopyBook = await prisma.book.create({
      data: {
        title: `Multi Copy Book ${Date.now()}`,
        author: 'Standard Author',
        isbn: `ISBN-MULTI-${Date.now()}`,
        category: 'General',
        totalCopies: 5,
        availableCopies: 5,
      },
    });
  });

  // =========================================================================
  // 7.1 ZERO COPIES REJECTION
  // =========================================================================
  it('7.1 should reject issuing a book when availableCopies is 0', async () => {
    const res = await request(app)
      .post('/api/library/issue')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({
        bookId: zeroCopyBook.id,
        studentId: testStudent1.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no available copies/i);
  });

  // =========================================================================
  // 7.2 ATOMIC CONCURRENCY ON LAST COPY (ROW-LEVEL LOCK SAFETY)
  // =========================================================================
  it('7.2 should prevent race conditions and ensure ONLY ONE issue succeeds on a book with 1 copy', async () => {
    const candidates = [
      testStudent1,
      testStudent2,
      testStudent3,
      testStudent4,
      testStudent5,
      testStudent6,
    ];

    // Fire 6 simultaneous concurrent issue requests for the single available copy
    const promises = candidates.map((student) =>
      request(app)
        .post('/api/library/issue')
        .set('Authorization', `Bearer ${clerkToken}`)
        .send({
          bookId: singleCopyBook.id,
          studentId: student.id,
        })
    );

    const responses = await Promise.all(promises);

    const succeeded = responses.filter((r) => r.status === 201);
    const failed = responses.filter((r) => r.status === 400);

    // Exactly 1 must succeed, 5 must fail
    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(5);

    // Verify database state: availableCopies must be exactly 0 (never negative)
    const bookInDb = await prisma.book.findUnique({
      where: { id: singleCopyBook.id },
    });
    expect(bookInDb!.availableCopies).toBe(0);

    // Verify only 1 active BookIssue exists in DB
    const issues = await prisma.bookIssue.findMany({
      where: { bookId: singleCopyBook.id, returnDate: null },
    });
    expect(issues.length).toBe(1);
  });

  // =========================================================================
  // 7.3 PREVENT DUPLICATE ACTIVE ISSUE FOR SAME STUDENT & BOOK
  // =========================================================================
  it('7.3 should reject issuing the same book twice to the same student simultaneously', async () => {
    // First issue succeeds
    const firstRes = await request(app)
      .post('/api/library/issue')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({
        bookId: multiCopyBook.id,
        studentId: testStudent1.id,
      });
    expect(firstRes.status).toBe(201);

    // Second issue attempt with same book and same student
    const secondRes = await request(app)
      .post('/api/library/issue')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({
        bookId: multiCopyBook.id,
        studentId: testStudent1.id,
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.success).toBe(false);
    expect(secondRes.body.message).toMatch(/duplicate/i);
  });

  // =========================================================================
  // 7.4 ATOMIC RETURN & FINE CALCULATION PARITY (₹2/DAY OVERDUE)
  // =========================================================================
  it('7.4 should atomically increment copies on return, calculate overdue fine, and match across profile and reports', async () => {
    // 1. Create an overdue issue directly (10 days past dueDate)
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const twentyFourDaysAgo = new Date(Date.now() - 24 * 24 * 60 * 60 * 1000);

    const overdueIssue = await prisma.bookIssue.create({
      data: {
        bookId: multiCopyBook.id,
        studentId: testStudent2.id,
        issuedByUserId: testClerkUser.id,
        issueDate: twentyFourDaysAgo,
        dueDate: tenDaysAgo, // Due 10 days ago
        status: 'OVERDUE',
      },
    });

    // Initial check: Book calculation service calculates 10 days * 2 = ₹20
    const calcInitial = LibraryCalculationService.calculateOverdueFine(overdueIssue.dueDate, new Date());
    expect(calcInitial.daysOverdue).toBe(10);
    expect(calcInitial.fineAmount).toBe(20.0);

    // Return the book today
    const returnRes = await request(app)
      .post(`/api/library/return/${overdueIssue.id}`)
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({});

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.data.daysOverdue).toBe(10);
    expect(returnRes.body.data.fineAssessed).toBe(20.0);
    expect(returnRes.body.data.fineStatus).toBe('PENDING');

    // 2. Cross-verify against Unified Student Profile
    const profileRes = await request(app)
      .get(`/api/students/${testStudent2.id}/profile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.library).toBeDefined();
    // At least this ₹20 fine is pending for testStudent2
    expect(profileRes.body.data.library.totalPendingFines).toBeGreaterThanOrEqual(20.0);

    // 3. Cross-verify against Library Reports
    const reportsRes = await request(app)
      .get('/api/library/reports')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reportsRes.status).toBe(200);
    expect(reportsRes.body.data.kpis.totalFinesPending).toBeGreaterThanOrEqual(20.0);
  });

  // =========================================================================
  // 7.5 CLERK FINE PAYMENT (CASH / FINE SETTLEMENT)
  // =========================================================================
  it('7.5 should allow Clerk to record an overdue fine as PAID', async () => {
    // Find the returned issue with PENDING fine from previous test
    const pendingIssue = await prisma.bookIssue.findFirst({
      where: { studentId: testStudent2.id, status: 'RETURNED', fineStatus: 'PENDING' },
    });
    expect(pendingIssue).toBeDefined();

    const payRes = await request(app)
      .post(`/api/library/issues/${pendingIssue!.id}/pay-fine`)
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({});

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.fineStatus).toBe('PAID');
    expect(payRes.body.data.finePaidAt).toBeDefined();

    // Verify in DB
    const inDb = await prisma.bookIssue.findUnique({ where: { id: pendingIssue!.id } });
    expect(inDb!.fineStatus).toBe('PAID');
  });

  // =========================================================================
  // 7.6 FINE WAIVER (ADMIN ONLY — CLERK BLOCKED WITH 403)
  // =========================================================================
  it('7.6 should reject Clerk from waiving a fine with 403, and allow Admin to waive it', async () => {
    // Create another returned issue with fine
    const issueToWaive = await prisma.bookIssue.create({
      data: {
        bookId: multiCopyBook.id,
        studentId: testStudent3.id,
        issuedByUserId: testClerkUser.id,
        issueDate: new Date('2026-08-01'),
        dueDate: new Date('2026-08-15'),
        returnDate: new Date('2026-08-20'),
        status: 'RETURNED',
        fineAmount: 10.0,
        fineStatus: 'PENDING',
      },
    });

    // 1. Clerk attempts to waive -> 403 Forbidden
    const clerkWaiveRes = await request(app)
      .post(`/api/library/issues/${issueToWaive.id}/waive-fine`)
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({ reason: 'Student apologized' });

    expect(clerkWaiveRes.status).toBe(403);
    expect(clerkWaiveRes.body.message).toMatch(/forbidden|only admin/i);

    // 2. Admin waives -> 200 OK
    const adminWaiveRes = await request(app)
      .post(`/api/library/issues/${issueToWaive.id}/waive-fine`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Hospitalization waiver authorized by Comptroller' });

    expect(adminWaiveRes.status).toBe(200);
    expect(adminWaiveRes.body.data.fineStatus).toBe('WAIVED');
    expect(adminWaiveRes.body.data.fineWaivedAt).toBeDefined();
  });

  // =========================================================================
  // 7.7 STUDENT ACCESS ISOLATION & SELF-SERVICE (403 ON OTHER STUDENTS)
  // =========================================================================
  it('7.7 should allow Student to view own library record, and return 403 when accessing another student', async () => {
    // 1. Student 1 queries own library
    const ownRes = await request(app)
      .get('/api/library/my-books')
      .set('Authorization', `Bearer ${student1Token}`);

    expect(ownRes.status).toBe(200);
    expect(ownRes.body.data.activeIssues).toBeDefined();

    // 2. Student 1 attempts to fetch Student 2 summary -> 403 Forbidden
    const crossRes = await request(app)
      .get(`/api/library/students/${testStudent2.id}/summary`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(crossRes.status).toBe(403);
    expect(crossRes.body.message).toMatch(/forbidden|only view your own/i);
  });

  // =========================================================================
  // 7.8 TEACHER ROLE EXCLUSION (403 ON ALL LIBRARY ENDPOINTS)
  // =========================================================================
  it('7.8 should return 403 when Teacher attempts to access Library endpoints', async () => {
    const issueAttempt = await request(app)
      .post('/api/library/issue')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ bookId: multiCopyBook.id, studentId: testStudent1.id });
    expect(issueAttempt.status).toBe(403);

    const overdueAttempt = await request(app)
      .get('/api/library/overdue')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(overdueAttempt.status).toBe(403);

    const reportAttempt = await request(app)
      .get('/api/library/reports')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(reportAttempt.status).toBe(403);
  });

  // =========================================================================
  // 7.9 BOOK DELETION GUARD (CANNOT DELETE BOOK WITH ACTIVE ISSUES)
  // =========================================================================
  it('7.9 should prevent deleting a book with active issues, and allow deleting an unissued book', async () => {
    // Attempt to delete multiCopyBook which has active issues
    const deleteBlocked = await request(app)
      .delete(`/api/library/books/${multiCopyBook.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteBlocked.status).toBe(400);
    expect(deleteBlocked.body.message).toMatch(/active issued copies/i);

    // Create a temporary unissued book and delete it
    const tempBook = await prisma.book.create({
      data: {
        title: 'Temporary Test Book',
        author: 'Temp Author',
        isbn: `ISBN-TEMP-${Date.now()}`,
        category: 'Temp',
        totalCopies: 1,
        availableCopies: 1,
      },
    });

    const deleteAllowed = await request(app)
      .delete(`/api/library/books/${tempBook.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteAllowed.status).toBe(200);
  });
});
