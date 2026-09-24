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
    // Log in as Rohan Gupta (B.Tech CSE student with pending fees)
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await sleep(600);
    await page.type('input[type="email"]', 'rohan.gupta@college.edu');
    await page.type('input[type="password"]', 'Student@123');
    await sleep(300);
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
    await sleep(2500);

    // Click "Pay Outstanding Fees" or "Pay Due"
    const clickedPay = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const payBtn = buttons.find((b) => b.textContent && (b.textContent.includes('Pay Outstanding') || b.textContent.includes('Pay Due')));
      if (payBtn) {
        payBtn.click();
        return true;
      }
      return false;
    });

    console.log('Clicked pay button?', clickedPay);
    if (clickedPay) {
      await sleep(1000);
      const filePath = path.join(SCREENSHOT_DIR, '22_student_pay_online_modal.png');
      await page.screenshot({ path: filePath, fullPage: false });
      console.log('📸 Captured: 22_student_pay_online_modal.png');
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
