const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:50005/login', { waitUntil: 'networkidle2', timeout: 15000 });
    
    const inputs = await page.('input');
    if (inputs.length >= 3) {
      await inputs[0].type('AM-0001', { delay: 15 });
      await inputs[1].type('admin', { delay: 15 });
      await inputs[2].type('Admin@123', { delay: 15 });
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    }

    console.log('Navigating to stock page...');
    await page.goto('http://localhost:50005/stock', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2500));

    // Type 'crosin' into search
    const searchInputs = await page.('input');
    for (const inp of searchInputs) {
      await inp.click();
      await inp.type('crosin', { delay: 20 });
      break;
    }
    await new Promise(r => setTimeout(r, 1500));

    // Click on Crosin Forte row
    const rows = await page.('tr');
    for (const row of rows) {
      const text = await (await row.getProperty('innerText')).jsonValue();
      if (text && text.includes('Crosin Forte')) {
        await row.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2500));

    const artifactPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\30c6bcb4-3d4d-4694-928d-f4b580461717\\audit_product_register.png';
    await page.screenshot({ path: artifactPath });
    console.log('Screenshot saved to:', artifactPath);
  } catch (err) {
    console.error('Audit error:', err);
  } finally {
    await browser.close();
  }
})();
