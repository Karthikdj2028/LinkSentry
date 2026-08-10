import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import edge from 'selenium-webdriver/edge.js';
import firefox from 'selenium-webdriver/firefox.js';
import config from '../config/environment.js';
import logger from './logger.js';

/**
 * Creates and configures a Selenium WebDriver instance
 * based on environment configuration.
 *
 * @returns {Promise<import('selenium-webdriver').WebDriver>}
 */
export async function createDriver() {
  const browserName = config.browser;
  const isHeadless = config.headless;

  logger.info(`Initializing WebDriver [Browser: ${browserName}, Headless: ${isHeadless}]`);

  const builder = new Builder().forBrowser(browserName);

  if (browserName === 'chrome') {
    const options = new chrome.Options();
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--use-fake-ui-for-media-stream');
    options.addArguments('--use-fake-device-for-media-stream');

    if (isHeadless) {
      options.addArguments('--headless=new');
    }

    builder.setChromeOptions(options);
  } else if (browserName === 'edge') {
    const options = new edge.Options();
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    if (isHeadless) {
      options.addArguments('--headless=new');
    }
    builder.setEdgeOptions(options);
  } else if (browserName === 'firefox') {
    const options = new firefox.Options();
    options.addArguments('--width=1920');
    options.addArguments('--height=1080');
    if (isHeadless) {
      options.addArguments('-headless');
    }
    builder.setFirefoxOptions(options);
  }

  const driver = await builder.build();

  // Set timeouts
  await driver.manage().setTimeouts({
    pageLoad: config.timeouts.pageLoad,
    script: config.timeouts.script,
  });

  return driver;
}

export default createDriver;
