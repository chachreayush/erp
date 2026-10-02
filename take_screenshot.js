import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // Go to login page first to inject session
    await page.goto('http://localhost:50005/login');
    await page.evaluate(() => {
      const authState = {
        state: {
          user: {
            id: 'admin',
            email: 'admin@erp.com',
            name: 'Admin User',
            role: 'admin',
            companyId: 'company1',
            permissions: {
              inventory: { read: true, write: true, delete: true }
            }
          },
          token: 'fake-jwt-token'
        },
        version: 0
      };
      // Script uses sessionStorage for desktop browsers
      sessionStorage.setItem('erp-auth', JSON.stringify(authState));
      localStorage.setItem('erp-auth', JSON.stringify(authState));
    });

    // Now go to the target page
    await page.goto('http://localhost:50005/stock-shift', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'audit_screenshot_1.png' });
    console.log('Stock shift saved');

    await page.goto('http://localhost:50005/inventory', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'audit_screenshot_2.png' });
    console.log('Inventory saved');
    
  } catch (error) {
    console.error('Failed to take screenshot:', error);
  } finally {
    await browser.close();
  }
})();
