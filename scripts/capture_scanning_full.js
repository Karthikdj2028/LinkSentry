import { Builder, By } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('web_audit_screenshots', 'v2_fixes');

async function main() {
  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--window-size=1440,1000');

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  try {
    await driver.get(BASE_URL + '/scanner');
    await driver.sleep(800);

    await driver.executeScript(() => {
      localStorage.setItem('linksentry_e2e_session', JSON.stringify({
        uid: 'e2e-analyst-1',
        email: 'analyst@linksentry.io',
      }));
    });

    await driver.get(BASE_URL + '/scanner');
    await driver.sleep(1000);

    const input = await driver.findElement(By.css('#url-input'));
    await input.clear();
    await input.sendKeys('http://chase-bank-online-security-auth--check.xyz/login.php');

    const submitBtn = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
    await submitBtn.click();

    await driver.sleep(150);
    await driver.executeScript("window.scrollTo(0, 500);");
    await driver.sleep(100);

    const shot1 = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, '03_active_scanning_progress_1440_full.png'), shot1, 'base64');

    // Mobile viewport
    await driver.get(BASE_URL + '/scanner');
    await driver.sleep(800);

    await driver.sendDevToolsCommand('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await driver.sleep(300);

    const inputMobile = await driver.findElement(By.css('#url-input'));
    await inputMobile.clear();
    await inputMobile.sendKeys('http://chase-bank-online-security-auth--check.xyz/login.php');

    const submitBtnMobile = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
    await submitBtnMobile.click();

    await driver.sleep(150);
    await driver.executeScript("window.scrollTo(0, 480);");
    await driver.sleep(100);

    const shot2 = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, '03_active_scanning_progress_375_full.png'), shot2, 'base64');

    console.log('✓ Full frame active scanning progress screenshots captured.');
  } finally {
    await driver.quit();
  }
}

main();
