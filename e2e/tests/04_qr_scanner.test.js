import { expect } from 'chai';
import { createDriver } from '../utils/driver.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import testData from '../utils/testData.js';
import excelReporter from '../utils/excelReporter.js';
import LoginPage from '../pages/LoginPage.js';
import NavigationBar from '../pages/NavigationBar.js';
import QrScannerPage from '../pages/QrScannerPage.js';

describe('Suite 04: QR Code Threat Scanner Module', function () {
  this.timeout(60000);
  let driver;
  let loginPage;
  let navBar;
  let qrScannerPage;

  before(async function () {
    config.requireAuthCredentials();
    driver = await createDriver();
    loginPage = new LoginPage(driver);
    navBar = new NavigationBar(driver);
    qrScannerPage = new QrScannerPage(driver);

    // Login and navigate to QR Scanner
    await loginPage.open();
    await loginPage.login(config.testEmail, config.testPassword);
    await navBar.waitForVisible(navBar.brandLogo, 15000);
    await navBar.goToScanner();
    await navBar.selectQrScannerSubTab();
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  beforeEach(function () {
    excelReporter.logStep(this.currentTest.title, 'Executing QR Scanner Test');
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const screenshot = await qrScannerPage.takeScreenshot(test.title);
      const currentUrl = await driver.getCurrentUrl().catch(() => 'unknown');
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'QR',
        module: 'QR Scanner',
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
        id: test.title.split(':')[0] || 'QR',
        module: 'QR Scanner',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('QR-001: Uploading Safe QR image returns SAFE verdict', async function () {
    await qrScannerPage.uploadQrImage(testData.fixtures.safeQr);
    await qrScannerPage.waitForResult();

    const verdict = await qrScannerPage.getVerdict();
    expect(verdict.toUpperCase()).to.equal('SAFE');

    const riskScore = await qrScannerPage.getRiskScore();
    expect(riskScore).to.be.a('number');
    expect(riskScore).to.be.at.least(0);
    expect(riskScore).to.be.below(40);
  });

  it('QR-002: Uploading Phishing QR image returns PHISHING verdict', async function () {
    await qrScannerPage.uploadQrImage(testData.fixtures.phishingQr);
    await qrScannerPage.waitForResult();

    const verdict = await qrScannerPage.getVerdict();
    expect(verdict.toUpperCase()).to.equal('PHISHING');

    const riskScore = await qrScannerPage.getRiskScore();
    expect(riskScore).to.be.a('number');
    expect(riskScore).to.be.at.least(70);
    expect(riskScore).to.be.at.most(100);
  });

  it('QR-003: Uploading non-URL QR payload triggers local classifier without error', async function () {
    await qrScannerPage.uploadQrImage(testData.fixtures.mailtoQr);
    await qrScannerPage.waitForResult();

    const isResult = await qrScannerPage.isResultDisplayed();
    expect(isResult).to.be.true;

    const verdict = await qrScannerPage.getVerdict();
    expect(['SAFE', 'SUSPICIOUS']).to.include(verdict.toUpperCase());
  });

  it('QR-004: Live camera mode toggles UI cleanly (Non-blocking device test)', async function () {
    await qrScannerPage.switchToCameraMode();
    const isCameraOrFallback = await qrScannerPage.isCameraUIOrFallbackDisplayed();
    expect(isCameraOrFallback).to.be.true;

    // Switch back to upload mode
    await qrScannerPage.switchToUploadMode();
  });
});
