import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { SELENIUM_CONFIG } from '../config/selenium.config.js';

export async function createDriver(options = {}) {
  const chromeOptions = new chrome.Options();
  
  if (SELENIUM_CONFIG.headless && !options.headless === false) {
    chromeOptions.addArguments(
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,800'
    );
  }

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  await driver.manage().setTimeouts({ implicit: SELENIUM_CONFIG.implicitWaitMs });
  await driver.manage().window().setRect(options.viewport || SELENIUM_CONFIG.viewports.desktop);

  return driver;
}
