import fs from 'fs';
import path from 'path';
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('web_audit_screenshots/baseline');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

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

async function setSession(driver, authenticated = true, theme = 'dark') {
  await driver.executeScript((auth, user, currentTheme) => {
    if (auth) {
      localStorage.setItem('linksentry_e2e_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('linksentry_e2e_session');
    }
    localStorage.setItem('linksentry_theme', currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, authenticated, TEST_ACCOUNT, theme);
}

async function checkOverflow(driver) {
  return await driver.executeScript(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const hasHorizontalOverflow = scrollWidth > docWidth || bodyScrollWidth > docWidth;
    
    const overflowingElements = [];
    const all = document.querySelectorAll('*');
    for (let el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 3) {
        overflowingElements.push({
          tag: el.tagName,
          className: (el.className || '').toString().slice(0, 60),
          id: el.id,
          right: Math.round(rect.right),
          docWidth
        });
        if (overflowingElements.length >= 5) break;
      }
    }

    return {
      docWidth,
      scrollWidth,
      hasHorizontalOverflow,
      overflowingElements
    };
  });
}

async function run() {
  console.log('=== RUNNING COMPLETE LINKsENTRY V1 BASELINE SNAPSHOT ===');
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--disable-gpu', '--no-sandbox');
  options.windowSize({ width: 1440, height: 900 });

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  await driver.manage().setTimeouts({ implicit: 3000, pageLoad: 15000, script: 10000 });

  const baselineReport = {
    timestamp: new Date().toISOString(),
    viewports: VIEWPORTS.map(v => v.name),
    pagesChecked: [],
    overflowIssues: [],
    consoleErrors: []
  };

  try {
    // 1. Unauthenticated Login & Register View
    console.log('\n--- 1. Capturing Login & Register across viewports ---');
    for (const vp of VIEWPORTS) {
      await driver.manage().window().setRect({ width: vp.width, height: vp.height });
      await driver.get(BASE_URL);
      await setSession(driver, false, 'dark');
      await driver.get(BASE_URL);
      await driver.sleep(300);

      const loginPng = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, `01_login_${vp.name}.png`), loginPng, 'base64');
      
      const of = await checkOverflow(driver);
      if (of.hasHorizontalOverflow) {
        baselineReport.overflowIssues.push({ page: 'login', viewport: vp.name, ...of });
      }

      try {
        const regTab = await driver.findElement(By.css('[data-testid="auth-tab-register"]'));
        await regTab.click();
        await driver.sleep(200);
        const regPng = await driver.takeScreenshot();
        fs.writeFileSync(path.join(OUTPUT_DIR, `01_register_${vp.name}.png`), regPng, 'base64');
      } catch (e) {
        // Tab click fallback
      }
    }
    baselineReport.pagesChecked.push('auth_login_register');

    // 2. Authenticated Session Setup
    console.log('\n--- 2. Authenticating as Security Analyst ---');
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await driver.get(BASE_URL);
    await setSession(driver, true, 'dark');
    await driver.get(BASE_URL);
    await driver.sleep(800);

    const tabsToAudit = [
      { id: '02_overview', tabName: 'overview', url: '/', label: 'Overview' },
      { id: '03_scanner_url', tabName: 'scanner', url: '/scanner?type=url', label: 'Scanner URL' },
      { id: '03_scanner_qr', tabName: 'scanner', url: '/scanner?type=qr', label: 'Scanner QR' },
      { id: '03_scanner_msg', tabName: 'scanner', url: '/scanner?type=message', label: 'Scanner Message' },
      { id: '04_history', tabName: 'history', url: '/history', label: 'History' },
      { id: '05_analytics', tabName: 'analytics', url: '/analytics', label: 'Analytics' },
      { id: '06_security_center', tabName: 'security-center', url: '/security-center', label: 'Security Center' },
      { id: '07_profile', tabName: 'profile', url: '/profile', label: 'Profile' }
    ];

    for (const tab of tabsToAudit) {
      console.log(`\nCapturing route: ${tab.label} (${tab.url}) across all 8 viewports...`);
      for (const vp of VIEWPORTS) {
        await driver.manage().window().setRect({ width: vp.width, height: vp.height });
        await driver.get(`${BASE_URL}${tab.url}`);
        await driver.sleep(350);

        const png = await driver.takeScreenshot();
        fs.writeFileSync(path.join(OUTPUT_DIR, `${tab.id}_${vp.name}.png`), png, 'base64');

        const of = await checkOverflow(driver);
        if (of.hasHorizontalOverflow) {
          baselineReport.overflowIssues.push({ page: tab.id, viewport: vp.name, ...of });
          console.warn(`  ⚠️ Overflow on ${tab.id} at ${vp.name}: scrollWidth=${of.scrollWidth} > clientWidth=${of.docWidth}`);
        }
      }
      baselineReport.pagesChecked.push(tab.id);
    }

    // 3. Live URL Scan of https://google.com & Capture Result
    console.log('\n--- 3. Executing live scan on https://google.com ---');
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await driver.get(`${BASE_URL}/scanner?type=url`);
    await driver.sleep(600);

    try {
      const input = await driver.findElement(By.css('input[type="text"], input[type="url"], input.url-input'));
      await input.clear();
      await input.sendKeys('https://google.com');
      const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
      await submitBtn.click();
      await driver.sleep(3500);

      for (const vp of VIEWPORTS) {
        await driver.manage().window().setRect({ width: vp.width, height: vp.height });
        await driver.sleep(250);
        const scanPng = await driver.takeScreenshot();
        fs.writeFileSync(path.join(OUTPUT_DIR, `03_scan_result_google_${vp.name}.png`), scanPng, 'base64');

        const of = await checkOverflow(driver);
        if (of.hasHorizontalOverflow) {
          baselineReport.overflowIssues.push({ page: 'scan_result_google', viewport: vp.name, ...of });
          console.warn(`  ⚠️ Overflow on scan_result_google at ${vp.name}`);
        }
      }
      baselineReport.pagesChecked.push('scan_result_google');
    } catch (e) {
      console.warn('Scan test warning:', e.message);
    }

    // 4. Live Impersonation Scan of https://www.ggle.com & Capture Result
    console.log('\n--- 4. Executing live scan on https://www.ggle.com ---');
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await driver.get(`${BASE_URL}/scanner?type=url`);
    await driver.sleep(500);

    try {
      const input = await driver.findElement(By.css('input[type="text"], input[type="url"], input.url-input'));
      await input.clear();
      await input.sendKeys('https://www.ggle.com');
      const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
      await submitBtn.click();
      await driver.sleep(3500);

      const gglePng = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, `03_scan_result_ggle_1440_desktop.png`), gglePng, 'base64');
      baselineReport.pagesChecked.push('scan_result_ggle');
    } catch (e) {
      console.warn('Ggle scan test warning:', e.message);
    }

    // 5. Open Security Center Executive Report Modal
    console.log('\n--- 5. Capturing Security Center Executive Audit Report Modal ---');
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await driver.get(`${BASE_URL}/security-center`);
    await driver.sleep(500);

    try {
      const auditBtn = await driver.findElement(By.css('button[data-testid="btn-open-audit-report"], .soc-actions-group button'));
      await auditBtn.click();
      await driver.sleep(500);
      const modalPng = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, `06_executive_audit_modal_1440.png`), modalPng, 'base64');
      baselineReport.pagesChecked.push('executive_audit_modal');
    } catch (e) {
      console.warn('Audit modal capture warning:', e.message);
    }

    // 6. Light Theme Captures
    console.log('\n--- 6. Capturing Light Theme Baseline ---');
    await setSession(driver, true, 'light');
    await driver.get(BASE_URL);
    await driver.sleep(400);
    const lightOverview = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, `08_overview_light_1440.png`), lightOverview, 'base64');

    await driver.get(`${BASE_URL}/scanner`);
    await driver.sleep(400);
    const lightScanner = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, `08_scanner_light_1440.png`), lightScanner, 'base64');

    // 7. Extract browser logs
    try {
      const logs = await driver.manage().logs().get('browser');
      const severe = logs.filter(l => l.level.name === 'SEVERE');
      baselineReport.consoleErrors = severe.map(l => l.message);
    } catch {
      // Ignored
    }

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'baseline_report.json'),
      JSON.stringify(baselineReport, null, 2)
    );

    console.log('\n========================================');
    console.log('=== V1 BASELINE CAPTURE SUCCESSFUL ===');
    console.log(`Total Pages/States Audited: ${baselineReport.pagesChecked.length}`);
    console.log(`Total Overflow Issues Found: ${baselineReport.overflowIssues.length}`);
    console.log(`Total Console Errors: ${baselineReport.consoleErrors.length}`);
    console.log(`Screenshots saved to: ${OUTPUT_DIR}`);
    console.log('========================================\n');
  } finally {
    await driver.quit();
  }
}

run().catch(err => {
  console.error('Execution failure:', err);
  process.exit(1);
});
