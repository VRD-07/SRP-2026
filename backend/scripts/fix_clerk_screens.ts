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

async function main() {
  console.log('🚀 Fixing Clerk screenshots (14, 15, 16, 17)...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    console.log('Navigating to login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await sleep(800);

    // 1-Click quick fill for Clerk
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const clerkBtn = buttons.find((b) => b.textContent && b.textContent.includes('Clerk'));
      if (clerkBtn) clerkBtn.click();
    });
    await sleep(400);

    // Click Sign In button
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();

    // Wait until URL contains /clerk
    console.log('Waiting for login redirect to /clerk...');
    await page.waitForFunction(() => window.location.pathname.startsWith('/clerk'), { timeout: 15000 });
    await sleep(2000);

    // 1. Navigate to Collect Fees
    console.log('14. Collect Fees...');
    await page.goto(`${BASE_URL}/clerk/collect`, { waitUntil: 'networkidle0' });
    await sleep(1500);

    // Search for Priya
    const searchInput = await page.$('input[placeholder*="Search"], input[type="text"]');
    if (searchInput) {
      await searchInput.type('Priya');
      await sleep(1500);

      // Click the student from search results dropdown
      await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('div, li, span'));
        const priya = items.find((el) => el.textContent && el.textContent.includes('Priya') && el.textContent.includes('Sharma'));
        if (priya) (priya as HTMLElement).click();
      });
      await sleep(2500);
    }

    const collectPath = path.join(SCREENSHOT_DIR, '14_clerk_collect_fees.png');
    await page.screenshot({ path: collectPath, fullPage: false });
    console.log('📸 Captured 14_clerk_collect_fees.png');

    // 2. Navigate to Payment History
    console.log('15. Payment History...');
    await page.goto(`${BASE_URL}/clerk/history`, { waitUntil: 'networkidle0' });
    await sleep(3000);
    const histPath = path.join(SCREENSHOT_DIR, '15_clerk_payment_history.png');
    await page.screenshot({ path: histPath, fullPage: false });
    console.log('📸 Captured 15_clerk_payment_history.png');

    // 3. Navigate to Pending Dues
    console.log('16. Pending Dues...');
    await page.goto(`${BASE_URL}/clerk/pending`, { waitUntil: 'networkidle0' });
    await sleep(3000);
    const pendingPath = path.join(SCREENSHOT_DIR, '16_clerk_pending_dues.png');
    await page.screenshot({ path: pendingPath, fullPage: false });
    console.log('📸 Captured 16_clerk_pending_dues.png');

    // 4. Navigate to Library Desk
    console.log('17. Library Desk...');
    await page.goto(`${BASE_URL}/clerk/library`, { waitUntil: 'networkidle0' });
    await sleep(2500);
    const libPath = path.join(SCREENSHOT_DIR, '17_clerk_library_circulation.png');
    await page.screenshot({ path: libPath, fullPage: false });
    console.log('📸 Captured 17_clerk_library_circulation.png');

    console.log('🎉 Clerk screens 14, 15, 16, 17 successfully captured!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
