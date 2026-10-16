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
  fs.writeFileSync('auth_token.json', JSON.stringify(authObj, null, 2));
  console.log("Fresh auth_token.json written successfully!");

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
    
    // Inject auth token into both sessionStorage and localStorage
    await page.evaluate((authJson) => {
      sessionStorage.setItem('erp-auth', JSON.stringify(authJson));
      localStorage.setItem('erp-auth', JSON.stringify(authJson));
    }, authObj);

    // 1. Sales Bill Workspace
    console.log("Navigating to /sales...");
    await page.goto('http://localhost:50005/sales', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));

    const path1 = `${artifactDir}\\doc20_sales_bill_workspace.png`;
    await page.screenshot({ path: path1, fullPage: false });
    console.log("Saved: " + path1);

    // 2. Open Customer Selector Modal [F7]
    console.log("Opening [F7] Customer Selector Modal via keyboard/click...");
    await page.evaluate(() => {
      const partyInput = document.querySelector('input[placeholder*="Select Party"]');
      if (partyInput) {
        partyInput.click();
      }
    });
    await new Promise(r => setTimeout(r, 1500));
    const path2 = `${artifactDir}\\doc20_customer_modal.png`;
    await page.screenshot({ path: path2, fullPage: false });
    console.log("Saved: " + path2);

    // Select the first customer (Apollo Pharmacy) via Enter key
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 800));

    // 3. Open Against Approved SO Modal [F9]
    console.log("Triggering [F9] Load Approved SO modal via F9 key...");
    await page.keyboard.press('F9');
    await new Promise(r => setTimeout(r, 1800));
    const path3 = `${artifactDir}\\doc20_so_picker_modal.png`;
    await page.screenshot({ path: path3, fullPage: false });
    console.log("Saved: " + path3);

    // Press Escape to close SO modal
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 800));

    // 4. Focus product row 1 and open Product modal
    console.log("Opening product search modal via Enter...");
    await page.evaluate(() => {
      const prod1 = document.getElementById('product-input-1');
      if (prod1) {
        prod1.focus();
      }
    });
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1500));
    // Select first product
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1200));

    // 5. Open F3 Batch Modal
    console.log("Pressing F3 to open Batch modal...");
    await page.keyboard.press('F3');
    await new Promise(r => setTimeout(r, 1800));
    const path4 = `${artifactDir}\\doc20_fefo_batch_modal.png`;
    await page.screenshot({ path: path4, fullPage: false });
    console.log("Saved: " + path4);

    // Close Batch modal
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 800));

    // 6. Navigate to Sales Register List
    console.log("Navigating to /sales?type=modify-bill...");
    await page.goto('http://localhost:50005/sales?type=modify-bill', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    const path5 = `${artifactDir}\\doc20_sales_list_register.png`;
    await page.screenshot({ path: path5, fullPage: false });
    console.log("Saved: " + path5);

    console.log("All 5 DOC-20 screenshots captured successfully with authenticated session!");
  } catch (err) {
    console.error("Screenshot error:", err);
  } finally {
    await browser.close();
  }
})();
