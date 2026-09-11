import {
  PrismaClient,
  Role,
  StudentStatus,
  AttendanceStatus,
  FeeHead,
  PaymentMode,
  TransactionStatus,
  BookIssueStatus,
  FineStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for College ERP (Admissions, Fees, Teachers & Attendance)...');

  // Clean existing data in reverse relation order
  await prisma.bookIssue.deleteMany();
  await prisma.book.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.feeAssignment.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Purged existing database tables');

  // Credentials configuration (supports custom env vars for real college credentials)
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@college.edu').toLowerCase().trim();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123';
  const adminName = process.env.INITIAL_ADMIN_NAME || 'Dr. Ramesh Sharma (Comptroller)';

  const clerkEmail = (process.env.INITIAL_CLERK_EMAIL || 'clerk.raj@college.edu').toLowerCase().trim();
  const clerkPassword = process.env.INITIAL_CLERK_PASSWORD || 'Clerk@123';
  const clerkName = process.env.INITIAL_CLERK_NAME || 'Rajesh Kumar (Senior Cashier)';

  const teacherEmail = (process.env.INITIAL_TEACHER_EMAIL || 'teacher.sunita@college.edu').toLowerCase().trim();
  const teacherPassword = process.env.INITIAL_TEACHER_PASSWORD || 'Teacher@123';

  const studentEmail = (process.env.INITIAL_STUDENT_EMAIL || 'student.aarav@college.edu').toLowerCase().trim();
  const studentPassword = process.env.INITIAL_STUDENT_PASSWORD || 'Student@123';

  const defaultPasswordHash = await bcrypt.hash(adminPassword, 10);
  const clerkPasswordHash = await bcrypt.hash(clerkPassword, 10);
  const teacherPasswordHash = await bcrypt.hash(teacherPassword, 10);
  const studentPasswordHash = await bcrypt.hash(studentPassword, 10);

  // 1. Create Admin User
  const admin = await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // 2. Create Clerks
  const clerk1 = await prisma.user.create({
    data: {
      name: clerkName,
      email: clerkEmail,
      passwordHash: clerkPasswordHash,
      role: Role.CLERK,
      isActive: true,
    },
  });

  const clerk2 = await prisma.user.create({
    data: {
      name: 'Anita Verma (Accounts Officer)',
      email: 'clerk.anita@college.edu',
      passwordHash: clerkPasswordHash,
      role: Role.CLERK,
      isActive: true,
    },
  });

  console.log('👤 Created Admin & Clerk accounts');

  // 3. Create Teachers
  const teacherUsersData = [
    {
      name: 'Prof. Sunita Sharma',
      email: teacherEmail,
      employeeId: 'TCH-101',
      subjectsTaught: ['Data Structures & Algorithms', 'Database Management Systems'],
      classesAssigned: [
        { class: 'B.Tech CSE', section: 'A' },
        { class: 'B.Tech CSE', section: 'B' },
      ],
    },
    {
      name: 'Dr. Arvind Verma',
      email: 'teacher.arvind@college.edu',
      employeeId: 'TCH-102',
      subjectsTaught: ['Computer Networks', 'Cloud Computing Architecture'],
      classesAssigned: [
        { class: 'B.Tech CSE', section: 'A' },
        { class: 'B.Tech IT', section: 'A' },
      ],
    },
    {
      name: 'Prof. Meera Nair',
      email: 'teacher.meera@college.edu',
      employeeId: 'TCH-103',
      subjectsTaught: ['Marketing Management', 'Business Ethics & Law'],
      classesAssigned: [{ class: 'BBA', section: 'A' }],
    },
    {
      name: 'Dr. Vikram Saxena',
      email: 'teacher.vikram@college.edu',
      employeeId: 'TCH-104',
      subjectsTaught: ['Corporate Financial Strategy', 'Managerial Economics'],
      classesAssigned: [{ class: 'MBA', section: 'A' }],
    },
  ];

  const createdTeachers: any[] = [];
  for (const t of teacherUsersData) {
    const user = await prisma.user.create({
      data: {
        name: t.name,
        email: t.email,
        passwordHash: teacherPasswordHash,
        role: Role.TEACHER,
        isActive: true,
      },
    });

    const teacher = await prisma.teacher.create({
      data: {
        userId: user.id,
        employeeId: t.employeeId,
        subjectsTaught: t.subjectsTaught,
        classesAssigned: t.classesAssigned,
      },
    });

    createdTeachers.push({ user, teacher });
  }

  console.log(`👨‍🏫 Created ${createdTeachers.length} Faculty / Teacher accounts`);

  // 4. Create Fee Structures for Academic Year 2026-2027
  const currentAcademicYear = '2026-2027';

  const feeStructuresData = [
    // B.Tech CSE (Batch 2024-2028)
    {
      class: 'B.Tech CSE',
      batch: '2024-2028',
      academicYear: currentAcademicYear,
      feeHead: FeeHead.Tuition,
      amount: 85000,
      dueDate: new Date('2026-09-30T18:30:00.000Z'),
    },
    {
      class: 'B.Tech CSE',
      batch: '2024-2028',
      academicYear: currentAcademicYear,
      feeHead: FeeHead.Hostel,
      amount: 45000,
      dueDate: new Date('2026-10-15T18:30:00.000Z'),
    },
    {
      class: 'B.Tech CSE',
      batch: '2024-2028',
      academicYear: currentAcademicYear,
      feeHead: FeeHead.Transport,
      amount: 18000,
      dueDate: new Date('2026-10-31T18:30:00.000Z'),
    },
    {
      class: 'B.Tech CSE',
      batch: '2024-2028',
      academicYear: currentAcademicYear,
      feeHead: FeeHead.Exam,
      amount: 6500,
      dueDate: new Date('2026-11-15T18:30:00.000Z'),
    },

    // B.Tech IT (Batch 2024-2028)
    {
      class: 'B.Tech IT',
      batch: '2024-2028',
      academicYear: currentAcademicYear,
      feeHead: FeeHead.Tuition,
      amount: 80000,
      dueDate: new Date('2026-09-30T18:30:00.000Z'),
    },
    {
      class: 'B.Tech IT',
      batch: '2024-2028',
      academicYear: currentAcademicYear,
      feeHead: FeeHead.Hostel,
      amount: 45000,
      dueDate: new Date('2026-10-15T18:30:00.000Z'),
    },
    {
      class: 'B.Tech IT',
      batch: '2024-2028',
      academicYear: currentAcademicYear,
      feeHead: FeeHead.Exam,
      amount: 6500,
      dueDate: new Date('2026-11-15T18:30:00.000Z'),
    },

    // BBA (Batch 2025-2028)
    {
      class: 'BBA',
      batch: '2025-2028',
      academicYear: currentAcademicYear,
      feeHead: FeeHead.Tuition,
      amount: 55000,
      dueDate: new Date('2026-09-20T18:30:00.000Z'),
    },
    {
      class: 'BBA',
      batch: '2025-2028',
      academicYear: currentAcademicYear,
      feeHead: FeeHead.Exam,
      amount: 5000,
      dueDate: new Date('2026-11-05T18:30:00.000Z'),
    },

    // MBA (Batch 2025-2027)
    {
      class: 'MBA',
      batch: '2025-2027',
      academicYear: currentAcademicYear,
      feeHead: FeeHead.Tuition,
      amount: 110000,
      dueDate: new Date('2026-09-25T18:30:00.000Z'),
    },
    {
      class: 'MBA',
      batch: '2025-2027',
      academicYear: currentAcademicYear,
      feeHead: FeeHead.Hostel,
      amount: 50000,
      dueDate: new Date('2026-10-10T18:30:00.000Z'),
    },
    {
      class: 'MBA',
      batch: '2025-2027',
      academicYear: currentAcademicYear,
      feeHead: FeeHead.Exam,
      amount: 8000,
      dueDate: new Date('2026-11-20T18:30:00.000Z'),
    },
  ];

  const createdFeeStructures: Record<string, any[]> = {};

  for (const item of feeStructuresData) {
    const fs = await prisma.feeStructure.create({ data: item });
    if (!createdFeeStructures[item.class]) {
      createdFeeStructures[item.class] = [];
    }
    createdFeeStructures[item.class].push(fs);
  }

  console.log(`📋 Created ${feeStructuresData.length} fee structures`);

  // 5. Create Students with full Admissions info
  const studentsSeed = [
    {
      name: 'Aarav Mehta',
      email: studentEmail,
      rollNumber: '24CSE0101',
      admissionNumber: 'ADM-2024-CSE-0101',
      class: 'B.Tech CSE',
      batch: '2024-2028',
      section: 'A',
      admissionYear: 2024,
      admissionDate: new Date('2024-07-15T09:00:00.000Z'),
      contactNumber: '+91 98765 43210',
      guardianName: 'Suresh Mehta',
      guardianContact: '+91 98765 43299',
      guardianRelation: 'Father',
      dateOfBirth: new Date('2006-04-12T00:00:00.000Z'),
      gender: 'Male',
      address: 'Flat 402, Nilgiri Heights, Vasant Vihar, New Delhi - 110057',
      documentsSubmitted: { aadhaar: true, birthCertificate: true, transferCertificate: true, marksheets: true },
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Priya Nair',
      email: 'priya.nair@college.edu',
      rollNumber: '24CSE0102',
      admissionNumber: 'ADM-2024-CSE-0102',
      class: 'B.Tech CSE',
      batch: '2024-2028',
      section: 'A',
      admissionYear: 2024,
      admissionDate: new Date('2024-07-16T09:30:00.000Z'),
      contactNumber: '+91 98765 43211',
      guardianName: 'Gopalakrishnan Nair',
      guardianContact: '+91 98765 43298',
      guardianRelation: 'Father',
      dateOfBirth: new Date('2006-08-22T00:00:00.000Z'),
      gender: 'Female',
      address: '14/B, Rosewood Manor, Indiranagar, Bengaluru - 560038',
      documentsSubmitted: { aadhaar: true, birthCertificate: true, transferCertificate: true, marksheets: true },
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Rohan Gupta',
      email: 'rohan.gupta@college.edu',
      rollNumber: '24CSE0103',
      admissionNumber: 'ADM-2024-CSE-0103',
      class: 'B.Tech CSE',
      batch: '2024-2028',
      section: 'A',
      admissionYear: 2024,
      admissionDate: new Date('2024-07-18T10:00:00.000Z'),
      contactNumber: '+91 98765 43212',
      guardianName: 'Vikas Gupta',
      guardianContact: '+91 98765 43297',
      guardianRelation: 'Father',
      dateOfBirth: new Date('2005-11-30T00:00:00.000Z'),
      gender: 'Male',
      address: '88, Civil Lines, Jaipur, Rajasthan - 302006',
      documentsSubmitted: { aadhaar: true, birthCertificate: true, transferCertificate: true, marksheets: true },
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Siddharth Rao',
      email: 'siddharth.rao@college.edu',
      rollNumber: '24CSE0104',
      admissionNumber: 'ADM-2024-CSE-0104',
      class: 'B.Tech CSE',
      batch: '2024-2028',
      section: 'A',
      admissionYear: 2024,
      admissionDate: new Date('2024-07-20T11:00:00.000Z'),
      contactNumber: '+91 98765 43213',
      guardianName: 'Raghav Rao',
      guardianContact: '+91 98765 43296',
      guardianRelation: 'Father',
      dateOfBirth: new Date('2006-01-14T00:00:00.000Z'),
      gender: 'Male',
      address: 'Plot 55, Jubilee Hills, Hyderabad - 500033',
      documentsSubmitted: { aadhaar: true, birthCertificate: true, transferCertificate: true, marksheets: false },
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Sneha Reddy',
      email: 'sneha.reddy@college.edu',
      rollNumber: '24IT0201',
      admissionNumber: 'ADM-2024-IT-0201',
      class: 'B.Tech IT',
      batch: '2024-2028',
      section: 'A',
      admissionYear: 2024,
      admissionDate: new Date('2024-07-21T09:15:00.000Z'),
      contactNumber: '+91 98765 43214',
      guardianName: 'K. V. Reddy',
      guardianContact: '+91 98765 43295',
      guardianRelation: 'Father',
      dateOfBirth: new Date('2006-06-18T00:00:00.000Z'),
      gender: 'Female',
      address: 'House 12, Sector 4, Gandhinagar - 382006',
      documentsSubmitted: { aadhaar: true, birthCertificate: true, transferCertificate: true, marksheets: true },
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Vikram Malhotra',
      email: 'vikram.malhotra@college.edu',
      rollNumber: '24IT0202',
      admissionNumber: 'ADM-2024-IT-0202',
      class: 'B.Tech IT',
      batch: '2024-2028',
      section: 'A',
      admissionYear: 2024,
      admissionDate: new Date('2024-07-22T10:30:00.000Z'),
      contactNumber: '+91 98765 43215',
      guardianName: 'Sunil Malhotra',
      guardianContact: '+91 98765 43294',
      guardianRelation: 'Father',
      dateOfBirth: new Date('2005-09-05T00:00:00.000Z'),
      gender: 'Male',
      address: 'B-101, Palm Court, Malad West, Mumbai - 400064',
      documentsSubmitted: { aadhaar: true, birthCertificate: true, transferCertificate: true, marksheets: true },
      photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Ananya Iyer',
      email: 'ananya.iyer@college.edu',
      rollNumber: '25BBA0301',
      admissionNumber: 'ADM-2025-BBA-0301',
      class: 'BBA',
      batch: '2025-2028',
      section: 'A',
      admissionYear: 2025,
      admissionDate: new Date('2025-06-25T11:00:00.000Z'),
      contactNumber: '+91 98765 43216',
      guardianName: 'S. Ramanathan Iyer',
      guardianContact: '+91 98765 43293',
      guardianRelation: 'Father',
      dateOfBirth: new Date('2007-02-10T00:00:00.000Z'),
      gender: 'Female',
      address: '22, Anna Nagar West, Chennai - 600040',
      documentsSubmitted: { aadhaar: true, birthCertificate: true, transferCertificate: true, marksheets: true },
      photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Karan Patel',
      email: 'karan.patel@college.edu',
      rollNumber: '25BBA0302',
      admissionNumber: 'ADM-2025-BBA-0302',
      class: 'BBA',
      batch: '2025-2028',
      section: 'A',
      admissionYear: 2025,
      admissionDate: new Date('2025-06-28T14:00:00.000Z'),
      contactNumber: '+91 98765 43217',
      guardianName: 'Dinesh Patel',
      guardianContact: '+91 98765 43292',
      guardianRelation: 'Father',
      dateOfBirth: new Date('2007-05-19T00:00:00.000Z'),
      gender: 'Male',
      address: '304, Shivalik Hills, Satellite, Ahmedabad - 380015',
      documentsSubmitted: { aadhaar: true, birthCertificate: true, transferCertificate: true, marksheets: true },
      photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Pooja Deshmukh',
      email: 'pooja.deshmukh@college.edu',
      rollNumber: '25MBA0401',
      admissionNumber: 'ADM-2025-MBA-0401',
      class: 'MBA',
      batch: '2025-2027',
      section: 'A',
      admissionYear: 2025,
      admissionDate: new Date('2025-06-20T10:00:00.000Z'),
      contactNumber: '+91 98765 43218',
      guardianName: 'Ajit Deshmukh',
      guardianContact: '+91 98765 43291',
      guardianRelation: 'Father',
      dateOfBirth: new Date('2003-12-04T00:00:00.000Z'),
      gender: 'Female',
      address: 'C-7, Model Colony, Shivajinagar, Pune - 411016',
      documentsSubmitted: { aadhaar: true, birthCertificate: true, transferCertificate: true, marksheets: true },
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Devendra Joshi',
      email: 'devendra.joshi@college.edu',
      rollNumber: '25MBA0402',
      admissionNumber: 'ADM-2025-MBA-0402',
      class: 'MBA',
      batch: '2025-2027',
      section: 'A',
      admissionYear: 2025,
      admissionDate: new Date('2025-06-22T15:00:00.000Z'),
      contactNumber: '+91 98765 43219',
      guardianName: 'Mahesh Joshi',
      guardianContact: '+91 98765 43290',
      guardianRelation: 'Father',
      dateOfBirth: new Date('2003-07-17T00:00:00.000Z'),
      gender: 'Male',
      address: '502, Lakeview Apartments, Udaipur - 313001',
      documentsSubmitted: { aadhaar: true, birthCertificate: true, transferCertificate: true, marksheets: true },
      photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    },
  ];

  const createdStudents: any[] = [];

  for (const s of studentsSeed) {
    const user = await prisma.user.create({
      data: {
        name: s.name,
        email: s.email,
        passwordHash: studentPasswordHash,
        role: Role.STUDENT,
        isActive: true,
      },
    });

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        rollNumber: s.rollNumber,
        admissionNumber: s.admissionNumber,
        name: s.name,
        class: s.class,
        batch: s.batch,
        section: s.section,
        admissionYear: s.admissionYear,
        admissionDate: s.admissionDate,
        contactNumber: s.contactNumber,
        guardianName: s.guardianName,
        guardianContact: s.guardianContact,
        guardianRelation: s.guardianRelation,
        dateOfBirth: s.dateOfBirth,
        gender: s.gender,
        address: s.address,
        documentsSubmitted: s.documentsSubmitted,
        photoUrl: s.photoUrl,
        status: StudentStatus.ACTIVE,
      },
    });

    // Assign all fee structures belonging to this student's class
    const relevantStructures = createdFeeStructures[s.class] || [];
    for (const fs of relevantStructures) {
      await prisma.feeAssignment.create({
        data: {
          studentId: student.id,
          feeStructureId: fs.id,
        },
      });
    }

    createdStudents.push(student);
  }

  console.log(`🎓 Created ${createdStudents.length} students with full Admissions profile & auto-assigned fee heads`);

  // 6. Create Transactions (Payments & Reversals)
  const aarav = createdStudents[0];
  const aaravAssignments = await prisma.feeAssignment.findMany({
    where: { studentId: aarav.id },
    include: { feeStructure: true },
  });

  const aaravTuition = aaravAssignments.find((a) => a.feeStructure.feeHead === FeeHead.Tuition)!;
  const aaravExam = aaravAssignments.find((a) => a.feeStructure.feeHead === FeeHead.Exam)!;

  await prisma.transaction.create({
    data: {
      studentId: aarav.id,
      feeAssignmentId: aaravTuition.id,
      amount: 85000,
      paymentMode: PaymentMode.ONLINE_PLACEHOLDER,
      referenceNumber: 'UPI-HDFC-99281204',
      recordedByClerkId: clerk1.id,
      receiptNumber: 'RCP-202609-00001',
      status: TransactionStatus.SUCCESS,
      createdAt: new Date('2026-09-01T10:30:00.000Z'),
    },
  });

  await prisma.transaction.create({
    data: {
      studentId: aarav.id,
      feeAssignmentId: aaravExam.id,
      amount: 6500,
      paymentMode: PaymentMode.CASH,
      referenceNumber: 'CASH-REC-001',
      recordedByClerkId: clerk1.id,
      receiptNumber: 'RCP-202609-00002',
      status: TransactionStatus.SUCCESS,
      createdAt: new Date('2026-09-02T11:15:00.000Z'),
    },
  });

  // Priya Nair (B.Tech CSE): Partial payment of ₹40,000 on Tuition (85,000 due)
  const priya = createdStudents[1];
  const priyaAssignments = await prisma.feeAssignment.findMany({
    where: { studentId: priya.id },
    include: { feeStructure: true },
  });
  const priyaTuition = priyaAssignments.find((a) => a.feeStructure.feeHead === FeeHead.Tuition)!;

  await prisma.transaction.create({
    data: {
      studentId: priya.id,
      feeAssignmentId: priyaTuition.id,
      amount: 40000,
      paymentMode: PaymentMode.CHEQUE,
      referenceNumber: 'CHQ-SBI-582910',
      recordedByClerkId: clerk2.id,
      receiptNumber: 'RCP-202609-00003',
      status: TransactionStatus.SUCCESS,
      createdAt: new Date('2026-09-03T14:20:00.000Z'),
    },
  });

  // Ananya Iyer (BBA): Full Tuition Paid (₹55,000)
  const ananya = createdStudents[6];
  const ananyaAssignments = await prisma.feeAssignment.findMany({
    where: { studentId: ananya.id },
    include: { feeStructure: true },
  });
  const ananyaTuition = ananyaAssignments.find((a) => a.feeStructure.feeHead === FeeHead.Tuition)!;

  await prisma.transaction.create({
    data: {
      studentId: ananya.id,
      feeAssignmentId: ananyaTuition.id,
      amount: 55000,
      paymentMode: PaymentMode.CASH,
      referenceNumber: 'CASH-REC-002',
      recordedByClerkId: clerk2.id,
      receiptNumber: 'RCP-202609-00004',
      status: TransactionStatus.SUCCESS,
      createdAt: new Date('2026-09-04T09:45:00.000Z'),
    },
  });

  // Pooja Deshmukh (MBA): Full Tuition Paid (₹110,000)
  const pooja = createdStudents[8];
  const poojaAssignments = await prisma.feeAssignment.findMany({
    where: { studentId: pooja.id },
    include: { feeStructure: true },
  });
  const poojaTuition = poojaAssignments.find((a) => a.feeStructure.feeHead === FeeHead.Tuition)!;

  await prisma.transaction.create({
    data: {
      studentId: pooja.id,
      feeAssignmentId: poojaTuition.id,
      amount: 110000,
      paymentMode: PaymentMode.DD,
      referenceNumber: 'DD-ICICI-441092',
      recordedByClerkId: clerk1.id,
      receiptNumber: 'RCP-202609-00005',
      status: TransactionStatus.SUCCESS,
      createdAt: new Date('2026-09-06T15:30:00.000Z'),
    },
  });

  // Sneha Reddy (B.Tech IT): Reversal Flow
  const sneha = createdStudents[4];
  const snehaAssignments = await prisma.feeAssignment.findMany({
    where: { studentId: sneha.id },
    include: { feeStructure: true },
  });
  const snehaHostel = snehaAssignments.find((a) => a.feeStructure.feeHead === FeeHead.Hostel)!;

  const originalSnehaTx = await prisma.transaction.create({
    data: {
      studentId: sneha.id,
      feeAssignmentId: snehaHostel.id,
      amount: 45000,
      paymentMode: PaymentMode.CHEQUE,
      referenceNumber: 'CHQ-BOUNCE-33211',
      recordedByClerkId: clerk1.id,
      receiptNumber: 'RCP-202609-00006',
      status: TransactionStatus.SUCCESS,
      createdAt: new Date('2026-09-02T12:00:00.000Z'),
    },
  });

  await prisma.transaction.create({
    data: {
      studentId: sneha.id,
      feeAssignmentId: snehaHostel.id,
      amount: 45000,
      paymentMode: PaymentMode.CHEQUE,
      referenceNumber: 'REV-CHQ-BOUNCE-33211',
      recordedByClerkId: clerk1.id,
      receiptNumber: 'REV-202609-00001',
      status: TransactionStatus.REVERSED,
      reversalOfTransactionId: originalSnehaTx.id,
      reversalReason: 'Cheque bounced / Returned by drawee bank due to signature mismatch on instrument.',
      createdAt: new Date('2026-09-05T16:00:00.000Z'),
    },
  });

  console.log('💳 Seeded transactions including payments, partial payments, and audited reversal flow');

  // 7. Seed Attendance History for Past 3 Weeks (15 weekdays)
  console.log('📅 Seeding 3 weeks of realistic Attendance Sessions & Records...');

  // Map class to students
  const studentsByClassSection: Record<string, any[]> = {};
  for (const s of createdStudents) {
    const key = `${s.class}:${s.section}`;
    if (!studentsByClassSection[key]) studentsByClassSection[key] = [];
    studentsByClassSection[key].push(s);
  }

  // Teacher lookup:
  // Sunita: B.Tech CSE (Section A)
  // Arvind: B.Tech IT (Section A)
  // Meera: BBA (Section A)
  // Vikram: MBA (Section A)
  const teacherSunita = createdTeachers[0].user;
  const teacherArvind = createdTeachers[1].user;
  const teacherMeera = createdTeachers[2].user;
  const teacherVikram = createdTeachers[3].user;

  const classTeacherMap: Record<string, string> = {
    'B.Tech CSE:A': teacherSunita.id,
    'B.Tech IT:A': teacherArvind.id,
    'BBA:A': teacherMeera.id,
    'MBA:A': teacherVikram.id,
  };

  // Generate last 15 weekdays before today (2026-09-09)
  const sessionDates: Date[] = [];
  const cur = new Date('2026-09-08T00:00:00.000Z');
  while (sessionDates.length < 15) {
    const dayOfWeek = cur.getUTCDay();
    // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      sessionDates.push(new Date(cur));
    }
    cur.setUTCDate(cur.getUTCDate() - 1);
  }
  sessionDates.reverse(); // Chronological order

  let totalSessionsSeeded = 0;
  let totalRecordsSeeded = 0;

  for (const date of sessionDates) {
    for (const [classKey, studentsInClass] of Object.entries(studentsByClassSection)) {
      const [className, section] = classKey.split(':');
      const teacherId = classTeacherMap[classKey];
      if (!teacherId) continue;

      const session = await prisma.attendanceSession.create({
        data: {
          class: className,
          section,
          date,
          markedByTeacherId: teacherId,
        },
      });
      totalSessionsSeeded++;

      for (let i = 0; i < studentsInClass.length; i++) {
        const student = studentsInClass[i];
        // Realistic distribution: 85% Present, 10% Absent, 5% Late
        // deterministic pseudo-random variation based on date and student index
        const hash = (date.getTime() / 86400000 + i * 7) % 20;
        let status: AttendanceStatus = AttendanceStatus.PRESENT;
        let remarks: string | null = null;

        if (hash === 3 || hash === 11) {
          status = AttendanceStatus.ABSENT;
          remarks = hash === 3 ? 'Medical leave' : 'Unannounced absence';
        } else if (hash === 17) {
          status = AttendanceStatus.LATE;
          remarks = 'Arrived 15 minutes late';
        }

        await prisma.attendanceRecord.create({
          data: {
            attendanceSessionId: session.id,
            studentId: student.id,
            status,
            remarks,
          },
        });
        totalRecordsSeeded++;
      }
    }
  }

  console.log(`✅ Seeded ${totalSessionsSeeded} Attendance Sessions and ${totalRecordsSeeded} Attendance Records`);

  // 8. Seed Library Catalog & Circulation History
  console.log('📚 Seeding Library Catalog and Circulation History...');

  const booksData = [
    {
      title: 'Introduction to Algorithms (CLRS)',
      author: 'Thomas H. Cormen, Charles E. Leiserson',
      isbn: '978-0262033848',
      category: 'Computer Science',
      totalCopies: 8,
    },
    {
      title: 'Database System Concepts (Silberschatz)',
      author: 'Abraham Silberschatz, Henry Korth',
      isbn: '978-0078022159',
      category: 'Computer Science',
      totalCopies: 6,
    },
    {
      title: 'Operating System Concepts',
      author: 'Abraham Silberschatz, Peter B. Galvin',
      isbn: '978-1119800361',
      category: 'Computer Science',
      totalCopies: 5,
    },
    {
      title: 'Computer Networking: A Top-Down Approach',
      author: 'James Kurose, Keith Ross',
      isbn: '978-0133594140',
      category: 'Computer Science',
      totalCopies: 5,
    },
    {
      title: 'Clean Code: A Handbook of Agile Software',
      author: 'Robert C. Martin',
      isbn: '978-0132350884',
      category: 'Software Engineering',
      totalCopies: 4,
    },
    {
      title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
      author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
      isbn: '978-0201633610',
      category: 'Software Engineering',
      totalCopies: 4,
    },
    {
      title: 'Artificial Intelligence: A Modern Approach',
      author: 'Stuart Russell, Peter Norvig',
      isbn: '978-0134610993',
      category: 'Artificial Intelligence',
      totalCopies: 6,
    },
    {
      title: 'Python Data Science Handbook',
      author: 'Jake VanderPlas',
      isbn: '978-1491912058',
      category: 'Data Science',
      totalCopies: 5,
    },
    {
      title: 'Corporate Finance: Theory and Practice',
      author: 'Aswath Damodaran',
      isbn: '978-0471283492',
      category: 'Finance & Management',
      totalCopies: 5,
    },
    {
      title: 'Marketing Management (16th Edition)',
      author: 'Philip Kotler, Kevin Lane Keller',
      isbn: '978-0135887158',
      category: 'Management',
      totalCopies: 5,
    },
    {
      title: 'Strategic Management and Business Policy',
      author: 'Thomas L. Wheelen, J. David Hunger',
      isbn: '978-0134522050',
      category: 'Management',
      totalCopies: 4,
    },
    {
      title: 'Higher Engineering Mathematics',
      author: 'Dr. B.S. Grewal',
      isbn: '978-8193328491',
      category: 'Mathematics',
      totalCopies: 10,
    },
    {
      title: 'Linear Algebra and Its Applications',
      author: 'Gilbert Strang',
      isbn: '978-0030105678',
      category: 'Mathematics',
      totalCopies: 6,
    },
    {
      title: 'Digital Design and Computer Architecture',
      author: 'David Harris, Sarah Harris',
      isbn: '978-0123944245',
      category: 'Electronics & Hardware',
      totalCopies: 4,
    },
    {
      title: 'Modern Quantum Mechanics',
      author: 'J.J. Sakurai, Jim Napolitano',
      isbn: '978-1108473223',
      category: 'Physics',
      totalCopies: 3,
    },
    {
      title: 'Cloud Native DevOps with Kubernetes',
      author: 'John Arundel, Justin Domingus',
      isbn: '978-1492040767',
      category: 'Cloud & Infrastructure',
      totalCopies: 5,
    },
  ];

  const createdBooks: any[] = [];
  for (const b of booksData) {
    const book = await prisma.book.create({
      data: {
        title: b.title,
        author: b.author,
        isbn: b.isbn,
        category: b.category,
        totalCopies: b.totalCopies,
        availableCopies: b.totalCopies, // will be adjusted as issues are seeded
      },
    });
    createdBooks.push(book);
  }
  console.log(`📖 Seeded ${createdBooks.length} Books in Library catalog`);

  // Helper for dates relative to today (2026-09-09)
  const today = new Date('2026-09-09T10:00:00.000Z');
  const daysAgo = (d: number) => new Date(today.getTime() - d * 86400000);
  const daysLater = (d: number) => new Date(today.getTime() + d * 86400000);

  // Issues definitions:
  // 1. Active on-time issues
  const activeIssuesData = [
    {
      studentIndex: 0,
      bookIndex: 0, // CLRS
      issueDate: daysAgo(5),
      dueDate: daysLater(9),
    },
    {
      studentIndex: 1,
      bookIndex: 2, // OS Concepts
      issueDate: daysAgo(3),
      dueDate: daysLater(11),
    },
    {
      studentIndex: 2,
      bookIndex: 9, // Marketing Management
      issueDate: daysAgo(7),
      dueDate: daysLater(7),
    },
    {
      studentIndex: 3,
      bookIndex: 7, // Python Data Science
      issueDate: daysAgo(1),
      dueDate: daysLater(13),
    },
  ];

  // 2. Active OVERDUE issues (past due date, accruing fines)
  const overdueIssuesData = [
    {
      studentIndex: 4, // Sneha
      bookIndex: 4, // Clean Code
      issueDate: daysAgo(28),
      dueDate: daysAgo(14), // 14 days overdue = ₹28 fine
      notes: 'First reminder notice sent via email',
    },
    {
      studentIndex: 5,
      bookIndex: 1, // Database System Concepts
      issueDate: daysAgo(22),
      dueDate: daysAgo(8), // 8 days overdue = ₹16 fine
      notes: 'Second reminder notice issued',
    },
    {
      studentIndex: 6,
      bookIndex: 8, // Corporate Finance
      issueDate: daysAgo(20),
      dueDate: daysAgo(6), // 6 days overdue = ₹12 fine
    },
  ];

  // 3. Returned issues with fines paid
  const returnedPaidData = [
    {
      studentIndex: 0,
      bookIndex: 3, // Computer Networking
      issueDate: daysAgo(35),
      dueDate: daysAgo(21),
      returnDate: daysAgo(16), // 5 days overdue = ₹10 fine paid
      fineAmount: 10.0,
      fineStatus: FineStatus.PAID,
      finePaidAt: daysAgo(16),
      notes: 'Fine collected in cash at counter',
    },
    {
      studentIndex: 1,
      bookIndex: 11, // Higher Eng Maths
      issueDate: daysAgo(30),
      dueDate: daysAgo(16),
      returnDate: daysAgo(8), // 8 days overdue = ₹16 fine paid
      fineAmount: 16.0,
      fineStatus: FineStatus.PAID,
      finePaidAt: daysAgo(8),
      notes: 'Fine paid via cash receipt',
    },
  ];

  // 4. Returned issues with fines waived by Admin
  const returnedWaivedData = [
    {
      studentIndex: 2,
      bookIndex: 12, // Linear Algebra
      issueDate: daysAgo(40),
      dueDate: daysAgo(26),
      returnDate: daysAgo(19), // 7 days overdue = ₹14 fine waived
      fineAmount: 14.0,
      fineStatus: FineStatus.WAIVED,
      fineWaivedAt: daysAgo(19),
      notes: 'Waived: Verified medical hospitalization during exam week',
    },
  ];

  // 5. Returned on time (0 fine)
  const returnedOnTimeData = [
    {
      studentIndex: 3,
      bookIndex: 6, // AI Modern Approach
      issueDate: daysAgo(25),
      dueDate: daysAgo(11),
      returnDate: daysAgo(12),
      fineAmount: 0.0,
      fineStatus: null,
    },
    {
      studentIndex: 4,
      bookIndex: 5, // Design Patterns
      issueDate: daysAgo(20),
      dueDate: daysAgo(6),
      returnDate: daysAgo(7),
      fineAmount: 0.0,
      fineStatus: null,
    },
    {
      studentIndex: 7,
      bookIndex: 13, // Digital Design
      issueDate: daysAgo(18),
      dueDate: daysAgo(4),
      returnDate: daysAgo(5),
      fineAmount: 0.0,
      fineStatus: null,
    },
  ];

  let totalActiveIssues = 0;
  const bookActiveCountMap: Record<string, number> = {};

  // Insert active on-time issues
  for (const item of activeIssuesData) {
    const student = createdStudents[item.studentIndex];
    const book = createdBooks[item.bookIndex];
    await prisma.bookIssue.create({
      data: {
        bookId: book.id,
        studentId: student.id,
        issuedByUserId: clerk1.id,
        issueDate: item.issueDate,
        dueDate: item.dueDate,
        status: BookIssueStatus.ISSUED,
      },
    });
    bookActiveCountMap[book.id] = (bookActiveCountMap[book.id] || 0) + 1;
    totalActiveIssues++;
  }

  // Insert active overdue issues
  for (const item of overdueIssuesData) {
    const student = createdStudents[item.studentIndex];
    const book = createdBooks[item.bookIndex];
    const daysOverdue = Math.floor((today.getTime() - item.dueDate.getTime()) / 86400000);
    const fineAmount = daysOverdue * 2.0;

    await prisma.bookIssue.create({
      data: {
        bookId: book.id,
        studentId: student.id,
        issuedByUserId: clerk1.id,
        issueDate: item.issueDate,
        dueDate: item.dueDate,
        status: BookIssueStatus.OVERDUE,
        fineAmount,
        fineStatus: FineStatus.PENDING,
        notes: item.notes || null,
      },
    });
    bookActiveCountMap[book.id] = (bookActiveCountMap[book.id] || 0) + 1;
    totalActiveIssues++;
  }

  // Insert returned paid
  for (const item of returnedPaidData) {
    const student = createdStudents[item.studentIndex];
    const book = createdBooks[item.bookIndex];
    await prisma.bookIssue.create({
      data: {
        bookId: book.id,
        studentId: student.id,
        issuedByUserId: clerk1.id,
        issueDate: item.issueDate,
        dueDate: item.dueDate,
        returnDate: item.returnDate,
        status: BookIssueStatus.RETURNED,
        fineAmount: item.fineAmount,
        fineStatus: item.fineStatus,
        finePaidAt: item.finePaidAt,
        notes: item.notes,
      },
    });
  }

  // Insert returned waived
  for (const item of returnedWaivedData) {
    const student = createdStudents[item.studentIndex];
    const book = createdBooks[item.bookIndex];
    await prisma.bookIssue.create({
      data: {
        bookId: book.id,
        studentId: student.id,
        issuedByUserId: clerk1.id,
        issueDate: item.issueDate,
        dueDate: item.dueDate,
        returnDate: item.returnDate,
        status: BookIssueStatus.RETURNED,
        fineAmount: item.fineAmount,
        fineStatus: item.fineStatus,
        fineWaivedAt: item.fineWaivedAt,
        notes: item.notes,
      },
    });
  }

  // Insert returned on time
  for (const item of returnedOnTimeData) {
    const student = createdStudents[item.studentIndex];
    const book = createdBooks[item.bookIndex];
    await prisma.bookIssue.create({
      data: {
        bookId: book.id,
        studentId: student.id,
        issuedByUserId: clerk1.id,
        issueDate: item.issueDate,
        dueDate: item.dueDate,
        returnDate: item.returnDate,
        status: BookIssueStatus.RETURNED,
        fineAmount: item.fineAmount,
        fineStatus: item.fineStatus,
      },
    });
  }

  // Synchronize availableCopies on books with active loans
  for (const [bookId, activeCount] of Object.entries(bookActiveCountMap)) {
    await prisma.book.update({
      where: { id: bookId },
      data: { availableCopies: { decrement: activeCount } },
    });
  }

  console.log(`📗 Seeded ${totalActiveIssues} active loans (including 3 overdue) and 6 returned historical loans`);
  console.log('🎉 Full database seeding finished successfully!\n');
  console.log('================================================================================');
  console.log('🎓 COLLEGE ERP — SEEDED CREDENTIALS SUMMARY');
  console.log('================================================================================');
  console.log(`👑 ADMIN:   ${adminEmail.padEnd(35)} | Password: ${adminPassword}`);
  console.log(`💼 CLERK:   ${clerkEmail.padEnd(35)} | Password: ${clerkPassword}`);
  console.log(`👨‍🏫 TEACHER: ${teacherEmail.padEnd(35)} | Password: ${teacherPassword}`);
  console.log(`🎓 STUDENT: ${studentEmail.padEnd(35)} | Password: ${studentPassword}`);
  console.log('--------------------------------------------------------------------------------');
  console.log('⚠️  SECURITY REMINDER FOR PRODUCTION:');
  console.log('Log into the Admin account and update your password immediately.');
  console.log('================================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
