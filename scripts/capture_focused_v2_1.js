import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve('web_audit_screenshots', 'v2_1_final_audit');

async function main() {
  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--window-size=1440,1100');
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  try {
    await driver.get(FRONTEND_URL + '/scanner');
    await driver.sleep(600);
    await driver.executeScript(() => {
      localStorage.setItem('linksentry_e2e_session', JSON.stringify({
        uid: 'v2-1-lead-auditor',
        email: 'auditor@linksentry.io',
      }));
    });

    // 1. Amazon.in
    await driver.get(FRONTEND_URL + '/scanner');
    await driver.sleep(800);
    const input1 = await driver.findElement(By.css('#url-input'));
    await input1.clear();
    await input1.sendKeys('https://amazon.in');
    const submitBtn1 = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
    await submitBtn1.click();
    await driver.wait(until.elementLocated(By.css('.scan-result-card')), 25000);
    await driver.sleep(1000);

    const verdictCard1 = await driver.findElement(By.css('.verdict-banner-box'));
    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'instant', block: 'center' });", verdictCard1);
    await driver.sleep(400);
    const shot1 = await driver.takeScreenshot();
    fs.writeFileSync(path.join(SCREENSHOT_DIR, '01_amazon_in_final_verdict_card.png'), shot1, 'base64');

    const decisionCard1 = await driver.findElement(By.css('.model-decision-signals-card'));
    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'instant', block: 'center' });", decisionCard1);
    await driver.sleep(400);
    const shot2 = await driver.takeScreenshot();
    fs.writeFileSync(path.join(SCREENSHOT_DIR, '02_amazon_in_ml_margins_card.png'), shot2, 'base64');

    // 2. ggle.com
    await driver.get(FRONTEND_URL + '/scanner');
    await driver.sleep(800);
    const input2 = await driver.findElement(By.css('#url-input'));
    await input2.clear();
    await input2.sendKeys('https://www.ggle.com');
    const submitBtn2 = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
    await submitBtn2.click();
    await driver.wait(until.elementLocated(By.css('.scan-result-card')), 25000);
    await driver.sleep(1000);

    const verdictCard2 = await driver.findElement(By.css('.verdict-banner-box'));
    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'instant', block: 'center' });", verdictCard2);
    await driver.sleep(400);
    const shot3 = await driver.takeScreenshot();
    fs.writeFileSync(path.join(SCREENSHOT_DIR, '03_ggle_com_final_verdict_card.png'), shot3, 'base64');

    const decisionCard2 = await driver.findElement(By.css('.model-decision-signals-card'));
    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'instant', block: 'center' });", decisionCard2);
    await driver.sleep(400);
    const shot4 = await driver.takeScreenshot();
    fs.writeFileSync(path.join(SCREENSHOT_DIR, '04_ggle_com_ml_margins_card.png'), shot4, 'base64');

    console.log('✓ Focused V2.1 screenshots saved successfully.');
  } finally {
    await driver.quit();
  }
}

main();
