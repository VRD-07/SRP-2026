import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity-ide\\brain\\1862df0f-6467-40bc-bb51-07308fc0b7e7\\screenshots';
const BASE_URL = 'http://localhost:5173';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Recapturing Admin Dashboard & Students List with populated data...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await sleep(600);
    await page.type('input[type="email"]', 'admin@college.edu');
    await page.type('input[type="password"]', 'Admin@123');
    const adminBtn = await page.$('button[type="submit"]');
    if (adminBtn) await adminBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await sleep(2000);

    // Wait for Admin Dashboard metrics to finish loading
    console.log('Waiting for admin dashboard overview metrics to load...');
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return !text.includes('₹ 0\n0 enrolled students') && !text.includes('No recent timeline data available');
      },
      { timeout: 30000 }
    ).catch(() => {});
    await sleep(2000);

    const dashDest = path.join(SCREENSHOT_DIR, '02_admin_dashboard.png');
    await page.screenshot({ path: dashDest, fullPage: false });
    console.log('📸 Successfully recaptured 02_admin_dashboard.png');

    // Go to student records
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const target = links.find((a) => a.textContent && a.textContent.includes('Student Records'));
      if (target) target.click();
    });

    console.log('Waiting for student records table to load...');
    await page.waitForFunction(
      () => !document.body.innerText.includes('Loading records from database...'),
      { timeout: 25000 }
    ).catch(() => {});
    await sleep(2000);

    const studentsDest = path.join(SCREENSHOT_DIR, '04_admin_students_list.png');
    await page.screenshot({ path: studentsDest, fullPage: false });
    console.log('📸 Successfully recaptured 04_admin_students_list.png');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
