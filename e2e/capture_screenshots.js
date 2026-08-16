import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';

const VIEWPORTS = [
  { name: 'desktop_1280x800', width: 1280, height: 800 },
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'mobile_390x844', width: 390, height: 844 },
  { name: 'desktop_1920x1080', width: 1920, height: 1080 }
];

const ROUTES = [
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
  { name: 'dashboard', path: '/' },
  { name: 'scanner_link', path: '/scanner' },
  { name: 'history', path: '/history' },
  { name: 'analytics', path: '/analytics' },
  { name: 'security_center', path: '/security' },
  { name: 'profile', path: '/profile' }
];

const OUTPUT_DIR = 'd:/LinkSentry/web_audit_screenshots';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureAll() {
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1');

  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    for (const vp of VIEWPORTS) {
      console.log(`Setting viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await driver.manage().window().setRect({ width: vp.width, height: vp.height });

      for (const route of ROUTES) {
        const url = `http://localhost:5173${route.path}`;
        try {
          await driver.get(url);
          await new Promise(r => setTimeout(r, 1200));

          const screenshot = await driver.takeScreenshot();
          const filename = path.join(OUTPUT_DIR, `${route.name}_${vp.name}.png`);
          fs.writeFileSync(filename, screenshot, 'base64');
          console.log(`  Saved: ${filename}`);
        } catch (e) {
          console.error(`  Error on ${url}:`, e.message);
        }
      }
    }
  } finally {
    if (driver) await driver.quit();
  }
}

captureAll().then(() => console.log('All screenshots captured successfully!')).catch(console.error);
