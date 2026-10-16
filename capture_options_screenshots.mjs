import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
  const artifactDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\4793a238-58bd-40ed-9c37-093423cd07cd';
  const htmlPath = 'file:///' + path.join(artifactDir, 'sales_bill_layout_options.html').replace(/\\/g, '/');

  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

  console.log("Navigating to HTML file: " + htmlPath);
  await page.goto(htmlPath, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  // Capture Option 1
  console.log("Capturing Option 1: Command-Deck...");
  await page.evaluate(() => switchTab(1));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: `${artifactDir}\\option1_command_deck.png` });

  // Capture Option 2
  console.log("Capturing Option 2: Split-Cockpit...");
  await page.evaluate(() => switchTab(2));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: `${artifactDir}\\option2_split_cockpit.png` });

  // Capture Option 3
  console.log("Capturing Option 3: Zen Minimalist...");
  await page.evaluate(() => switchTab(3));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: `${artifactDir}\\option3_zen_minimalist.png` });

  // Capture Option 4
  console.log("Capturing Option 4: Multi-Tab Studio...");
  await page.evaluate(() => switchTab(4));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: `${artifactDir}\\option4_multi_tab_studio.png` });

  await browser.close();
  console.log("All 4 option screenshots captured successfully!");
})();
