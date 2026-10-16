import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const authData = fs.readFileSync('auth_token.json', 'utf-8');

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.on('dialog', async d => await d.dismiss());
  await page.setViewport({ width: 1440, height: 950 });

  try {
    console.log("Navigating to login to inject session...");
    await page.goto('http://localhost:50005/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Inject auth token into both sessionStorage and localStorage
    await page.evaluate((dataStr) => {
      sessionStorage.setItem('erp-auth', dataStr);
      localStorage.setItem('erp-auth', dataStr);
    }, authData);

    // 1. Company-wise Sales Report
    console.log("Navigating to /reports...");
    await page.goto('http://localhost:50005/reports', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3500));

    const path1 = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\4793a238-58bd-40ed-9c37-093423cd07cd\\doc30_company_wise_sales.png';
    await page.screenshot({ path: path1, fullPage: true });
    console.log("Saved: " + path1);

    // 2. Click "View Products" to open company product drilldown
    console.log("Clicking View Products for company drilldown...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes('View Products'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    const path2 = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\4793a238-58bd-40ed-9c37-093423cd07cd\\doc30_company_drilldown.png';
    await page.screenshot({ path: path2, fullPage: true });
    console.log("Saved: " + path2);

    // 3. Open Marg-style Company Filter Modal
    console.log("Clicking Filter Companies modal button...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes('Filter Companies'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const path3 = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\4793a238-58bd-40ed-9c37-093423cd07cd\\doc30_company_modal.png';
    await page.screenshot({ path: path3, fullPage: false });
    console.log("Saved: " + path3);

    // Close the modal
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.trim() === 'Close');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // 4. Navigate to /reports/designer
    console.log("Navigating to /reports/designer...");
    await page.goto('http://localhost:50005/reports/designer', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    const path4 = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\4793a238-58bd-40ed-9c37-093423cd07cd\\doc30_designer_executed.png';
    await page.screenshot({ path: path4, fullPage: true });
    console.log("Saved: " + path4);

    // 5. Navigate to /finance
    console.log("Navigating to /finance...");
    await page.goto('http://localhost:50005/finance', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    const path5 = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\4793a238-58bd-40ed-9c37-093423cd07cd\\finance_dashboard.png';
    await page.screenshot({ path: path5, fullPage: true });
    console.log("Saved: " + path5);

    console.log("ALL_VERIFICATION_SCREENSHOTS_TAKEN");
  } catch (err) {
    console.error("Screenshot capture error:", err);
  } finally {
    await browser.close();
  }
})();
