import { expect } from 'chai';
import { createDriver } from '../utils/driver.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import LoginPage from '../pages/LoginPage.js';
import NavigationBar from '../pages/NavigationBar.js';
import ProfilePage from '../pages/ProfilePage.js';

describe('Suite 01: Authentication Module', function () {
  this.timeout(60000);
  let driver;
  let loginPage;
  let navBar;
  let profilePage;

  before(async function () {
    driver = await createDriver();
    loginPage = new LoginPage(driver);
    navBar = new NavigationBar(driver);
    profilePage = new ProfilePage(driver);
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  beforeEach(function () {
    excelReporter.logStep(this.currentTest.title, 'Initializing Test Scenario');
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const screenshot = await loginPage.takeScreenshot(test.title);
      const currentUrl = await driver.getCurrentUrl().catch(() => 'unknown');
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'AUTH',
        module: 'Authentication',
        scenario: test.title,
        browser: config.browser,
        status: 'FAILED',
        duration,
        error: test.err?.message,
        screenshot,
        url: currentUrl,
      });
      logger.error(`Test FAILED: ${test.title} - ${test.err?.message}`);
    } else {
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'AUTH',
        module: 'Authentication',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('AUTH-003: Empty credential validation shows prompt', async function () {
    await loginPage.open();
    await loginPage.waitForAuthLoaded();

    // Click submit with empty email & password
    await loginPage.login('', '');
    const isError = await loginPage.isErrorDisplayed();
    expect(isError).to.be.true;

    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).to.include('Please enter your email address');
  });

  it('AUTH-002: Invalid credentials rejection displays alert', async function () {
    await loginPage.open();
    await loginPage.waitForAuthLoaded();

    await loginPage.login('nonexistent.analyst.qa@linksentry.test', 'InvalidSecret123!');
    const isError = await loginPage.isErrorDisplayed();
    expect(isError).to.be.true;

    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg.length).to.be.greaterThan(0);
  });

  it('AUTH-001: Valid authentication logs in analyst', async function () {
    config.requireAuthCredentials();

    await loginPage.open();
    await loginPage.waitForAuthLoaded();
    await loginPage.login(config.testEmail, config.testPassword);

    const isNavVisible = await navBar.isNavbarVisible();
    expect(isNavVisible).to.be.true;
  });

  it('AUTH-005: Session persistence remains active across reload', async function () {
    config.requireAuthCredentials();

    // Ensure logged in
    const isNavVisibleBefore = await navBar.isNavbarVisible();
    if (!isNavVisibleBefore) {
      await loginPage.open();
      await loginPage.login(config.testEmail, config.testPassword);
    }

    // Refresh page
    await driver.navigate().refresh();
    const isNavVisibleAfter = await navBar.isNavbarVisible();
    expect(isNavVisibleAfter).to.be.true;
  });

  it('AUTH-004: Analyst logout terminates session and returns to login', async function () {
    config.requireAuthCredentials();

    // Navigate to profile and logout
    await navBar.goToProfile();
    await profilePage.logout();

    // Verify login page returns
    const isLoginPage = await loginPage.isLoginPageDisplayed();
    expect(isLoginPage).to.be.true;
  });
});
