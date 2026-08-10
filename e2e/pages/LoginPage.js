import { By, until } from 'selenium-webdriver';
import BasePage from './BasePage.js';

/**
 * LoginPage Page Object Model
 * Encapsulates authentication portal interactions and locators.
 */
export class LoginPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.emailInput = By.id('login-email');
    this.passwordInput = By.id('login-password');
    this.submitBtn = By.css('button.auth-submit-btn');
    this.switchModeBtn = By.css('button.auth-switch-btn');
    this.errorAlert = By.css('.auth-error-alert .error-text');
    this.errorBanner = By.css('.auth-error-alert');
    this.loadingSplash = By.css('.auth-loading-splash');
    this.authCardTitle = By.css('.auth-card-title');
    this.authForm = By.css('.auth-form');
  }

  async waitForAuthLoaded() {
    // Wait for the Firebase splash loader to dismiss and login form to mount
    await this.driver.wait(until.elementLocated(this.emailInput), 20000);
    await this.waitForVisible(this.emailInput, 15000);
    await this.waitForClickable(this.submitBtn, 15000);
  }

  async login(email, password) {
    await this.waitForAuthLoaded();
    if (email) {
      await this.type(this.emailInput, email);
    } else if (email === '') {
      await this.clear(this.emailInput);
    }
    if (password) {
      await this.type(this.passwordInput, password);
    } else if (password === '') {
      await this.clear(this.passwordInput);
    }
    await this.click(this.submitBtn);
  }

  async getErrorMessage() {
    return await this.getText(this.errorAlert, 10000);
  }

  async isErrorDisplayed(timeout = 10000) {
    try {
      await this.waitForVisible(this.errorBanner, timeout);
      return true;
    } catch {
      return false;
    }
  }

  async switchToRegister() {
    await this.click(this.switchModeBtn);
  }

  async isLoginPageDisplayed() {
    return await this.isDisplayed(this.emailInput, 5000);
  }
}

export default LoginPage;
