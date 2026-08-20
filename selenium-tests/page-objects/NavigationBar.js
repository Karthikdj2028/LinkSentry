import { By } from 'selenium-webdriver';
import { BasePage } from './BasePage.js';
import { safeClick } from '../utilities/wait-helpers.js';

export class NavigationBar extends BasePage {
  constructor(driver) {
    super(driver);
    this.locators = {
      navHome: By.css('a[href="/"], nav a:nth-child(1), .nav-item-scanner, [data-tab="scanner"]'),
      navHistory: By.css('a[href="/history"], nav a:nth-child(2), .nav-item-history, [data-tab="history"]'),
      navProfile: By.css('a[href="/profile"], nav a:nth-child(3), .nav-item-profile, [data-tab="profile"]'),
      themeToggle: By.css('button[aria-label*="theme"], button.theme-toggle, .theme-switch'),
      brandLogo: By.css('.brand-logo, .app-header h1, .logo-title'),
    };
  }

  async goToScanner() {
    await safeClick(this.driver, this.locators.navHome);
  }

  async goToHistory() {
    await safeClick(this.driver, this.locators.navHistory);
  }

  async goToProfile() {
    await safeClick(this.driver, this.locators.navProfile);
  }

  async toggleTheme() {
    await safeClick(this.driver, this.locators.themeToggle);
  }
}
