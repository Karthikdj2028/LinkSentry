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
    this.logoutTopBtn = By.css('[data-testid="profile-logout-btn"], button.logout-btn-top');
    this.emailDisplay = By.css('[data-testid="profile-user-email"], .profile-meta-row .meta-val.text-cyan');
    this.uidDisplay = By.css('[data-testid="profile-user-uid"]');
    this.heroHeading = By.css('.page-main-heading');
    this.profilePage = By.css('.profile-page');
  }

  async waitForProfileLoaded() {
    await this.waitForVisible(this.heroHeading, 15000);
  }

  async logout() {
    await this.waitForProfileLoaded();
    await this.click(this.logoutTopBtn);
  }

  async getDisplayedEmail() {
    await this.waitForProfileLoaded();
    return await this.getText(this.emailDisplay);
  }

  async getDisplayedUid() {
    await this.waitForProfileLoaded();
    return await this.getText(this.uidDisplay);
  }

  async isProfilePageDisplayed() {
    return await this.isDisplayed(this.profilePage, 5000);
  }
}

export default ProfilePage;
