"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding for College Fees ERP...');
    // Clean existing data in reverse relation order
    await prisma.transaction.deleteMany();
    await prisma.feeAssignment.deleteMany();
    await prisma.feeStructure.deleteMany();
    await prisma.student.deleteMany();
    await prisma.user.deleteMany();
    console.log('🧹 Purged existing database tables');
    const defaultPasswordHash = await bcryptjs_1.default.hash('Admin@123', 10);
    const clerkPasswordHash = await bcryptjs_1.default.hash('Clerk@123', 10);
    const studentPasswordHash = await bcryptjs_1.default.hash('Student@123', 10);
    // 1. Create Admin User
    const admin = await prisma.user.create({
        data: {
            name: 'Dr. Ramesh Sharma (Comptroller)',
            email: 'admin@college.edu',
            passwordHash: defaultPasswordHash,
            role: client_1.Role.ADMIN,
            isActive: true,
        },
    });
    // 2. Create Clerks
    const clerk1 = await prisma.user.create({
        data: {
            name: 'Rajesh Kumar (Senior Cashier)',
            email: 'clerk.raj@college.edu',
            passwordHash: clerkPasswordHash,
            role: client_1.Role.CLERK,
            isActive: true,
        },
    });
    const clerk2 = await prisma.user.create({
        data: {
            name: 'Anita Verma (Accounts Officer)',
            email: 'clerk.anita@college.edu',
            passwordHash: clerkPasswordHash,
            role: client_1.Role.CLERK,
            isActive: true,
        },
    });
    console.log('👤 Created Admin & Clerk accounts');
    // 3. Create Fee Structures for Academic Year 2026-2027
    const currentAcademicYear = '2026-2027';
    const feeStructuresData = [
        // B.Tech CSE (Batch 2024-2028)
        {
            class: 'B.Tech CSE',
            batch: '2024-2028',
            academicYear: currentAcademicYear,
            feeHead: client_1.FeeHead.Tuition,
            amount: 85000,
            dueDate: new Date('2026-09-30T18:30:00.000Z'),
        },
        {
            class: 'B.Tech CSE',
            batch: '2024-2028',
            academicYear: currentAcademicYear,
            feeHead: client_1.FeeHead.Hostel,
            amount: 45000,
            dueDate: new Date('2026-10-15T18:30:00.000Z'),
        },
        {
            class: 'B.Tech CSE',
            batch: '2024-2028',
            academicYear: currentAcademicYear,
            feeHead: client_1.FeeHead.Transport,
            amount: 18000,
            dueDate: new Date('2026-10-31T18:30:00.000Z'),
        },
        {
            class: 'B.Tech CSE',
            batch: '2024-2028',
            academicYear: currentAcademicYear,
            feeHead: client_1.FeeHead.Exam,
            amount: 6500,
            dueDate: new Date('2026-11-15T18:30:00.000Z'),
        },
        // B.Tech IT (Batch 2024-2028)
        {
            class: 'B.Tech IT',
            batch: '2024-2028',
            academicYear: currentAcademicYear,
            feeHead: client_1.FeeHead.Tuition,
            amount: 80000,
            dueDate: new Date('2026-09-30T18:30:00.000Z'),
        },
        {
            class: 'B.Tech IT',
            batch: '2024-2028',
            academicYear: currentAcademicYear,
            feeHead: client_1.FeeHead.Hostel,
            amount: 45000,
            dueDate: new Date('2026-10-15T18:30:00.000Z'),
        },
        {
            class: 'B.Tech IT',
            batch: '2024-2028',
            academicYear: currentAcademicYear,
            feeHead: client_1.FeeHead.Exam,
            amount: 6500,
            dueDate: new Date('2026-11-15T18:30:00.000Z'),
        },
        // BBA (Batch 2025-2028)
        {
            class: 'BBA',
            batch: '2025-2028',
            academicYear: currentAcademicYear,
            feeHead: client_1.FeeHead.Tuition,
            amount: 55000,
            dueDate: new Date('2026-09-20T18:30:00.000Z'),
        },
        {
            class: 'BBA',
            batch: '2025-2028',
            academicYear: currentAcademicYear,
            feeHead: client_1.FeeHead.Exam,
            amount: 5000,
            dueDate: new Date('2026-11-05T18:30:00.000Z'),
        },
        // MBA (Batch 2025-2027)
        {
            class: 'MBA',
            batch: '2025-2027',
            academicYear: currentAcademicYear,
            feeHead: client_1.FeeHead.Tuition,
            amount: 110000,
            dueDate: new Date('2026-09-25T18:30:00.000Z'),
        },
        {
            class: 'MBA',
            batch: '2025-2027',
            academicYear: currentAcademicYear,
            feeHead: client_1.FeeHead.Hostel,
            amount: 50000,
            dueDate: new Date('2026-10-10T18:30:00.000Z'),
        },
        {
            class: 'MBA',
            batch: '2025-2027',
            academicYear: currentAcademicYear,
            feeHead: client_1.FeeHead.Exam,
            amount: 8000,
            dueDate: new Date('2026-11-20T18:30:00.000Z'),
        },
    ];
    const createdFeeStructures = {};
    for (const item of feeStructuresData) {
        const fs = await prisma.feeStructure.create({ data: item });
        if (!createdFeeStructures[item.class]) {
            createdFeeStructures[item.class] = [];
        }
        createdFeeStructures[item.class].push(fs);
    }
    console.log(`📋 Created ${feeStructuresData.length} fee structures`);
    // 4. Create Students
    const studentsSeed = [
        {
            name: 'Aarav Mehta',
            email: 'student.aarav@college.edu',
            rollNumber: '24CSE0101',
            class: 'B.Tech CSE',
            batch: '2024-2028',
            admissionYear: 2024,
            contactNumber: '+91 98765 43210',
        },
        {
            name: 'Priya Nair',
            email: 'priya.nair@college.edu',
            rollNumber: '24CSE0102',
            class: 'B.Tech CSE',
            batch: '2024-2028',
            admissionYear: 2024,
            contactNumber: '+91 98765 43211',
        },
        {
            name: 'Rohan Gupta',
            email: 'rohan.gupta@college.edu',
            rollNumber: '24CSE0103',
            class: 'B.Tech CSE',
            batch: '2024-2028',
            admissionYear: 2024,
            contactNumber: '+91 98765 43212',
        },
        {
            name: 'Siddharth Rao',
            email: 'siddharth.rao@college.edu',
            rollNumber: '24CSE0104',
            class: 'B.Tech CSE',
            batch: '2024-2028',
            admissionYear: 2024,
            contactNumber: '+91 98765 43213',
        },
        {
            name: 'Sneha Reddy',
            email: 'sneha.reddy@college.edu',
            rollNumber: '24IT0201',
            class: 'B.Tech IT',
            batch: '2024-2028',
            admissionYear: 2024,
            contactNumber: '+91 98765 43214',
        },
        {
            name: 'Vikram Malhotra',
            email: 'vikram.malhotra@college.edu',
            rollNumber: '24IT0202',
            class: 'B.Tech IT',
            batch: '2024-2028',
            admissionYear: 2024,
            contactNumber: '+91 98765 43215',
        },
        {
            name: 'Ananya Iyer',
            email: 'ananya.iyer@college.edu',
            rollNumber: '25BBA0301',
            class: 'BBA',
            batch: '2025-2028',
            admissionYear: 2025,
            contactNumber: '+91 98765 43216',
        },
        {
            name: 'Karan Patel',
            email: 'karan.patel@college.edu',
            rollNumber: '25BBA0302',
            class: 'BBA',
            batch: '2025-2028',
            admissionYear: 2025,
            contactNumber: '+91 98765 43217',
        },
        {
            name: 'Pooja Deshmukh',
            email: 'pooja.deshmukh@college.edu',
            rollNumber: '25MBA0401',
            class: 'MBA',
            batch: '2025-2027',
            admissionYear: 2025,
            contactNumber: '+91 98765 43218',
        },
        {
            name: 'Devendra Joshi',
            email: 'devendra.joshi@college.edu',
            rollNumber: '25MBA0402',
            class: 'MBA',
            batch: '2025-2027',
            admissionYear: 2025,
            contactNumber: '+91 98765 43219',
        },
    ];
    const createdStudents = [];
    for (const s of studentsSeed) {
        const user = await prisma.user.create({
            data: {
                name: s.name,
                email: s.email,
                passwordHash: studentPasswordHash,
                role: client_1.Role.STUDENT,
                isActive: true,
            },
        });
        const student = await prisma.student.create({
            data: {
                userId: user.id,
                rollNumber: s.rollNumber,
                name: s.name,
                class: s.class,
                batch: s.batch,
                admissionYear: s.admissionYear,
                contactNumber: s.contactNumber,
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
    console.log(`🎓 Created ${createdStudents.length} students & auto-assigned fee heads`);
    // 5. Create Transactions (Payments & Reversals)
    // Let's seed realistic payments:
    // Aarav Mehta (B.Tech CSE): Paid Tuition in full (85,000) via Net Banking / DD, Exam fee (6,500) via Cash. Transport and Hostel pending.
    const aarav = createdStudents[0];
    const aaravAssignments = await prisma.feeAssignment.findMany({
        where: { studentId: aarav.id },
        include: { feeStructure: true },
    });
    const aaravTuition = aaravAssignments.find((a) => a.feeStructure.feeHead === client_1.FeeHead.Tuition);
    const aaravExam = aaravAssignments.find((a) => a.feeStructure.feeHead === client_1.FeeHead.Exam);
    await prisma.transaction.create({
        data: {
            studentId: aarav.id,
            feeAssignmentId: aaravTuition.id,
            amount: 85000,
            paymentMode: client_1.PaymentMode.DD,
            referenceNumber: 'DD-SBI-984721',
            recordedByClerkId: clerk1.id,
            receiptNumber: 'RCP-202609-00001',
            status: client_1.TransactionStatus.SUCCESS,
            createdAt: new Date('2026-09-01T10:30:00.000Z'),
        },
    });
    await prisma.transaction.create({
        data: {
            studentId: aarav.id,
            feeAssignmentId: aaravExam.id,
            amount: 6500,
            paymentMode: client_1.PaymentMode.CASH,
            referenceNumber: 'CASH-REC-0192',
            recordedByClerkId: clerk2.id,
            receiptNumber: 'RCP-202609-00002',
            status: client_1.TransactionStatus.SUCCESS,
            createdAt: new Date('2026-09-03T11:15:00.000Z'),
        },
    });
    // Priya Nair (B.Tech CSE): Partial Tuition payment (₹40,000 paid out of ₹85,000)
    const priya = createdStudents[1];
    const priyaAssignments = await prisma.feeAssignment.findMany({
        where: { studentId: priya.id },
        include: { feeStructure: true },
    });
    const priyaTuition = priyaAssignments.find((a) => a.feeStructure.feeHead === client_1.FeeHead.Tuition);
    await prisma.transaction.create({
        data: {
            studentId: priya.id,
            feeAssignmentId: priyaTuition.id,
            amount: 40000,
            paymentMode: client_1.PaymentMode.CHEQUE,
            referenceNumber: 'CHQ-HDFC-663819',
            recordedByClerkId: clerk1.id,
            receiptNumber: 'RCP-202609-00003',
            status: client_1.TransactionStatus.SUCCESS,
            createdAt: new Date('2026-09-04T14:20:00.000Z'),
        },
    });
    // Ananya Iyer (BBA): Full Tuition payment (₹55,000)
    const ananya = createdStudents[6];
    const ananyaAssignments = await prisma.feeAssignment.findMany({
        where: { studentId: ananya.id },
        include: { feeStructure: true },
    });
    const ananyaTuition = ananyaAssignments.find((a) => a.feeStructure.feeHead === client_1.FeeHead.Tuition);
    await prisma.transaction.create({
        data: {
            studentId: ananya.id,
            feeAssignmentId: ananyaTuition.id,
            amount: 55000,
            paymentMode: client_1.PaymentMode.ONLINE_PLACEHOLDER,
            referenceNumber: 'UPI-RAZOR-TXN99120',
            recordedByClerkId: clerk2.id,
            receiptNumber: 'RCP-202609-00004',
            status: client_1.TransactionStatus.SUCCESS,
            createdAt: new Date('2026-09-05T09:45:00.000Z'),
        },
    });
    // Pooja Deshmukh (MBA): Full Tuition payment (₹110,000)
    const pooja = createdStudents[8];
    const poojaAssignments = await prisma.feeAssignment.findMany({
        where: { studentId: pooja.id },
        include: { feeStructure: true },
    });
    const poojaTuition = poojaAssignments.find((a) => a.feeStructure.feeHead === client_1.FeeHead.Tuition);
    await prisma.transaction.create({
        data: {
            studentId: pooja.id,
            feeAssignmentId: poojaTuition.id,
            amount: 110000,
            paymentMode: client_1.PaymentMode.DD,
            referenceNumber: 'DD-ICICI-441092',
            recordedByClerkId: clerk1.id,
            receiptNumber: 'RCP-202609-00005',
            status: client_1.TransactionStatus.SUCCESS,
            createdAt: new Date('2026-09-06T15:30:00.000Z'),
        },
    });
    // Sneha Reddy (B.Tech IT): Demonstrating the Reversal Flow!
    // Transaction was recorded via Cheque (₹45,000 for Hostel), but the cheque bounced.
    const sneha = createdStudents[4];
    const snehaAssignments = await prisma.feeAssignment.findMany({
        where: { studentId: sneha.id },
        include: { feeStructure: true },
    });
    const snehaHostel = snehaAssignments.find((a) => a.feeStructure.feeHead === client_1.FeeHead.Hostel);
    const originalSnehaTx = await prisma.transaction.create({
        data: {
            studentId: sneha.id,
            feeAssignmentId: snehaHostel.id,
            amount: 45000,
            paymentMode: client_1.PaymentMode.CHEQUE,
            referenceNumber: 'CHQ-BOUNCE-33211',
            recordedByClerkId: clerk1.id,
            receiptNumber: 'RCP-202609-00006',
            status: client_1.TransactionStatus.SUCCESS,
            createdAt: new Date('2026-09-02T12:00:00.000Z'),
        },
    });
    // Reversal transaction compensating entry
    await prisma.transaction.create({
        data: {
            studentId: sneha.id,
            feeAssignmentId: snehaHostel.id,
            amount: 45000,
            paymentMode: client_1.PaymentMode.CHEQUE,
            referenceNumber: 'REV-CHQ-BOUNCE-33211',
            recordedByClerkId: clerk1.id,
            receiptNumber: 'REV-202609-00001',
            status: client_1.TransactionStatus.REVERSED,
            reversalOfTransactionId: originalSnehaTx.id,
            reversalReason: 'Cheque bounced / Returned by drawee bank due to signature mismatch on instrument.',
            createdAt: new Date('2026-09-05T16:00:00.000Z'),
        },
    });
    console.log('💳 Seeded transactions including payments, partial payments, and audited reversal flow');
    console.log('✅ Database seeding finished successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
