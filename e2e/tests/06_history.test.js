import { expect } from 'chai';
import { createDriver } from '../utils/driver.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import LoginPage from '../pages/LoginPage.js';
import NavigationBar from '../pages/NavigationBar.js';
import UrlScannerPage from '../pages/UrlScannerPage.js';
import HistoryPage from '../pages/HistoryPage.js';

describe('Suite 06: History & Firestore Audit Module', function () {
  this.timeout(60000);
  let driver;
  let loginPage;
  let navBar;
  let urlScannerPage;
  let historyPage;
  const uniqueDomain = `audit-test-${Date.now()}.example.org`;

  before(async function () {
    config.requireAuthCredentials();
    driver = await createDriver();
    loginPage = new LoginPage(driver);
    navBar = new NavigationBar(driver);
    urlScannerPage = new UrlScannerPage(driver);
    historyPage = new HistoryPage(driver);

    // Login
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
    excelReporter.logStep(this.currentTest.title, 'Executing History Module Test');
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const screenshot = await historyPage.takeScreenshot(test.title);
      const currentUrl = await driver.getCurrentUrl().catch(() => 'unknown');
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'HISTORY',
        module: 'History',
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
        id: test.title.split(':')[0] || 'HISTORY',
        module: 'History',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('HISTORY-001: Executed scan persists to Firestore audit trail and appears in History', async function () {
    // 1. Perform a scan
    await navBar.goToScanner();
    await navBar.selectUrlScannerSubTab();
    await urlScannerPage.scanUrl(`https://${uniqueDomain}`);
    await urlScannerPage.waitForResult();

    // 2. Navigate to History
    await navBar.goToHistory();
    await historyPage.waitForHistoryLoaded();

    // 3. Search for unique domain
    await historyPage.searchHistory(uniqueDomain);
    const hasRecord = await historyPage.hasRecordContaining(uniqueDomain);
    expect(hasRecord).to.be.true;
  });

  it('HISTORY-002: Filter chips and reload function seamlessly', async function () {
    await historyPage.waitForHistoryLoaded();
    await historyPage.filterByType('ALL');
    await historyPage.refreshLogs();

    const rowCount = await historyPage.getRowCount();
    expect(rowCount).to.be.at.least(1);
  });
});
