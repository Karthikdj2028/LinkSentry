import { By } from 'selenium-webdriver';
import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.emailInput = By.css('input[type="email"], #login-email, input[placeholder*="email"i]');
    this.passwordInput = By.css('input[type="password"], #login-password, input[placeholder*="password"i]');
    this.submitBtn = By.css('button[type="submit"], button.btn-auth-submit');
    this.switchModeBtn = By.css('button.auth-switch-btn, button.switch-mode-btn');
    this.errorMessage = By.css('.auth-error-message, .error-banner, .auth-error');
    this.confirmPasswordInput = By.css('input#register-confirm-password, input[placeholder*="Confirm"i]');
  }

  async login(email, password) {
    if (email !== undefined) await this.type(this.emailInput, email);
    if (password !== undefined) await this.type(this.passwordInput, password);
    await this.click(this.submitBtn);
  }

  async getErrorMessage() {
    if (await this.isDisplayed(this.errorMessage, 3000)) {
      return await this.getText(this.errorMessage);
    }
    return '';
  }

  async toggleAuthMode() {
    if (await this.isDisplayed(this.switchModeBtn, 3000)) {
      await this.click(this.switchModeBtn);
    }
  }
}
