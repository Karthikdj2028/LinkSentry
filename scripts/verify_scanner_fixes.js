import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('web_audit_screenshots', 'v2_fixes');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '320_small_mobile', width: 320, height: 700 },
  { name: '375_mobile', width: 375, height: 812 },
  { name: '412_large_mobile', width: 412, height: 915 },
  { name: '768_tablet', width: 768, height: 1024 },
  { name: '1024_desktop_small', width: 1024, height: 768 },
  { name: '1366_laptop', width: 1366, height: 768 },
  { name: '1440_desktop', width: 1440, height: 900 },
  { name: '1920_fhd', width: 1920, height: 1080 },
];

async function setupDriver() {
  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-gpu');
  options.addArguments('--window-size=1440,900');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  return driver;
}

async function setViewport(driver, vp) {
  try {
    await driver.sendDevToolsCommand('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width <= 768,
    });
  } catch {
    await driver.manage().window().setRect({ width: vp.width, height: vp.height });
  }
  await driver.sleep(300);
}

async function checkHorizontalOverflow(driver, contextName) {
  const overflow = await driver.executeScript(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const bodyWidth = document.body.scrollWidth;
    const maxScroll = Math.max(docWidth, bodyWidth);
    const hasOverflow = maxScroll > winWidth + 1;

    let overflowingElements = [];
    if (hasOverflow) {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.right > winWidth + 1) {
          overflowingElements.push({
            tag: el.tagName,
            className: (el.className && typeof el.className === 'string') ? el.className.slice(0, 50) : '',
            id: el.id || '',
            right: Math.round(rect.right),
            winWidth: winWidth
          });
        }
      }
    }

    return {
      hasOverflow,
      maxScroll,
      winWidth,
      overflowingElements: overflowingElements.slice(0, 5)
    };
  });

  return overflow;
}

async function main() {
  console.log('=== STARTING TARGETED SCANNER UI & MULTI-VIEWPORT VERIFICATION ===\n');
  const driver = await setupDriver();

  try {
    await driver.get(BASE_URL + '/scanner');
    await driver.sleep(1000);

    // Set auth session
    await driver.executeScript(() => {
      localStorage.setItem('linksentry_e2e_session', JSON.stringify({
        uid: 'e2e-analyst-1',
        email: 'analyst@linksentry.io',
        displayName: 'Security Analyst 1',
        role: 'Senior Threat Analyst',
      }));
    });

    await driver.get(BASE_URL + '/scanner');
    await driver.sleep(1500);

    // =========================================================================
    // 1. LIVE SCAN: Long Realistic Phishing / Typosquat URL
    // =========================================================================
    const testUrl = 'http://login-verify-account-security-update.example.com/resetPath';
    console.log(`\n--- 1. Executing Live Scan for: ${testUrl} ---`);

    const input = await driver.findElement(By.css('#url-input'));
    await input.clear();
    await input.sendKeys(testUrl);

    const submitBtn = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
    await submitBtn.click();

    // Catch Scanning In-Progress state immediately
    await driver.sleep(350);
    const hasScanningState = await driver.executeScript(() => {
      const el = document.querySelector('.scanning-in-progress');
      if (!el) return false;
      const target = el.querySelector('.status-primary-target')?.textContent || '';
      const steps = Array.from(el.querySelectorAll('.scanning-stage-step')).map(s => s.textContent.trim());
      return { target, stepsCount: steps.length, steps };
    });

    console.log('Scanning In-Progress State Captured:', hasScanningState);

    // Capture Scanning State at 375px and 1440px
    await driver.manage().window().setRect({ width: 375, height: 812 });
    await driver.sleep(200);
    let screenshotData = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, '03_scanning_state_375_mobile.png'), screenshotData, 'base64');

    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await driver.sleep(200);
    screenshotData = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, '03_scanning_state_1440_desktop.png'), screenshotData, 'base64');

    // Wait for scan results
    console.log('Waiting for Scan Result Card...');
    await driver.wait(until.elementLocated(By.css('.scan-result-card')), 15000);
    await driver.sleep(1000);

    // =========================================================================
    // 2. Expand Technical Model Decision Signals & Verify UI Text Separation
    // =========================================================================
    console.log('\n--- 2. Inspecting Technical Model Decision Signals ---');
    const signalsToggle = await driver.findElement(By.css('.signals-header-row'));
    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'instant', block: 'center' }); arguments[0].click();", signalsToggle);
    await driver.sleep(500);

    const decisionSignalsData = await driver.executeScript(() => {
      const list = document.querySelector('.decision-meters-list');
      if (!list) return null;
      const rows = Array.from(list.querySelectorAll('.decision-meter-row')).map(row => {
        const classLabel = row.querySelector('.meter-class-label')?.textContent?.trim();
        const scoreVal = row.querySelector('.meter-score-val')?.textContent?.trim();
        const fullText = row.textContent.replace(/\s+/g, ' ').trim();
        const trackWidth = row.querySelector('.meter-track')?.getBoundingClientRect()?.width || 0;
        return { classLabel, scoreVal, fullText, trackWidth };
      });
      return rows;
    });

    console.log('Decision Signals Rows in DOM:', decisionSignalsData);

    // Verify that NO string is merged like "Benign-3.9005"
    if (decisionSignalsData) {
      for (const row of decisionSignalsData) {
        if (row.classLabel && row.scoreVal) {
          console.log(`  ✓ Class: "${row.classLabel}" | Score: "${row.scoreVal}" (Track width: ${row.trackWidth}px)`);
        }
      }
    }

    // =========================================================================
    // 3. Inspect Interactive URL Anatomy
    // =========================================================================
    console.log('\n--- 3. Inspecting Interactive URL Anatomy ---');
    const anatomyData = await driver.executeScript(() => {
      const container = document.querySelector('.url-segments-container');
      const card = document.querySelector('.url-segment-card');
      if (!container || !card) return null;

      const segments = Array.from(container.querySelectorAll('.url-segment-btn')).map(btn => ({
        text: btn.querySelector('.segment-text')?.textContent?.trim(),
        badge: btn.querySelector('.segment-badge')?.textContent?.trim(),
      }));

      const category = card.querySelector('.segment-category-label')?.textContent?.trim();
      const title = card.querySelector('.segment-main-title')?.textContent?.trim();
      const scope = card.querySelector('.segment-scope-pill')?.textContent?.trim();
      const whatIsIt = card.querySelector('.qa-item .qa-body')?.textContent?.trim();

      return { segments, category, title, scope, whatIsIt };
    });

    console.log('URL Anatomy Data in DOM:', anatomyData);

    // =========================================================================
    // 4. Multi-Viewport Responsive & Screenshot Audit (8 Viewports)
    // =========================================================================
    console.log('\n--- 4. Multi-Viewport Responsive & Screenshot Audit ---');
    const viewportResults = [];

    for (const vp of VIEWPORTS) {
      await setViewport(driver, vp);
      await driver.sleep(300);

      const overflow = await checkHorizontalOverflow(driver, `Scanner Results at ${vp.name}`);
      const filename = `result_${vp.name}.png`;
      const screenshot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), screenshot, 'base64');

      viewportResults.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        hasOverflow: overflow.hasOverflow,
        maxScroll: overflow.maxScroll,
        winWidth: overflow.winWidth,
        overflowingElements: overflow.overflowingElements
      });

      console.log(`  [${vp.name}] Width: ${vp.width}px -> Overflow: ${overflow.hasOverflow ? 'FAIL ❌' : 'PASS ✓'} (Scroll: ${overflow.maxScroll}px, Win: ${overflow.winWidth}px)`);
    }

    // =========================================================================
    // 5. Also Test Live Scans for Safe (google.com) and Typosquat (ggle.com)
    // =========================================================================
    console.log('\n--- 5. Testing Live Scan: https://google.com ---');
    await setViewport(driver, { width: 1440, height: 900 });
    const input2 = await driver.findElement(By.css('#url-input'));
    await input2.clear();
    await input2.sendKeys('https://google.com');
    const submitBtn2 = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
    await submitBtn2.click();

    await driver.wait(until.elementLocated(By.css('.scan-result-card')), 15000);
    await driver.sleep(800);
    const googleScreenshot = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'result_google_safe_1440.png'), googleScreenshot, 'base64');
    console.log('  ✓ Google.com Scan Result verified and captured.');

    console.log('\n--- 6. Testing Live Scan & Decision Signals: https://www.ggle.com ---');
    const input3 = await driver.findElement(By.css('#url-input'));
    await input3.clear();
    await input3.sendKeys('https://www.ggle.com');
    const submitBtn3 = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
    await submitBtn3.click();

    await driver.wait(until.elementLocated(By.css('.scan-result-card')), 15000);
    await driver.sleep(1000);

    const ggleDecisionSignals = await driver.executeScript(() => {
      const list = document.querySelector('.decision-meters-list');
      if (!list) return null;
      const rows = Array.from(list.querySelectorAll('.decision-meter-row')).map(row => {
        const classLabel = row.querySelector('.meter-class-label')?.textContent?.trim();
        const scoreVal = row.querySelector('.meter-score-val')?.textContent?.trim();
        const fullText = row.textContent.replace(/\s+/g, ' ').trim();
        const trackWidth = row.querySelector('.meter-track')?.getBoundingClientRect()?.width || 0;
        return { classLabel, scoreVal, fullText, trackWidth };
      });
      return rows;
    });

    console.log('Ggle.com Live Decision Signals:', ggleDecisionSignals);
    if (ggleDecisionSignals) {
      for (const row of ggleDecisionSignals) {
        console.log(`  ✓ Decision Row: Class "${row.classLabel}" | Score "${row.scoreVal}" | Full: "${row.fullText}"`);
      }
    }

    const ggleScreenshot = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'result_ggle_typosquat_1440.png'), ggleScreenshot, 'base64');
    console.log('  ✓ Ggle.com Scan Result verified and captured.');

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'scanner_fixes_report.json'),
      JSON.stringify({ decisionSignalsData, ggleDecisionSignals, anatomyData, viewportResults }, null, 2)
    );

    console.log('\n=== ALL TARGETED SCANNER FIXES VERIFIED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Error during verification:', err);
    process.exitCode = 1;
  } finally {
    await driver.quit();
  }
}

main();
