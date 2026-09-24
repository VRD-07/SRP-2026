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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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

    // Click Collect Fees
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const target = links.find((a) => a.textContent && a.textContent.includes('Collect Fees'));
      if (target) (target as HTMLElement).click();
    });
    await sleep(1500);

    // Type Priya in search
    const searchInput = await page.$('input[placeholder*="Search"], input[type="text"]');
    if (searchInput) {
      await searchInput.type('Priya');
      await sleep(1500);

      // Click on search result item
      await page.evaluate(() => {
        const item = document.querySelector('div.cursor-pointer, li.cursor-pointer, .p-3.cursor-pointer');
        if (item) (item as HTMLElement).click();
      });
      await sleep(2500);
    }

    const filePath = path.join(SCREENSHOT_DIR, '14_clerk_collect_fees.png');
    await page.screenshot({ path: filePath, fullPage: false });
    console.log('📸 Recaptured 14_clerk_collect_fees.png with populated student and payment form!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
