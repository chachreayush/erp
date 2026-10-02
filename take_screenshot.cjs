const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport for desktop
  await page.setViewport({ width: 1280, height: 800 });
  
  // Go to inventory page which will redirect to login if not logged in
  await page.goto('http://localhost:50005/inventory', { waitUntil: 'networkidle2' });
  
  // Wait to see if we are on login page or inventory
  await page.waitForTimeout(1000);
  const url = page.url();
  
  if (url.includes('/login')) {
      console.log('Logging in...');
      await page.type('input[type="text"]', 'admin_am');
      await page.type('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      // Navigate to inventory again
      await page.goto('http://localhost:50005/inventory', { waitUntil: 'networkidle2' });
  }

  console.log('On inventory page. Taking base screenshot.');
  await page.screenshot({ path: 'screenshot_base.png' });
  
  // Click Add Product
  console.log('Clicking Add Product...');
  const addProductBtn = await page.$x("//button[contains(., 'Add Product')]");
  if (addProductBtn.length > 0) {
      await addProductBtn[0].click();
      await page.waitForTimeout(1000);
      
      console.log('Taking modal screenshot.');
      await page.screenshot({ path: 'screenshot_modal.png' });
  } else {
      console.log('Add Product button not found!');
  }

  await browser.close();
})();
