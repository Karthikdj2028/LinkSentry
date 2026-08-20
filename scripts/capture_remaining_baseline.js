import fs from 'fs';
import path from 'path';
import { Builder, By } from 'selenium-webdriver';
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

async function selectTabViaReact(driver, tabId, subTab = 'url') {
  await driver.executeScript((t, sub) => {
    window.history.pushState({ tab: t }, '', t === 'scanner' && sub !== 'url' ? `/scanner?type=${sub}` : `/${t === 'overview' ? '' : t}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, tabId, subTab);
  await driver.sleep(400);
}

async function run() {
  console.log('Capturing Security Center, Profile, Live Scans, and Modals...');
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--disable-gpu', '--no-sandbox');
  options.windowSize({ width: 1440, height: 900 });

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    await driver.get(BASE_URL);
    await setSession(driver);
    await driver.get(BASE_URL);
    await driver.sleep(600);

    // 1. Security Center across all 8 viewports
    console.log('Capturing Security Center...');
    await selectTabViaReact(driver, 'security-center');
    for (const vp of VIEWPORTS) {
      await driver.manage().window().setRect({ width: vp.width, height: vp.height });
      await driver.sleep(300);
      const png = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, `06_security_center_${vp.name}.png`), png, 'base64');
    }

    // 2. Security Center Audit Modal
    console.log('Capturing Executive Audit Report Modal...');
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await driver.sleep(200);
    try {
      const modalBtn = await driver.findElement(By.css('button.btn-primary, button[data-testid*="audit"], .soc-actions-group button'));
      await modalBtn.click();
      await driver.sleep(500);
      const modalPng = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, `06_executive_audit_modal_1440.png`), modalPng, 'base64');
      // close modal
      const closeBtn = await driver.findElement(By.css('.modal-close-btn, button.btn-secondary'));
      await closeBtn.click();
      await driver.sleep(300);
    } catch (e) {
      console.warn('Audit modal click note:', e.message);
    }

    // 3. Profile across all 8 viewports
    console.log('Capturing Profile...');
    await selectTabViaReact(driver, 'profile');
    for (const vp of VIEWPORTS) {
      await driver.manage().window().setRect({ width: vp.width, height: vp.height });
      await driver.sleep(300);
      const png = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, `07_profile_${vp.name}.png`), png, 'base64');
    }

    // Expand Help FAQ accordion on Profile
    try {
      const faqBtn = await driver.findElement(By.css('.faq-item button, .help-accordion button, button.faq-question'));
      await faqBtn.click();
      await driver.sleep(300);
      const faqPng = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, `07_profile_faq_expanded_1440.png`), faqPng, 'base64');
    } catch {
      // FAQ accordion
    }

    // 4. Live Scans on Scanner page
    console.log('Capturing Live Scan results for google.com, ggle.com, micros0ft.com...');
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await selectTabViaReact(driver, 'scanner', 'url');
    await driver.sleep(400);

    const testUrls = [
      { url: 'https://google.com', file: '03_scan_result_google' },
      { url: 'https://www.ggle.com', file: '03_scan_result_ggle' },
      { url: 'https://www.micros0ft.com', file: '03_scan_result_micros0ft' }
    ];

    for (const item of testUrls) {
      console.log(`  Scanning ${item.url}...`);
      await selectTabViaReact(driver, 'scanner', 'url');
      await driver.sleep(400);
      const input = await driver.findElement(By.css('input.form-input, input[type="text"], input[type="url"]'));
      await input.clear();
      await input.sendKeys(item.url);
      const submit = await driver.findElement(By.css('button[type="submit"], button.btn-primary'));
      await submit.click();
      await driver.sleep(3500); // await API response & render

      for (const vp of VIEWPORTS) {
        await driver.manage().window().setRect({ width: vp.width, height: vp.height });
        await driver.sleep(250);
        const png = await driver.takeScreenshot();
        fs.writeFileSync(path.join(OUTPUT_DIR, `${item.file}_${vp.name}.png`), png, 'base64');
      }
    }

    console.log('Remaining baseline capture completed successfully!');
  } finally {
    await driver.quit();
  }
}

run().catch(e => {
  console.error('Failure:', e);
  process.exit(1);
});
