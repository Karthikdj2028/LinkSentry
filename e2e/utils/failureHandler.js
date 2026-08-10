import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotsDir = path.resolve(__dirname, '../screenshots');

if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

function sanitizeName(name) {
    return name
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .substring(0, 100);
}

export async function captureFailure(driver, test) {
    if (!driver) {
        logger.error(`Cannot capture screenshot: WebDriver unavailable`);
        return null;
    }

    try {
        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-');

        const testName = sanitizeName(
            test?.fullTitle?.() || test?.title || 'unknown-test'
        );

        const filename = `${timestamp}_${testName}.png`;
        const filepath = path.join(screenshotsDir, filename);

        const image = await driver.takeScreenshot();
        fs.writeFileSync(filepath, image, 'base64');

        logger.error(`Failure screenshot saved: ${filepath}`);

        return filepath;
    } catch (error) {
        logger.error(
            `Failed to capture screenshot: ${error.message}`
        );

        return null;
    }
}

export async function captureFailureContext(driver, test) {
  const context = {
    test: test?.fullTitle?.() || test?.title || 'Unknown test',
    timestamp: new Date().toISOString(),
  };

  try {
    if (driver) {
      context.url = await driver.getCurrentUrl();
      context.title = await driver.getTitle();
    }
  } catch (error) {
    context.browserContextError = error.message;
  }

  context.screenshot = await captureFailure(driver, test);

  logger.error(
    `Test failure context: ${JSON.stringify(context)}`
  );

  return context;
}

export default {
  captureFailure,
  captureFailureContext,
};
