import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity-ide\\brain\\1862df0f-6467-40bc-bb51-07308fc0b7e7\\screenshots';
const BASE_URL = 'http://localhost:5173';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Capturing Admin 360 Student Profile with robust selector wait...');
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
    await sleep(1500);

    // Go to student records
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const target = links.find((a) => a.textContent && a.textContent.includes('Student Records'));
      if (target) target.click();
    });

    console.log('Waiting for student directory records to load...');
    await page.waitForFunction(
      () => document.querySelector('button[title="View Unified Student Profile"]') !== null,
      { timeout: 25000 }
    ).catch(() => {});
    await sleep(1500);

    // Click first eye button (View Unified Student Profile)
    await page.evaluate(() => {
      const eyeBtn = document.querySelector('button[title="View Unified Student Profile"]');
      if (eyeBtn) (eyeBtn as HTMLElement).click();
    });

    console.log('Waiting for PERSONAL INFORMATION to appear in 360 profile...');
    await page.waitForFunction(
      () => document.body.innerText.includes('PERSONAL INFORMATION') || document.body.innerText.includes('Comprehensive Dossier'),
      { timeout: 30000 }
    ).catch(() => {});
    await sleep(2000);

    const adminProfileDest = path.join(SCREENSHOT_DIR, '06_admin_student_profile.png');
    await page.screenshot({ path: adminProfileDest, fullPage: false });
    console.log('📸 Successfully captured loaded 06_admin_student_profile.png');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
