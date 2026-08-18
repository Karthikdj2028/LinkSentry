import { By } from 'selenium-webdriver';
import BasePage from './BasePage.js';

/**
 * AnalyticsPage Page Object Model
 * Encapsulates telemetry analytics, CSV export, print report, and metrics cards.
 */
export class AnalyticsPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.pageContainer = By.css('.analytics-page-container, .analytics-page');
    this.pageTitle = By.css('.page-title, .page-main-heading');
    this.exportCsvBtn = By.css('[data-testid="analytics-export-csv"]');
    this.printReportBtn = By.css('[data-testid="analytics-print-report"]');
    this.statCards = By.css('.stat-cards-grid .stat-card, .dashboard-metrics-grid .stat-card, .stat-card');
  }

  async waitForAnalyticsLoaded() {
    await this.waitForVisible(this.pageTitle, 15000);
  }

  async isExportCsvDisplayed() {
    return await this.isDisplayed(this.exportCsvBtn, 5000);
  }

  async isPrintReportDisplayed() {
    return await this.isDisplayed(this.printReportBtn, 5000);
  }

  async getStatCardCount() {
    try {
      const cards = await this.findAll(this.statCards, 5000);
      return cards.length;
    } catch {
      return 0;
    }
  }
}

export default AnalyticsPage;
