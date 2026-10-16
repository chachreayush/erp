import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const artifactDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\4793a238-58bd-40ed-9c37-093423cd07cd';

  console.log("Fetching fresh JWT authentication token...");
  const loginRes = await fetch('http://localhost:8000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@123', is_lan: true })
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json();
  const authObj = {
    state: {
      user: loginData.user,
      token: loginData.access_token,
      originalAmUser: null,
      originalAmToken: null,
      appMode: 'lan',
      serverUrl: 'http://localhost:8000'
    },
    version: 0
  };

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.on('dialog', async d => await d.dismiss());
  await page.setViewport({ width: 1440, height: 950 });

  try {
    console.log("Navigating to app to inject session...");
    await page.goto('http://localhost:50005/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Inject auth token and ensure minimal theme is active (to test override resistance)
    await page.evaluate((authJson) => {
      sessionStorage.setItem('erp-auth', JSON.stringify(authJson));
      localStorage.setItem('erp-auth', JSON.stringify(authJson));
      localStorage.setItem('merge-erp-theme', JSON.stringify({ state: { activeTheme: 'minimal' }, version: 0 }));
    }, authObj);

    console.log("Navigating to /sales...");
    await page.goto('http://localhost:50005/sales', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Populate Apollo Pharmacy as party
    console.log("Selecting party Apollo Pharmacy...");
    await page.evaluate(() => {
      const partyInput = document.querySelector('input[placeholder*="Select Party"]');
      if (partyInput) partyInput.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 800));

    // Populate row 1 product
    console.log("Selecting product for row 1...");
    await page.evaluate(() => {
      const p1 = document.getElementById('product-input-1');
      if (p1) p1.focus();
    });
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1200));
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1000));

    // Type batch and advance
    console.log("Typing batch B5553...");
    await page.focus('#batch-input-1');
    await page.keyboard.type('B5553');
    await page.focus('#bottom-expiry-input');
    await page.keyboard.type('11/27');
    await page.focus('#qty-input-1');
    await page.keyboard.type('10');
    await page.focus('#prate-input-1');
    await page.keyboard.type('48.37');
    await page.focus('#dis-input-1');
    await page.keyboard.type('0.00');

    await new Promise(r => setTimeout(r, 1500));

    const outPath = `${artifactDir}\\live_sales_bill_themed.png`;
    await page.screenshot({ path: outPath, fullPage: false });
    console.log("Saved screenshot: " + outPath);

  } catch (err) {
    console.error("Capture error:", err);
  } finally {
    await browser.close();
  }
})();
