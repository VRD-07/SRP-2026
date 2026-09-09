import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { prisma } from '../config/db';
import { CalculationService } from './calculationService';

export class ReceiptPdfService {
  /**
   * Generates a formal, high-resolution PDF receipt for any transaction.
   */
  static async generateReceiptPdf(transactionId: string): Promise<Uint8Array> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        student: true,
        feeAssignment: {
          include: {
            feeStructure: true,
          },
        },
        recordedByClerk: {
          select: { id: true, name: true, email: true, role: true },
        },
        reversalOf: true,
        reversedBy: true,
      },
    });

    if (!transaction) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    // Get current balance calculation for student
    const studentFeeSummary = await CalculationService.getStudentFeeCalculation(transaction.studentId);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Color palette
    const primaryColor = rgb(0.12, 0.22, 0.45); // Deep Navy
    const secondaryColor = rgb(0.39, 0.40, 0.95); // Indigo
    const darkTextColor = rgb(0.1, 0.15, 0.2);
    const lightTextColor = rgb(0.45, 0.5, 0.58);
    const borderColor = rgb(0.85, 0.88, 0.92);
    const cardBgColor = rgb(0.97, 0.98, 1.0);
    const successColor = rgb(0.06, 0.6, 0.35);
    const reversedColor = rgb(0.88, 0.22, 0.22);

    let y = height - 50;

    // Header Background Accent
    page.drawRectangle({
      x: 30,
      y: y - 70,
      width: width - 60,
      height: 85,
      color: cardBgColor,
      borderColor: borderColor,
      borderWidth: 1,
    });

    // College Header
    page.drawText('METROPOLITAN INSTITUTE OF TECHNOLOGY & HIGHER STUDIES', {
      x: 45,
      y: y,
      size: 14,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText('DIRECTORATE OF FINANCE & ACCOUNTS  •  CAMPUS ERP SUITE', {
      x: 45,
      y: y - 18,
      size: 9,
      font: fontRegular,
      color: lightTextColor,
    });

    page.drawText('CAMPUS PLAZA, SECTOR-4, METROPOLIS • TEL: +91 11-45678900 • WWW.COLLEGE.EDU', {
      x: 45,
      y: y - 32,
      size: 7.5,
      font: fontRegular,
      color: lightTextColor,
    });

    y -= 85;

    // Receipt Banner
    const isReversal = transaction.status === 'REVERSED';
    const bannerTitle = isReversal ? 'OFFICIAL TRANSACTION REVERSAL VOUCHER' : 'OFFICIAL FEE PAYMENT RECEIPT';

    page.drawText(bannerTitle, {
      x: 45,
      y: y,
      size: 15,
      font: fontBold,
      color: isReversal ? reversedColor : primaryColor,
    });

    // Status Pill
    const statusText = isReversal ? 'STATUS: REVERSED' : 'STATUS: SUCCESSFUL';
    const statusColor = isReversal ? reversedColor : successColor;
    page.drawText(statusText, {
      x: width - 180,
      y: y,
      size: 10,
      font: fontBold,
      color: statusColor,
    });

    y -= 25;

    // Metadata Bar
    page.drawLine({
      start: { x: 45, y: y },
      end: { x: width - 45, y: y },
      thickness: 1,
      color: borderColor,
    });

    y -= 18;

    const receiptDate = new Date(transaction.createdAt).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    page.drawText(`Receipt No: ${transaction.receiptNumber}`, {
      x: 45,
      y: y,
      size: 9.5,
      font: fontBold,
      color: darkTextColor,
    });

    page.drawText(`Date & Time: ${receiptDate}`, {
      x: width - 230,
      y: y,
      size: 9,
      font: fontRegular,
      color: darkTextColor,
    });

    y -= 25;

    // Student Info Card
    page.drawRectangle({
      x: 45,
      y: y - 75,
      width: width - 90,
      height: 75,
      color: rgb(0.99, 0.99, 1.0),
      borderColor: borderColor,
      borderWidth: 1,
    });

    page.drawText('STUDENT INFORMATION', {
      x: 55,
      y: y - 16,
      size: 8.5,
      font: fontBold,
      color: secondaryColor,
    });

    // Two-column layout for student info
    const s = transaction.student;
    page.drawText(`Student Name: ${s.name}`, { x: 55, y: y - 34, size: 9, font: fontRegular, color: darkTextColor });
    page.drawText(`Roll Number:  ${s.rollNumber}`, { x: 55, y: y - 50, size: 9, font: fontBold, color: darkTextColor });
    page.drawText(`Contact No:   ${s.contactNumber}`, { x: 55, y: y - 66, size: 9, font: fontRegular, color: darkTextColor });

    page.drawText(`Program / Class: ${s.class}`, { x: width / 2 + 20, y: y - 34, size: 9, font: fontRegular, color: darkTextColor });
    page.drawText(`Batch:           ${s.batch}`, { x: width / 2 + 20, y: y - 50, size: 9, font: fontRegular, color: darkTextColor });
    page.drawText(`Admission Year:  ${s.admissionYear}`, { x: width / 2 + 20, y: y - 66, size: 9, font: fontRegular, color: darkTextColor });

    y -= 105;

    // Fee Item Breakdown Table
    page.drawText('TRANSACTION & FEE HEAD PARTICULARS', {
      x: 45,
      y: y,
      size: 9,
      font: fontBold,
      color: primaryColor,
    });

    y -= 15;

    // Table Header
    page.drawRectangle({
      x: 45,
      y: y - 20,
      width: width - 90,
      height: 20,
      color: rgb(0.92, 0.94, 0.98),
    });

    page.drawText('Fee Head / Particulars', { x: 55, y: y - 14, size: 8.5, font: fontBold, color: primaryColor });
    page.drawText('Academic Year', { x: 220, y: y - 14, size: 8.5, font: fontBold, color: primaryColor });
    page.drawText('Total Fee (₹)', { x: 340, y: y - 14, size: 8.5, font: fontBold, color: primaryColor });
    page.drawText('Amount Paid (₹)', { x: 445, y: y - 14, size: 8.5, font: fontBold, color: primaryColor });

    y -= 25;

    const fs = transaction.feeAssignment.feeStructure;

    page.drawText(`${fs.feeHead} Fee`, { x: 55, y: y - 12, size: 9, font: fontBold, color: darkTextColor });
    page.drawText(`${fs.academicYear}`, { x: 220, y: y - 12, size: 9, font: fontRegular, color: darkTextColor });
    page.drawText(`${fs.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { x: 340, y: y - 12, size: 9, font: fontRegular, color: darkTextColor });
    page.drawText(`${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { x: 445, y: y - 12, size: 9, font: fontBold, color: isReversal ? reversedColor : successColor });

    y -= 25;

    page.drawLine({
      start: { x: 45, y: y },
      end: { x: width - 45, y: y },
      thickness: 1,
      color: borderColor,
    });

    y -= 20;

    // Payment method & Summary Block
    page.drawText(`Payment Mode:    ${transaction.paymentMode}`, { x: 55, y: y, size: 9, font: fontRegular, color: darkTextColor });
    page.drawText(`Reference / Ref: ${transaction.referenceNumber}`, { x: 55, y: y - 16, size: 9, font: fontRegular, color: darkTextColor });
    page.drawText(`Cashier / Clerk: ${transaction.recordedByClerk.name} (${transaction.recordedByClerk.email})`, {
      x: 55,
      y: y - 32,
      size: 9,
      font: fontRegular,
      color: darkTextColor,
    });

    if (transaction.reversalReason) {
      page.drawText(`Reversal Audit Reason: ${transaction.reversalReason}`, {
        x: 55,
        y: y - 48,
        size: 9,
        font: fontBold,
        color: reversedColor,
      });
      y -= 16;
    }

    // Totals Box (Right Side)
    page.drawRectangle({
      x: width - 230,
      y: y - 60,
      width: 185,
      height: 65,
      color: rgb(0.97, 0.98, 1.0),
      borderColor: borderColor,
      borderWidth: 1,
    });

    page.drawText('Total Paid on Receipt:', { x: width - 220, y: y - 16, size: 8.5, font: fontRegular, color: lightTextColor });
    page.drawText(`₹ ${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, {
      x: width - 220,
      y: y - 32,
      size: 13,
      font: fontBold,
      color: isReversal ? reversedColor : primaryColor,
    });

    const pendingBalance = studentFeeSummary ? studentFeeSummary.totalPending : 0;
    page.drawText(`Remaining Balance: ₹ ${pendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, {
      x: width - 220,
      y: y - 48,
      size: 8.5,
      font: fontRegular,
      color: pendingBalance > 0 ? rgb(0.8, 0.4, 0.1) : successColor,
    });

    y -= 95;

    // Security & Verification Notice
    page.drawRectangle({
      x: 45,
      y: y - 50,
      width: width - 90,
      height: 50,
      color: rgb(0.98, 0.98, 0.98),
      borderColor: borderColor,
      borderWidth: 1,
    });

    page.drawText('IMPORTANT NOTES & AUDIT VERIFICATION:', {
      x: 55,
      y: y - 14,
      size: 7.5,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText('1. This is an official system-generated transaction voucher from AURA Campus ERP.', {
      x: 55,
      y: y - 26,
      size: 7,
      font: fontRegular,
      color: lightTextColor,
    });

    page.drawText('2. All transactions are logged with immutable cryptographic verification. Retain this receipt for future reference.', {
      x: 55,
      y: y - 38,
      size: 7,
      font: fontRegular,
      color: lightTextColor,
    });

    // Signature Area
    y -= 100;

    page.drawLine({
      start: { x: 55, y: y },
      end: { x: 200, y: y },
      thickness: 1,
      color: borderColor,
    });
    page.drawText('Student / Depositor Signature', { x: 55, y: y - 14, size: 8, font: fontRegular, color: lightTextColor });

    page.drawLine({
      start: { x: width - 200, y: y },
      end: { x: width - 55, y: y },
      thickness: 1,
      color: borderColor,
    });
    page.drawText('Authorized Accounts Officer', { x: width - 195, y: y - 14, size: 8, font: fontRegular, color: lightTextColor });

    return await pdfDoc.save();
  }
}
