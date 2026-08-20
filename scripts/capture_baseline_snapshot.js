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
    
    // Find specific overflowing elements if any
    const overflowingElements = [];
    const all = document.querySelectorAll('*');
    for (let el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 2) {
        overflowingElements.push({
          tag: el.tagName,
          className: (el.className || '').toString().slice(0, 50),
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

async function runBaseline() {
  console.log('=== STARTING LINKsENTRY V1 BASELINE SNAPSHOT ===');
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--disable-gpu', '--no-sandbox', '--window-size=1440,900');
  
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  const baselineReport = {
    timestamp: new Date().toISOString(),
    viewportsAudited: VIEWPORTS.map(v => v.name),
    pages: {},
    consoleErrors: [],
    overflows: []
  };

  try {
    // 1. Unauthenticated Login & Register Baseline
    console.log('\n[1/7] Auditing Unauthenticated Routes (Login & Register)...');
    for (const vp of VIEWPORTS) {
      await driver.manage().window().setRect({ width: vp.width, height: vp.height });
      await driver.get(BASE_URL);
      await setSession(driver, false, 'dark');
      await driver.get(BASE_URL);
      await driver.sleep(600);

      // Login screenshot
      const loginPng = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, `01_login_${vp.name}.png`), loginPng, 'base64');
      
      const overflowInfo = await checkOverflow(driver);
      if (overflowInfo.hasHorizontalOverflow) {
        baselineReport.overflows.push({ page: 'login', viewport: vp.name, ...overflowInfo });
      }

      // Switch to register tab
      try {
        const registerTab = await driver.findElement(By.css('[data-testid="auth-tab-register"]'));
        await registerTab.click();
        await driver.sleep(300);
        const registerPng = await driver.takeScreenshot();
        fs.writeFileSync(path.join(OUTPUT_DIR, `01_register_${vp.name}.png`), registerPng, 'base64');
      } catch (e) {
        console.warn(`Could not capture register mode on ${vp.name}:`, e.message);
      }
    }

    // Authenticate for remaining routes
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await driver.get(BASE_URL);
    await setSession(driver, true, 'dark');
    await driver.get(BASE_URL);
    await driver.sleep(1000);

    const routes = [
      { id: '02_overview', path: '/', name: 'Overview / Dashboard' },
      { id: '03_scanner_url', path: '/scanner?type=url', name: 'Scanner (URL subtab)' },
      { id: '03_scanner_qr', path: '/scanner?type=qr', name: 'Scanner (QR subtab)' },
      { id: '03_scanner_msg', path: '/scanner?type=message', name: 'Scanner (Message subtab)' },
      { id: '04_history', path: '/history', name: 'History' },
      { id: '05_analytics', path: '/analytics', name: 'Analytics' },
      { id: '06_security_center', path: '/security-center', name: 'Security Center' },
      { id: '07_profile', path: '/profile', name: 'Profile & Settings' }
    ];

    for (const route of routes) {
      console.log(`\nAuditing route: ${route.name} (${route.path})...`);
      for (const vp of VIEWPORTS) {
        await driver.manage().window().setRect({ width: vp.width, height: vp.height });
        await driver.get(`${BASE_URL}${route.path}`);
        await driver.sleep(600);

        const png = await driver.takeScreenshot();
        fs.writeFileSync(path.join(OUTPUT_DIR, `${route.id}_${vp.name}.png`), png, 'base64');

        const overflow = await checkOverflow(driver);
        if (overflow.hasHorizontalOverflow) {
          baselineReport.overflows.push({ page: route.id, viewport: vp.name, ...overflow });
          console.warn(`  ⚠️ Overflow detected on ${route.id} at ${vp.name}: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.docWidth}`);
        }
      }
    }

    // Scan a live URL to capture ScanResultCard baseline across viewports
    console.log('\n[Live Scan Baseline] Scanning https://google.com on Scanner page...');
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await driver.get(`${BASE_URL}/scanner`);
    await driver.sleep(800);

    try {
      const input = await driver.findElement(By.css('input[type="url"], input[placeholder*="http"], input.url-input, input.form-input'));
      await input.clear();
      await input.sendKeys('https://google.com');
      const submitBtn = await driver.findElement(By.css('button[type="submit"], button.scan-btn, button.btn-primary'));
      await submitBtn.click();
      await driver.sleep(3500); // wait for scan response

      for (const vp of VIEWPORTS) {
        await driver.manage().window().setRect({ width: vp.width, height: vp.height });
        await driver.sleep(400);
        const scanResultPng = await driver.takeScreenshot();
        fs.writeFileSync(path.join(OUTPUT_DIR, `03_scan_result_google_${vp.name}.png`), scanResultPng, 'base64');
        const overflow = await checkOverflow(driver);
        if (overflow.hasHorizontalOverflow) {
          baselineReport.overflows.push({ page: 'scan_result_google', viewport: vp.name, ...overflow });
        }
      }
    } catch (err) {
      console.error('Scan test execution error:', err.message);
    }

    // Capture Light Theme snapshots
    console.log('\n[Light Theme Baseline] Capturing Light Theme snapshots...');
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await setSession(driver, true, 'light');
    await driver.get(BASE_URL);
    await driver.sleep(800);
    const lightDashPng = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, `08_overview_light_1440.png`), lightDashPng, 'base64');

    await driver.get(`${BASE_URL}/scanner`);
    await driver.sleep(800);
    const lightScannerPng = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, `08_scanner_light_1440.png`), lightScannerPng, 'base64');

    // Collect browser console errors
    try {
      const logs = await driver.manage().logs().get('browser');
      const severeLogs = logs.filter(l => l.level.name === 'SEVERE');
      baselineReport.consoleErrors = severeLogs.map(l => l.message);
    } catch {
      // Ignored if driver logs not supported
    }

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'baseline_report.json'),
      JSON.stringify(baselineReport, null, 2)
    );

    console.log('\n=== BASELINE SNAPSHOT COMPLETED SUCCESSFULLY ===');
    console.log(`Saved screenshots to: ${OUTPUT_DIR}`);
    console.log(`Total overflow occurrences recorded: ${baselineReport.overflows.length}`);
  } finally {
    await driver.quit();
  }
}

runBaseline().catch(err => {
  console.error('Baseline execution failed:', err);
  process.exit(1);
});
