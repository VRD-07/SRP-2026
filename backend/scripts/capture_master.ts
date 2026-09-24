import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity-ide\\brain\\1862df0f-6467-40bc-bb51-07308fc0b7e7\\screenshots';
const BASE_URL = 'http://localhost:5173';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureScreen(page: any, filename: string, waitMs = 1500) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await sleep(waitMs);
  await page.screenshot({ path: filePath, fullPage: false });
  const stat = fs.statSync(filePath);
  console.log(`📸 Captured: ${filename} (${Math.round(stat.size / 1024)} KB)`);
}

async function clickLink(page: any, label: string) {
  return page.evaluate((text: string) => {
    const links = Array.from(document.querySelectorAll('a, button'));
    const target = links.find((el) => el.textContent && el.textContent.includes(text));
    if (target) {
      (target as HTMLElement).click();
      return true;
    }
    return false;
  }, label);
}

async function login(page: any, email: string, pass: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await sleep(800);

  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    if (inputs[0]) (inputs[0] as HTMLInputElement).value = '';
    if (inputs[1]) (inputs[1] as HTMLInputElement).value = '';
  });

  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', pass);
  await sleep(200);

  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) await submitBtn.click();
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
  await sleep(2500); // Allow auth verification and initial dashboard load
}

async function main() {
  console.log('🚀 Starting Master Walkthrough Capture with full seeded data...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    // ----------------------------------------------------
    // 1. LOGIN SCREEN
    // ----------------------------------------------------
    console.log('--- 1. Login Screen ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await captureScreen(page, '01_login_screen.png', 1000);

    // ----------------------------------------------------
    // 2. ADMIN PORTAL
    // ----------------------------------------------------
    console.log('--- 2. Admin Portal ---');
    await login(page, 'admin@college.edu', 'Admin@123');
    await captureScreen(page, '02_admin_dashboard.png', 2500);

    // Fee Structures
    await clickLink(page, 'Fee Structure');
    await captureScreen(page, '03_admin_fee_structures.png', 2000);

    // Student Records Directory
    await clickLink(page, 'Student Records');
    await captureScreen(page, '04_admin_students_list.png', 2000);

    // Open New Admission Modal
    await clickLink(page, 'New Admission');
    await captureScreen(page, '05_admin_new_student_modal.png', 1000);

    // Close modal by clicking Cancel or navigating to student profile
    await clickLink(page, 'Cancel');
    await sleep(500);

    // Student 360 Profile: click first student name
    await page.evaluate(() => {
      const studentSpans = Array.from(document.querySelectorAll('span'));
      const aarav = studentSpans.find((s) => s.textContent && s.textContent.includes('Aarav Mehta'));
      if (aarav) (aarav as HTMLElement).click();
    });
    await captureScreen(page, '06_admin_student_profile.png', 2500);

    // Teachers Management
    await clickLink(page, 'Teachers');
    await captureScreen(page, '07_admin_teachers_list.png', 2000);

    // Attendance Reports & Analytics
    await clickLink(page, 'Attendance Reports');
    await captureScreen(page, '08_admin_attendance_analytics.png', 2000);

    // Library & Books
    await clickLink(page, 'Library & Books');
    await captureScreen(page, '09_admin_library_catalog.png', 2000);

    // Clerks & Cashiers
    await clickLink(page, 'Clerks');
    await captureScreen(page, '10_admin_clerks_cashiers.png', 2000);

    // Financial Reports & Analytics
    await clickLink(page, 'Reports & Analytics');
    await captureScreen(page, '11_admin_financial_reports.png', 2500);

    // Settings
    await clickLink(page, 'Settings');
    await captureScreen(page, '12_admin_settings.png', 1500);

    // Sign out Admin
    await clickLink(page, 'Sign Out');
    await sleep(1500);

    // ----------------------------------------------------
    // 3. CLERK PORTAL
    // ----------------------------------------------------
    console.log('--- 3. Clerk Portal ---');
    await login(page, 'clerk.raj@college.edu', 'Clerk@123');
    await captureScreen(page, '13_clerk_dashboard.png', 2500);

    // Collect Fees Counter
    await clickLink(page, 'Collect Fees');
    await sleep(1000);
    // Type search
    const searchInput = await page.$('input[placeholder*="Search"], input[type="text"]');
    if (searchInput) {
      await searchInput.type('Priya');
      await sleep(1000);
      await page.evaluate(() => {
        const studentRow = document.querySelector('div[role="button"], li, .cursor-pointer');
        if (studentRow) (studentRow as HTMLElement).click();
      });
      await sleep(1200);
    }
    await captureScreen(page, '14_clerk_collect_fees.png', 1500);

    // Payment History & Audit Ledger
    await clickLink(page, 'Payment History');
    await sleep(3000); // Remote query takes ~2s
    await captureScreen(page, '15_clerk_payment_history.png', 2000);

    // Pending Dues Register
    await clickLink(page, 'Pending Dues');
    await captureScreen(page, '16_clerk_pending_dues.png', 2000);

    // Library Desk Circulation
    await clickLink(page, 'Library Desk');
    await captureScreen(page, '17_clerk_library_circulation.png', 2000);

    // Sign out Clerk
    await clickLink(page, 'Sign Out');
    await sleep(1500);

    // ----------------------------------------------------
    // 4. TEACHER PORTAL
    // ----------------------------------------------------
    console.log('--- 4. Teacher Portal ---');
    await login(page, 'teacher.sunita@college.edu', 'Teacher@123');
    await captureScreen(page, '18_teacher_dashboard.png', 2500);

    // Mark Daily Attendance
    await clickLink(page, 'Mark Attendance');
    await captureScreen(page, '19_teacher_mark_attendance.png', 2500);

    // Attendance History & Log
    await clickLink(page, 'Attendance History');
    await captureScreen(page, '20_teacher_attendance_history.png', 2000);

    // Sign out Teacher
    await clickLink(page, 'Sign Out');
    await sleep(1500);

    // ----------------------------------------------------
    // 5. STUDENT PORTAL
    // ----------------------------------------------------
    console.log('--- 5. Student Portal ---');
    // Log in as Rohan Gupta (B.Tech CSE student with pending dues)
    await login(page, 'rohan.gupta@college.edu', 'Student@123');
    await captureScreen(page, '21_student_dashboard.png', 2500);

    // Open Pay Now Modal
    await clickLink(page, 'Pay Outstanding Fees');
    await captureScreen(page, '22_student_pay_online_modal.png', 1200);

    // Dismiss modal by clicking Close / Understood button
    await clickLink(page, 'Understood');
    await sleep(600);

    // My Attendance
    await clickLink(page, 'My Attendance');
    await captureScreen(page, '23_student_attendance.png', 2000);

    // My Library
    await clickLink(page, 'My Library');
    await captureScreen(page, '24_student_library.png', 2000);

    // My Profile
    await clickLink(page, 'My Profile');
    await captureScreen(page, '25_student_profile.png', 2500);

    console.log('🎉 ALL 25 MASTER SCREENSHOTS CAPTURED WITH RICH DATA!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ Master capture error:', err);
  process.exit(1);
});
