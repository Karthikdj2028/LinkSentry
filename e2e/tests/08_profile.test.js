import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import { createDriver } from '../utils/driver.js';
import { captureFailureContext } from '../utils/failureHandler.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import BasePage from '../pages/BasePage.js';
import ProfilePage from '../pages/ProfilePage.js';

describe('Suite 08: Profile & Security Preferences', function () {
  this.timeout(60000);
  let driver;
  let basePage;
  let profilePage;

  before(async function () {
    driver = await createDriver();
    basePage = new BasePage(driver);
    profilePage = new ProfilePage(driver);

    // Seed session token and open profile
    await basePage.open();
    await basePage.setSession({ uid: 'e2e-analyst-prof-uid', email: 'analyst.prof@linksentry.io' });
    await basePage.open('/profile');
    await profilePage.waitForProfileLoaded();
  });

  after(async function () {
    if (driver) {
      await basePage.clearSession();
      await driver.quit();
    }
  });

  beforeEach(async function () {
    excelReporter.logStep(this.currentTest.title, 'Initializing Test Scenario');
    await basePage.open('/profile');
    await profilePage.waitForProfileLoaded();
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const failureContext = await captureFailureContext(driver, test);
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'PROF',
        module: 'Profile',
        scenario: test.title,
        browser: config.browser,
        status: 'FAILED',
        duration,
        error: test.err?.message,
        screenshot: failureContext?.screenshot,
        url: failureContext?.url || 'unknown',
      });
      logger.error(`Test FAILED: ${test.title} - ${test.err?.message}`);
    } else {
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'PROF',
        module: 'Profile',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('PROF-001: Profile page loads and hero header displays', async function () {
    const isDisplayed = await profilePage.isProfilePageDisplayed();
    expect(isDisplayed).to.be.true;
    const heading = await basePage.getText(profilePage.heroHeading);
    expect(heading).to.include('Profile & Account Security');
  });

  it('PROF-002: Firebase Authenticated Workspace status banner displays', async function () {
    const banner = await basePage.getText(By.css('.auth-status-banner, .profile-hero-card'));
    expect(banner).to.include('Active');
  });

  it('PROF-003: User authenticated email displays correctly', async function () {
    const email = await profilePage.getDisplayedEmail();
    expect(email).to.equal('analyst.prof@linksentry.io');
  });

  it('PROF-004: Firebase UID displays correctly', async function () {
    const uid = await profilePage.getDisplayedUid();
    expect(uid.length).to.be.greaterThan(0);
  });

  it('PROF-005: Security Preferences section renders 3 toggle switches', async function () {
    const toggles = await basePage.findAll(By.css('.toggle-switch'));
    expect(toggles.length).to.be.at.least(3);
  });

  it('PROF-006: Toggle Real-Time Threat Notifications preference', async function () {
    // Use BasePage.click to ensure element is scrolled into view before clicking
    await basePage.click(By.css('.preference-toggle-row:nth-of-type(1) .toggle-switch'));
    const hasStatus = await basePage.isDisplayed(By.css('.save-status-banner'), 3000);
    expect(hasStatus).to.be.true;
  });

  it('PROF-007: Toggle Automated Quarantine preference', async function () {
    await basePage.click(By.css('.preference-toggle-row:nth-of-type(2) .toggle-switch'));
    const hasStatus = await basePage.isDisplayed(By.css('.save-status-banner'), 3000);
    expect(hasStatus).to.be.true;
  });

  it('PROF-008: Toggle Anonymous Threat Telemetry Sharing preference', async function () {
    await basePage.click(By.css('.preference-toggle-row:nth-of-type(3) .toggle-switch'));
    const hasStatus = await basePage.isDisplayed(By.css('.save-status-banner'), 3000);
    expect(hasStatus).to.be.true;
  });

  it('PROF-009: Preference save status message displays feedback', async function () {
    await basePage.click(By.css('.preference-toggle-row:nth-of-type(1) .toggle-switch'));
    const statusText = await basePage.getText(By.css('.save-status-banner'));
    expect(statusText).to.include('Preferences saved');
  });

  it('PROF-010: Profile layout renders cleanly on mobile viewport (360x800)', async function () {
    await basePage.setViewport(360, 800);
    const isDisplayed = await profilePage.isProfilePageDisplayed();
    expect(isDisplayed).to.be.true;
    await basePage.setViewport(1920, 1080);
  });
});
