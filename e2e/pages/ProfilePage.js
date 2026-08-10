import { By } from 'selenium-webdriver';
import BasePage from './BasePage.js';

/**
 * ProfilePage Page Object Model
 * Encapsulates analyst identity profile and sign-out controls.
 */
export class ProfilePage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.logoutCardBtn = By.css('button.logout-action-card-btn');
    this.logoutTopBtn = By.css('button.logout-btn-top');
    this.emailDisplay = By.css('.profile-meta-row .meta-val.text-cyan');
    this.heroHeading = By.css('.page-main-heading');
  }

  async waitForProfileLoaded() {
    await this.waitForVisible(this.heroHeading, 15000);
  }

  async logout() {
    await this.waitForProfileLoaded();
    if (await this.isDisplayed(this.logoutCardBtn, 2000)) {
      await this.click(this.logoutCardBtn);
    } else {
      await this.click(this.logoutTopBtn);
    }
  }

  async getDisplayedEmail() {
    await this.waitForProfileLoaded();
    return await this.getText(this.emailDisplay);
  }
}

export default ProfilePage;
