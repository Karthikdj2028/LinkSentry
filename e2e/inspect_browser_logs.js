import { Builder, By } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';

const TEST_EMAIL = 'analyst.qa.test@linksentry.io';
const TEST_PASS = 'TestPass123!';

async function inspectLogsAndScreens() {
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage');
  options.setLoggingPrefs({ browser: 'ALL' });

  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    await driver.get('http://localhost:5173/');
    await new Promise(r => setTimeout(r, 2000));

    // Login
    const emailInput = await driver.findElement(By.id('login-email'));
    const passInput = await driver.findElement(By.id('login-password'));
    await emailInput.sendKeys(TEST_EMAIL);
    await passInput.sendKeys(TEST_PASS);
    const submitBtn = await driver.findElement(By.css('[data-testid="login-submit-button"]'));
    await driver.executeScript('arguments[0].click();', submitBtn);
    await new Promise(r => setTimeout(r, 3000));

    const routes = ['/', '/dashboard', '/scanner', '/history', '/analytics', '/security-center', '/profile'];
    for (const route of routes) {
      console.log(`\n--- Inspecting Route: ${route} ---`);
      await driver.get(`http://localhost:5173${route}`);
      await new Promise(r => setTimeout(r, 2500));
      
      const logs = await driver.manage().logs().get('browser');
      for (const log of logs) {
        console.log(`[Browser Log ${log.level.name}]: ${log.message}`);
      }
    }
  } finally {
    await driver.quit();
  }
}

inspectLogsAndScreens().catch(console.error);
