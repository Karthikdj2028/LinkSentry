import { By } from 'selenium-webdriver';
import BasePage from './BasePage.js';

/**
 * HistoryPage Page Object Model
 * Encapsulates Cloud Firestore scan audit trail, live search, and filter chips.
 */
export class HistoryPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.searchInput = By.css('input.search-input');
    this.refreshBtn = By.css('button.logout-btn-top');
    this.table = By.css('table.cyber-table');
    this.tableRows = By.css('table.cyber-table tbody tr');
    this.emptyState = By.xpath("//div[contains(@class, 'cyber-card')]//h3[contains(text(), 'No scans recorded yet')]");
  }

  async waitForHistoryLoaded() {
    await this.waitForVisible(this.searchInput, 15000);
  }

  async searchHistory(query) {
    await this.waitForHistoryLoaded();
    await this.type(this.searchInput, query);
  }

  async filterByType(type) {
    const chipLocator = By.xpath(`//div[contains(@class, 'filter-group')]//button[contains(@class, 'filter-chip') and normalize-space(text())='${type}']`);
    await this.click(chipLocator);
  }

  async refreshLogs() {
    await this.click(this.refreshBtn);
  }

  async getRowCount() {
    try {
      const rows = await this.findAll(this.tableRows, 5000);
      return rows.length;
    } catch {
      return 0;
    }
  }

  async hasRecordContaining(text) {
    try {
      const matchLocator = By.xpath(`//table[contains(@class, 'cyber-table')]//tbody//tr[contains(., '${text}')]`);
      return await this.isDisplayed(matchLocator, 6000);
    } catch {
      return false;
    }
  }
}

export default HistoryPage;
