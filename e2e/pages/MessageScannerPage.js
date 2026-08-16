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
    this.messageInput = By.css('[data-testid="message-input"], #message-input');
    this.scanSubmitBtn = By.css('[data-testid="message-scan-submit"], button.scan-submit-btn');
    this.clearBtn = By.css('[data-testid="message-scan-clear"]');
    this.validationError = By.css('[data-testid="message-validation-error"], .validation-error-message');
    this.resultCard = By.css('[data-testid="scan-result-card"], .cyber-card.scan-result-card');
    this.verdictBadge = By.css('[data-testid="scan-result-verdict"], .verdict-main-row .cyber-badge');
    this.riskScoreText = By.css('[data-testid="risk-score-value"], .risk-score-number');
    this.confidenceText = By.css('[data-testid="scan-result-confidence"], .verdict-confidence');
    this.charCount = By.css('.character-counter');
  }

  async scanMessage(text) {
    const input = await this.waitForVisible(this.messageInput, 15000);
    await this.driver.wait(until.elementIsEnabled(input), 15000);
    await this.clear(this.messageInput);
    if (text) {
      await input.sendKeys(text);
    }
    const btn = await this.waitForClickable(this.scanSubmitBtn, 15000);
    // Scroll the submit button into center view before clicking.
    // On small viewports (390x844) the button can be pushed below the fold.
    await this.scrollAndClickElement(btn, 15000);
  }

  async selectPreset(index = 0) {
    const presetBtn = By.css(`[data-testid="preset-message-${index}"]`);
    await this.click(presetBtn);
  }

  async clearInput() {
    await this.click(this.clearBtn);
  }

  async getInputValue() {
    return await this.getValue(this.messageInput);
  }

  async getValidationError() {
    return await this.getText(this.validationError, 10000);
  }

  async isValidationErrorDisplayed(timeout = 10000) {
    return await this.isDisplayed(this.validationError, timeout);
  }

  async waitForResult(timeout = 30000) {
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

  async getCharacterCountText() {
    return await this.getText(this.charCount);
  }
}

export default MessageScannerPage;
