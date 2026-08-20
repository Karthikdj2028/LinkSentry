import { Builder, By, until, logging } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://127.0.0.1:8000';
const SCREENSHOT_DIR = path.resolve('web_audit_screenshots', 'full_v2_audit');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '320_small_mobile', width: 320, height: 640 },
  { name: '375_mobile', width: 375, height: 812 },
  { name: '412_large_mobile', width: 412, height: 915 },
  { name: '768_tablet', width: 768, height: 1024 },
  { name: '1024_small_desktop', width: 1024, height: 768 },
  { name: '1366_laptop', width: 1366, height: 768 },
  { name: '1440_desktop', width: 1440, height: 900 },
  { name: '1920_fhd', width: 1920, height: 1080 },
];

const ROUTES = [
  { path: '/login', name: 'Login', auth: false },
  { path: '/register', name: 'Register', auth: false },
  { path: '/dashboard', name: 'Dashboard', auth: true },
  { path: '/scanner', name: 'Scanner Hub', auth: true },
  { path: '/history', name: 'History', auth: true },
  { path: '/analytics', name: 'Analytics', auth: true },
  { path: '/security-center', name: 'Security Center', auth: true },
  { path: '/profile', name: 'Profile / Settings', auth: true },
];

const SCAN_TEST_CASES = [
  { url: 'https://google.com', label: 'Safe (Google)' },
  { url: 'https://amazon.in', label: 'Safe Regional (Amazon.in)' },
  { url: 'https://www.ggle.com', label: 'Typosquat (ggle.com)' },
  { url: 'https://www.micros0ft.com', label: 'Typosquat (micros0ft.com)' },
  { url: 'http://login-verify-account-security-update.example.com/resetPath', label: 'NXDOMAIN / Suspicious' },
  { url: 'http://chase-bank-online-security-auth--check.xyz/login.php', label: 'Long Phishing Target' },
];

const auditResults = {
  environment: {
    frontendUrl: FRONTEND_URL,
    backendUrl: BACKEND_URL,
    timestamp: new Date().toISOString(),
    backendHealth: null,
  },
  routesAudit: {},
  responsiveMatrix: {},
  scannerConsistencyMatrix: [],
  decisionSignalsAudit: [],
  consoleLogs: [],
  networkErrors: [],
};

async function checkBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    const data = await res.json();
    auditResults.environment.backendHealth = { status: res.status, data };
    console.log('✓ Backend Health Check:', res.status, data);
    return true;
  } catch (err) {
    console.error('Backend health check failed:', err.message);
    auditResults.environment.backendHealth = { error: err.message };
    return false;
  }
}

async function runAudit() {
  console.log('=== STARTING COMPLETE LINKsENTRY V2 AUDIT ===');
  await checkBackendHealth();

  const logPrefs = new logging.Preferences();
  logPrefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);

  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--window-size=1440,900');
  options.setLoggingPrefs(logPrefs);

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  try {
    // -------------------------------------------------------------
    // INITIALIZE AUTH SESSION ONCE
    // -------------------------------------------------------------
    await driver.get(FRONTEND_URL + '/login');
    await driver.sleep(1000);
    await driver.executeScript(() => {
      localStorage.setItem('linksentry_e2e_session', JSON.stringify({
        uid: 'e2e-audit-analyst',
        email: 'analyst@linksentry.io',
        displayName: 'Lead Security Auditor',
      }));
    });
    await driver.sleep(300);

    // -------------------------------------------------------------
    // PHASE 2 & 3: ROUTE & RESPONSIVE AUDIT
    // -------------------------------------------------------------
    console.log('\n--- Auditing Routes & Responsive Layout Across 8 Viewports ---');

    for (const route of ROUTES) {
      auditResults.responsiveMatrix[route.name] = {};
      console.log(`\nAuditing Route: ${route.name} (${route.path})`);

      for (const vp of VIEWPORTS) {
        await driver.sendDevToolsCommand('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: vp.width < 768,
        });
        await driver.sleep(80);

        await driver.get(FRONTEND_URL + route.path);
        await driver.sleep(600);

        const metrics = await driver.executeScript(() => {
          const doc = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
          const clientW = doc.clientWidth;
          const winW = window.innerWidth;
          const hasHScroll = scrollW > (clientW + 1); // 1px rounding tolerance
          return { scrollW, clientW, winW, hasHScroll };
        });

        const status = metrics.hasHScroll ? 'FAIL' : 'PASS';
        auditResults.responsiveMatrix[route.name][vp.width] = status;

        if (metrics.hasHScroll) {
          console.log(`  [${vp.width}px] FAIL - Horizontal Overflow: ScrollWidth=${metrics.scrollW}px, WinWidth=${metrics.winW}px`);
          const shot = await driver.takeScreenshot();
          fs.writeFileSync(path.join(SCREENSHOT_DIR, `OVERFLOW_${route.name.replace(/\s+/g, '_')}_${vp.width}.png`), shot, 'base64');
        } else {
          process.stdout.write(`  [${vp.width}px: PASS] `);
        }
      }
      console.log('');
      const shot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(SCREENSHOT_DIR, `ROUTE_${route.name.replace(/\s+/g, '_')}_1440.png`), shot, 'base64');
    }

    // -------------------------------------------------------------
    // PHASE 2B: THEME SWITCHING AUDIT
    // -------------------------------------------------------------
    console.log('\n--- Testing Theme Toggle (Dark Mode / Light Mode) ---');
    await driver.get(FRONTEND_URL + '/dashboard');
    await driver.sleep(500);

    const themeToggleBtn = await driver.findElements(By.css('.theme-toggle-btn, [data-testid="theme-toggle"], .btn-theme'));
    if (themeToggleBtn.length > 0) {
      await themeToggleBtn[0].click();
      await driver.sleep(300);
      const themeAttr = await driver.executeScript(() => document.documentElement.getAttribute('data-theme') || document.body.className);
      console.log('  Theme switched to:', themeAttr);
      const shot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(SCREENSHOT_DIR, `THEME_SWITCH_LIGHT.png`), shot, 'base64');
      // Switch back
      await themeToggleBtn[0].click();
      await driver.sleep(200);
    } else {
      console.log('  Theme toggle button selector not found directly, checking header icon');
    }

    // -------------------------------------------------------------
    // PHASE 4 & 5: SCANNER LOGIC & VERDICT CONSISTENCY AUDIT
    // -------------------------------------------------------------
    console.log('\n--- Testing Scanner Logic, Verdicts & Technical Decision Signals ---');

    await driver.sendDevToolsCommand('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    for (const testCase of SCAN_TEST_CASES) {
      console.log(`\nExecuting Live Scan: ${testCase.label} -> ${testCase.url}`);

      // 1. Fetch backend API directly for ground truth
      let backendData = null;
      try {
        const apiRes = await fetch(`${BACKEND_URL}/api/v1/scan/url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: testCase.url }),
        });
        backendData = await apiRes.json();
      } catch (e) {
        console.error('Backend scan fetch error:', e.message);
      }

      // 2. Perform scan in Live UI
      await driver.get(FRONTEND_URL + '/scanner');
      await driver.sleep(800);

      const input = await driver.findElement(By.css('#url-input'));
      await input.clear();
      await input.sendKeys(testCase.url);

      const submitBtn = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
      await submitBtn.click();

      await driver.wait(until.elementLocated(By.css('.scan-result-card')), 15000);
      await driver.sleep(600);

      // Extract frontend rendered values
      const frontendData = await driver.executeScript(() => {
        const verdictEl = document.querySelector('.result-verdict-badge, .verdict-badge, .verdict-pill, .security-verdict-tag, [data-testid="verdict-badge"]');
        const scoreEl = document.querySelector('.result-score-num, .score-number, .risk-score-value, .threat-score-display');
        const mlPredEl = document.querySelector('.spec-row .spec-value, .ml-model-prediction');
        
        // Extract technical decision signals
        const decisionRows = Array.from(document.querySelectorAll('.decision-meter-row')).map(r => {
          const label = r.querySelector('.meter-class-label')?.innerText?.trim();
          const score = r.querySelector('.meter-score-val')?.innerText?.trim();
          const isHighlighted = r.classList.contains('is-leading') || r.classList.contains('highlighted');
          return { label, score, isHighlighted };
        });

        // Extract verdict text from security verdict card
        const cardVerdictText = document.querySelector('.security-verdict-card .verdict-title, .verdict-primary-text, .result-header-verdict')?.innerText?.trim();

        return {
          verdictBadge: verdictEl?.innerText?.trim(),
          cardVerdict: cardVerdictText,
          score: scoreEl?.innerText?.trim(),
          decisionRows,
        };
      });

      const beML = backendData?.ml_prediction || backendData?.analysis?.ml_prediction || 'N/A';
      const beFinalVerdict = backendData?.verdict || backendData?.final_verdict || backendData?.threat_level || 'N/A';
      const beRiskScore = backendData?.risk_score !== undefined ? backendData?.risk_score : (backendData?.threat_score || 'N/A');
      const beDecisionScores = backendData?.decision_scores || backendData?.analysis?.decision_scores || backendData?.decision_margins || {};

      const feVerdict = frontendData.verdictBadge || frontendData.cardVerdict || 'N/A';
      const feScore = frontendData.score || 'N/A';

      const isConsistent = (
        feVerdict.toUpperCase().includes(beFinalVerdict.toUpperCase()) ||
        beFinalVerdict.toUpperCase().includes(feVerdict.toUpperCase())
      );

      console.log(`  Backend: ML=${beML} | FinalVerdict=${beFinalVerdict} | RiskScore=${beRiskScore}`);
      console.log(`  Frontend: DisplayedVerdict=${feVerdict} | DisplayedScore=${feScore} | Consistent=${isConsistent ? 'YES ✓' : 'NO ❌'}`);
      console.log(`  Decision Signals Rows in Frontend:`, frontendData.decisionRows);

      auditResults.scannerConsistencyMatrix.push({
        url: testCase.url,
        label: testCase.label,
        backendML: beML,
        backendFinalVerdict: beFinalVerdict,
        backendRiskScore: beRiskScore,
        frontendVerdict: feVerdict,
        frontendScore: feScore,
        consistent: isConsistent,
        decisionRows: frontendData.decisionRows,
        backendDecisionScores: beDecisionScores,
      });

      const shot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(SCREENSHOT_DIR, `SCAN_${testCase.label.replace(/[^a-zA-Z0-9]/g, '_')}.png`), shot, 'base64');
    }

    // -------------------------------------------------------------
    // PHASE 6: INTERACTIVE URL ANATOMY SEGMENT CLICK AUDIT
    // -------------------------------------------------------------
    console.log('\n--- Testing Interactive URL Anatomy Segment Interactions ---');
    await driver.get(FRONTEND_URL + '/scanner');
    await driver.sleep(600);

    const inputAnat = await driver.findElement(By.css('#url-input'));
    await inputAnat.clear();
    await inputAnat.sendKeys('https://www.ggle.com');
    const submitBtnAnat = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
    await submitBtnAnat.click();
    await driver.wait(until.elementLocated(By.css('.url-anatomy-wrapper')), 15000);
    await driver.sleep(500);

    const segments = await driver.findElements(By.css('.url-segment-btn'));
    console.log(`  Found ${segments.length} URL segment buttons`);
    for (let i = 0; i < segments.length; i++) {
      await segments[i].click();
      await driver.sleep(200);
      const activeText = await driver.executeScript(() => {
        return {
          cat: document.querySelector('.segment-category-label')?.innerText?.trim(),
          title: document.querySelector('.segment-main-title')?.innerText?.trim(),
          whatIsIt: document.querySelector('.qa-item .qa-body')?.innerText?.trim(),
        };
      });
      console.log(`  Segment [${i}] Clicked -> Title: "${activeText.title}" | Category: "${activeText.cat}"`);
    }

    // -------------------------------------------------------------
    // PHASE 8: BROWSER CONSOLE LOG AUDIT
    // -------------------------------------------------------------
    console.log('\n--- Collecting Browser Console Logs & Errors ---');
    const logs = await driver.manage().logs().get(logging.Type.BROWSER);
    for (const entry of logs) {
      auditResults.consoleLogs.push({
        level: entry.level.name,
        message: entry.message,
        timestamp: entry.timestamp,
      });
      if (entry.level.name === 'SEVERE') {
        console.log(`  [CONSOLE SEVERE]: ${entry.message}`);
      }
    }
    console.log(`  Total Console Logs Collected: ${logs.length}`);

  } finally {
    await driver.quit();
  }

  // Save audit data to disk
  fs.writeFileSync('web_audit_screenshots/full_v2_audit/audit_summary.json', JSON.stringify(auditResults, null, 2));
  console.log('\n✓ Comprehensive Audit run completed. Results saved to web_audit_screenshots/full_v2_audit/audit_summary.json');
}

runAudit();
