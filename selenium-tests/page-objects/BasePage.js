import { By, until } from 'selenium-webdriver';
import { config } from '../config/selenium.config.js';

export class BasePage {
  constructor(driver) {
    this.driver = driver;
    this.baseUrl = config.baseUrl;
  }

  async navigate(path = '/') {
    await this.driver.get(this.baseUrl + path);
  }

  async getTitle() {
    return await this.driver.getTitle();
  }

  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }

  async find(locator) {
    return await this.driver.findElement(locator);
  }

  async findAll(locator) {
    return await this.driver.findElements(locator);
  }

  async isDisplayed(locator) {
    try {
      const el = await this.driver.findElement(locator);
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }

  async getText(locator) {
    const el = await this.driver.findElement(locator);
    return await el.getText();
  }

  async takeScreenshot(filepath) {
    const data = await this.driver.takeScreenshot();
    return Buffer.from(data, 'base64');
  }
}
