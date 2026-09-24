import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity-ide\\brain\\a67442fc-448d-4dd9-82c2-2f47df20c631\\screenshots';
const BASE_URL = 'http://localhost:5173';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureScreen(page: any, filename: string) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await sleep(1200); // Allow render and data fetching to settle
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`📸 Captured: ${filename}`);
}

async function clickButtonWithText(page: any, text: string) {
  return page.evaluate((btnText: string) => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const target = buttons.find((b) => b.textContent && b.textContent.includes(btnText));
    if (target) {
      (target as HTMLElement).click();
      return true;
    }
    return false;
  }, text);
}

async function loginAs(page: any, email: string, pass: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await sleep(600);

  // Clear inputs and type
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    if (inputs[0]) (inputs[0] as HTMLInputElement).value = '';
    if (inputs[1]) (inputs[1] as HTMLInputElement).value = '';
  });

  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', pass);
  await sleep(300);

  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
  }
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 8000 }).catch(() => {});
  await sleep(1500);
}

async function main() {
  console.log('🚀 Launching Chrome to capture complete walkthrough...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  try {
    // ----------------------------------------------------
    // 1. LOGIN SCREEN
    // ----------------------------------------------------
    console.log('--- Step 1: Login Screen ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '01_login_screen.png');

    // ----------------------------------------------------
    // 2. ADMIN FLOW
    // ----------------------------------------------------
    console.log('--- Step 2: Admin Flow ---');
    await loginAs(page, 'admin@college.edu', 'Admin@123');
    await captureScreen(page, '02_admin_dashboard.png');

    // Admin: Fee Structures
    await page.goto(`${BASE_URL}/admin/fee-structures`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '03_admin_fee_structures.png');

    // Admin: Students Directory
    await page.goto(`${BASE_URL}/admin/students`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '04_admin_students_list.png');

    // Admin: New Student Admission Modal
    const clickedNewAdm = await clickButtonWithText(page, 'New Admission');
    if (clickedNewAdm) {
      await sleep(800);
      await captureScreen(page, '05_admin_new_student_modal.png');
      // reload students page to dismiss modal
      await page.goto(`${BASE_URL}/admin/students`, { waitUntil: 'networkidle0' });
    }

    // Admin: Student 360 Profile (Click on first student name)
    const clickedStudent = await page.evaluate(() => {
      const studentNameSpan = document.querySelector('span.hover\\:text-indigo-600');
      if (studentNameSpan) {
        (studentNameSpan as HTMLElement).click();
        return true;
      }
      return false;
    });
    if (clickedStudent) {
      await sleep(1500);
      await captureScreen(page, '06_admin_student_profile.png');
    }

    // Admin: Teachers Management
    await page.goto(`${BASE_URL}/admin/teachers`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '07_admin_teachers_list.png');

    // Admin: Attendance Analytics
    await page.goto(`${BASE_URL}/admin/attendance-reports`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '08_admin_attendance_analytics.png');

    // Admin: Library Management
    await page.goto(`${BASE_URL}/admin/library`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '09_admin_library_catalog.png');

    // Admin: Clerks / Cashiers
    await page.goto(`${BASE_URL}/admin/clerks`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '10_admin_clerks_cashiers.png');

    // Admin: Financial Reports
    await page.goto(`${BASE_URL}/admin/reports`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '11_admin_financial_reports.png');

    // Admin: Settings
    await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '12_admin_settings.png');

    // Clear local storage for next role
    await page.evaluate(() => localStorage.clear());

    // ----------------------------------------------------
    // 3. CLERK FLOW
    // ----------------------------------------------------
    console.log('--- Step 3: Clerk Flow ---');
    await loginAs(page, 'clerk.raj@college.edu', 'Clerk@123');
    await captureScreen(page, '13_clerk_dashboard.png');

    // Clerk: Collect Fees
    await page.goto(`${BASE_URL}/clerk/collect`, { waitUntil: 'networkidle0' });
    await sleep(800);
    // Find search input and type "Priya" (who has pending fees)
    const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="roll"], input[type="text"]');
    if (searchInput) {
      await searchInput.type('Priya');
      await sleep(1000);
      // Select the student if dropdown or result appears
      await page.evaluate(() => {
        const result = document.querySelector('div[role="button"], li, .cursor-pointer');
        if (result) (result as HTMLElement).click();
      });
      await sleep(800);
    }
    await captureScreen(page, '14_clerk_collect_fees.png');

    // Clerk: Payment History
    await page.goto(`${BASE_URL}/clerk/history`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '15_clerk_payment_history.png');

    // Clerk: Pending Dues
    await page.goto(`${BASE_URL}/clerk/pending`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '16_clerk_pending_dues.png');

    // Clerk: Library Circulation
    await page.goto(`${BASE_URL}/clerk/library`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '17_clerk_library_circulation.png');

    await page.evaluate(() => localStorage.clear());

    // ----------------------------------------------------
    // 4. TEACHER FLOW
    // ----------------------------------------------------
    console.log('--- Step 4: Teacher Flow ---');
    await loginAs(page, 'teacher.sunita@college.edu', 'Teacher@123');
    await captureScreen(page, '18_teacher_dashboard.png');

    // Teacher: Mark Attendance
    await page.goto(`${BASE_URL}/teacher/mark`, { waitUntil: 'networkidle0' });
    await sleep(1200);
    await captureScreen(page, '19_teacher_mark_attendance.png');

    // Teacher: Attendance History
    await page.goto(`${BASE_URL}/teacher/history`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '20_teacher_attendance_history.png');

    await page.evaluate(() => localStorage.clear());

    // ----------------------------------------------------
    // 5. STUDENT FLOW
    // ----------------------------------------------------
    console.log('--- Step 5: Student Flow ---');
    await loginAs(page, 'student.aarav@college.edu', 'Student@123');
    await captureScreen(page, '21_student_dashboard.png');

    // Student: Pay Online Modal (Click Pay Now button)
    const clickedPay = await clickButtonWithText(page, 'Pay');
    if (clickedPay) {
      await sleep(800);
      await captureScreen(page, '22_student_pay_online_modal.png');
      // reload student dashboard
      await page.goto(`${BASE_URL}/student`, { waitUntil: 'networkidle0' });
    }

    // Student: Attendance
    await page.goto(`${BASE_URL}/student/attendance`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '23_student_attendance.png');

    // Student: Library
    await page.goto(`${BASE_URL}/student/library`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '24_student_library.png');

    // Student: Profile
    await page.goto(`${BASE_URL}/student/profile`, { waitUntil: 'networkidle0' });
    await captureScreen(page, '25_student_profile.png');

    console.log('🎉 All 25 walkthrough screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ Error capturing screenshots:', err);
  process.exit(1);
});
