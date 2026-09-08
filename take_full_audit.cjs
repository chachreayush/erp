const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('Navigating to login...');
  await page.goto('http://localhost:50005/login', { waitUntil: 'networkidle0' });
  
  console.log('Logging in...');
  const inputs = await page.$$('input');
  
  if (inputs.length >= 3) {
    await inputs[0].focus();
    await page.keyboard.type('AM-0001', {delay: 10}); 
    await inputs[1].focus();
    await page.keyboard.type('admin', {delay: 10});
    await inputs[2].focus();
    await page.keyboard.type('Admin@123', {delay: 10});
  } 
  
  await new Promise(r => setTimeout(r, 500));
  await page.keyboard.press('Enter');
  
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Navigation timeout, continuing...'));
  
  console.log('Taking Home Screen screenshot...');
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(__dirname, 'audit_home.png') });

  console.log('Navigating to Sales Bill...');
  await page.goto('http://localhost:50005/sales?type=bill', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(__dirname, 'audit_sales.png') });

  console.log('Navigating to Products List...');
  await page.goto('http://localhost:50005/inventory/products', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(__dirname, 'audit_products.png') });
  
  console.log('Navigating to Settings...');
  await page.goto('http://localhost:50005/settings', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(__dirname, 'audit_settings.png') });

  await browser.close();
  console.log('Done!');
})();
