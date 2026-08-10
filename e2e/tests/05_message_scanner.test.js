import { expect } from 'chai';
import { createDriver } from '../utils/driver.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import testData from '../utils/testData.js';
import excelReporter from '../utils/excelReporter.js';
import LoginPage from '../pages/LoginPage.js';
import NavigationBar from '../pages/NavigationBar.js';
import MessageScannerPage from '../pages/MessageScannerPage.js';

describe('Suite 05: Message & Smishing Threat Scanner Module', function () {
  this.timeout(60000);
  let driver;
  let loginPage;
  let navBar;
  let messageScannerPage;

  before(async function () {
    config.requireAuthCredentials();
    driver = await createDriver();
    loginPage = new LoginPage(driver);
    navBar = new NavigationBar(driver);
    messageScannerPage = new MessageScannerPage(driver);

    // Login and navigate to Message Scanner
    await loginPage.open();
    await loginPage.login(config.testEmail, config.testPassword);
    await navBar.waitForVisible(navBar.brandLogo, 15000);
    await navBar.goToScanner();
    await navBar.selectMessageScannerSubTab();
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  beforeEach(function () {
    excelReporter.logStep(this.currentTest.title, 'Executing Message Scanner Test');
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const screenshot = await messageScannerPage.takeScreenshot(test.title);
      const currentUrl = await driver.getCurrentUrl().catch(() => 'unknown');
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'MESSAGE',
        module: 'Message Scanner',
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
        id: test.title.split(':')[0] || 'MESSAGE',
        module: 'Message Scanner',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('MESSAGE-001: Safe message returns SAFE verdict with low risk', async function () {
    await messageScannerPage.scanMessage(testData.messages.safe);
    await messageScannerPage.waitForResult();

    const verdict = await messageScannerPage.getVerdict();
    expect(verdict.toUpperCase()).to.equal('SAFE');

    const riskScore = await messageScannerPage.getRiskScore();
    expect(riskScore).to.be.a('number');
    expect(riskScore).to.be.at.least(0);
    expect(riskScore).to.be.below(40);
  });

  it('MESSAGE-002: Suspicious urgent message flags anomalies', async function () {
    await messageScannerPage.scanMessage(testData.messages.suspicious);
    await messageScannerPage.waitForResult();

    const verdict = await messageScannerPage.getVerdict();
    expect(['SUSPICIOUS', 'PHISHING']).to.include(verdict.toUpperCase());

    const riskScore = await messageScannerPage.getRiskScore();
    expect(riskScore).to.be.a('number');
    expect(riskScore).to.be.at.least(30);
  });

  it('MESSAGE-003: OTP phishing smishing message returns PHISHING verdict', async function () {
    await messageScannerPage.scanMessage(testData.messages.otpPhishing);
    await messageScannerPage.waitForResult();

    const verdict = await messageScannerPage.getVerdict();
    expect(verdict.toUpperCase()).to.equal('PHISHING');

    const riskScore = await messageScannerPage.getRiskScore();
    expect(riskScore).to.be.a('number');
    expect(riskScore).to.be.at.least(70);
  });

  it('MESSAGE-004: Stage 6C cloud storage renewal lure returns PHISHING verdict (score 100 regression)', async function () {
    await messageScannerPage.scanMessage(testData.messages.stage6cRenewalPhishing);
    await messageScannerPage.waitForResult();

    const verdict = await messageScannerPage.getVerdict();
    expect(verdict.toUpperCase()).to.equal('PHISHING');

    const riskScore = await messageScannerPage.getRiskScore();
    expect(riskScore).to.equal(100);
  });
});
