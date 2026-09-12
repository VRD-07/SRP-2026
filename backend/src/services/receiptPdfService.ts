import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db';
import { CalculationService } from './calculationService';

/**
 * Resolves an asset path checking environment variables and multiple relative locations
 * across production and development directory structures.
 */
function resolveAssetPath(relativePath: string, envVarName?: string): string | null {
  const envVal = envVarName ? process.env[envVarName] : undefined;
  const candidates: string[] = [];

  if (envVal) {
    candidates.push(path.resolve(envVal));
  }

  candidates.push(
    path.resolve(process.cwd(), relativePath),
    path.resolve(process.cwd(), 'backend', relativePath),
    path.resolve(__dirname, '..', relativePath),
    path.resolve(__dirname, '../..', relativePath),
    path.resolve(__dirname, '../../..', relativePath),
    path.resolve(__dirname, '../../../../', relativePath)
  );

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export class ReceiptPdfService {
  /**
   * Generates a formal, high-resolution PDF receipt for any transaction.
   * Full Unicode support (including ₹ Indian Rupee) via Noto Sans and dynamic College Logo header.
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
    pdfDoc.registerFontkit(fontkit);

    const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
    const { width, height } = page.getSize();

    // Load Unicode-capable Noto Sans fonts for full currency (₹) and text support
    const regularFontPath = resolveAssetPath('assets/fonts/NotoSans-Regular.ttf');
    const boldFontPath = resolveAssetPath('assets/fonts/NotoSans-Bold.ttf');

    let fontBold: any;
    let fontRegular: any;
    let hasUnicodeSupport = false;

    try {
      if (regularFontPath && boldFontPath) {
        const regularBytes = fs.readFileSync(regularFontPath);
        const boldBytes = fs.readFileSync(boldFontPath);
        fontRegular = await pdfDoc.embedFont(regularBytes, { subset: true });
        fontBold = await pdfDoc.embedFont(boldBytes, { subset: true });
        hasUnicodeSupport = true;
      } else {
        throw new Error('NotoSans font files not found at expected paths');
      }
    } catch (fontErr) {
      console.warn('⚠️ Falling back to Helvetica standard fonts:', fontErr);
      fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      hasUnicodeSupport = false;
    }

    // Safe currency symbol formatter
    const curr = (amount: number): string => {
      const formatted = amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return hasUnicodeSupport ? `₹ ${formatted}` : `Rs. ${formatted}`;
    };

    const currSymbol = hasUnicodeSupport ? '₹' : 'Rs.';

    // Embed College Logo / Crest if present
    let logoImage: any = null;
    try {
      const logoPath =
        resolveAssetPath('assets/logo.png', 'COLLEGE_LOGO_PATH') ||
        resolveAssetPath('assets/logo.jpg', 'COLLEGE_LOGO_PATH') ||
        resolveAssetPath('assets/logo.jpeg', 'COLLEGE_LOGO_PATH');

      if (logoPath && fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        const isPng = logoBytes.length > 4 && logoBytes[0] === 0x89 && logoBytes[1] === 0x50 && logoBytes[2] === 0x4e && logoBytes[3] === 0x47;
        if (isPng) {
          logoImage = await pdfDoc.embedPng(logoBytes);
        } else {
          logoImage = await pdfDoc.embedJpg(logoBytes);
        }
      }
    } catch (logoErr) {
      console.warn('⚠️ Could not embed college logo in receipt PDF:', logoErr);
    }

    // Color palette
    const primaryColor = rgb(0.12, 0.22, 0.45); // Deep Navy
    const secondaryColor = rgb(0.39, 0.40, 0.95); // Indigo
    const darkTextColor = rgb(0.1, 0.15, 0.2);
    const lightTextColor = rgb(0.45, 0.5, 0.58);
    const borderColor = rgb(0.85, 0.88, 0.92);
    const cardBgColor = rgb(0.97, 0.98, 1.0);
    const successColor = rgb(0.06, 0.6, 0.35);
    const reversedColor = rgb(0.88, 0.22, 0.22);

    // 1. College Header Banner (Top of page)
    const headerHeight = 85;
    const headerY = height - 40;

    page.drawRectangle({
      x: 30,
      y: headerY - headerHeight,
      width: width - 60,
      height: headerHeight,
      color: cardBgColor,
      borderColor: borderColor,
      borderWidth: 1,
    });

    let textStartX = 45;
    if (logoImage) {
      const logoSize = 65;
      page.drawImage(logoImage, {
        x: 45,
        y: headerY - headerHeight + (headerHeight - logoSize) / 2,
        width: logoSize,
        height: logoSize,
      });
      textStartX = 125;
    }

    page.drawText('METROPOLITAN INSTITUTE OF TECHNOLOGY & HIGHER STUDIES', {
      x: textStartX,
      y: headerY - 24,
      size: 13,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText('DIRECTORATE OF FINANCE & ACCOUNTS  •  CAMPUS ERP SUITE', {
      x: textStartX,
      y: headerY - 42,
      size: 8.5,
      font: fontBold,
      color: secondaryColor,
    });

    page.drawText('ACCREDITED GRADE "A++"  •  AFFILIATED TO STATE TECHNICAL UNIVERSITY', {
      x: textStartX,
      y: headerY - 56,
      size: 7.5,
      font: fontRegular,
      color: lightTextColor,
    });

    page.drawText('CAMPUS PLAZA, SECTOR-4, METROPOLIS • TEL: +91 11-45678900 • WWW.COLLEGE.EDU', {
      x: textStartX,
      y: headerY - 70,
      size: 7,
      font: fontRegular,
      color: lightTextColor,
    });

    let y = headerY - headerHeight - 16;

    // Horizontal Navy Accent Divider
    page.drawLine({
      start: { x: 30, y },
      end: { x: width - 30, y },
      thickness: 1.5,
      color: primaryColor,
    });

    y -= 22;

    // 2. Receipt Voucher Title Banner
    const isReversal = transaction.status === 'REVERSED';
    const bannerTitle = isReversal ? 'OFFICIAL TRANSACTION REVERSAL VOUCHER' : 'OFFICIAL FEE PAYMENT RECEIPT';

    page.drawText(bannerTitle, {
      x: 45,
      y: y,
      size: 14,
      font: fontBold,
      color: isReversal ? reversedColor : primaryColor,
    });

    // Status Pill
    const statusText = isReversal ? 'STATUS: REVERSED' : 'STATUS: SUCCESSFUL';
    const statusColor = isReversal ? reversedColor : successColor;
    page.drawText(statusText, {
      x: width - 170,
      y: y,
      size: 9.5,
      font: fontBold,
      color: statusColor,
    });

    y -= 20;

    // 3. Metadata Bar (Receipt No, Date & Time)
    page.drawLine({
      start: { x: 45, y },
      end: { x: width - 45, y },
      thickness: 1,
      color: borderColor,
    });

    y -= 16;

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

    y -= 22;

    // 4. Student Info Card
    page.drawRectangle({
      x: 45,
      y: y - 72,
      width: width - 90,
      height: 72,
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

    const s = transaction.student;
    page.drawText(`Student Name: ${s.name}`, { x: 55, y: y - 33, size: 9, font: fontRegular, color: darkTextColor });
    page.drawText(`Roll Number:  ${s.rollNumber}`, { x: 55, y: y - 48, size: 9, font: fontBold, color: darkTextColor });
    page.drawText(`Contact No:   ${s.contactNumber}`, { x: 55, y: y - 63, size: 9, font: fontRegular, color: darkTextColor });

    page.drawText(`Program / Class: ${s.class}`, { x: width / 2 + 20, y: y - 33, size: 9, font: fontRegular, color: darkTextColor });
    page.drawText(`Batch:           ${s.batch}`, { x: width / 2 + 20, y: y - 48, size: 9, font: fontRegular, color: darkTextColor });
    page.drawText(`Admission Year:  ${s.admissionYear}`, { x: width / 2 + 20, y: y - 63, size: 9, font: fontRegular, color: darkTextColor });

    y -= 96;

    // 5. Fee Item Breakdown Table
    page.drawText('TRANSACTION & FEE HEAD PARTICULARS', {
      x: 45,
      y: y,
      size: 9,
      font: fontBold,
      color: primaryColor,
    });

    y -= 14;

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
    page.drawText(`Total Fee (${currSymbol})`, { x: 340, y: y - 14, size: 8.5, font: fontBold, color: primaryColor });
    page.drawText(`Amount Paid (${currSymbol})`, { x: 445, y: y - 14, size: 8.5, font: fontBold, color: primaryColor });

    y -= 25;

    const fsData = transaction.feeAssignment.feeStructure;

    page.drawText(`${fsData.feeHead} Fee`, { x: 55, y: y - 12, size: 9, font: fontBold, color: darkTextColor });
    page.drawText(`${fsData.academicYear}`, { x: 220, y: y - 12, size: 9, font: fontRegular, color: darkTextColor });
    page.drawText(curr(fsData.amount), { x: 340, y: y - 12, size: 9, font: fontRegular, color: darkTextColor });
    page.drawText(curr(transaction.amount), { x: 445, y: y - 12, size: 9, font: fontBold, color: isReversal ? reversedColor : successColor });

    y -= 25;

    page.drawLine({
      start: { x: 45, y },
      end: { x: width - 45, y },
      thickness: 1,
      color: borderColor,
    });

    y -= 18;

    // 6. Payment method & Summary Block
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
      y: y - 56,
      width: 185,
      height: 60,
      color: rgb(0.97, 0.98, 1.0),
      borderColor: borderColor,
      borderWidth: 1,
    });

    page.drawText('Total Paid on Receipt:', { x: width - 220, y: y - 14, size: 8.5, font: fontRegular, color: lightTextColor });
    page.drawText(curr(transaction.amount), {
      x: width - 220,
      y: y - 30,
      size: 13,
      font: fontBold,
      color: isReversal ? reversedColor : primaryColor,
    });

    const pendingBalance = studentFeeSummary ? studentFeeSummary.totalPending : 0;
    page.drawText(`Remaining Balance: ${curr(pendingBalance)}`, {
      x: width - 220,
      y: y - 46,
      size: 8.5,
      font: fontRegular,
      color: pendingBalance > 0 ? rgb(0.8, 0.4, 0.1) : successColor,
    });

    y -= 88;

    // 7. Security & Verification Notice
    page.drawRectangle({
      x: 45,
      y: y - 48,
      width: width - 90,
      height: 48,
      color: rgb(0.98, 0.98, 0.98),
      borderColor: borderColor,
      borderWidth: 1,
    });

    page.drawText('IMPORTANT NOTES & AUDIT VERIFICATION:', {
      x: 55,
      y: y - 13,
      size: 7.5,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText('1. This is an official system-generated transaction voucher from AURA Campus ERP.', {
      x: 55,
      y: y - 25,
      size: 7,
      font: fontRegular,
      color: lightTextColor,
    });

    page.drawText('2. All transactions are logged with immutable cryptographic verification. Retain this receipt for future reference.', {
      x: 55,
      y: y - 37,
      size: 7,
      font: fontRegular,
      color: lightTextColor,
    });

    // 8. Signature Area
    y -= 90;

    page.drawLine({
      start: { x: 55, y },
      end: { x: 200, y },
      thickness: 1,
      color: borderColor,
    });
    page.drawText('Student / Depositor Signature', { x: 55, y: y - 14, size: 8, font: fontRegular, color: lightTextColor });

    page.drawLine({
      start: { x: width - 200, y },
      end: { x: width - 55, y },
      thickness: 1,
      color: borderColor,
    });
    page.drawText('Authorized Accounts Officer', { x: width - 195, y: y - 14, size: 8, font: fontRegular, color: lightTextColor });

    return await pdfDoc.save();
  }
}
