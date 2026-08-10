import { until } from 'selenium-webdriver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.resolve(__dirname, '../screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

/**
 * Base Page Object encapsulating Selenium explicit waits and core browser actions.
 */
export class BasePage {
  /**
   * @param {import('selenium-webdriver').WebDriver} driver
   */
  constructor(driver) {
    this.driver = driver;
    this.baseUrl = config.baseUrl;
    this.defaultTimeout = config.timeouts.explicit;
  }

  async open(path = '') {
    const targetUrl = `${this.baseUrl}${path}`;
    logger.info(`Navigating to URL: ${targetUrl}`);
    await this.driver.get(targetUrl);
  }

  async find(locator, timeout = this.defaultTimeout) {
    const element = await this.driver.wait(until.elementLocated(locator), timeout);
    await this.driver.wait(until.elementIsVisible(element), timeout);
    return element;
  }

  async findAll(locator, timeout = this.defaultTimeout) {
    await this.driver.wait(until.elementsLocated(locator), timeout);
    return await this.driver.findElements(locator);
  }

  async click(locator, timeout = this.defaultTimeout) {
    const element = await this.waitForClickable(locator, timeout);
    await element.click();
  }

  async type(locator, text, timeout = this.defaultTimeout) {
    const element = await this.find(locator, timeout);
    await element.clear();
    await element.sendKeys(text);
  }

  async clear(locator, timeout = this.defaultTimeout) {
    const element = await this.find(locator, timeout);
    await element.clear();
  }

  async getText(locator, timeout = this.defaultTimeout) {
    const element = await this.find(locator, timeout);
    return await element.getText();
  }

  async getValue(locator, timeout = this.defaultTimeout) {
    const element = await this.find(locator, timeout);
    return await element.getAttribute('value');
  }

  async isDisplayed(locator, timeout = 5000) {
    try {
      const element = await this.driver.wait(until.elementLocated(locator), timeout);
      await this.driver.wait(until.elementIsVisible(element), timeout);
      return true;
    } catch {
      return false;
    }
  }

  async waitForVisible(locator, timeout = this.defaultTimeout) {
    const element = await this.driver.wait(until.elementLocated(locator), timeout);
    await this.driver.wait(until.elementIsVisible(element), timeout);
    return element;
  }

  async waitForClickable(locator, timeout = this.defaultTimeout) {
    const element = await this.waitForVisible(locator, timeout);
    await this.driver.wait(until.elementIsEnabled(element), timeout);
    return element;
  }

  async waitForUrlContains(substring, timeout = this.defaultTimeout) {
    await this.driver.wait(until.urlContains(substring), timeout);
  }

  async scrollIntoView(locator) {
    const element = await this.find(locator);
    await this.driver.executeScript('arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });', element);
  }

  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }

  async getPageTitle() {
    return await this.driver.getTitle();
  }

  async takeScreenshot(testName = 'screenshot') {
    try {
      const image = await this.driver.takeScreenshot();
      const sanitizedName = testName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${timestamp}_${sanitizedName}.png`;
      const filePath = path.join(screenshotsDir, filename);
      fs.writeFileSync(filePath, image, 'base64');
      logger.info(`Screenshot captured: ${filePath}`);
      return filename;
    } catch (err) {
      logger.error(`Failed to capture screenshot: ${err.message}`);
      return null;
    }
  }
}

export default BasePage;
