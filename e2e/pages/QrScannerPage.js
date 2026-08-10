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
    this.fileInput = By.css('input.hidden-file-input[type="file"]');
    this.dropzone = By.css('.qr-dropzone');
    this.uploadModeBtn = By.xpath("//div[contains(@class, 'qr-mode-switch-row')]//button[contains(text(), 'Image Upload Mode')]");
    this.cameraModeBtn = By.xpath("//div[contains(@class, 'qr-mode-switch-row')]//button[contains(text(), 'Live Camera Stream')]");
    this.cameraPlaceholder = By.css('.qr-camera-placeholder, .camera-viewfinder');
    this.cameraVideo = By.css('video, .camera-viewfinder');
    this.cameraError = By.css('.camera-instruction.text-red, .auth-error-alert');
    this.resultCard = By.css('.cyber-card.scan-result-card');
    this.verdictBadge = By.css('.verdict-main-row .cyber-badge');
    this.riskScoreText = By.css('.risk-score-number');
    this.resetBtn = By.xpath("//div[contains(@class, 'scan-result-actions')]//button[contains(text(), 'New Scan')]");
  }

  async uploadQrImage(filePath) {
    // Ensure upload mode is active and file input is located
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

export default QrScannerPage;
