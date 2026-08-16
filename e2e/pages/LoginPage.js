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
    this.emailInput = By.css('[data-testid="login-email-input"], #login-email');
    this.passwordInput = By.css('[data-testid="login-password-input"], #login-password');
    this.submitBtn = By.css('[data-testid="login-submit-button"], button.auth-submit-btn');
    this.switchModeBtn = By.css('[data-testid="switch-to-register-btn"], button.auth-switch-btn');
    this.loginTab = By.css('[data-testid="auth-tab-login"]');
    this.registerTab = By.css('[data-testid="auth-tab-register"]');
    this.errorAlert = By.css('[data-testid="auth-error"] .error-text, .auth-error-alert .error-text');
    this.errorBanner = By.css('[data-testid="auth-error"], .auth-error-alert');
    this.loadingSplash = By.css('.auth-loading-splash');
    this.authCardTitle = By.css('.auth-card-title');
    this.authForm = By.css('[data-testid="login-form"], .auth-form');
  }

  async waitForAuthLoaded() {
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

  async clickLoginTab() {
    await this.click(this.loginTab);
  }

  async clickRegisterTab() {
    await this.click(this.registerTab);
  }

  async isLoginPageDisplayed() {
    return await this.isDisplayed(this.emailInput, 5000);
  }
}

export default LoginPage;
