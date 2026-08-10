import { By } from 'selenium-webdriver';
import BasePage from './BasePage.js';

/**
 * NavigationBar Page Object Model
 * Handles top-level tab switching and scanner subtab navigation.
 */
export class NavigationBar extends BasePage {
  constructor(driver) {
    super(driver);

    // Desktop Nav Items
    this.brandLogo = By.css('.brand-logo');
    this.statusPill = By.css('.system-status-pill');
    this.homeTab = By.xpath("//nav[contains(@class, 'desktop-nav')]//button[contains(@class, 'nav-link')][.//span[contains(text(), 'Home')]]");
    this.scannerTab = By.xpath("//nav[contains(@class, 'desktop-nav')]//button[contains(@class, 'nav-link')][.//span[contains(text(), 'Scanner')]]");
    this.historyTab = By.xpath("//nav[contains(@class, 'desktop-nav')]//button[contains(@class, 'nav-link')][.//span[contains(text(), 'History')]]");
    this.dashboardTab = By.xpath("//nav[contains(@class, 'desktop-nav')]//button[contains(@class, 'nav-link')][.//span[contains(text(), 'Dashboard')]]");
    this.profileTab = By.xpath("//nav[contains(@class, 'desktop-nav')]//button[contains(@class, 'nav-link')][.//span[contains(text(), 'Profile')]]");

    // Scanner Subtab Buttons
    this.urlSubTab = By.xpath("//div[contains(@class, 'scanner-subtabs-nav')]//button[.//span[contains(text(), 'URL Scanner')]]");
    this.qrSubTab = By.xpath("//div[contains(@class, 'scanner-subtabs-nav')]//button[.//span[contains(text(), 'QR Scanner')]]");
    this.messageSubTab = By.xpath("//div[contains(@class, 'scanner-subtabs-nav')]//button[.//span[contains(text(), 'Message Scanner')]]");
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
    await this.waitForVisible(By.css('.history-page'), 10000);
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
    await this.waitForVisible(By.id('url-input'), 10000);
  }

  async selectQrScannerSubTab() {
    await this.click(this.qrSubTab);
    await this.waitForVisible(By.css('.qr-dropzone, .camera-viewfinder, .qr-camera-placeholder'), 10000);
  }

  async selectMessageScannerSubTab() {
    await this.click(this.messageSubTab);
    await this.waitForVisible(By.id('message-input'), 10000);
  }

  async isNavbarVisible() {
    return await this.isDisplayed(this.brandLogo, 10000);
  }
}

export default NavigationBar;
