const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('Logging in...');
  await page.goto('http://localhost:50005/login', { waitUntil: 'networkidle0' });
  const inputs = await page.$$('input');
  if (inputs.length >= 3) {
    await inputs[0].focus(); await page.keyboard.type('AM-0001'); 
    await inputs[1].focus(); await page.keyboard.type('admin');
    await inputs[2].focus(); await page.keyboard.type('Admin@123');
  } 
  await new Promise(r => setTimeout(r, 500));
  await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(e => {});
  
  const screens = [
    { name: '1_Home', url: 'http://localhost:50005/' },
    { name: '2_Client_Management', url: 'http://localhost:50005/admin/clients' },
    { name: '3_Master_Data', url: 'http://localhost:50005/master' },
    { name: '4_Current_Stock', url: 'http://localhost:50005/inventory/stock' },
    { name: '5_Sales_Dashboard', url: 'http://localhost:50005/sales' },
    { name: '6_Sales_Bill', url: 'http://localhost:50005/sales?type=bill' },
    { name: '7_Purchase_Bill', url: 'http://localhost:50005/purchase?type=bill' },
    { name: '8_Finance', url: 'http://localhost:50005/finance' },
    { name: '9_Settings', url: 'http://localhost:50005/settings' }
  ];

  for (const screen of screens) {
    console.log(`Navigating to ${screen.name}...`);
    await page.goto(screen.url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000)); // wait for renders/animations
    await page.screenshot({ path: path.join(__dirname, `audit_${screen.name}.png`) });
  }

  await browser.close();
  console.log('Done capturing all screens!');
})();
