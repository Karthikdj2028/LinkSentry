import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('web_audit_screenshots', 'v2_fixes');

async function main() {
  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--window-size=1440,1200');

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  try {
    await driver.get(BASE_URL + '/scanner');
    await driver.sleep(1000);

    await driver.executeScript(() => {
      localStorage.setItem('linksentry_e2e_session', JSON.stringify({
        uid: 'e2e-analyst-1',
        email: 'analyst@linksentry.io',
      }));
    });

    await driver.get(BASE_URL + '/scanner');
    await driver.sleep(1500);

    const input = await driver.findElement(By.css('#url-input'));
    await input.clear();
    await input.sendKeys('https://www.ggle.com');

    const submitBtn = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
    await submitBtn.click();

    await driver.wait(until.elementLocated(By.css('.scan-result-card')), 15000);
    await driver.sleep(1000);

    // Scroll directly to the Model Decision Signals card
    const decisionCard = await driver.findElement(By.css('.model-decision-signals-card'));
    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'instant', block: 'start' });", decisionCard);
    await driver.sleep(400);

    const shot1 = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, '01_technical_decision_signals_1440.png'), shot1, 'base64');

    // Scroll to URL Anatomy
    const anatomyCard = await driver.findElement(By.css('.url-anatomy-wrapper'));
    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'instant', block: 'start' });", anatomyCard);
    await driver.sleep(400);

    const shot2 = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, '02_url_anatomy_1440.png'), shot2, 'base64');

    // Mobile 375px capture
    await driver.sendDevToolsCommand('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await driver.sleep(300);

    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'instant', block: 'start' });", decisionCard);
    await driver.sleep(300);
    const shot3 = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, '01_technical_decision_signals_375.png'), shot3, 'base64');

    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'instant', block: 'start' });", anatomyCard);
    await driver.sleep(300);
    const shot4 = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, '02_url_anatomy_375.png'), shot4, 'base64');

    console.log('✓ All detailed card screenshots saved successfully.');
  } finally {
    await driver.quit();
  }
}

main();
