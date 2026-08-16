import { By } from 'selenium-webdriver';
import { BasePage } from './BasePage.js';

export class ScannerPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.urlTab = By.css('.scanner-tab-btn[data-subtab="url"], button:contains("URL")');
    this.qrTab = By.css('.scanner-tab-btn[data-subtab="qr"], button:contains("QR")');
    this.messageTab = By.css('.scanner-tab-btn[data-subtab="message"], button:contains("Message")');

    // URL Scanner elements
    this.urlInput = By.css('input.url-input-field, input[placeholder*="http"i]');
    this.urlScanBtn = By.css('button.scan-btn-primary, button.scan-submit-btn');

    // Message Scanner elements
    this.messageInput = By.css('textarea.message-textarea, textarea[placeholder*="message"i]');
    this.messageScanBtn = By.css('button.scan-btn-primary');

    // QR Scanner elements
    this.qrFileInput = By.css('input[type="file"].qr-file-input, input[type="file"]');
    this.qrDropZone = By.css('.qr-drag-drop-zone, .qr-upload-box');

    // Scan Result elements
    this.verdictBadge = By.css('.verdict-badge, .verdict-pill, .verdict-text');
    this.riskScore = By.css('.risk-score-value, .score-number');
    this.indicators = By.css('.indicator-item, .indicator-tag, .indicator-text');
    this.saveWarningBanner = By.css('.warning-banner, .save-warning');
  }

  async selectSubTab(tab) {
    if (tab === 'url') await this.click(this.urlTab);
    else if (tab === 'qr') await this.click(this.qrTab);
    else if (tab === 'message') await this.click(this.messageTab);
  }

  async scanUrl(url) {
    await this.type(this.urlInput, url);
    await this.click(this.urlScanBtn);
  }

  async scanMessage(msg) {
    await this.type(this.messageInput, msg);
    await this.click(this.messageScanBtn);
  }

  async uploadQrImage(filePath) {
    const input = await this.find(this.qrFileInput);
    await input.sendKeys(filePath);
  }

  async getVerdict() {
    return await this.getText(this.verdictBadge);
  }

  async getRiskScore() {
    return await this.getText(this.riskScore);
  }

  async hasWarningBanner() {
    return await this.isDisplayed(this.saveWarningBanner, 2000);
  }
}
