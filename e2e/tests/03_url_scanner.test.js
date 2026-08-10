import { expect } from 'chai';
import { createDriver } from '../utils/driver.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import testData from '../utils/testData.js';
import excelReporter from '../utils/excelReporter.js';
import LoginPage from '../pages/LoginPage.js';
import NavigationBar from '../pages/NavigationBar.js';
import UrlScannerPage from '../pages/UrlScannerPage.js';

describe('Suite 03: URL Threat Scanner Module', function () {
  this.timeout(60000);
  let driver;
  let loginPage;
  let navBar;
  let urlScannerPage;

  before(async function () {
    config.requireAuthCredentials();
    driver = await createDriver();
    loginPage = new LoginPage(driver);
    navBar = new NavigationBar(driver);
    urlScannerPage = new UrlScannerPage(driver);

    // Login and navigate to URL Scanner
    await loginPage.open();
    await loginPage.login(config.testEmail, config.testPassword);
    await navBar.waitForVisible(navBar.brandLogo, 15000);
    await navBar.goToScanner();
    await navBar.selectUrlScannerSubTab();
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  beforeEach(function () {
    excelReporter.logStep(this.currentTest.title, 'Executing URL Scanner Test');
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const screenshot = await urlScannerPage.takeScreenshot(test.title);
      const currentUrl = await driver.getCurrentUrl().catch(() => 'unknown');
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'URL',
        module: 'URL Scanner',
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
        id: test.title.split(':')[0] || 'URL',
        module: 'URL Scanner',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('URL-003: Empty input displays validation error', async function () {
    await urlScannerPage.scanUrl('');
    const isError = await urlScannerPage.isValidationErrorDisplayed();
    expect(isError).to.be.true;

    const errorMsg = await urlScannerPage.getValidationError();
    expect(errorMsg).to.include('Please enter a URL');
  });

  it('URL-004: Clear button resets input field', async function () {
    await urlScannerPage.type(urlScannerPage.urlInput, 'https://temporary-sample.org');
    await urlScannerPage.clearInput();
    const val = await urlScannerPage.getInputValue();
    expect(val).to.equal('');
  });

  it('URL-001: Safe URL scan returns SAFE verdict with low risk', async function () {
    await urlScannerPage.scanUrl(testData.urls.safe);
    await urlScannerPage.waitForResult();

    const verdict = await urlScannerPage.getVerdict();
    expect(verdict.toUpperCase()).to.equal('SAFE');

    const riskScore = await urlScannerPage.getRiskScore();
    expect(riskScore).to.be.a('number');
    expect(riskScore).to.be.at.least(0);
    expect(riskScore).to.be.below(40);
  });

  it('URL-002: Phishing URL scan returns PHISHING verdict with high risk', async function () {
    await urlScannerPage.scanUrl(testData.urls.phishing);
    await urlScannerPage.waitForResult();

    const verdict = await urlScannerPage.getVerdict();
    expect(verdict.toUpperCase()).to.equal('PHISHING');

    const riskScore = await urlScannerPage.getRiskScore();
    expect(riskScore).to.be.a('number');
    expect(riskScore).to.be.at.least(70);
    expect(riskScore).to.be.at.most(100);
  });
});
