import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--disable-gpu', '--no-sandbox');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await driver.get('http://localhost:5173');
    await driver.executeScript(() => {
      localStorage.setItem('linksentry_e2e_session', JSON.stringify({ uid: 'e2e-analyst-1', email: 'analyst@linksentry.io' }));
    });
    await driver.get('http://localhost:5173/security-center');
    await driver.sleep(600);
    const btn = await driver.findElement(By.css('[data-testid="security-center-print-btn"]'));
    await driver.executeScript('arguments[0].click();', btn);
    await driver.sleep(600);
    await driver.wait(until.elementLocated(By.css('.audit-report-modal')), 5000);
    const png = await driver.takeScreenshot();
    fs.writeFileSync(path.join(__dirname, '../web_audit_screenshots/v2/06_executive_audit_modal_1440_desktop.png'), png, 'base64');
    console.log('Successfully captured updated audit modal screenshot!');
  } finally {
    await driver.quit();
  }
})();
