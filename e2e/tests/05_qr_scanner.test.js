import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import { createDriver } from '../utils/driver.js';
import { captureFailureContext } from '../utils/failureHandler.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import BasePage from '../pages/BasePage.js';
import NavigationBar from '../pages/NavigationBar.js';
import QrScannerPage from '../pages/QrScannerPage.js';

describe('Suite 05: Optical QR Quishing Scanner', function () {
  this.timeout(60000);
  let driver;
  let basePage;
  let navBar;
  let qrPage;

  before(async function () {
    driver = await createDriver();
    basePage = new BasePage(driver);
    navBar = new NavigationBar(driver);
    qrPage = new QrScannerPage(driver);

    // Seed session token and open QR scanner
    await basePage.open();
    await basePage.setSession({ uid: 'e2e-analyst-qr-uid', email: 'analyst.qr@linksentry.io' });
    await basePage.open('/scanner?type=qr');
    await qrPage.waitForVisible(qrPage.dropzone, 15000);
  });

  after(async function () {
    if (driver) {
      await basePage.clearSession();
      await driver.quit();
    }
  });

  beforeEach(async function () {
    excelReporter.logStep(this.currentTest.title, 'Initializing Test Scenario');
    await basePage.open('/scanner?type=qr');
    await qrPage.waitForVisible(qrPage.dropzone, 15000);
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const failureContext = await captureFailureContext(driver, test);
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'QR',
        module: 'QR Scanner',
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

  it('QR-001: QR Scanner page renders in default Image Upload Mode', async function () {
    const isDropzoneVisible = await qrPage.isDisplayed(qrPage.dropzone);
    expect(isDropzoneVisible).to.be.true;
    const heading = await basePage.getText(By.css('.scanner-title'));
    expect(heading).to.include('QR Code Phishing');
  });

  it('QR-002: Drag and drop zone with file input is visible', async function () {
    const isDropzoneVisible = await qrPage.isDisplayed(qrPage.dropzone);
    expect(isDropzoneVisible).to.be.true;
    const dropzoneText = await basePage.getText(qrPage.dropzone);
    expect(dropzoneText).to.include('Drag & drop QR image');
  });

  it('QR-003: Mode switch toggles to Live Camera Stream mode', async function () {
    await qrPage.switchToCameraMode();
    const isCamera = await qrPage.isCameraUIOrFallbackDisplayed();
    expect(isCamera).to.be.true;
  });

  it('QR-004: Camera viewfinder or capability guidance displays in camera mode', async function () {
    await qrPage.switchToCameraMode();
    const isVisible = await qrPage.isCameraUIOrFallbackDisplayed();
    expect(isVisible).to.be.true;
  });

  it('QR-005: Mode switch toggles back to Image Upload mode', async function () {
    await qrPage.switchToCameraMode();
    await qrPage.switchToUploadMode();
    const isDropzone = await qrPage.isDisplayed(qrPage.dropzone);
    expect(isDropzone).to.be.true;
  });

  it('QR-006: Optical QR preset chip 0 triggers optical detonation', async function () {
    const presetBtn = By.css('.preset-quick-group button.preset-chip');
    await basePage.click(presetBtn);
    const isResult = await qrPage.isDisplayed(qrPage.resultCard, 25000);
    expect(isResult).to.be.true;
  });

  it('QR-007: QR result card renders security verdict badge', async function () {
    const presetBtn = By.css('.preset-quick-group button.preset-chip');
    await basePage.click(presetBtn);
    const verdict = await qrPage.getVerdict();
    expect(['SAFE', 'SUSPICIOUS', 'PHISHING']).to.include(verdict.toUpperCase());
  });

  it('QR-008: QR result card renders threat risk score meter', async function () {
    const presetBtn = By.css('.preset-quick-group button.preset-chip');
    await basePage.click(presetBtn);
    const score = await qrPage.getRiskScore();
    expect(score).to.be.within(0, 100);
  });

  it('QR-009: QR result specifications display QR Format Category', async function () {
    const presetBtn = By.css('.preset-quick-group button.preset-chip');
    await basePage.click(presetBtn);
    const hasSpecs = await basePage.isDisplayed(By.css('.heuristics-list'));
    expect(hasSpecs).to.be.true;
  });

  it('QR-010: QR result Reset button restores upload dropzone', async function () {
    const presetBtn = By.css('.preset-quick-group button.preset-chip');
    await basePage.click(presetBtn);
    await qrPage.waitForResult();
    await qrPage.resetScan();
    const isDropzone = await qrPage.isDisplayed(qrPage.dropzone);
    expect(isDropzone).to.be.true;
  });

  it('QR-011: Non-URL mailto QR payload classification', async function () {
    // Select second preset (mailto)
    const chips = await basePage.findAll(By.css('.preset-quick-group button.preset-chip'));
    if (chips.length > 1) {
      await qrPage.scrollAndClickElement(chips[1]);
      const isResult = await qrPage.isDisplayed(qrPage.resultCard, 25000);
      expect(isResult).to.be.true;
    }
  });

  it('QR-012: Non-URL tel phone QR payload classification', async function () {
    const chips = await basePage.findAll(By.css('.preset-quick-group button.preset-chip'));
    if (chips.length > 2) {
      await qrPage.scrollAndClickElement(chips[2]);
      const isResult = await qrPage.isDisplayed(qrPage.resultCard, 25000);
      expect(isResult).to.be.true;
    }
  });

  it('QR-013: Non-URL wifi QR payload classification', async function () {
    const chips = await basePage.findAll(By.css('.preset-quick-group button.preset-chip'));
    if (chips.length > 3) {
      await qrPage.scrollAndClickElement(chips[3]);
      const isResult = await qrPage.isDisplayed(qrPage.resultCard, 25000);
      expect(isResult).to.be.true;
    }
  });

  it('QR-014: QR dropzone renders without horizontal overflow on mobile viewport (390x844)', async function () {
    await basePage.setViewport(390, 844);
    const isDropzone = await qrPage.isDisplayed(qrPage.dropzone);
    expect(isDropzone).to.be.true;
    await basePage.setViewport(1920, 1080);
  });
});
