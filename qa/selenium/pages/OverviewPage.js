import { By } from 'selenium-webdriver';
import { BasePage } from './BasePage.js';

export class OverviewPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.title = By.css('.overview-title, h1');
    this.statCards = By.css('.stat-card');
    this.quickScanBtn = By.css('button.quick-scan-btn, .quick-action-card');
    this.threatRadar = By.css('.threat-radar-container, .radar-widget');
    this.recentScansList = By.css('.recent-scans-feed, .recent-scans-list');
  }

  async isLoaded() {
    return await this.isDisplayed(this.title, 5000);
  }

  async getStatCardCount() {
    const cards = await this.driver.findElements(this.statCards);
    return cards.length;
  }
}
