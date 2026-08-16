import { By, until } from 'selenium-webdriver';
import BasePage from './BasePage.js';

/**
 * QrScannerPage Page Object Model
 * Encapsulates QR Code image uploads, camera mode toggle, and result assertions.
 */
export class QrScannerPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.fileInput = By.css('[data-testid="qr-file-input"], input.hidden-file-input[type="file"]');
    this.dropzone = By.css('[data-testid="qr-dropzone"], .qr-dropzone');
    this.uploadModeBtn = By.css('[data-testid="qr-mode-upload"]');
    this.cameraModeBtn = By.css('[data-testid="qr-mode-camera"]');
    this.cameraPlaceholder = By.css('.qr-camera-placeholder, .camera-viewfinder');
    this.cameraVideo = By.css('video, .camera-viewfinder');
    this.cameraError = By.css('.camera-instruction.text-red, .auth-error-alert');
    this.resultCard = By.css('[data-testid="scan-result-card"], .cyber-card.scan-result-card');
    this.verdictBadge = By.css('[data-testid="scan-result-verdict"], .verdict-main-row .cyber-badge');
    this.riskScoreText = By.css('[data-testid="risk-score-value"], .risk-score-number');
    this.resetBtn = By.css('[data-testid="scan-reset-button"]');
    this.validationError = By.css('.validation-error-message');
  }

  async uploadQrImage(filePath) {
    await this.switchToUploadMode();
    const inputElement = await this.driver.wait(until.elementLocated(this.fileInput), 15000);
    await inputElement.sendKeys(filePath);
  }

  async switchToCameraMode() {
    await this.click(this.cameraModeBtn);
    await this.waitForVisible(this.cameraPlaceholder, 10000);
  }

  async switchToUploadMode() {
    await this.click(this.uploadModeBtn);
    await this.waitForVisible(this.dropzone, 10000);
  }

  async isCameraUIOrFallbackDisplayed() {
    const placeholderVisible = await this.isDisplayed(this.cameraPlaceholder, 5000);
    const videoVisible = await this.isDisplayed(this.cameraVideo, 5000);
    const errorVisible = await this.isDisplayed(this.cameraError, 5000);
    return placeholderVisible || videoVisible || errorVisible;
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

  async resetScan() {
    await this.click(this.resetBtn);
  }
}

export default QrScannerPage;
