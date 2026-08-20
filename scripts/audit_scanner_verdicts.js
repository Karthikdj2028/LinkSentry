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

const TEST_CASES = [
  { url: 'https://google.com', label: 'Safe_Google' },
  { url: 'https://amazon.in', label: 'Safe_Amazon_India' },
  { url: 'https://www.ggle.com', label: 'Typosquat_ggle' },
  { url: 'https://www.micros0ft.com', label: 'Typosquat_micros0ft' },
  { url: 'http://login-verify-account-security-update.example.com/resetPath', label: 'NXDOMAIN_Suspicious' },
  { url: 'http://chase-bank-online-security-auth--check.xyz/login.php', label: 'Long_Phishing_Target' },
];

async function runScannerAudit() {
  console.log('=== RUNNING SCANNER SECURITY VERDICT & DECISION CONSISTENCY AUDIT ===');
  const results = [];

  const logPrefs = new logging.Preferences();
  logPrefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);

  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--window-size=1440,1100');
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.setLoggingPrefs(logPrefs);

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  try {
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

    for (const testCase of TEST_CASES) {
      console.log(`\nTesting URL: ${testCase.url} (${testCase.label})`);

      // 1. Direct backend API call
      let backendData = null;
      try {
        const apiRes = await fetch(`${BACKEND_URL}/api/scan/url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: testCase.url }),
        });
        backendData = await apiRes.json();
      } catch (e) {
        console.error('Backend scan fetch error:', e.message);
      }

      // 2. Perform scan in Live Frontend
      await driver.get(FRONTEND_URL + '/scanner');
      await driver.sleep(800);

      const input = await driver.findElement(By.css('#url-input'));
      await input.clear();
      await input.sendKeys(testCase.url);

      const submitBtn = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
      await submitBtn.click();

      await driver.wait(until.elementLocated(By.css('.scan-result-card')), 25000);
      await driver.sleep(1000);

      // Extract frontend rendered state
      const frontendData = await driver.executeScript(() => {
        const verdictBadge = document.querySelector('[data-testid="scan-result-verdict"], .verdict-main-row .badge')?.innerText?.trim();
        const verdictDesc = document.querySelector('.verdict-description-text')?.innerText?.trim();
        const score = document.querySelector('[data-testid="risk-score-value"], .risk-score-number')?.innerText?.trim();

        // Technical decision signals
        const decisionRows = Array.from(document.querySelectorAll('.decision-meter-row')).map(r => {
          const classLabel = r.querySelector('.meter-class-label')?.innerText?.trim();
          const scoreVal = r.querySelector('.meter-score-val')?.innerText?.trim();
          const isLeading = r.classList.contains('is-leading');
          return { classLabel, scoreVal, isLeading };
        });

        return {
          verdictBadge,
          verdictDesc,
          score,
          decisionRows,
        };
      });

      const beML = backendData?.ml_prediction || backendData?.analysis?.ml_prediction || 'N/A';
      const beFinalVerdict = backendData?.verdict || backendData?.final_verdict || backendData?.threat_level || 'N/A';
      const beRiskScore = backendData?.risk_score !== undefined ? backendData?.risk_score : (backendData?.threat_score || 'N/A');
      const beConfidence = backendData?.confidence || backendData?.analysis?.confidence || 'N/A';
      const beBrand = backendData?.potential_brand || backendData?.typosquat_target || 'None';
      const beDecisionScores = backendData?.decision_scores || backendData?.analysis?.decision_scores || {};

      const feVerdict = frontendData.verdictBadge || frontendData.verdictCard || 'N/A';
      const feScore = frontendData.score || 'N/A';

      const consistent = (
        feVerdict.toUpperCase().includes(beFinalVerdict.toUpperCase()) ||
        beFinalVerdict.toUpperCase().includes(feVerdict.toUpperCase())
      );

      console.log(`  Backend: ML=${beML} | FinalVerdict=${beFinalVerdict} | RiskScore=${beRiskScore} | Brand=${beBrand}`);
      console.log(`  Frontend: DisplayedVerdict=${feVerdict} | DisplayedScore=${feScore} | Consistent=${consistent ? 'YES ✓' : 'NO ❌'}`);
      console.log(`  Decision Rows (${frontendData.decisionRows.length}):`, frontendData.decisionRows);

      results.push({
        url: testCase.url,
        label: testCase.label,
        backendML: beML,
        backendFinalVerdict: beFinalVerdict,
        backendRiskScore: beRiskScore,
        backendConfidence: beConfidence,
        frontendVerdict: feVerdict,
        frontendScore: feScore,
        consistent,
        frontendDecisionRows: frontendData.decisionRows,
        backendDecisionScores: beDecisionScores,
      });

      const shot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(SCREENSHOT_DIR, `SCAN_${testCase.label}.png`), shot, 'base64');
    }

    fs.writeFileSync('web_audit_screenshots/full_v2_audit/scanner_verdict_results.json', JSON.stringify(results, null, 2));
    console.log('\n✓ Scanner Verdict Audit Complete. Results saved.');
  } finally {
    await driver.quit();
  }
}

runScannerAudit();
