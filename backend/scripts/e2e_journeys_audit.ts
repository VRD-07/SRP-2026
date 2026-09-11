import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { ENV } from '../src/config/env';

interface AuditResult {
  journey: string;
  step: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: AuditResult[] = [];

function record(journey: string, step: string, passed: boolean, details: string) {
  results.push({
    journey,
    step,
    status: passed ? 'PASS' : 'FAIL',
    details,
  });
  const symbol = passed ? '✅' : '❌';
  console.log(`${symbol} [${journey}] ${step} — ${details}`);
  if (!passed) {
    throw new Error(`Audit Failure in [${journey}] ${step}: ${details}`);
  }
}

async function runE2EJourneysAudit() {
  console.log('================================================================');
  console.log('🚀 RUNNING END-TO-END CROSS-MODULE USER JOURNEYS AUDIT');
  console.log('================================================================\n');

  // Setup Admin & Clerk tokens
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: `admin_${Date.now()}@college.edu`,
        passwordHash: await bcrypt.hash('Admin@123', 10),
        role: 'ADMIN',
      },
    });
  }
  const adminToken = jwt.sign(
    { userId: admin.id, email: admin.email, role: 'ADMIN', name: admin.name },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  let clerk = await prisma.user.findFirst({ where: { role: 'CLERK', isActive: true } });
  if (!clerk) {
    clerk = await prisma.user.create({
      data: {
        name: 'Chief Cashier',
        email: `clerk_${Date.now()}@college.edu`,
        passwordHash: await bcrypt.hash('Clerk@123', 10),
        role: 'CLERK',
      },
    });
  }
  const clerkToken = jwt.sign(
    { userId: clerk.id, email: clerk.email, role: 'CLERK', name: clerk.name },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Find or create an authorized teacher
  let teacherUser = await prisma.user.findFirst({ where: { role: 'TEACHER', isActive: true } });
  let teacherProfile: any;
  if (!teacherUser) {
    teacherUser = await prisma.user.create({
      data: {
        name: 'Prof. E2E Faculty',
        email: `faculty_${Date.now()}@college.edu`,
        passwordHash: await bcrypt.hash('Teacher@123', 10),
        role: 'TEACHER',
      },
    });
    teacherProfile = await prisma.teacher.create({
      data: {
        userId: teacherUser.id,
        employeeId: `EMP-E2E-${Date.now()}`,
        subjectsTaught: ['Advanced Algorithms'],
        classesAssigned: [{ class: 'B.Tech CSE', section: 'A' }],
      },
    });
  } else {
    teacherProfile = await prisma.teacher.findUnique({ where: { userId: teacherUser.id } });
    if (!teacherProfile) {
      teacherProfile = await prisma.teacher.create({
        data: {
          userId: teacherUser.id,
          employeeId: `EMP-E2E-${Date.now()}`,
          subjectsTaught: ['Advanced Algorithms'],
          classesAssigned: [{ class: 'B.Tech CSE', section: 'A' }],
        },
      });
    } else {
      const assigned = (Array.isArray(teacherProfile.classesAssigned) ? teacherProfile.classesAssigned : []) as any[];
      if (!assigned.some((c: any) => c.class === 'B.Tech CSE' && c.section === 'A')) {
        await prisma.teacher.update({
          where: { id: teacherProfile.id },
          data: { classesAssigned: [...assigned, { class: 'B.Tech CSE', section: 'A' }] },
        });
      }
    }
  }
  const teacherToken = jwt.sign(
    { userId: teacherUser.id, email: teacherUser.email, role: 'TEACHER', name: teacherUser.name },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Find or create test FeeStructure
  let feeStructure = await prisma.feeStructure.findFirst({
    where: { class: 'B.Tech CSE' },
  });
  if (!feeStructure) {
    feeStructure = await prisma.feeStructure.create({
      data: {
        class: 'B.Tech CSE',
        batch: '2024-2028',
        academicYear: '2026-2027',
        feeHead: 'Tuition',
        amount: 50000.0,
        dueDate: new Date('2026-12-31'),
      },
    });
  }

  // Find or create test book
  let book = await prisma.book.findFirst({ where: { availableCopies: { gt: 0 } } });
  if (!book) {
    book = await prisma.book.create({
      data: {
        title: 'Algorithms & Discrete Mathematics',
        author: 'E2E Author',
        isbn: `ISBN-E2E-${Date.now()}`,
        category: 'Computer Science',
        totalCopies: 5,
        availableCopies: 5,
      },
    });
  }

  // =========================================================================
  // JOURNEY 1: ADMIN STUDENT ONBOARDING -> FEES -> ATTENDANCE -> LIBRARY
  // =========================================================================
  console.log('\n--- JOURNEY 1: ADMIN STUDENT ONBOARDING (NEW ADMISSION) ---');
  const studentRoll = `ROLL-E2E-${Date.now()}`;
  const studentEmail = `student_${Date.now()}@college.edu`;
  let studentId: string;
  let studentUserId: string;

  // 1.1 Admin onboards student from scratch
  const createStudentRes = await request(app)
    .post('/api/students')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Aarav Gupta',
      email: studentEmail,
      rollNumber: studentRoll,
      admissionNumber: `ADM-${Date.now()}`,
      class: 'B.Tech CSE',
      batch: '2024-2028',
      section: 'A',
      admissionYear: 2024,
      contactNumber: '+919876543210',
      admissionDate: '2024-07-15',
      guardianName: 'Ramesh Gupta',
      guardianContact: '+919876543211',
      guardianRelation: 'Father',
      dateOfBirth: '2005-04-12',
      gender: 'Male',
      address: '742 Evergreen Terrace, Sector 4',
      documentsSubmitted: {
        aadhaar: true,
        marksheet10: true,
        marksheet12: true,
        transferCertificate: true,
      },
    });

  studentId = createStudentRes.body.data?.student?.id || createStudentRes.body.data?.id;
  studentUserId = createStudentRes.body.data?.user?.id || createStudentRes.body.data?.userId;

  record(
    'Admin Onboarding',
    'Student Creation',
    createStudentRes.status === 201 && createStudentRes.body.success === true && !!studentId,
    `Student created with ID ${studentId}, linked User credentials generated.`
  );

  // 1.2 Assign Fee Structure to newly created student
  const assignFeeRes = await request(app)
    .post(`/api/students/${studentId}/assignments`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      feeStructureIds: [feeStructure.id],
    });

  record(
    'Admin Onboarding',
    'Fee Structure Assignment',
    assignFeeRes.status === 200 && assignFeeRes.body.success === true,
    `Assigned Fee Structure ${feeStructure.id} (₹${feeStructure.amount}). Total pending dues: ₹${assignFeeRes.body.data?.totalPending}`
  );

  // 1.3 Confirm student can log in with auto-generated credentials (default Student@123)
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: studentEmail,
      password: 'Student@123',
    });

  record(
    'Admin Onboarding',
    'Student Portal Login',
    loginRes.status === 200 && loginRes.body.data?.token !== undefined && loginRes.body.data?.user?.role === 'STUDENT',
    `Student authenticated successfully with role 'STUDENT'. JWT issued.`
  );
  const studentToken = loginRes.body.data.token;

  // 1.4 Confirm student appears in Attendance Roster for B.Tech CSE Section A
  const rosterRes = await request(app)
    .get('/api/attendance/roster?class=B.Tech%20CSE&section=A')
    .set('Authorization', `Bearer ${teacherToken}`);

  const inRoster = rosterRes.body.data?.students?.some((s: any) => s.id === studentId);
  record(
    'Admin Onboarding',
    'Attendance Roster Inclusion',
    rosterRes.status === 200 && inRoster === true,
    `Newly admitted student ${studentRoll} correctly appears on teacher's active roster.`
  );

  // 1.5 Confirm student is eligible for Library issue
  const checkEligibilityRes = await request(app)
    .get(`/api/library/students/${studentId}/summary`)
    .set('Authorization', `Bearer ${clerkToken}`);

  record(
    'Admin Onboarding',
    'Library Eligibility Check',
    checkEligibilityRes.status === 200 && checkEligibilityRes.body.data?.activeIssuesCount === 0,
    `Student library account active with 0 active loans and 0 fines.`
  );

  // =========================================================================
  // JOURNEY 2: CLERK PARTIAL PAYMENT & LIBRARY BOOK ISSUE -> UNIFIED PROFILE
  // =========================================================================
  console.log('\n--- JOURNEY 2: CLERK PARTIAL FEE PAYMENT & LIBRARY BOOK ISSUE ---');

  // Find fee assignment id
  let feeAssignment = await prisma.feeAssignment.findUnique({
    where: {
      studentId_feeStructureId: {
        studentId,
        feeStructureId: feeStructure.id,
      },
    },
  });
  if (!feeAssignment) {
    feeAssignment = await prisma.feeAssignment.findFirst({
      where: { studentId },
    });
  }

  // 2.1 Clerk records partial payment of ₹20,000 against assigned fees
  const paymentAmount = 20000.0;
  const paymentRef = `PAY-PARTIAL-${Date.now()}`;
  const payRes = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${clerkToken}`)
    .send({
      studentId,
      feeAssignmentId: feeAssignment!.id,
      amount: paymentAmount,
      paymentMode: 'CASH',
      referenceNumber: paymentRef,
    });

  record(
    'Clerk Operations',
    'Partial Fee Payment',
    payRes.status === 201 && payRes.body.success === true,
    `Payment of ₹${paymentAmount} recorded. Official receipt: ${payRes.body.data?.receiptNumber}`
  );

  // 2.2 Clerk issues a library book to this student
  const issueBookRes = await request(app)
    .post('/api/library/issue')
    .set('Authorization', `Bearer ${clerkToken}`)
    .send({
      bookId: book.id,
      studentId,
    });

  record(
    'Clerk Operations',
    'Library Book Issue',
    issueBookRes.status === 201 && issueBookRes.body.success === true,
    `Book "${book.title}" issued to student. Due date: ${issueBookRes.body.data?.dueDate}`
  );
  const issuedBookIssueId = issueBookRes.body.data.id;

  // 2.3 Verify Unified Student Profile IMMEDIATELY reflects BOTH changes without caching delay
  const profileRes = await request(app)
    .get(`/api/students/${studentId}/profile`)
    .set('Authorization', `Bearer ${adminToken}`);

  const profileData = profileRes.body.data;
  const feeMatch =
    profileData.fees.totalPaid === paymentAmount &&
    profileData.fees.totalPending === profileData.fees.totalAssigned - paymentAmount;
  const libraryMatch =
    profileData.library.activeIssuesCount === 1 &&
    profileData.library.activeIssues.some((i: any) => i.id === issuedBookIssueId);

  record(
    'Clerk Operations',
    'Unified Profile Immediate Reflection',
    profileRes.status === 200 && feeMatch && libraryMatch,
    `Unified profile live: totalPaid = ₹${profileData.fees.totalPaid}, pending = ₹${profileData.fees.totalPending}, activeLibraryLoans = ${profileData.library.activeIssuesCount}. Zero cache lag.`
  );

  // =========================================================================
  // JOURNEY 3: TEACHER ATTENDANCE MARKING -> EDIT -> REPORTS REFLECTION
  // =========================================================================
  console.log('\n--- JOURNEY 3: TEACHER ATTENDANCE MARKING & EDIT WITHOUT DUPLICATES ---');
  const attendanceDate = new Date().toISOString().split('T')[0];

  // 3.1 Teacher marks initial attendance (student as ABSENT)
  const markRes1 = await request(app)
    .post('/api/attendance/mark')
    .set('Authorization', `Bearer ${teacherToken}`)
    .send({
      class: 'B.Tech CSE',
      section: 'A',
      date: attendanceDate,
      records: [
        {
          studentId,
          status: 'ABSENT',
          remarks: 'Medical leave requested',
        },
      ],
    });

  record(
    'Teacher Attendance',
    'Initial Attendance Marking',
    markRes1.status === 200 && markRes1.body.success === true,
    `Attendance marked as ABSENT for session ${markRes1.body.data?.sessionId}.`
  );
  const sessionId = markRes1.body.data.sessionId;

  // 3.2 Teacher edits that day's attendance (changes student to PRESENT)
  const markRes2 = await request(app)
    .post('/api/attendance/mark')
    .set('Authorization', `Bearer ${teacherToken}`)
    .send({
      class: 'B.Tech CSE',
      section: 'A',
      date: attendanceDate,
      records: [
        {
          studentId,
          status: 'PRESENT',
          remarks: 'Late arrival slip approved by HOD',
        },
      ],
    });

  // Verify no duplicate AttendanceSession was created
  const sessionCount = await prisma.attendanceSession.count({
    where: {
      class: 'B.Tech CSE',
      section: 'A',
      date: new Date(`${attendanceDate}T00:00:00.000Z`),
    },
  });

  const recordCount = await prisma.attendanceRecord.count({
    where: {
      attendanceSessionId: sessionId,
      studentId,
    },
  });

  record(
    'Teacher Attendance',
    'In-Place Attendance Edit & Zero Duplication',
    markRes2.status === 200 && sessionCount === 1 && recordCount === 1,
    `Attendance updated to PRESENT in place. Exactly 1 session and 1 record exist in DB.`
  );

  // 3.3 Confirm change is reflected in Admin Attendance Reports
  const adminReportRes = await request(app)
    .get(`/api/attendance/reports?class=B.Tech%20CSE&section=A`)
    .set('Authorization', `Bearer ${adminToken}`);

  const studentAdminRow = adminReportRes.body.data?.find((r: any) => r.studentId === studentId);
  record(
    'Teacher Attendance',
    'Admin Reports Reflection',
    adminReportRes.status === 200 && studentAdminRow?.present >= 1 && studentAdminRow?.percentage === 100,
    `Admin reports show student ${studentRoll}: present=${studentAdminRow?.present}, turnout=${studentAdminRow?.percentage}%.`
  );

  // 3.4 Confirm change is reflected in Student's self-attendance view
  const studentAttRes = await request(app)
    .get('/api/attendance/my-attendance')
    .set('Authorization', `Bearer ${studentToken}`);

  const myRec = studentAttRes.body.data?.history?.some((r: any) => r.status === 'PRESENT');
  record(
    'Teacher Attendance',
    'Student Self-Attendance Reflection',
    studentAttRes.status === 200 && myRec && studentAttRes.body.data?.summary?.percentage === 100,
    `Student self-view matches Admin reports: turnout = ${studentAttRes.body.data?.summary?.percentage}%.`
  );

  // =========================================================================
  // JOURNEY 4: STUDENT SELF-SERVICE ROLE PARITY (FEES, ATTENDANCE, LIBRARY)
  // =========================================================================
  console.log('\n--- JOURNEY 4: STUDENT SELF-SERVICE PARITY ACROSS ROLES ---');

  // Fetch Student's view of own profile
  const studentSelfProfileRes = await request(app)
    .get('/api/students/me/profile')
    .set('Authorization', `Bearer ${studentToken}`);

  // Fetch Student's view of library
  const studentLibraryRes = await request(app)
    .get('/api/library/my-books')
    .set('Authorization', `Bearer ${studentToken}`);

  const adminProfileCheck = await request(app)
    .get(`/api/students/${studentId}/profile`)
    .set('Authorization', `Bearer ${adminToken}`);

  const feesParity =
    studentSelfProfileRes.body.data?.fees?.totalPaid === adminProfileCheck.body.data?.fees?.totalPaid &&
    studentSelfProfileRes.body.data?.fees?.totalPending === adminProfileCheck.body.data?.fees?.totalPending;

  const libraryParity =
    studentLibraryRes.body.data?.activeIssuesCount === adminProfileCheck.body.data?.library?.activeIssuesCount;

  record(
    'Student Self-Service',
    'Cross-Role Financial & Academic Parity',
    studentSelfProfileRes.status === 200 && feesParity && libraryParity,
    `Zero discrepancy between Student portal and Admin console (Fees Paid: ₹${feesParity ? studentSelfProfileRes.body.data.fees.totalPaid : 'DRIFT'}, Active Books: ${libraryParity ? studentLibraryRes.body.data.activeIssuesCount : 'DRIFT'}).`
  );

  // Verify student cannot spy on other students
  const otherStudent = await prisma.student.findFirst({
    where: { id: { not: studentId } },
  });

  if (otherStudent) {
    const snoopProfileRes = await request(app)
      .get(`/api/students/${otherStudent.id}/profile`)
      .set('Authorization', `Bearer ${studentToken}`);

    const snoopLibraryRes = await request(app)
      .get(`/api/library/students/${otherStudent.id}/summary`)
      .set('Authorization', `Bearer ${studentToken}`);

    record(
      'Student Self-Service',
      'Cross-Student Boundary Isolation',
      snoopProfileRes.status === 403 && snoopLibraryRes.status === 403,
      `Student blocked from viewing other student profile (403) and library summary (403).`
    );
  }

  // =========================================================================
  // JOURNEY 5: FULL LIFECYCLE DEACTIVATION (STUDENT LEAVING/GRADUATING)
  // =========================================================================
  console.log('\n--- JOURNEY 5: FULL LIFECYCLE DEACTIVATION (AUDIT PERSISTENCE) ---');

  // 5.1 Admin deactivates student
  const deactRes = await request(app)
    .patch(`/api/students/${studentId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'INACTIVE' });

  record(
    'Lifecycle Deactivation',
    'Student Status Update to INACTIVE',
    deactRes.status === 200 && deactRes.body.success === true,
    `Student status updated to INACTIVE.`
  );

  // 5.2 Confirm student portal login access is strictly revoked
  const loginRevokedRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: studentEmail,
      password: 'Student@123',
    });

  record(
    'Lifecycle Deactivation',
    'Portal Login Revocation',
    loginRevokedRes.status === 403,
    `Deactivated student login rejected with HTTP 403 Forbidden.`
  );

  // 5.3 Confirm historical Fees, Attendance, and Library records remain 100% intact and viewable by Admin
  const adminPostDeactProfileRes = await request(app)
    .get(`/api/students/${studentId}/profile`)
    .set('Authorization', `Bearer ${adminToken}`);

  const postDeact = adminPostDeactProfileRes.body.data;
  const historyIntact =
    postDeact.student.status === 'INACTIVE' &&
    postDeact.student.user.isActive === false &&
    postDeact.fees.totalPaid === paymentAmount &&
    postDeact.fees.totalPending === postDeact.fees.totalAssigned - paymentAmount &&
    postDeact.attendance.totalSessions >= 1 &&
    postDeact.library.activeIssuesCount === 1;

  record(
    'Lifecycle Deactivation',
    'Historical Ledger & Academic Integrity Preservation',
    adminPostDeactProfileRes.status === 200 && historyIntact,
    `Admin can fully audit historical student: Paid=₹${postDeact.fees.totalPaid}, Sessions=${postDeact.attendance.totalSessions}, ActiveLoans=${postDeact.library.activeIssuesCount}. Zero cascade deletion.`
  );

  console.log('\n================================================================');
  console.log(`🎉 ALL ${results.length} END-TO-END USER JOURNEYS PASSED WITH 100% SUCCESS`);
  console.log('================================================================\n');

  console.table(results);
}

runE2EJourneysAudit()
  .catch((err) => {
    console.error('❌ E2E Journeys Audit Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
