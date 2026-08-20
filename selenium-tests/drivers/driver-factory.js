import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { config } from '../config/selenium.config.js';

export async function createDriver(options = {}) {
  const isHeadless = options.headless !== undefined ? options.headless : config.headless;
  const chromeOptions = new chrome.Options();

  if (isHeadless) {
    chromeOptions.addArguments('--headless=new');
  }

  chromeOptions.addArguments(
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=' + (options.width || config.viewport.width) + ',' + (options.height || config.viewport.height),
    '--ignore-certificate-errors'
  );

  const driver = await new Builder()
    .forBrowser(config.browser)
    .setChromeOptions(chromeOptions)
    .build();

  await driver.manage().setTimeouts({
    implicit: config.timeout.implicit,
    pageLoad: config.timeout.pageLoad,
    script: config.timeout.script,
  });

  return driver;
}
