const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  await page.type('input[type="email"]', 'clerk.raj@college.edu');
  await page.type('input[type="password"]', 'Clerk@123');
  const btn = await page.$('button[type="submit"]');
  await btn.click();
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2000));

  console.log('Current URL after login:', page.url());

  // Click Payment History
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const target = links.find((a) => a.textContent && a.textContent.includes('Payment History'));
    if (target) {
      console.log('Found target link, clicking:', target.getAttribute('href'));
      target.click();
    } else {
      console.log('Target link NOT found!');
    }
  });

  console.log('Waiting for database records to load...');
  await page.waitForFunction(() => !document.body.innerText.includes('Loading records from database...'), { timeout: 25000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
  console.log('Current URL after link click:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('Body text:', bodyText);

  const dest = 'C:\\Users\\Acer\\.gemini\\antigravity-ide\\brain\\1862df0f-6467-40bc-bb51-07308fc0b7e7\\screenshots\\15_clerk_payment_history.png';
  await page.screenshot({ path: dest, fullPage: false });
  console.log('Saved screenshot to:', dest);

  await browser.close();
})();
