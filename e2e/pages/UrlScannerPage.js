import { By, until } from 'selenium-webdriver';
import BasePage from './BasePage.js';

/**
 * UrlScannerPage Page Object Model
 * Encapsulates URL threat scanner controls, form actions, and result card locators.
 */
export class UrlScannerPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.urlInput = By.id('url-input');
    this.scanSubmitBtn = By.css('button.scan-submit-btn');
    this.clearBtn = By.css('button.input-clear-btn');
    this.validationError = By.css('.validation-error-message');
    this.scanningRadar = By.css('.scanning-in-progress');
    this.resultCard = By.css('.cyber-card.scan-result-card');
    this.verdictBadge = By.css('.verdict-main-row .cyber-badge');
    this.riskScoreText = By.css('.risk-score-number');
    this.confidenceText = By.css('.verdict-confidence');
    this.targetText = By.css('.scan-target-text');
    this.resetBtn = By.xpath("//div[contains(@class, 'scan-result-actions')]//button[contains(text(), 'New Scan')]");
  }

  async scanUrl(url) {
    const input = await this.waitForVisible(this.urlInput, 15000);
    await this.driver.wait(until.elementIsEnabled(input), 15000);
    await this.clear(this.urlInput);
    if (url) {
      await input.sendKeys(url);
    }
    const btn = await this.waitForClickable(this.scanSubmitBtn, 15000);
    await btn.click();
  }

  async clearInput() {
    await this.click(this.clearBtn);
  }

  async getInputValue() {
    return await this.getValue(this.urlInput);
  }

  async getValidationError() {
    return await this.getText(this.validationError, 10000);
  }

  async isValidationErrorDisplayed(timeout = 10000) {
    return await this.isDisplayed(this.validationError, timeout);
  }

  async waitForResult(timeout = 25000) {
    await this.waitForVisible(this.resultCard, timeout);
    await this.waitForVisible(this.verdictBadge, timeout);
  }

  async getVerdict() {
    await this.waitForResult();
    const rawText = await this.getText(this.verdictBadge);
    return rawText.trim();
  }

  async getRiskScore() {
    await this.waitForResult();
    const rawScore = await this.getText(this.riskScoreText);
    return parseInt(rawScore.trim(), 10);
  }

  async getConfidence() {
    await this.waitForResult();
    return await this.getText(this.confidenceText);
  }

  async isResultDisplayed() {
    return await this.isDisplayed(this.resultCard, 5000);
  }

  async resetScan() {
    await this.click(this.resetBtn);
  }
}

export default UrlScannerPage;
