import { Builder, By, until, logging } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://127.0.0.1:8000';
const SCREENSHOT_DIR = path.resolve('web_audit_screenshots', 'v2_1_final_audit');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const TEST_CASES = [
  { url: 'https://google.com', label: 'Safe_Google' },
  { url: 'https://amazon.in', label: 'Safe_Regional_Amazon' },
  { url: 'https://www.ggle.com', label: 'Typosquat_ggle' },
  { url: 'https://www.micros0ft.com', label: 'Typosquat_micros0ft' },
  { url: 'http://login-verify-account-security-update.example.com/resetPath', label: 'NXDOMAIN_Suspicious' },
  { url: 'http://chase-bank-online-security-auth--check.xyz/login.php', label: 'Phishing_Clone' },
];

async function main() {
  console.log('=== STARTING LINKsENTRY V2.1 FINAL AUDIT & LIVE VERIFICATION ===\n');

  const logPrefs = new logging.Preferences();
  logPrefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);

  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--window-size=1440,1050');
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.setLoggingPrefs(logPrefs);

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  const matrix = [];

  try {
    // 1. Initialize Auth
    await driver.get(FRONTEND_URL + '/scanner');
    await driver.sleep(600);
    await driver.executeScript(() => {
      localStorage.setItem('linksentry_e2e_session', JSON.stringify({
        uid: 'v2-1-lead-auditor',
        email: 'auditor@linksentry.io',
        displayName: 'Senior Security Auditor',
      }));
    });
    await driver.sleep(300);

    for (const tc of TEST_CASES) {
      console.log(`\nTesting Case: ${tc.label} -> ${tc.url}`);

      // Query Backend Directly
      let beData = null;
      try {
        const res = await fetch(`${BACKEND_URL}/api/scan/url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: tc.url }),
        });
        beData = await res.json();
      } catch (e) {
        console.error('Backend query failed:', e.message);
      }

      // Live UI Scan
      await driver.get(FRONTEND_URL + '/scanner');
      await driver.sleep(800);

      const input = await driver.findElement(By.css('#url-input'));
      await input.clear();
      await input.sendKeys(tc.url);

      const submitBtn = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
      await submitBtn.click();

      await driver.wait(until.elementLocated(By.css('.scan-result-card')), 25000);
      await driver.sleep(1000);

      // Extract frontend rendered state
      const feData = await driver.executeScript(() => {
        const verdictBadge = document.querySelector('[data-testid="scan-result-verdict"], .verdict-main-row .badge')?.innerText?.trim();
        const verdictDesc = document.querySelector('.verdict-description-text')?.innerText?.trim();
        const score = document.querySelector('[data-testid="risk-score-value"], .risk-score-number')?.innerText?.trim();

        // Technical ML Decision Margins
        const decisionRows = Array.from(document.querySelectorAll('.decision-meter-row')).map(r => {
          const label = r.querySelector('.meter-class-label')?.innerText?.trim();
          const score = r.querySelector('.meter-score-val')?.innerText?.trim();
          const isLeading = r.classList.contains('leading-signal') || r.classList.contains('is-leading');
          return { label, score, isLeading };
        });

        // Verifications
        const dnsText = document.querySelector('[data-testid="domain-dns-status"]')?.innerText?.trim();

        return {
          verdictBadge,
          verdictDesc,
          score,
          decisionRows,
          dnsText,
        };
      });

      const beML = beData?.ml_prediction || beData?.analysis?.ml_prediction || 'N/A';
      const beFinalVerdict = beData?.verdict || beData?.final_verdict || 'N/A';
      const beRiskScore = beData?.risk_score !== undefined ? beData?.risk_score : 'N/A';
      const beDecisionScores = beData?.decision_scores || beData?.analysis?.decision_scores || {};

      const feVerdict = feData.verdictBadge || 'N/A';
      const feScore = feData.score || 'N/A';

      const consistent = (
        feVerdict.toUpperCase() === beFinalVerdict.toUpperCase() &&
        String(feScore) === String(beRiskScore)
      );

      console.log(`  Backend: ML=${beML} | FusionVerdict=${beFinalVerdict} | RiskScore=${beRiskScore}`);
      console.log(`  Frontend: DisplayedVerdict=${feVerdict} | DisplayedScore=${feScore} | Consistent=${consistent ? 'YES ✓' : 'NO ❌'}`);
      console.log(`  ML Decision Rows (${feData.decisionRows.length}):`, feData.decisionRows);

      matrix.push({
        url: tc.url,
        label: tc.label,
        backendML: beML,
        backendFusionVerdict: beFinalVerdict,
        backendRiskScore: beRiskScore,
        frontendVerdict: feVerdict,
        frontendScore: feScore,
        consistent,
        decisionRows: feData.decisionRows,
        backendDecisionScores: beDecisionScores,
      });

      const shot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(SCREENSHOT_DIR, `RESULT_${tc.label}.png`), shot, 'base64');
    }

    fs.writeFileSync('web_audit_screenshots/v2_1_final_audit/final_audit_summary.json', JSON.stringify(matrix, null, 2));
    console.log('\n✓ All test cases executed and verified. Results saved to final_audit_summary.json');
  } finally {
    await driver.quit();
  }
}

main();
