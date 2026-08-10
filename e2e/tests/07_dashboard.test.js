import { expect } from 'chai';
import { createDriver } from '../utils/driver.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import LoginPage from '../pages/LoginPage.js';
import NavigationBar from '../pages/NavigationBar.js';
import DashboardPage from '../pages/DashboardPage.js';

describe('Suite 07: Dashboard & Live Telemetry Module', function () {
  this.timeout(60000);
  let driver;
  let loginPage;
  let navBar;
  let dashboardPage;

  before(async function () {
    config.requireAuthCredentials();
    driver = await createDriver();
    loginPage = new LoginPage(driver);
    navBar = new NavigationBar(driver);
    dashboardPage = new DashboardPage(driver);

    // Login and navigate to Dashboard
    await loginPage.open();
    await loginPage.login(config.testEmail, config.testPassword);
    await navBar.waitForVisible(navBar.brandLogo, 15000);
    await navBar.goToDashboard();
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
    // Generate final Excel Report
    try {
      await excelReporter.generateReport({
        baseUrl: config.baseUrl,
        browser: config.browser,
      });
    } catch (err) {
      logger.error(`Failed to generate Excel report in after hook: ${err.message}`);
    }
  });

  beforeEach(function () {
    excelReporter.logStep(this.currentTest.title, 'Executing Dashboard Telemetry Test');
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const screenshot = await dashboardPage.takeScreenshot(test.title);
      const currentUrl = await driver.getCurrentUrl().catch(() => 'unknown');
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'DASH',
        module: 'Dashboard',
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
        id: test.title.split(':')[0] || 'DASH',
        module: 'Dashboard',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('DASH-001: Dashboard loads live telemetry stat cards and threat vectors', async function () {
    await dashboardPage.waitForDashboardLoaded();

    // Verify stat cards
    const cardCount = await dashboardPage.getStatCardCount();
    expect(cardCount).to.be.at.least(1);

    // Verify threat vector card
    const isVectorVisible = await dashboardPage.isThreatVectorCardVisible();
    expect(isVectorVisible).to.be.true;

    // Refresh telemetry action
    await dashboardPage.refreshTelemetry();
  });
});
