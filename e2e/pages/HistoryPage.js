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
    this.searchInput = By.css('[data-testid="history-search-input"], input.search-input');
    this.searchClearBtn = By.css('[data-testid="history-search-clear"]');
    this.refreshBtn = By.css('[data-testid="history-refresh-btn"]');
    this.table = By.css('table.cyber-table');
    this.tableRows = By.css('table.cyber-table tbody tr');
    this.emptyState = By.css('[data-testid="history-empty-state"]');
  }

  async waitForHistoryLoaded() {
    await this.waitForVisible(this.searchInput, 15000);
  }

  async searchHistory(query) {
    await this.waitForHistoryLoaded();
    const input = await this.waitForClickable(this.searchInput, 15000);
    await input.click();
    await input.clear();
    if (query) {
      await input.sendKeys(query);
    }
  }

  async filterByType(type) {
    const chipLocator = By.css(`[data-testid="filter-type-${type.toLowerCase()}"]`);
    await this.click(chipLocator);
  }

  async filterByVerdict(verdict) {
    const chipLocator = By.css(`[data-testid="filter-verdict-${verdict.toLowerCase()}"]`);
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

  async isEmptyStateDisplayed() {
    return await this.isDisplayed(this.emptyState, 5000);
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
