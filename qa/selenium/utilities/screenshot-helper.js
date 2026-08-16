import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('qa/selenium/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

export async function captureScreenshot(driver, testName) {
  try {
    const timestamp = Date.now();
    const filename = `${testName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);
    const image = await driver.takeScreenshot();
    fs.writeFileSync(filepath, image, 'base64');
    return filepath;
  } catch (err) {
    console.error('Failed to capture screenshot:', err);
    return null;
  }
}
