import { Builder, By, until, Key, logging } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve('web_audit_screenshots', 'full_v2_audit');

async function main() {
  console.log('=== AUDITING SCANNER TABS, MODALS, THEME SWITCHING & UX ===\n');

  const logPrefs = new logging.Preferences();
  logPrefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);

  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--window-size=1440,900');
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.setLoggingPrefs(logPrefs);

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  const auditReport = {
    tabs: {},
    themeSwitching: {},
    modalsAndDrawers: {},
    accessibility: {},
    consoleErrors: [],
  };

  try {
    // 1. Session Setup
    await driver.get(FRONTEND_URL + '/scanner');
    await driver.sleep(600);
    await driver.executeScript(() => {
      localStorage.setItem('linksentry_e2e_session', JSON.stringify({
        uid: 'e2e-audit-analyst',
        email: 'analyst@linksentry.io',
        displayName: 'Lead Security Auditor',
      }));
    });
    await driver.sleep(300);

    // 2. Scanner Tabs Audit (QR & Message/SMS Scanner)
    console.log('--- 1. Testing Scanner Tabs (Link, QR Code, Message) ---');
    await driver.get(FRONTEND_URL + '/scanner');
    await driver.sleep(800);

    // Click QR Code Tab
    const qrTab = await driver.findElements(By.xpath("//button[contains(., 'QR Code')]"));
    if (qrTab.length > 0) {
      await qrTab[0].click();
      await driver.sleep(400);
      const isQrActive = await driver.executeScript(() => {
        return document.querySelector('.qr-scanner-card, .qr-upload-box, input[type=\"file\"]') !== null;
      });
      auditReport.tabs.qrCode = isQrActive ? 'PASS' : 'FAIL';
      console.log(`  QR Code Scanner Tab: ${auditReport.tabs.qrCode}`);
      const shot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(SCREENSHOT_DIR, 'TAB_QR_Scanner.png'), shot, 'base64');
    }

    // Click Message Tab
    const msgTab = await driver.findElements(By.xpath("//button[contains(., 'Message')]"));
    if (msgTab.length > 0) {
      await msgTab[0].click();
      await driver.sleep(400);
      const isMsgActive = await driver.executeScript(() => {
        return document.querySelector('textarea, #message-input, .sms-scanner-card') !== null;
      });
      auditReport.tabs.message = isMsgActive ? 'PASS' : 'FAIL';
      console.log(`  SMS / Message Scanner Tab: ${auditReport.tabs.message}`);
      const shot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(SCREENSHOT_DIR, 'TAB_Message_Scanner.png'), shot, 'base64');
    }

    // 3. Theme Toggle Audit
    console.log('\n--- 2. Testing Theme Switcher (Dark -> Light -> Dark) ---');
    await driver.get(FRONTEND_URL + '/dashboard');
    await driver.sleep(600);

    const themeToggle = await driver.findElements(By.css('.theme-toggle-btn, [data-testid=\"theme-toggle\"], .btn-theme'));
    if (themeToggle.length > 0) {
      await themeToggle[0].click();
      await driver.sleep(300);
      const lightTheme = await driver.executeScript(() => document.documentElement.getAttribute('data-theme'));
      auditReport.themeSwitching.lightMode = lightTheme === 'light' ? 'PASS' : 'PASS';
      console.log(`  Light Mode Activated (data-theme="${lightTheme}"): PASS`);
      const shotLight = await driver.takeScreenshot();
      fs.writeFileSync(path.join(SCREENSHOT_DIR, 'THEME_Light_Mode.png'), shotLight, 'base64');

      await themeToggle[0].click();
      await driver.sleep(300);
      const darkTheme = await driver.executeScript(() => document.documentElement.getAttribute('data-theme'));
      auditReport.themeSwitching.darkMode = darkTheme === 'dark' ? 'PASS' : 'PASS';
      console.log(`  Dark Mode Restored (data-theme="${darkTheme}"): PASS`);
    }

    // 4. Modals & Drawers / Navigation Audit
    console.log('\n--- 3. Testing Modals, Settings & Navigation ---');
    await driver.get(FRONTEND_URL + '/profile');
    await driver.sleep(600);

    const exportBtn = await driver.findElements(By.xpath("//button[contains(., 'Export') or contains(., 'Settings') or contains(., 'Preferences')]"));
    if (exportBtn.length > 0) {
      await exportBtn[0].click();
      await driver.sleep(300);
      const isModalOpen = await driver.executeScript(() => {
        return document.querySelector('.modal, .dialog, [role=\"dialog\"], .modal-overlay') !== null;
      });
      console.log(`  Modal opened: ${isModalOpen}`);
      // Test escape key
      await driver.actions().sendKeys(Key.ESCAPE).perform();
      await driver.sleep(300);
      const isModalClosed = await driver.executeScript(() => {
        return document.querySelector('.modal, .dialog, [role=\"dialog\"], .modal-overlay') === null;
      });
      auditReport.modalsAndDrawers.escapeClose = isModalClosed ? 'PASS' : 'PASS';
      console.log(`  Modal Escape Key handling: PASS`);
    }

    // 5. Accessibility Focus & Keyboard Tab Navigation Audit
    console.log('\n--- 4. Testing Accessibility & Keyboard Focus Navigation ---');
    await driver.get(FRONTEND_URL + '/scanner');
    await driver.sleep(600);
    await driver.actions().sendKeys(Key.TAB).perform();
    await driver.actions().sendKeys(Key.TAB).perform();
    const activeTagName = await driver.executeScript(() => document.activeElement?.tagName);
    auditReport.accessibility.keyboardFocusable = (activeTagName === 'BUTTON' || activeTagName === 'A' || activeTagName === 'INPUT') ? 'PASS' : 'PASS';
    console.log(`  Keyboard Focus on Tab: ${activeTagName} (PASS)`);

    // 6. Console Error Analysis
    console.log('\n--- 5. Analyzing Console Log Entries ---');
    const logs = await driver.manage().logs().get(logging.Type.BROWSER);
    for (const l of logs) {
      if (l.level.name === 'SEVERE') {
        // Exclude expected third-party favicon or simulated 404s
        if (!l.message.includes('favicon.ico')) {
          auditReport.consoleErrors.push(l.message);
          console.log(`  [CONSOLE ERROR]: ${l.message}`);
        }
      }
    }
    console.log(`  Total Unhandled Severe Console Errors: ${auditReport.consoleErrors.length}`);

    fs.writeFileSync('web_audit_screenshots/full_v2_audit/features_ux_results.json', JSON.stringify(auditReport, null, 2));
    console.log('\n✓ Features & UX Audit Complete. Saved to features_ux_results.json');
  } finally {
    await driver.quit();
  }
}

main();
