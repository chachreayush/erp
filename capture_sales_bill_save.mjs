import puppeteer from 'puppeteer';

(async () => {
  const artifactDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\4793a238-58bd-40ed-9c37-093423cd07cd';

  console.log("Logging into backend...");
  const loginRes = await fetch('http://localhost:8000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@123', is_lan: true })
  });
  if (!loginRes.ok) throw new Error("Backend login failed");
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
  
  // Track dialogs
  let dialogMessage = null;
  page.on('dialog', async dialog => {
    dialogMessage = dialog.message();
    console.log(`[BROWSER DIALOG] ${dialog.type()}: ${dialogMessage}`);
    await dialog.accept();
  });

  await page.setViewport({ width: 1440, height: 950 });

  try {
    console.log("Navigating to app...");
    await page.goto('http://localhost:50005/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    await page.evaluate((authJson) => {
      sessionStorage.setItem('erp-auth', JSON.stringify(authJson));
      localStorage.setItem('erp-auth', JSON.stringify(authJson));
      // Set a mock product with an arbitrary UUID to simulate user's exact state
      const mockItems = [{
        id: "5efc2dbf-b614-4bc8-9c09-cf987cbc6cfb",
        name: "Levocet 40",
        packing: "10 TAB",
        mrp: 120,
        p_rate: 102,
        rate_a: 102,
        igst_percent: 12
      }];
      localStorage.setItem('erp_inventory_items', JSON.stringify(mockItems));
    }, authObj);

    console.log("Navigating to /sales?type=bill...");
    await page.goto('http://localhost:50005/sales?type=bill', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill in Party Name and Product
    console.log("Filling in bill fields...");
    await page.evaluate(() => {
      // Set party
      const partyInput = document.querySelector('input[placeholder*="Select Party"], input[placeholder*="Cash / Customer Name"]');
      if (partyInput) {
        partyInput.value = 'LIFECARE CHEMIST & DRUGGIST';
        partyInput.dispatchEvent(new Event('input', { bubbles: true }));
        partyInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await page.screenshot({ path: `${artifactDir}\\live_sales_bill_saved_verified.png` });
    console.log("Initial state screenshot captured!");

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await browser.close();
  }
})();
