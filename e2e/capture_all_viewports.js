import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const OUTPUT_DIR = 'd:/LinkSentry/web_audit_screenshots';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const TEST_USER = {
  uid: 'e2e_analyst_qa_user',
  email: 'analyst.qa.test@linksentry.io',
  displayName: 'QA Security Analyst'
};

const VIEWPORTS = [
  { name: 'mobile_390x844', width: 390, height: 844 },
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'desktop_1280x800', width: 1280, height: 800 },
  { name: 'desktop_1920x1080', width: 1920, height: 1080 }
];

const PAGES = [
  { name: 'overview', path: '/' },
  { name: 'scanner_url', path: '/scanner?type=url' },
  { name: 'scanner_qr', path: '/scanner?type=qr' },
  { name: 'scanner_message', path: '/scanner?type=message' },
  { name: 'history', path: '/history' },
  { name: 'analytics', path: '/analytics' },
  { name: 'security_center', path: '/security-center' },
  { name: 'profile', path: '/profile' }
];

async function captureAllViewports() {
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'linksentry_chrome_'));
  
  const options = new chrome.Options();
  options.addArguments(
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--force-device-scale-factor=1',
    '--disable-gpu',
    '--remote-debugging-port=0',
    `--user-data-dir=${tmpProfile}`
  );

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    await driver.manage().window().setRect({ width: 1280, height: 800 });
    await driver.get('http://localhost:5173/');

    // Seed session in localStorage
    await driver.executeScript((user) => {
      localStorage.setItem('linksentry_e2e_session', JSON.stringify(user));
      localStorage.setItem('linksentry_theme', 'light');

      const sampleScans = [
        {
          id: 'local_sample_1',
          userId: user.uid,
          type: 'url',
          input: 'https://login-apple-security-check.xyz/auth',
          url: 'https://login-apple-security-check.xyz/auth',
          domain: 'login-apple-security-check.xyz',
          verdict: 'phishing',
          riskScore: 92,
          confidence: '98%',
          engine: 'V3.3 Hybrid ML',
          source: 'LinkSentry Neural Engine',
          isLocalOnly: false,
          createdAt: { seconds: Math.floor(Date.now() / 1000) - 3600 }
        },
        {
          id: 'local_sample_2',
          userId: user.uid,
          type: 'qr',
          input: 'https://github.com/security/advisories',
          url: 'https://github.com/security/advisories',
          domain: 'github.com',
          verdict: 'safe',
          riskScore: 4,
          confidence: '95%',
          engine: 'Optical Matrix Decoder',
          source: 'LinkSentry Barcode Engine',
          isLocalOnly: true,
          createdAt: { seconds: Math.floor(Date.now() / 1000) - 7200 }
        },
        {
          id: 'local_sample_3',
          userId: user.uid,
          type: 'message',
          input: 'URGENT: Your bank account will be locked. Verify PIN now at https://secure-bank-alerts.info',
          url: 'https://secure-bank-alerts.info',
          domain: 'secure-bank-alerts.info',
          verdict: 'phishing',
          riskScore: 96,
          confidence: '99%',
          engine: 'Smishing NLP Heuristic',
          source: 'LinkSentry NLP Core',
          isLocalOnly: true,
          createdAt: { seconds: Math.floor(Date.now() / 1000) - 14400 }
        }
      ];

      localStorage.setItem(`linksentry_local_scans_${user.uid}`, JSON.stringify(sampleScans));
    }, TEST_USER);

    // Initial page reload to establish authenticated context
    await driver.get('http://localhost:5173/');
    await driver.wait(until.elementLocated(By.css('.site-header')), 8000);
    await new Promise((r) => setTimeout(r, 1000));

    // Audit across Light and Dark themes
    const THEMES = ['light', 'dark'];

    for (const currentTheme of THEMES) {
      console.log(`\n========================================`);
      console.log(` AUDITING THEME: ${currentTheme.toUpperCase()}`);
      console.log(`========================================`);

      for (const vp of VIEWPORTS) {
        console.log(`\nViewport: ${vp.name} (${vp.width}x${vp.height}) - Theme: ${currentTheme}`);
        await driver.manage().window().setRect({ width: vp.width, height: vp.height });
        await new Promise((r) => setTimeout(r, 400));

        for (const page of PAGES) {
          await driver.executeScript((targetPath, thm) => {
            window.history.pushState({}, '', targetPath);
            window.dispatchEvent(new PopStateEvent('popstate'));
            localStorage.setItem('linksentry_theme', thm);
            document.documentElement.setAttribute('data-theme', thm);
            document.documentElement.style.colorScheme = thm;
          }, page.path, currentTheme);

          await new Promise((r) => setTimeout(r, 800));

          const shot = await driver.takeScreenshot();
          const filename = path.join(OUTPUT_DIR, `${page.name}_${currentTheme}_${vp.name}.png`);
          fs.writeFileSync(filename, shot, 'base64');
          console.log(`  ✓ Saved: ${path.basename(filename)}`);
        }
      }
    }

    console.log('\n========================================');
    console.log(' ALL 64 VISUAL SCREENSHOTS CAPTURED');
    console.log('========================================');
  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    try {
      await driver.quit();
    } catch {}
    try {
      fs.rmSync(tmpProfile, { recursive: true, force: true });
    } catch {}
  }
}

captureAllViewports();
