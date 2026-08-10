import { expect } from 'chai';
import { createDriver } from '../utils/driver.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import LoginPage from '../pages/LoginPage.js';
import NavigationBar from '../pages/NavigationBar.js';
import UrlScannerPage from '../pages/UrlScannerPage.js';
import QrScannerPage from '../pages/QrScannerPage.js';
import MessageScannerPage from '../pages/MessageScannerPage.js';
import HistoryPage from '../pages/HistoryPage.js';
import DashboardPage from '../pages/DashboardPage.js';
import ProfilePage from '../pages/ProfilePage.js';

describe('Suite 02: Navigation & View Routing Module', function () {
  this.timeout(60000);
  let driver;
  let loginPage;
  let navBar;
  let urlScannerPage;
  let qrScannerPage;
  let messageScannerPage;
  let historyPage;
  let dashboardPage;
  let profilePage;

  before(async function () {
    config.requireAuthCredentials();
    driver = await createDriver();
    loginPage = new LoginPage(driver);
    navBar = new NavigationBar(driver);
    urlScannerPage = new UrlScannerPage(driver);
    qrScannerPage = new QrScannerPage(driver);
    messageScannerPage = new MessageScannerPage(driver);
    historyPage = new HistoryPage(driver);
    dashboardPage = new DashboardPage(driver);
    profilePage = new ProfilePage(driver);

    // Authenticate session once for navigation suite
    await loginPage.open();
    await loginPage.login(config.testEmail, config.testPassword);
    await navBar.waitForVisible(navBar.brandLogo, 15000);
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  beforeEach(function () {
    excelReporter.logStep(this.currentTest.title, 'Executing Navigation Scenario');
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const screenshot = await navBar.takeScreenshot(test.title);
      const currentUrl = await driver.getCurrentUrl().catch(() => 'unknown');
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'NAV',
        module: 'Navigation',
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
        id: test.title.split(':')[0] || 'NAV',
        module: 'Navigation',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('NAV-001: Primary tab switching activates corresponding views', async function () {
    // 1. Go to Scanner
    await navBar.goToScanner();
    const isUrlInputVisible = await urlScannerPage.isDisplayed(urlScannerPage.urlInput, 5000);
    expect(isUrlInputVisible).to.be.true;

    // 2. Go to History
    await navBar.goToHistory();
    const isHistoryVisible = await historyPage.isDisplayed(historyPage.searchInput, 5000);
    expect(isHistoryVisible).to.be.true;

    // 3. Go to Dashboard
    await navBar.goToDashboard();
    const isDashboardVisible = await dashboardPage.isDisplayed(dashboardPage.heroHeading, 5000);
    expect(isDashboardVisible).to.be.true;

    // 4. Go to Profile
    await navBar.goToProfile();
    const isProfileVisible = await profilePage.isDisplayed(profilePage.heroHeading, 5000);
    expect(isProfileVisible).to.be.true;

    // 5. Return Home
    await navBar.goToHome();
  });

  it('NAV-002: Scanner subtab navigation switches between URL, QR, and Message scanners', async function () {
    await navBar.goToScanner();

    // 1. Select QR Scanner subtab
    await navBar.selectQrScannerSubTab();
    const isDropzoneVisible = await qrScannerPage.isDisplayed(qrScannerPage.dropzone, 5000);
    expect(isDropzoneVisible).to.be.true;

    // 2. Select Message Scanner subtab
    await navBar.selectMessageScannerSubTab();
    const isMessageInputVisible = await messageScannerPage.isDisplayed(messageScannerPage.messageInput, 5000);
    expect(isMessageInputVisible).to.be.true;

    // 3. Return to URL Scanner subtab
    await navBar.selectUrlScannerSubTab();
    const isUrlInputVisible = await urlScannerPage.isDisplayed(urlScannerPage.urlInput, 5000);
    expect(isUrlInputVisible).to.be.true;
  });

  it('NAV-003: Home logo click returns to Home view', async function () {
    await navBar.goToDashboard();
    await navBar.click(navBar.brandLogo);
    // Home view banner
    const isHome = await navBar.isDisplayed(navBar.brandLogo, 5000);
    expect(isHome).to.be.true;
  });
});
