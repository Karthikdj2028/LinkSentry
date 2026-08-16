import { By } from 'selenium-webdriver';
import BasePage from './BasePage.js';

/**
 * DashboardPage Page Object Model
 * Encapsulates live telemetry stat cards, threat vector distributions, and metrics.
 */
export class DashboardPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.heroHeading = By.css('.page-main-heading');
    this.dashboardPage = By.css('.dashboard-page');
    this.statCards = By.css('.dashboard-stats-grid .stat-card');
    this.vectorCard = By.css('.dashboard-vector-card');
    this.vectorItems = By.css('.vector-bars-list .vector-bar-item');
    this.launchScannerCta = By.css('[data-testid="dashboard-launch-scanner-btn"], .dashboard-launch-scanner-btn');
    this.emptyState = By.css('[data-testid="dashboard-empty-state"]');
  }

  async waitForDashboardLoaded() {
    await this.waitForVisible(this.heroHeading, 15000);
  }

  async getStatCardCount() {
    try {
      const cards = await this.findAll(this.statCards, 5000);
      return cards.length;
    } catch {
      return 0;
    }
  }

  async isThreatVectorCardVisible() {
    return await this.isDisplayed(this.vectorCard, 5000);
  }

  async isDashboardLoaded() {
    return await this.isDisplayed(this.dashboardPage, 5000);
  }

  async isEmptyStateDisplayed() {
    return await this.isDisplayed(this.emptyState, 5000);
  }
}

export default DashboardPage;
