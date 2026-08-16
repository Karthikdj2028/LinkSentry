import { Builder, logging } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

async function checkConsole() {
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'debug_chrome_'));
  const options = new chrome.Options();
  options.addArguments(
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--user-data-dir=${tmpProfile}`
  );
  
  const prefs = new logging.Preferences();
  prefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);
  options.setLoggingPrefs(prefs);

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    await driver.get('http://localhost:5173/');
    await driver.executeScript(() => {
      localStorage.setItem('linksentry_e2e_session', JSON.stringify({
        uid: 'e2e_analyst_qa_user',
        email: 'analyst.qa.test@linksentry.io',
        displayName: 'QA Security Analyst'
      }));
      localStorage.setItem('linksentry_theme', 'light');
    });
    await driver.get('http://localhost:5173/');
    await new Promise((r) => setTimeout(r, 2000));

    const logs = await driver.manage().logs().get(logging.Type.BROWSER);
    console.log('--- BROWSER LOGS ---');
    logs.forEach(l => console.log(`[${l.level.name}] ${l.message}`));

    const shot = await driver.takeScreenshot();
    fs.writeFileSync('d:/LinkSentry/web_audit_screenshots/test_overview_direct.png', shot, 'base64');
    console.log('Screenshot saved to test_overview_direct.png');
  } finally {
    await driver.quit();
  }
}

checkConsole();
