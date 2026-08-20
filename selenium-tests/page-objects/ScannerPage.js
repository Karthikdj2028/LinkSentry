import { By, until } from 'selenium-webdriver';
import { BasePage } from './BasePage.js';
import { safeClick, safeType, waitForElement, waitForVisible } from '../utilities/wait-helpers.js';

export class ScannerPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.locators = {
      urlInput: By.css('input[type="text"], input[placeholder*="URL"], input[placeholder*="http"], input[name="url"], #url-input'),
      scanButton: By.css('button[type="submit"], button.scan-btn, button.btn-primary, button:has(svg), #scan-button'),
      clearButton: By.css('button.clear-btn, button[aria-label="Clear"]'),
      qrButton: By.css('button[aria-label*="QR"], button.qr-scan-btn, button:has(.qr-icon)'),
      loadingState: By.css('.scanning-indicator, .active-scan-container, .scanner-loading, [role="progressbar"]'),
      verdictCard: By.css('.verdict-card, .final-verdict-card, .verdict-header, .threat-verdict'),
      riskScoreBadge: By.css('.risk-score-badge, .risk-score-value, .score-circle'),
      indicatorsList: By.css('.indicators-list, .threat-indicators, .indicator-item'),
      domainVerificationCard: By.css('.domain-verification-card, .reachability-card, .domain-status-badge'),
      technicalSignalsCard: By.css('.technical-signals-card, .model-decision-signals, .signals-grid'),
      urlAnatomyCard: By.css('.url-anatomy-card, .understand-link-section, .anatomy-grid'),
    };
  }

  async scanUrl(url) {
    const input = await safeType(this.driver, this.locators.urlInput, url);
    try {
      await safeClick(this.driver, this.locators.scanButton);
    } catch {
      await input.sendKeys('\uE007'); // Enter key
    }
  }

  async clearInput() {
    try {
      await safeClick(this.driver, this.locators.clearButton, 2000);
    } catch {
      const input = await this.find(this.locators.urlInput);
      await input.clear();
    }
  }

  async isVerdictDisplayed(timeout = 12000) {
    try {
      const el = await waitForElement(this.driver, this.locators.verdictCard, timeout);
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }

  async getVerdictText() {
    return await this.getText(this.locators.verdictCard);
  }
}
