import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity-ide\\brain\\a67442fc-448d-4dd9-82c2-2f47df20c631\\screenshots';
const BASE_URL = 'http://localhost:5173';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await sleep(600);
    await page.type('input[type="email"]', 'clerk.raj@college.edu');
    await page.type('input[type="password"]', 'Clerk@123');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
    await sleep(2000);

    // Click sidebar link "Payment History"
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const target = links.find((a) => a.textContent && a.textContent.includes('Payment History'));
      if (target) (target as HTMLElement).click();
    });

    console.log('Waiting for transactions table to load...');
    await page.waitForSelector('table, tbody tr', { timeout: 10000 }).catch(() => {});
    await sleep(2000);

    const filePath = path.join(SCREENSHOT_DIR, '15_clerk_payment_history.png');
    await page.screenshot({ path: filePath, fullPage: false });
    console.log('📸 Captured table: 15_clerk_payment_history.png');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
