import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { ENV } from '../src/config/env';
import { CalculationService } from '../src/services/calculationService';

describe('PHASE 2 COMPREHENSIVE VERIFICATION & REGRESSION AUDIT', () => {
  let adminToken: string;
  let clerkToken: string;
  let teacherToken: string;
  let studentToken: string;

  let adminUser: any;
  let clerkUser: any;
  let teacherObj: any;
  let testFeeStructure: any;

  beforeAll(async () => {
    // 0. Robust DB warmup
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await prisma.$connect();
        break;
      } catch (e) {
        if (attempt === 3) throw e;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // 1. Get or create Admin user
    adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: 'Audit Admin',
          email: `audit.admin.${Date.now()}@college.edu`,
          passwordHash: await bcrypt.hash('Admin@123', 10),
          role: 'ADMIN',
          isActive: true,
        },
      });
    }
    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: 'ADMIN', name: adminUser.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Get or create Clerk user
    clerkUser = await prisma.user.findFirst({ where: { role: 'CLERK', isActive: true } });
    if (!clerkUser) {
      clerkUser = await prisma.user.create({
        data: {
          name: 'Audit Clerk',
          email: `audit.clerk.${Date.now()}@college.edu`,
          passwordHash: await bcrypt.hash('Clerk@123', 10),
          role: 'CLERK',
          isActive: true,
        },
      });
    }
    clerkToken = jwt.sign(
      { userId: clerkUser.id, email: clerkUser.email, role: 'CLERK', name: clerkUser.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Find or create a test Fee Structure
    testFeeStructure = await prisma.feeStructure.findFirst({
      where: { class: 'AUDIT-CLASS' },
    });
    if (!testFeeStructure) {
      testFeeStructure = await prisma.feeStructure.create({
        data: {
          feeHead: 'Tuition',
          class: 'AUDIT-CLASS',
          batch: '2026-2030',
          academicYear: '2026-2027',
          amount: 50000.0,
          dueDate: new Date('2026-12-31'),
        },
      });
    }
  });

  // =========================================================================
  // SECTION 1: REGRESSION CHECK & NEW ADMISSION INTEGRATION WITH FEES MODULE
  // =========================================================================
  describe('1. Regression Check: Fees Flow on Newly Admitted Students', () => {
    let newStudentId: string;
    let newStudentRoll: string;
    let feeAssignmentId: string;
    let recordedTransactionId: string;

    it('1.1 should create a new student via the new Admissions flow with full dossier', async () => {
      newStudentRoll = `AUDIT-STU-${Date.now()}`;
      const payload = {
        name: 'Rohan Verma',
        email: `rohan.${Date.now()}@college.edu`,
        rollNumber: newStudentRoll,
        admissionNumber: `ADM-${Date.now()}`,
        class: 'AUDIT-CLASS',
        batch: '2026-2030',
        section: 'A',
        admissionYear: 2026,
        contactNumber: '9876543210',
        admissionDate: '2026-07-15',
        guardianName: 'Suresh Verma',
        guardianContact: '9876543211',
        guardianRelation: 'Father',
        dateOfBirth: '2005-04-12',
        gender: 'Male',
        address: '42, Park Avenue, Metro City',
        documentsSubmitted: { marksheet10th: true, marksheet12th: true, transferCertificate: true },
        status: 'ACTIVE',
        password: 'Student@123',
      };

      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student).toBeDefined();
      newStudentId = res.body.data.student.id;
    });

    it('1.2 should assign a Fee Structure to this new student and calculate exact dues', async () => {
      const res = await request(app)
        .post(`/api/students/${newStudentId}/assignments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ feeStructureIds: [testFeeStructure.id] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify assignment in DB
      const assignment = await prisma.feeAssignment.findUnique({
        where: {
          studentId_feeStructureId: {
            studentId: newStudentId,
            feeStructureId: testFeeStructure.id,
          },
        },
      });
      expect(assignment).toBeDefined();
      feeAssignmentId = assignment!.id;

      // Verify calculation service returns exact 50,000 pending
      const calc = await CalculationService.getStudentFeeCalculation(newStudentId);
      expect(calc.totalAssigned).toBe(50000.0);
      expect(calc.totalPaid).toBe(0.0);
      expect(calc.totalPending).toBe(50000.0);
    });

    it('1.3 should record a fee payment via Clerk and generate official receipt', async () => {
      const paymentRef = `PAY-AUDIT-${Date.now()}`;
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${clerkToken}`)
        .send({
          studentId: newStudentId,
          feeAssignmentId,
          amount: 20000.0,
          paymentMode: 'CASH',
          referenceNumber: paymentRef,
          remarks: 'Initial partial payment',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receiptNumber).toMatch(/^RCP-\d{6}-\d{5}$/);
      expect(res.body.data.amount).toBe(20000.0);
      recordedTransactionId = res.body.data.id;

      // Verify updated dues: 50,000 - 20,000 = 30,000
      const calcAfter = await CalculationService.getStudentFeeCalculation(newStudentId);
      expect(calcAfter.totalPaid).toBe(20000.0);
      expect(calcAfter.totalPending).toBe(30000.0);
    });

    it('1.4 should reverse the payment cleanly and restore pending balance', async () => {
      const res = await request(app)
        .post(`/api/transactions/${recordedTransactionId}/reverse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reversalReason: 'Audit verification test reversal' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receiptNumber).toMatch(/^REV-\d{6}-\d{5}$/);

      // Verify balance restored to 50,000.00
      const calcRestored = await CalculationService.getStudentFeeCalculation(newStudentId);
      expect(calcRestored.totalPaid).toBe(0.0);
      expect(calcRestored.totalPending).toBe(50000.0);
    });
  });

  // =========================================================================
  // SECTION 2: STUDENT RECORDS & ADMISSIONS VERIFICATION
  // =========================================================================
  describe('2. Student Records / Admissions Verification', () => {
    let admittedStudent: any;
    let studentUserEmail: string;

    it('2.1 should verify student can log in with auto-created credentials', async () => {
      studentUserEmail = `priya.audit.${Date.now()}@college.edu`;
      const createRes = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Priya Sharma',
          email: studentUserEmail,
          rollNumber: `STU-PRIYA-${Date.now()}`,
          admissionNumber: `ADM-PRIYA-${Date.now()}`,
          class: 'AUDIT-CLASS',
          batch: '2026-2030',
          section: 'B',
          admissionYear: 2026,
          contactNumber: '9123456780',
          guardianName: 'Radha Sharma',
          guardianContact: '9123456789',
          guardianRelation: 'Mother',
          status: 'ACTIVE',
          password: 'Student@123',
        });

      expect(createRes.status).toBe(201);
      admittedStudent = createRes.body.data.student;

      // Log in with created credentials
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: studentUserEmail,
          password: 'Student@123',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.user.role).toBe('STUDENT');
      studentToken = loginRes.body.data.token;
    });

    it('2.2 should edit student details and reflect immediately on profile', async () => {
      const updateRes = await request(app)
        .put(`/api/students/${admittedStudent.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          contactNumber: '9999988888',
          address: 'Updated Residential Address 101',
          documentsSubmitted: { marksheet10th: true, aadhaarCard: true },
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);

      // Verify on Profile endpoint
      const profileRes = await request(app)
        .get(`/api/students/${admittedStudent.id}/profile`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.student.contactNumber).toBe('9999988888');
      expect(profileRes.body.data.student.address).toBe('Updated Residential Address 101');
      expect(profileRes.body.data.student.documentsSubmitted.aadhaarCard).toBe(true);
    });

    it('2.3 should deactivate student (INACTIVE) and prevent login, keeping records intact', async () => {
      const deactRes = await request(app)
        .patch(`/api/students/${admittedStudent.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INACTIVE' });

      expect(deactRes.status).toBe(200);

      // Verify login is now blocked
      const blockedLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: studentUserEmail,
          password: 'Student@123',
        });

      expect(blockedLogin.status).toBe(403);
      expect(blockedLogin.body.message).toMatch(/deactivated|disabled|inactive/i);

      // Verify records remain intact for Admin
      const adminCheck = await request(app)
        .get(`/api/students/${admittedStudent.id}/profile`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminCheck.status).toBe(200);
      expect(adminCheck.body.data.student.status).toBe('INACTIVE');
    });

    it('2.4 should confirm searching and filtering students by name, class, section, and status', async () => {
      // Filter by class
      const classRes = await request(app)
        .get('/api/students?class=AUDIT-CLASS')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(classRes.status).toBe(200);
      expect(classRes.body.data.length).toBeGreaterThan(0);
      classRes.body.data.forEach((s: any) => {
        expect(s.class).toBe('AUDIT-CLASS');
      });

      // Filter by status INACTIVE
      const statusRes = await request(app)
        .get('/api/students?status=INACTIVE')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(statusRes.status).toBe(200);
      statusRes.body.data.forEach((s: any) => {
        expect(s.status).toBe('INACTIVE');
      });

      // Search by name
      const searchRes = await request(app)
        .get('/api/students?search=Priya')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.some((s: any) => s.name.includes('Priya'))).toBe(true);
    });

    it('2.5 should confirm no student can be hard-deleted (DELETE returns 404)', async () => {
      const deleteRes = await request(app)
        .delete(`/api/students/${admittedStudent.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(404);
    });
  });

  // =========================================================================
  // SECTION 3: TEACHER ROLE & BOUNDARY ENFORCEMENT
  // =========================================================================
  describe('3. Teacher Role & Boundary Enforcement', () => {
    let teacherUserEmail: string;
    let teacherId: string;
    let teacherUserId: string;

    it('3.1 should create a Teacher account with specific class assignments and login', async () => {
      teacherUserEmail = `prof.audit.${Date.now()}@college.edu`;
      const createRes = await request(app)
        .post('/api/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Professor Audit',
          email: teacherUserEmail,
          employeeId: `EMP-${Date.now()}`,
          subjectsTaught: ['Data Structures', 'Algorithms'],
          classesAssigned: [
            { class: 'AUDIT-CLASS', section: 'A' },
            { class: 'AUDIT-CLASS', section: 'B' },
          ],
          password: 'Teacher@123',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      teacherId = createRes.body.data.id;
      teacherUserId = createRes.body.data.userId;

      // Log in as teacher
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: teacherUserEmail,
          password: 'Teacher@123',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.role).toBe('TEACHER');
      expect(loginRes.body.data.user.teacherId).toBe(teacherId);
      expect(loginRes.body.data.user.classesAssigned.length).toBe(2);
      teacherToken = loginRes.body.data.token;
    });

    it('3.2 should return 403 when Teacher accesses Admin-only or Clerk-only endpoints directly', async () => {
      // Teacher calling Admin clerk list
      const clerksRes = await request(app)
        .get('/api/clerks')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(clerksRes.status).toBe(403);

      // Teacher calling Admin fee structure creation
      const feeCreateRes = await request(app)
        .post('/api/fee-structures')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ feeHead: 'Test', class: 'AUDIT-CLASS', batch: '2026', amount: 100 });
      expect(feeCreateRes.status).toBe(403);

      // Teacher calling Clerk payment collection
      const payRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ amount: 1000 });
      expect(payRes.status).toBe(403);
    });

    it('3.3 should reject Teacher attendance marking for UNASSIGNED class with 403', async () => {
      const res = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          class: 'UNAUTHORIZED-CLASS',
          section: 'Z',
          date: '2026-11-01',
          records: [],
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not assigned/i);
    });

    it('3.4 should deactivate Teacher, block login, but keep past attendance intact', async () => {
      // First clean up any prior test session for this class/section/date
      const dateStr = '2026-11-02';
      await prisma.attendanceRecord.deleteMany({
        where: { session: { class: 'AUDIT-CLASS', section: 'A', date: new Date(dateStr) } },
      });
      await prisma.attendanceSession.deleteMany({
        where: { class: 'AUDIT-CLASS', section: 'A', date: new Date(dateStr) },
      });

      const activeStudent = await prisma.student.findFirst({
        where: { class: 'AUDIT-CLASS', section: 'A' },
      });

      const markRes = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          class: 'AUDIT-CLASS',
          section: 'A',
          date: dateStr,
          records: [
            { studentId: activeStudent!.id, status: 'PRESENT', remarks: 'Good attendance' },
          ],
        });
      expect(markRes.status).toBe(200);

      // Deactivate teacher
      const deactRes = await request(app)
        .patch(`/api/teachers/${teacherId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });
      expect(deactRes.status).toBe(200);

      // Verify login blocked
      const loginAttempt = await request(app)
        .post('/api/auth/login')
        .send({
          email: teacherUserEmail,
          password: 'Teacher@123',
        });
      expect(loginAttempt.status).toBe(403);

      // Verify attendance session still exists in DB and attributed to this teacher
      const session = await prisma.attendanceSession.findUnique({
        where: {
          class_section_date: {
            class: 'AUDIT-CLASS',
            section: 'A',
            date: new Date(dateStr),
          },
        },
      });
      expect(session).toBeDefined();
      expect(session!.markedByTeacherId).toBe(teacherUserId);
    });
  });

  // =========================================================================
  // SECTION 4: ATTENDANCE MODULE INTEGRITY & ZERO DUPLICATES
  // =========================================================================
  describe('4. Attendance Module Integrity', () => {
    let activeTeacherToken: string;
    let testStudentA: any;
    let testStudentB: any;
    const testDate = '2026-11-10';

    beforeAll(async () => {
      // Clean up any residual test data for PHYSICS-CLASS section A
      await prisma.attendanceRecord.deleteMany({
        where: { session: { class: 'PHYSICS-CLASS', section: 'A' } },
      });
      await prisma.attendanceSession.deleteMany({
        where: { class: 'PHYSICS-CLASS', section: 'A' },
      });
      await prisma.student.deleteMany({
        where: { class: 'PHYSICS-CLASS', section: 'A' },
      });

      // Create an active teacher
      const tEmail = `teacher.active.${Date.now()}@college.edu`;
      const tUser = await prisma.user.create({
        data: {
          name: 'Teacher Active',
          email: tEmail,
          passwordHash: await bcrypt.hash('Teacher@123', 10),
          role: 'TEACHER',
          isActive: true,
          teacher: {
            create: {
              employeeId: `EMP-ACT-${Date.now()}`,
              subjectsTaught: ['Physics'],
              classesAssigned: [{ class: 'PHYSICS-CLASS', section: 'A' }],
            },
          },
        },
        include: { teacher: true },
      });

      activeTeacherToken = jwt.sign(
        {
          userId: tUser.id,
          email: tUser.email,
          role: 'TEACHER',
          name: tUser.name,
          teacherId: tUser.teacher!.id,
          classesAssigned: [{ class: 'PHYSICS-CLASS', section: 'A' }],
        },
        ENV.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Create 2 active students in PHYSICS-CLASS section A
      testStudentA = await prisma.student.create({
        data: {
          name: 'Student Alpha',
          rollNumber: `ROLL-A-${Date.now()}`,
          class: 'PHYSICS-CLASS',
          section: 'A',
          batch: '2026',
          admissionYear: 2026,
          contactNumber: '1112223334',
          status: 'ACTIVE',
          user: {
            create: {
              name: 'Student Alpha',
              email: `student.alpha.${Date.now()}@college.edu`,
              passwordHash: await bcrypt.hash('Student@123', 10),
              role: 'STUDENT',
              isActive: true,
            },
          },
        },
        include: { user: true },
      });

      testStudentB = await prisma.student.create({
        data: {
          name: 'Student Beta',
          rollNumber: `ROLL-B-${Date.now()}`,
          class: 'PHYSICS-CLASS',
          section: 'A',
          batch: '2026',
          admissionYear: 2026,
          contactNumber: '1112223335',
          status: 'ACTIVE',
          user: {
            create: {
              name: 'Student Beta',
              email: `student.beta.${Date.now()}@college.edu`,
              passwordHash: await bcrypt.hash('Student@123', 10),
              role: 'STUDENT',
              isActive: true,
            },
          },
        },
        include: { user: true },
      });
    });

    it('4.1 should mark attendance and then edit existing session without creating duplicates', async () => {
      // First submission
      const res1 = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${activeTeacherToken}`)
        .send({
          class: 'PHYSICS-CLASS',
          section: 'A',
          date: testDate,
          records: [
            { studentId: testStudentA.id, status: 'PRESENT', remarks: 'On time' },
            { studentId: testStudentB.id, status: 'ABSENT', remarks: 'Unexcused' },
          ],
        });

      expect(res1.status).toBe(200);

      // Verify exactly 1 session exists
      const sessionsCount1 = await prisma.attendanceSession.count({
        where: { class: 'PHYSICS-CLASS', section: 'A', date: new Date(testDate) },
      });
      expect(sessionsCount1).toBe(1);

      // Second submission for exact same date/class/section (edit marks)
      const res2 = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${activeTeacherToken}`)
        .send({
          class: 'PHYSICS-CLASS',
          section: 'A',
          date: testDate,
          records: [
            { studentId: testStudentA.id, status: 'LATE', remarks: 'Late by 10 mins' },
            { studentId: testStudentB.id, status: 'PRESENT', remarks: 'Arrived after medical' },
          ],
        });

      expect(res2.status).toBe(200);

      // Verify still strictly 1 session exists
      const sessionsCount2 = await prisma.attendanceSession.count({
        where: { class: 'PHYSICS-CLASS', section: 'A', date: new Date(testDate) },
      });
      expect(sessionsCount2).toBe(1);

      // Verify records updated and no duplicate records
      const records = await prisma.attendanceRecord.findMany({
        where: { session: { class: 'PHYSICS-CLASS', section: 'A', date: new Date(testDate) } },
      });
      expect(records.length).toBe(2);

      const recA = records.find((r) => r.studentId === testStudentA.id);
      expect(recA?.status).toBe('LATE');
      expect(recA?.remarks).toBe('Late by 10 mins');

      const recB = records.find((r) => r.studentId === testStudentB.id);
      expect(recB?.status).toBe('PRESENT');
      expect(recB?.remarks).toBe('Arrived after medical');
    });

    it('4.2 should allow student to view personal attendance and block cross-student queries', async () => {
      const alphaToken = jwt.sign(
        { userId: testStudentA.user.id, email: testStudentA.user.email, role: 'STUDENT', name: testStudentA.name },
        ENV.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Student Alpha views own attendance
      const myRes = await request(app)
        .get('/api/attendance/my-attendance')
        .set('Authorization', `Bearer ${alphaToken}`);

      expect(myRes.status).toBe(200);
      expect(myRes.body.success).toBe(true);
      expect(myRes.body.data.student.id).toBe(testStudentA.id);
      expect(myRes.body.data.history.length).toBeGreaterThan(0);

      // Student Alpha calling teacher session listing (should return 403)
      const blockedSess = await request(app)
        .get('/api/attendance/sessions')
        .set('Authorization', `Bearer ${alphaToken}`);
      expect(blockedSess.status).toBe(403);
    });

    it('4.3 should lock Clerk out of every attendance endpoint with 403', async () => {
      const endpoints = [
        request(app).get('/api/attendance/sessions').set('Authorization', `Bearer ${clerkToken}`),
        request(app).get('/api/attendance/reports').set('Authorization', `Bearer ${clerkToken}`),
        request(app).post('/api/attendance/mark').set('Authorization', `Bearer ${clerkToken}`).send({}),
      ];

      const responses = await Promise.all(endpoints);
      responses.forEach((res) => {
        expect(res.status).toBe(403);
      });
    });

    it('4.4 should verify Admin attendance reports calculation matches raw DB rows by hand', async () => {
      const res = await request(app)
        .get('/api/attendance/reports?class=PHYSICS-CLASS&section=A')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const rows = res.body.data;

      // Verify Student B: 1 session, 1 PRESENT -> 100%
      const rowB = rows.find((r: any) => r.studentId === testStudentB.id);
      expect(rowB).toBeDefined();
      expect(rowB.total).toBe(1);
      expect(rowB.present).toBe(1);
      expect(rowB.percentage).toBe(100);

      // Verify Student A: 1 session, 1 LATE -> 50%
      const rowA = rows.find((r: any) => r.studentId === testStudentA.id);
      expect(rowA).toBeDefined();
      expect(rowA.total).toBe(1);
      expect(rowA.late).toBe(1);
      expect(rowA.percentage).toBe(50);
    });

    it('4.5 should export attendance report as CSV and match database ground truth', async () => {
      const res = await request(app)
        .get('/api/attendance/reports/export?class=PHYSICS-CLASS&section=A')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('Roll Number,Student Name,Class,Section,Total Sessions,Present,Absent,Late,Attendance %');
      expect(res.text).toContain('Student Alpha');
      expect(res.text).toContain('Student Beta');
    });
  });

  // =========================================================================
  // SECTION 5: UNIFIED STUDENT PROFILE INTEGRATION & CODE-LEVEL CHECK
  // =========================================================================
  describe('5. Unified Student Profile Verification', () => {
    let sampleStudent: any;

    beforeAll(async () => {
      sampleStudent = await prisma.student.findFirst({
        where: { status: 'ACTIVE' },
        include: { user: true },
      });
    });

    it('5.1 should return unified profile with real Admissions, live Fees calculation, and Attendance', async () => {
      const res = await request(app)
        .get(`/api/students/${sampleStudent.id}/profile`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { student, fees, attendance } = res.body.data;

      // 1. Student Dossier check
      expect(student.id).toBe(sampleStudent.id);
      expect(student.rollNumber).toBe(sampleStudent.rollNumber);
      expect(student.user).toBeDefined();

      // 2. Fees calculation check
      expect(fees).toBeDefined();
      expect(typeof fees.totalAssigned).toBe('number');
      expect(typeof fees.totalPaid).toBe('number');
      expect(typeof fees.totalPending).toBe('number');
      expect(Array.isArray(fees.heads)).toBe(true);

      // Verify exact parity with CalculationService
      const directCalc = await CalculationService.getStudentFeeCalculation(sampleStudent.id);
      expect(fees.totalAssigned).toBe(directCalc.totalAssigned);
      expect(fees.totalPaid).toBe(directCalc.totalPaid);
      expect(fees.totalPending).toBe(directCalc.totalPending);

      // 3. Attendance check
      expect(attendance).toBeDefined();
      expect(typeof attendance.percentage).toBe('number');
      expect(Array.isArray(attendance.recentRecords)).toBe(true);
    });

    it('5.2 should reflect a new fee payment immediately on the unified profile without server restart', async () => {
      // Create a fresh structure and assignment with ₹5,000 due to guarantee valid headroom for ₹500 payment
      const liveStructure = await prisma.feeStructure.create({
        data: {
          feeHead: 'Other',
          class: `VERIFY-${Date.now()}`,
          batch: '2026',
          academicYear: '2026-2027',
          amount: 5000.0,
          dueDate: new Date('2026-12-31'),
        },
      });

      const assignment = await prisma.feeAssignment.create({
        data: {
          studentId: sampleStudent.id,
          feeStructureId: liveStructure.id,
        },
      });

      const initialProfile = await request(app)
        .get(`/api/students/${sampleStudent.id}/profile`)
        .set('Authorization', `Bearer ${adminToken}`);

      const initialPaid = initialProfile.body.data.fees.totalPaid;

      // Record ₹500 payment
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${clerkToken}`)
        .send({
          studentId: sampleStudent.id,
          feeAssignmentId: assignment.id,
          amount: 500.0,
          paymentMode: 'CASH',
          referenceNumber: `LIVE-VERIFY-${Date.now()}`,
        });

      // Fetch profile again immediately
      const updatedProfile = await request(app)
        .get(`/api/students/${sampleStudent.id}/profile`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(updatedProfile.body.data.fees.totalPaid).toBe(initialPaid + 500.0);
    });

    it('5.3 should allow student to view own profile but return 403 when viewing another student', async () => {
      const otherStudent = await prisma.student.findFirst({
        where: { id: { not: sampleStudent.id }, status: 'ACTIVE' },
        include: { user: true },
      });

      if (otherStudent && sampleStudent.user) {
        const studentAToken = jwt.sign(
          { userId: sampleStudent.user.id, email: sampleStudent.user.email, role: 'STUDENT', name: sampleStudent.name },
          ENV.JWT_SECRET,
          { expiresIn: '1h' }
        );

        // Can view own profile
        const ownRes = await request(app)
          .get('/api/students/me/profile')
          .set('Authorization', `Bearer ${studentAToken}`);
        expect(ownRes.status).toBe(200);
        expect(ownRes.body.data.student.id).toBe(sampleStudent.id);

        // Cannot view other student's profile
        const otherRes = await request(app)
          .get(`/api/students/${otherStudent.id}/profile`)
          .set('Authorization', `Bearer ${studentAToken}`);
        expect(otherRes.status).toBe(403);
      }
    });
  });
});
