import { By, until, Key } from 'selenium-webdriver';
import BasePage from './BasePage.js';

/**
 * UrlScannerPage Page Object Model
 * Encapsulates URL threat scanner controls, form actions, and result card locators.
 */
export class UrlScannerPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.urlInput = By.css('[data-testid="url-input"], #url-input');
    this.scanSubmitBtn = By.css('[data-testid="url-scan-submit"], button.scan-submit-btn');
    this.clearBtn = By.css('[data-testid="url-scan-clear"], button.input-clear-btn');
    this.validationError = By.css('[data-testid="url-validation-error"], .validation-error-message');
    this.scanningRadar = By.css('.scanning-in-progress');
    this.resultCard = By.css('[data-testid="scan-result-card"], .cyber-card.scan-result-card');
    this.verdictBadge = By.css('[data-testid="scan-result-verdict"], .verdict-main-row .cyber-badge');
    this.riskScoreText = By.css('[data-testid="risk-score-value"], .risk-score-number');
    this.confidenceText = By.css('[data-testid="scan-result-confidence"], .verdict-confidence');
    this.targetText = By.css('[data-testid="scan-result-target"], .scan-target-text');
    // Prefer the explicit data-testid for the reset button so we don't
    // accidentally match other action buttons (e.g. copy) in the same
    // `.scan-result-actions` container.
    this.resetBtn = By.css('[data-testid="scan-reset-button"]');
    this.copyBtn = By.css('[data-testid="scan-copy-button"]');
  }

  async scanUrl(url) {
    const input = await this.waitForVisible(this.urlInput, 15000);
    await this.driver.wait(until.elementIsEnabled(input), 15000);
    await this.clear(this.urlInput);
    if (url) {
      await input.sendKeys(url);
    }
    const btn = await this.waitForClickable(this.scanSubmitBtn, 15000);
    // Scroll the submit button into the center of the viewport before clicking.
    // On small viewports (390x844) the button can land outside the visible area.
    await this.scrollAndClickElement(btn, 15000);
  }

  async scanUrlWithEnter(url) {
    const input = await this.waitForVisible(this.urlInput, 15000);
    await this.driver.wait(until.elementIsEnabled(input), 15000);
    await this.clear(this.urlInput);
    if (url) {
      await input.sendKeys(url, Key.RETURN);
    }
  }

  async selectPreset(index = 0) {
    const presetBtn = By.css(`[data-testid="preset-url-${index}"]`);
    await this.click(presetBtn);
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

  async waitForResult(timeout = 45000) {
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

  async waitForResultHidden(timeout = 8000) {
    // Wait for the result card to disappear from the DOM or become invisible.
    await this.driver.wait(async () => {
      const visible = await this.isDisplayed(this.resultCard, 500);
      return !visible;
    }, timeout, 'Result card was still visible after reset');
  }

  async resetScan() {
    await this.click(this.resetBtn);
  }

  async isSubmitDisabled() {
    const btn = await this.find(this.scanSubmitBtn);
    const disabled = await btn.getAttribute('disabled');
    return disabled !== null;
  }
}

export default UrlScannerPage;
