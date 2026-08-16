import { By } from 'selenium-webdriver';
import { BasePage } from './BasePage.js';

export class HistoryPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.searchInput = By.css('input.history-search-input, input[placeholder*="Search"i]');
    this.filterBtns = By.css('.filter-btn, .history-filter-chip');
    this.scanCards = By.css('.history-card, .scan-history-item');
    this.deleteBtn = By.css('button.delete-scan-btn, button[title*="Delete"i]');
  }

  async searchHistory(query) {
    await this.type(this.searchInput, query);
  }

  async getScanCount() {
    const cards = await this.driver.findElements(this.scanCards);
    return cards.length;
  }
}

export class AnalyticsPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.charts = By.css('.analytics-chart, .radar-chart, .chart-container');
    this.statNumbers = By.css('.analytics-metric, .stat-value');
  }

  async isLoaded() {
    return await this.isDisplayed(this.charts, 5000);
  }
}

export class SecurityCenterPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.shieldScore = By.css('.shield-score-number, .score-value');
    this.toggleSwitches = By.css('.toggle-switch, .switch-slider');
  }

  async isLoaded() {
    return await this.isDisplayed(this.shieldScore, 5000);
  }
}

export class ProfilePage extends BasePage {
  constructor(driver) {
    super(driver);
    this.userEmail = By.css('.user-email, .profile-email');
    this.userUid = By.css('.user-uid-display, .profile-uid');
    this.cloudSyncToggle = By.css('input#cloud-sync-toggle, .cloud-sync-switch input');
    this.themeToggleBtn = By.css('button.theme-toggle-btn');
    this.logoutBtn = By.css('button.logout-btn, button.btn-signout');
  }

  async isLoaded() {
    return await this.isDisplayed(this.userEmail, 5000);
  }

  async logout() {
    await this.click(this.logoutBtn);
  }
}
