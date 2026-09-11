import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { ENV } from '../src/config/env';

describe('6. STUDENT RECORDS, TEACHER MANAGEMENT & ATTENDANCE MODULE', () => {
  let adminToken: string;
  let clerkToken: string;
  let teacherToken: string;
  let teacher2Token: string;
  let student1Token: string;
  let student2Token: string;

  let testAdminUser: any;
  let testClerkUser: any;
  let testTeacherUser: any;
  let testTeacher2User: any;
  let testStudent1: any;
  let testStudent2: any;

  beforeAll(async () => {
    const validHash = await bcrypt.hash('TestPass@123', 10);

    // 1. Fetch or create Admin
    testAdminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!testAdminUser) {
      testAdminUser = await prisma.user.create({
        data: {
          name: 'Admin Test',
          email: `admin_test_${Date.now()}@college.edu`,
          passwordHash: validHash,
          role: 'ADMIN',
        },
      });
    }

    // 2. Fetch or create Clerk
    testClerkUser = await prisma.user.findFirst({ where: { role: 'CLERK' } });
    if (!testClerkUser) {
      testClerkUser = await prisma.user.create({
        data: {
          name: 'Clerk Test',
          email: `clerk_test_${Date.now()}@college.edu`,
          passwordHash: validHash,
          role: 'CLERK',
        },
      });
    }

    // 3. Create Teacher 1 (Assigned to 'B.Tech CSE' Section 'A')
    const teacherUser1 = await prisma.user.create({
      data: {
        name: 'Teacher CSE A',
        email: `teacher1_${Date.now()}@college.edu`,
        passwordHash: validHash,
        role: 'TEACHER',
      },
    });
    const teacherProfile1 = await prisma.teacher.create({
      data: {
        userId: teacherUser1.id,
        employeeId: `EMP-T1-${Date.now()}`,
        subjectsTaught: ['Algorithms', 'Data Structures'],
        classesAssigned: [{ class: 'B.Tech CSE', section: 'A' }],
      },
    });
    testTeacherUser = { ...teacherUser1, teacher: teacherProfile1 };

    // 4. Create Teacher 2 (Assigned ONLY to 'B.Tech IT' Section 'A')
    const teacherUser2 = await prisma.user.create({
      data: {
        name: 'Teacher IT A',
        email: `teacher2_${Date.now()}@college.edu`,
        passwordHash: validHash,
        role: 'TEACHER',
      },
    });
    const teacherProfile2 = await prisma.teacher.create({
      data: {
        userId: teacherUser2.id,
        employeeId: `EMP-T2-${Date.now()}`,
        subjectsTaught: ['Networks'],
        classesAssigned: [{ class: 'B.Tech IT', section: 'A' }],
      },
    });
    testTeacher2User = { ...teacherUser2, teacher: teacherProfile2 };

    // 5. Create Student 1 in B.Tech CSE Section A
    const studentUser1 = await prisma.user.create({
      data: {
        name: 'Student One CSE',
        email: `student1_${Date.now()}@college.edu`,
        passwordHash: validHash,
        role: 'STUDENT',
      },
    });
    testStudent1 = await prisma.student.create({
      data: {
        userId: studentUser1.id,
        rollNumber: `ROLL-S1-${Date.now()}`,
        admissionNumber: `ADM-S1-${Date.now()}`,
        name: 'Student One CSE',
        class: 'B.Tech CSE',
        batch: '2024-2028',
        section: 'A',
        admissionYear: 2024,
        contactNumber: '+919876500001',
        guardianName: 'Guardian One',
        guardianContact: '+919876500099',
        guardianRelation: 'Father',
        gender: 'Male',
        address: '123 Academic Way',
        status: 'ACTIVE',
      },
    });

    // 6. Create Student 2 in B.Tech CSE Section A
    const studentUser2 = await prisma.user.create({
      data: {
        name: 'Student Two CSE',
        email: `student2_${Date.now()}@college.edu`,
        passwordHash: validHash,
        role: 'STUDENT',
      },
    });
    testStudent2 = await prisma.student.create({
      data: {
        userId: studentUser2.id,
        rollNumber: `ROLL-S2-${Date.now()}`,
        admissionNumber: `ADM-S2-${Date.now()}`,
        name: 'Student Two CSE',
        class: 'B.Tech CSE',
        batch: '2024-2028',
        section: 'A',
        admissionYear: 2024,
        contactNumber: '+919876500002',
        status: 'ACTIVE',
      },
    });

    // Generate JWTs
    adminToken = jwt.sign(
      { userId: testAdminUser.id, email: testAdminUser.email, role: 'ADMIN', name: testAdminUser.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    clerkToken = jwt.sign(
      { userId: testClerkUser.id, email: testClerkUser.email, role: 'CLERK', name: testClerkUser.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    teacherToken = jwt.sign(
      {
        userId: testTeacherUser.id,
        email: testTeacherUser.email,
        role: 'TEACHER',
        name: testTeacherUser.name,
        teacherId: testTeacherUser.teacher.id,
      },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    teacher2Token = jwt.sign(
      {
        userId: testTeacher2User.id,
        email: testTeacher2User.email,
        role: 'TEACHER',
        name: testTeacher2User.name,
        teacherId: testTeacher2User.teacher.id,
      },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    student1Token = jwt.sign(
      { userId: studentUser1.id, email: studentUser1.email, role: 'STUDENT', name: studentUser1.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    student2Token = jwt.sign(
      { userId: studentUser2.id, email: studentUser2.email, role: 'STUDENT', name: studentUser2.name },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('6.1 Student Records & Admissions CRUD', () => {
    let createdStudentId: string;
    const testRoll = `ROLL-ADM-${Date.now()}`;
    const testAdmNo = `ADM-NO-${Date.now()}`;

    it('should create a new student with full admissions details and auto-create User', async () => {
      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admissions Candidate',
          email: `candidate_${Date.now()}@college.edu`,
          rollNumber: testRoll,
          admissionNumber: testAdmNo,
          class: 'B.Tech CSE',
          batch: '2024-2028',
          section: 'B',
          admissionYear: 2024,
          admissionDate: '2024-07-20',
          contactNumber: '+919811122233',
          guardianName: 'Paternal Guardian',
          guardianContact: '+919811122244',
          guardianRelation: 'Father',
          dateOfBirth: '2006-03-15',
          gender: 'Female',
          address: '42 Sector 15, Chandigarh',
          documentsSubmitted: { aadhaar: true, birthCertificate: true },
          status: 'ACTIVE',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.rollNumber).toBe(testRoll);
      expect(res.body.data.student.section).toBe('B');
      expect(res.body.data.user.role).toBe('STUDENT');
      createdStudentId = res.body.data.student.id;
    });

    it('should filter students by class, section, and status', async () => {
      const res = await request(app)
        .get('/api/students?class=B.Tech%20CSE&section=B&status=ACTIVE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((s: any) => s.id === createdStudentId);
      expect(found).toBeDefined();
      expect(found.section).toBe('B');
    });

    it('should update student details cleanly', async () => {
      const res = await request(app)
        .put(`/api/students/${createdStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          guardianContact: '+919999988888',
          address: 'Updated Residential Address 101',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await prisma.student.findUnique({ where: { id: createdStudentId } });
      expect(check?.guardianContact).toBe('+919999988888');
      expect(check?.address).toBe('Updated Residential Address 101');
    });

    it('should deactivate a student without deleting the record (soft deactivation)', async () => {
      const res = await request(app)
        .patch(`/api/students/${createdStudentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const student = await prisma.student.findUnique({
        where: { id: createdStudentId },
        include: { user: true },
      });
      expect(student).not.toBeNull();
      expect(student?.status).toBe('INACTIVE');
      expect(student?.user.isActive).toBe(false);
    });
  });

  describe('6.2 Teacher Management CRUD', () => {
    let createdTeacherId: string;
    const empId = `EMP-TEST-${Date.now()}`;

    it('should allow Admin to create a teacher account with class assignments', async () => {
      const res = await request(app)
        .post('/api/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Prof. Test Mentor',
          email: `mentor_${Date.now()}@college.edu`,
          employeeId: empId,
          subjectsTaught: ['Data Mining', 'Machine Learning'],
          classesAssigned: [
            { class: 'B.Tech CSE', section: 'A' },
            { class: 'B.Tech CSE', section: 'B' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe(empId);
      createdTeacherId = res.body.data.id;
    });

    it('should allow Admin to view and update teacher details', async () => {
      const res = await request(app)
        .put(`/api/teachers/${createdTeacherId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subjectsTaught: ['Data Mining', 'Deep Learning'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const teacher = await prisma.teacher.findUnique({ where: { id: createdTeacherId } });
      expect(teacher?.subjectsTaught).toContain('Deep Learning');
    });

    it('should allow Admin to reset a teacher password', async () => {
      const res = await request(app)
        .post(`/api/teachers/${createdTeacherId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'NewSecurePass@123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const teacher = await prisma.teacher.findUnique({
        where: { id: createdTeacherId },
        include: { user: true },
      });
      const match = await bcrypt.compare('NewSecurePass@123', teacher!.user.passwordHash);
      expect(match).toBe(true);
    });
  });

  describe('6.3 Attendance Module: Marking, Sessions & Unique Constraints', () => {
    const testDate = '2026-10-15';

    beforeAll(async () => {
      await prisma.attendanceSession.deleteMany({
        where: {
          class: 'B.Tech CSE',
          section: 'A',
          date: new Date(`${testDate}T00:00:00.000Z`),
        },
      });
    });

    it('should allow an assigned Teacher to mark attendance for their class/section', async () => {
      const res = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          class: 'B.Tech CSE',
          section: 'A',
          date: testDate,
          records: [
            { studentId: testStudent1.id, status: 'PRESENT' },
            { studentId: testStudent2.id, status: 'ABSENT', remarks: 'Sick leave' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recordsCount).toBe(2);
    });

    it('should respect unique constraint and update existing session when re-marking (no duplicate sessions)', async () => {
      // Re-mark for same class, section, date with updated status for testStudent2
      const res = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          class: 'B.Tech CSE',
          section: 'A',
          date: testDate,
          records: [
            { studentId: testStudent1.id, status: 'PRESENT' },
            { studentId: testStudent2.id, status: 'LATE', remarks: 'Arrived at 9:30' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify that only 1 AttendanceSession exists for that (class, section, date)
      const sessions = await prisma.attendanceSession.findMany({
        where: {
          class: 'B.Tech CSE',
          section: 'A',
          date: new Date(`${testDate}T00:00:00.000Z`),
        },
      });
      expect(sessions.length).toBe(1);

      // Verify records were updated, not duplicated
      const records = await prisma.attendanceRecord.findMany({
        where: { attendanceSessionId: sessions[0].id },
      });
      expect(records.length).toBe(2);

      const s2Record = records.find((r) => r.studentId === testStudent2.id);
      expect(s2Record?.status).toBe('LATE');
    });

    it('should strictly return 403 when a Teacher attempts to mark attendance for an unassigned class/section', async () => {
      // Teacher 2 is assigned ONLY to 'B.Tech IT:A', attempting to mark 'B.Tech CSE:A'
      const res = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${teacher2Token}`)
        .send({
          class: 'B.Tech CSE',
          section: 'A',
          date: testDate,
          records: [{ studentId: testStudent1.id, status: 'PRESENT' }],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('should strictly return 403 when a CLERK attempts to access any attendance endpoint', async () => {
      // 1. Clerk calling attendance marking
      const markRes = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${clerkToken}`)
        .send({
          class: 'B.Tech CSE',
          section: 'A',
          date: testDate,
          records: [{ studentId: testStudent1.id, status: 'PRESENT' }],
        });
      expect(markRes.status).toBe(403);

      // 2. Clerk calling attendance reports
      const reportRes = await request(app)
        .get('/api/attendance/reports')
        .set('Authorization', `Bearer ${clerkToken}`);
      expect(reportRes.status).toBe(403);

      // 3. Clerk calling attendance roster
      const rosterRes = await request(app)
        .get('/api/attendance/roster?class=B.Tech%20CSE&section=A')
        .set('Authorization', `Bearer ${clerkToken}`);
      expect(rosterRes.status).toBe(403);
    });

    it('should strictly return 403 when an ADMIN attempts to mark attendance (Teacher-only action)', async () => {
      const res = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          class: 'B.Tech CSE',
          section: 'A',
          date: testDate,
          records: [{ studentId: testStudent1.id, status: 'PRESENT' }],
        });

      expect(res.status).toBe(403);
    });

    it('should allow Admin to view aggregate attendance reports and export CSV', async () => {
      const res = await request(app)
        .get('/api/attendance/reports?class=B.Tech%20CSE&section=A')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const csvRes = await request(app)
        .get('/api/attendance/reports/export?class=B.Tech%20CSE&section=A')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(csvRes.status).toBe(200);
      expect(csvRes.headers['content-type']).toContain('text/csv');
      expect(csvRes.text).toContain('Roll Number,Student Name');
    });

    it('should allow Student to view their own attendance, but return 403 if attempting to view another student', async () => {
      // 1. Student 1 views their own attendance via /my-attendance
      const myRes = await request(app)
        .get('/api/attendance/my-attendance')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(myRes.status).toBe(200);
      expect(myRes.body.success).toBe(true);
      expect(myRes.body.data.student.id).toBe(testStudent1.id);
      expect(myRes.body.data.summary).toBeDefined();

      // 2. Student 1 attempts to access another student's profile/attendance
      const otherRes = await request(app)
        .get(`/api/students/${testStudent2.id}/profile`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(otherRes.status).toBe(403);
      expect(otherRes.body.success).toBe(false);
    });
  });

  describe('6.4 Unified Student Profile Integration', () => {
    it('should return Admissions details, Fees summary from CalculationService, and Attendance statistics in a single unified view', async () => {
      const res = await request(app)
        .get(`/api/students/${testStudent1.id}/profile`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      // 1. Admissions / Personal info
      expect(data.student).toBeDefined();
      expect(data.student.name).toBe('Student One CSE');
      expect(data.student.guardianName).toBe('Guardian One');
      expect(data.student.admissionNumber).toBeDefined();

      // 2. Fees summary (integrated from CalculationService)
      expect(data.fees).toBeDefined();
      expect(typeof data.fees.totalAssigned).toBe('number');
      expect(typeof data.fees.totalPaid).toBe('number');
      expect(typeof data.fees.totalPending).toBe('number');

      // 3. Attendance summary (integrated from Attendance module)
      expect(data.attendance).toBeDefined();
      expect(typeof data.attendance.percentage).toBe('number');
      expect(typeof data.attendance.totalSessions).toBe('number');
      expect(Array.isArray(data.attendance.recentRecords)).toBe(true);
    });
  });
});
