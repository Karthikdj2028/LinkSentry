import { By } from 'selenium-webdriver';
import BasePage from './BasePage.js';

/**
 * NavigationBar Page Object Model
 * Handles top-level tab switching, mobile menu drawer, and scanner subtab navigation.
 */
export class NavigationBar extends BasePage {
  constructor(driver) {
    super(driver);

    // Desktop Nav Items
    this.brandLogo = By.css('[data-testid="nav-brand-logo"], .brand-logo');
    this.statusPill = By.css('[data-testid="nav-system-status"], .system-status-pill');
    this.homeTab = By.css('[data-testid="nav-tab-home"]');
    this.scannerTab = By.css('[data-testid="nav-tab-scanner"]');
    this.historyTab = By.css('[data-testid="nav-tab-history"]');
    this.analyticsTab = By.css('[data-testid="nav-tab-analytics"]');
    this.dashboardTab = By.css('[data-testid="nav-tab-dashboard"]');
    this.profileTab = By.css('[data-testid="nav-tab-profile"]');

    // Mobile menu
    this.mobileToggle = By.css('[data-testid="mobile-menu-toggle"]');
    this.mobileDrawer = By.css('[data-testid="mobile-nav-drawer"]');

    // Scanner Subtab Buttons
    this.urlSubTab = By.css('[data-testid="subtab-url"]');
    this.qrSubTab = By.css('[data-testid="subtab-qr"]');
    this.messageSubTab = By.css('[data-testid="subtab-message"]');
  }

  async goToHome() {
    await this.click(this.homeTab);
    await this.waitForVisible(By.css('.home-page'), 10000);
  }

  async goToScanner() {
    await this.click(this.scannerTab);
    await this.waitForVisible(By.css('.scanner-page'), 10000);
  }

  async goToHistory() {
    await this.click(this.historyTab);
    await this.waitForVisible(By.css('.history-page, [data-testid="history-controls-card"], .history-controls-card'), 10000);
  }

  async goToAnalytics() {
    await this.click(this.analyticsTab);
    await this.waitForVisible(By.css('.analytics-page-container'), 10000);
  }

  async goToDashboard() {
    await this.click(this.dashboardTab);
    await this.waitForVisible(By.css('.dashboard-page'), 10000);
  }

  async goToProfile() {
    await this.click(this.profileTab);
    await this.waitForVisible(By.css('.profile-page'), 10000);
  }

  async selectUrlScannerSubTab() {
    await this.click(this.urlSubTab);
    await this.waitForVisible(By.css('[data-testid="url-input"], #url-input'), 10000);
  }

  async selectQrScannerSubTab() {
    await this.click(this.qrSubTab);
    await this.waitForVisible(By.css('[data-testid="qr-dropzone"], .qr-dropzone, .camera-viewfinder, .qr-camera-placeholder'), 10000);
  }

  async selectMessageScannerSubTab() {
    await this.click(this.messageSubTab);
    await this.waitForVisible(By.css('[data-testid="message-input"], #message-input'), 10000);
  }

  async isNavbarVisible() {
    return await this.isDisplayed(this.brandLogo, 10000);
  }

  async isTabActive(tabId) {
    const tabElement = await this.find(By.css(`[data-testid="nav-tab-${tabId}"]`));
    const classes = await tabElement.getAttribute('className');
    return classes.includes('active');
  }

  async openMobileMenu() {
    await this.click(this.mobileToggle);
    await this.waitForVisible(this.mobileDrawer, 5000);
  }
}

export default NavigationBar;
