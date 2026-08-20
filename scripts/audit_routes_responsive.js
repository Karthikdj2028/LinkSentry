import { Builder, By, logging } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve('web_audit_screenshots', 'full_v2_audit');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '320', width: 320, height: 640 },
  { name: '375', width: 375, height: 812 },
  { name: '412', width: 412, height: 915 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1366', width: 1366, height: 768 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
];

const ROUTES = [
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/scanner', name: 'Scanner Hub' },
  { path: '/history', name: 'History' },
  { path: '/analytics', name: 'Analytics' },
  { path: '/security-center', name: 'Security Center' },
  { path: '/profile', name: 'Profile / Settings' },
];

async function createDriver() {
  const logPrefs = new logging.Preferences();
  logPrefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);

  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--window-size=1440,900');
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.setLoggingPrefs(logPrefs);

  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

async function auditRoutes() {
  console.log('=== RUNNING ROUTE & MULTI-VIEWPORT RESPONSIVE AUDIT ===');
  const results = {};

  const driver = await createDriver();
  try {
    await driver.get(FRONTEND_URL + '/login');
    await driver.sleep(600);
    await driver.executeScript(() => {
      localStorage.setItem('linksentry_e2e_session', JSON.stringify({
        uid: 'e2e-audit-analyst',
        email: 'analyst@linksentry.io',
        displayName: 'Lead Security Auditor',
      }));
    });
    await driver.sleep(200);

    for (const route of ROUTES) {
      results[route.name] = {};
      console.log(`\nAuditing Route: ${route.name} (${route.path})`);

      for (const vp of VIEWPORTS) {
        await driver.sendDevToolsCommand('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: vp.width < 768,
        });

        await driver.get(FRONTEND_URL + route.path);
        await driver.sleep(400);

        const metrics = await driver.executeScript(() => {
          const doc = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
          const clientW = doc.clientWidth;
          const winW = window.innerWidth;
          const hasHScroll = scrollW > (clientW + 1);
          return { scrollW, clientW, winW, hasHScroll };
        });

        const status = metrics.hasHScroll ? 'FAIL' : 'PASS';
        results[route.name][vp.name] = status;

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

    // Collect browser logs
    const logs = await driver.manage().logs().get(logging.Type.BROWSER);
    fs.writeFileSync('web_audit_screenshots/full_v2_audit/route_responsive_results.json', JSON.stringify({ results, logs }, null, 2));
    console.log('\n✓ Route and Responsive Audit Complete. Results saved.');
  } finally {
    await driver.quit();
  }
}

auditRoutes();
