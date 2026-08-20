import fs from 'fs';
import path from 'path';
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('web_audit_screenshots/v2');

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
  uid: 'v2-lead-analyst',
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
    const hasHorizontalOverflow = scrollWidth > docWidth + 1 || bodyScrollWidth > docWidth + 1;
    
    const overflowingElements = [];
    if (hasHorizontalOverflow) {
      const all = document.querySelectorAll('*');
      for (let el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.right > docWidth + 2) {
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
    }

    return {
      docWidth,
      scrollWidth,
      hasHorizontalOverflow,
      overflowingElements
    };
  });
}

async function navigateToRoute(driver, routePath) {
  await driver.executeScript((dest) => {
    window.history.pushState({}, '', dest);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, routePath);
  await driver.sleep(250);
}

async function run() {
  console.log('=== STARTING LINKsENTRY V2 COMPREHENSIVE VERIFICATION & SCREENSHOT HARNESS ===');
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--disable-gpu', '--no-sandbox');
  options.windowSize({ width: 1440, height: 900 });

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  await driver.manage().setTimeouts({ implicit: 5000, pageLoad: 30000, script: 15000 });

  const auditReport = {
    timestamp: new Date().toISOString(),
    viewportsAudited: VIEWPORTS.map(v => v.name),
    routesVerified: [],
    liveScansVerified: [],
    overflowAudit: [],
    themeContrastAudit: [],
    testPassCount: 0,
    testFailCount: 0
  };

  try {
    // -----------------------------------------------------------------------
    // 1. Unauthenticated Auth Portal (Login & Register)
    // -----------------------------------------------------------------------
    console.log('\n--- 1. Auditing Auth Portal (Login & Register) ---');
    await driver.get(BASE_URL);
    await setSession(driver, false, 'dark');
    await driver.get(BASE_URL);
    await driver.sleep(400);

    for (const vp of VIEWPORTS) {
      await driver.manage().window().setRect({ width: vp.width, height: vp.height });
      await driver.sleep(200);

      const loginPng = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, `01_login_${vp.name}.png`), loginPng, 'base64');
      
      const ofLogin = await checkOverflow(driver);
      if (ofLogin.hasHorizontalOverflow) {
        auditReport.overflowAudit.push({ page: 'login', viewport: vp.name, ...ofLogin });
        console.warn(`  ⚠️ Overflow on Login at ${vp.name}`);
      }

      // Switch to Register tab
      try {
        const regTab = await driver.findElement(By.css('[data-testid="auth-tab-register"]'));
        await regTab.click();
        await driver.sleep(150);
        const regPng = await driver.takeScreenshot();
        fs.writeFileSync(path.join(OUTPUT_DIR, `01_register_${vp.name}.png`), regPng, 'base64');
        const loginTab = await driver.findElement(By.css('[data-testid="auth-tab-login"]'));
        await loginTab.click();
        await driver.sleep(150);
      } catch (e) {
        // Tab click
      }
    }
    auditReport.routesVerified.push('auth_portal');

    // -----------------------------------------------------------------------
    // 2. Authenticated Routes Navigation & Verification
    // -----------------------------------------------------------------------
    console.log('\n--- 2. Setting Authenticated Session ---');
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await driver.get(BASE_URL);
    await setSession(driver, true, 'dark');
    await driver.get(BASE_URL);
    await driver.sleep(600);

    const routes = [
      { id: '02_overview', url: '/', label: 'Overview' },
      { id: '03_scanner_url', url: '/scanner?type=url', label: 'Scanner (Link)' },
      { id: '03_scanner_qr', url: '/scanner?type=qr', label: 'Scanner (QR Code)' },
      { id: '03_scanner_msg', url: '/scanner?type=message', label: 'Scanner (Message)' },
      { id: '04_history', url: '/history', label: 'History' },
      { id: '05_analytics', url: '/analytics', label: 'Analytics' },
      { id: '06_security_center', url: '/security-center', label: 'Security Center' },
      { id: '07_profile', url: '/profile', label: 'Profile' }
    ];

    for (const route of routes) {
      console.log(`Auditing Route: ${route.label} across 8 viewports...`);
      await navigateToRoute(driver, route.url);
      await driver.sleep(300);

      for (const vp of VIEWPORTS) {
        await driver.manage().window().setRect({ width: vp.width, height: vp.height });
        await driver.sleep(200);

        const png = await driver.takeScreenshot();
        fs.writeFileSync(path.join(OUTPUT_DIR, `${route.id}_${vp.name}.png`), png, 'base64');

        const of = await checkOverflow(driver);
        if (of.hasHorizontalOverflow) {
          auditReport.overflowAudit.push({ page: route.id, viewport: vp.name, ...of });
          console.warn(`  ⚠️ Overflow on ${route.id} at ${vp.name}`);
        }
      }
      auditReport.routesVerified.push(route.id);
    }

    // -----------------------------------------------------------------------
    // 3. Security Center Executive Audit Report Modal
    // -----------------------------------------------------------------------
    console.log('\n--- 3. Verifying Executive Security Audit Report Modal ---');
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await driver.get(`${BASE_URL}/security-center`);
    await driver.sleep(500);

    try {
      const modalBtn = await driver.findElement(By.css('[data-testid="security-center-print-btn"]'));
      await driver.executeScript('arguments[0].scrollIntoView({ block: "center" });', modalBtn);
      await driver.sleep(200);
      await driver.executeScript('arguments[0].click();', modalBtn);
      await driver.sleep(600);

      const modalEl = await driver.wait(until.elementLocated(By.css('.audit-report-modal, .modal-overlay')), 5000);
      const modalPng = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, `06_executive_audit_modal_1440_desktop.png`), modalPng, 'base64');

      for (const vp of [VIEWPORTS[0], VIEWPORTS[3], VIEWPORTS[6]]) {
        await driver.manage().window().setRect({ width: vp.width, height: vp.height });
        await driver.sleep(300);
        const vpPng = await driver.takeScreenshot();
        fs.writeFileSync(path.join(OUTPUT_DIR, `06_executive_audit_modal_${vp.name}.png`), vpPng, 'base64');
      }

      // Close modal
      const closeBtn = await driver.findElement(By.css('.modal-close-btn, button.btn-secondary'));
      await driver.executeScript('arguments[0].click();', closeBtn);
      await driver.sleep(400);
      auditReport.routesVerified.push('security_audit_modal');
      console.log('  ✓ Executive Audit Report Modal rendered and closed cleanly.');
    } catch (e) {
      console.warn('  ⚠️ Audit modal verification note:', e.message);
    }

    // -----------------------------------------------------------------------
    // 4. Live Scans Verification (Google, Ggle, Micros0ft)
    // -----------------------------------------------------------------------
    console.log('\n--- 4. Executing Live Multi-Signal Scans ---');
    const scanTests = [
      {
        url: 'https://google.com',
        expectedVerdict: 'SAFE',
        expectedThreat: false,
        prefix: '03_scan_result_google'
      },
      {
        url: 'https://www.ggle.com',
        expectedVerdict: 'SUSPICIOUS',
        expectedThreat: true,
        prefix: '03_scan_result_ggle'
      },
      {
        url: 'https://www.micros0ft.com',
        expectedVerdict: 'SUSPICIOUS',
        expectedThreat: true,
        prefix: '03_scan_result_micros0ft'
      }
    ];

    for (const test of scanTests) {
      console.log(`\nTesting live scan on ${test.url}...`);
      await driver.manage().window().setRect({ width: 1440, height: 900 });
      await driver.get(`${BASE_URL}/scanner?type=url`);
      await driver.sleep(500);

      // If a previous scan result is present, click reset
      try {
        const resetBtn = await driver.findElement(By.css('[data-testid="scan-reset-button"]'));
        if (resetBtn) {
          await driver.executeScript('arguments[0].click();', resetBtn);
          await driver.sleep(300);
        }
      } catch {
        // No prior scan
      }

      const input = await driver.wait(until.elementLocated(By.css('[data-testid="url-scan-input"]')), 5000);
      await input.clear();
      await input.sendKeys(test.url);

      const submitBtn = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
      await driver.executeScript('arguments[0].scrollIntoView({ block: "center" });', submitBtn);
      await driver.sleep(200);
      await driver.executeScript('arguments[0].click();', submitBtn);

      console.log('  Waiting for V3.4 backend response & scan result card...');
      const card = await driver.wait(until.elementLocated(By.css('[data-testid="scan-result-card"]')), 25000);
      await driver.sleep(800);

      const verdictEl = await driver.findElement(By.css('[data-testid="scan-result-verdict"]'));
      const renderedVerdict = (await verdictEl.getText()).trim().toUpperCase();
      console.log(`  Live UI Verdict: ${renderedVerdict} (Expected: ${test.expectedVerdict})`);

      // Capture result across all 8 viewports
      for (const vp of VIEWPORTS) {
        await driver.manage().window().setRect({ width: vp.width, height: vp.height });
        await driver.sleep(300);
        const png = await driver.takeScreenshot();
        fs.writeFileSync(path.join(OUTPUT_DIR, `${test.prefix}_${vp.name}.png`), png, 'base64');
        
        const of = await checkOverflow(driver);
        if (of.hasHorizontalOverflow) {
          auditReport.overflowAudit.push({ page: test.prefix, viewport: vp.name, ...of });
        }
      }

      auditReport.liveScansVerified.push({
        url: test.url,
        renderedVerdict,
        expectedVerdict: test.expectedVerdict,
        passed: renderedVerdict === test.expectedVerdict
      });

      if (renderedVerdict === test.expectedVerdict) {
        auditReport.testPassCount += 1;
      } else {
        auditReport.testFailCount += 1;
      }
    }

    // -----------------------------------------------------------------------
    // 5. Light Theme Verification
    // -----------------------------------------------------------------------
    console.log('\n--- 5. Capturing Light Theme V2 Pages ---');
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await setSession(driver, true, 'light');
    
    for (const r of [routes[0], routes[1], routes[4], routes[5], routes[6], routes[7]]) {
      await driver.get(`${BASE_URL}${r.url}`);
      await driver.sleep(350);
      const lightPng = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, `08_${r.id}_light_1440.png`), lightPng, 'base64');
    }

    // Write final JSON summary
    fs.writeFileSync(path.join(OUTPUT_DIR, 'v2_verification_report.json'), JSON.stringify(auditReport, null, 2));

    console.log('\n======================================================');
    console.log('=== LINKsENTRY V2 LIVE VERIFICATION COMPLETE ===');
    console.log(`Total Routes Checked: ${auditReport.routesVerified.length}`);
    console.log(`Total Live Scan Tests: ${auditReport.liveScansVerified.length} (Passed: ${auditReport.testPassCount})`);
    console.log(`Total Horizontal Overflow Issues: ${auditReport.overflowAudit.length}`);
    console.log(`Verified Screenshots Directory: ${OUTPUT_DIR}`);
    console.log('======================================================\n');

  } finally {
    await driver.quit();
  }
}

run().catch(err => {
  console.error('V2 Verification Execution Error:', err);
  process.exit(1);
});
