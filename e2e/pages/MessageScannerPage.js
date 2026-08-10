import { By, until } from 'selenium-webdriver';
import BasePage from './BasePage.js';

/**
 * MessageScannerPage Page Object Model
 * Encapsulates SMS/Message threat scanner controls and assertions.
 */
export class MessageScannerPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.messageInput = By.id('message-input');
    this.scanSubmitBtn = By.css('button.scan-submit-btn');
    this.clearBtn = By.xpath("//form[contains(@class, 'scan-form')]//button[contains(text(), 'Clear')]");
    this.validationError = By.css('.validation-error-message');
    this.resultCard = By.css('.cyber-card.scan-result-card');
    this.verdictBadge = By.css('.verdict-main-row .cyber-badge');
    this.riskScoreText = By.css('.risk-score-number');
    this.confidenceText = By.css('.verdict-confidence');
  }

  async scanMessage(text) {
    const input = await this.waitForVisible(this.messageInput, 15000);
    await this.driver.wait(until.elementIsEnabled(input), 15000);
    await this.clear(this.messageInput);
    if (text) {
      await input.sendKeys(text);
    }
    const btn = await this.waitForClickable(this.scanSubmitBtn, 15000);
    await btn.click();
  }

  async clearInput() {
    await this.click(this.clearBtn);
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

  async isResultDisplayed() {
    return await this.isDisplayed(this.resultCard, 5000);
  }
}

export default MessageScannerPage;
