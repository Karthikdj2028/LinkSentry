import fs from 'fs';
import path from 'path';
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('web_audit_screenshots/baseline');

const VIEWPORTS = [
  { name: '320_small_mobile', width: 320, height: 640 },
  { name: '375_standard_mobile', width: 375, height: 667 },
  { name: '412_large_mobile', width: 412, height: 869 },
  { name: '768_small_tablet', width: 768, height: 1024 },
  { name: '1024_tablet', width: 1024, height: 768 },
  { name: '1366_laptop', width: 1366, height: 768 },
  { name: '1440_desktop', width: 1440, height: 900 },
  { name: '1920_large_desktop', width: 1920, height: 1080 }
];

const TEST_ACCOUNT = {
  uid: 'baseline-test-analyst',
  email: 'analyst@linksentry.io',
  displayName: 'Lead Security Analyst',
  role: 'Senior SOC Analyst'
};

async function setSession(driver) {
  await driver.executeScript((user) => {
    localStorage.setItem('linksentry_e2e_session', JSON.stringify(user));
    localStorage.setItem('linksentry_theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  }, TEST_ACCOUNT);
}

async function run() {
  console.log('Capturing verified live scan results for LinkSentry V3.4 across viewports...');
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--disable-gpu', '--no-sandbox');
  options.windowSize({ width: 1440, height: 900 });

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  await driver.manage().setTimeouts({ implicit: 5000, pageLoad: 15000, script: 10000 });

  try {
    await driver.get(BASE_URL);
    await setSession(driver);

    const testTargets = [
      { url: 'https://google.com', filenamePrefix: '03_scan_result_google' },
      { url: 'https://www.ggle.com', filenamePrefix: '03_scan_result_ggle' },
      { url: 'https://www.micros0ft.com', filenamePrefix: '03_scan_result_micros0ft' }
    ];

    for (const item of testTargets) {
      console.log(`\n=== Scanning Target: ${item.url} ===`);
      await driver.manage().window().setRect({ width: 1440, height: 900 });
      await driver.get(`${BASE_URL}/scanner?type=url`);
      await driver.sleep(600);

      // Wait for input
      const input = await driver.wait(until.elementLocated(By.css('[data-testid="url-scan-input"]')), 5000);
      await input.clear();
      await input.sendKeys(item.url);

      const submitBtn = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
      await driver.executeScript('arguments[0].scrollIntoView({ block: "center" });', submitBtn);
      await driver.sleep(200);
      await driver.executeScript('arguments[0].click();', submitBtn);

      // Wait for scan result card to appear
      console.log('  Waiting for scan result card to render in DOM...');
      const resultCard = await driver.wait(until.elementLocated(By.css('[data-testid="scan-result-card"]')), 20000);
      await driver.sleep(600); // let animations settle

      // Extract rendered verdict
      const verdictEl = await driver.findElement(By.css('[data-testid="scan-result-verdict"]'));
      const verdictText = await verdictEl.getText();
      console.log(`  Rendered UI Verdict: ${verdictText}`);

      // Capture across all viewports
      for (const vp of VIEWPORTS) {
        await driver.manage().window().setRect({ width: vp.width, height: vp.height });
        await driver.sleep(300);
        const png = await driver.takeScreenshot();
        fs.writeFileSync(path.join(OUTPUT_DIR, `${item.filenamePrefix}_${vp.name}.png`), png, 'base64');
      }
    }

    console.log('\nAll live scan baseline screenshots successfully captured!');
  } finally {
    await driver.quit();
  }
}

run().catch(err => {
  console.error('Capture live scan error:', err);
  process.exit(1);
});
