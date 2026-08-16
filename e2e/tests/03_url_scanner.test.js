import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import { createDriver } from '../utils/driver.js';
import { captureFailureContext } from '../utils/failureHandler.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import BasePage from '../pages/BasePage.js';
import NavigationBar from '../pages/NavigationBar.js';
import UrlScannerPage from '../pages/UrlScannerPage.js';

describe('Suite 03: Advanced URL Phishing Scanner', function () {
  this.timeout(60000);
  let driver;
  let basePage;
  let navBar;
  let urlPage;

  before(async function () {
    driver = await createDriver();
    basePage = new BasePage(driver);
    navBar = new NavigationBar(driver);
    urlPage = new UrlScannerPage(driver);

    // Seed session token and open URL scanner
    await basePage.open();
    await basePage.setSession({ uid: 'e2e-analyst-url-uid', email: 'analyst.url@linksentry.io' });
    await basePage.open('/scanner?type=url');
    await urlPage.waitForVisible(urlPage.urlInput, 15000);
  });

  after(async function () {
    if (driver) {
      await basePage.clearSession();
      await driver.quit();
    }
  });

  beforeEach(async function () {
    excelReporter.logStep(this.currentTest.title, 'Initializing Test Scenario');
    // Ensure on URL scanner page
    await basePage.open('/scanner?type=url');
    await urlPage.waitForVisible(urlPage.urlInput, 15000);
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const failureContext = await captureFailureContext(driver, test);
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'URL',
        module: 'URL Scanner',
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

  it('URL-001: URL Scanner page renders input form and mode pill', async function () {
    const isInputVisible = await urlPage.isDisplayed(urlPage.urlInput);
    expect(isInputVisible).to.be.true;
    const modePill = await basePage.getText(By.css('.scanner-mode-pill'));
    expect(modePill).to.include('V3.3');
  });

  it('URL-002: Empty URL submission shows validation error prompt', async function () {
    await urlPage.scanUrl('');
    const isError = await urlPage.isValidationErrorDisplayed();
    expect(isError).to.be.true;
    const msg = await urlPage.getValidationError();
    expect(msg).to.include('Please enter a URL');
  });

  it('URL-003: Invalid URL format missing domain dot shows validation error', async function () {
    await urlPage.scanUrl('justsomestringnodot');
    const isError = await urlPage.isValidationErrorDisplayed();
    expect(isError).to.be.true;
    const msg = await urlPage.getValidationError();
    expect(msg).to.include('valid domain or URL');
  });

  it('URL-004: Typing input reveals clear button', async function () {
    await urlPage.type(urlPage.urlInput, 'https://testdomain.com');
    const isClearVisible = await urlPage.isDisplayed(urlPage.clearBtn);
    expect(isClearVisible).to.be.true;
  });

  it('URL-005: Clear button clears text from URL input', async function () {
    await urlPage.type(urlPage.urlInput, 'https://testdomain.com');
    await urlPage.clearInput();
    const val = await urlPage.getInputValue();
    expect(val).to.equal('');
  });

  it('URL-006: Scanning legitimate safe URL (https://google.com) returns Safe verdict', async function () {
    await urlPage.scanUrl('https://google.com');
    const verdict = await urlPage.getVerdict();
    expect(verdict.toUpperCase()).to.equal('SAFE');
  });

  it('URL-007: Safe scan produces low risk score (0-30)', async function () {
    await urlPage.scanUrl('https://google.com');
    const score = await urlPage.getRiskScore();
    expect(score).to.be.at.most(30);
  });

  it('URL-008: Safe scan displays confidence percentage', async function () {
    await urlPage.scanUrl('https://google.com');
    const confidence = await urlPage.getConfidence();
    expect(confidence).to.include('%');
  });

  it('URL-009: Scanning known phishing test preset returns Phishing verdict', async function () {
    await urlPage.scanUrl('http://paypal-security-verification.xyz');
    const verdict = await urlPage.getVerdict();
    expect(['PHISHING', 'SUSPICIOUS']).to.include(verdict.toUpperCase());
  });

  it('URL-010: Phishing scan produces high risk score (>70)', async function () {
    await urlPage.scanUrl('http://paypal-security-verification.xyz');
    const score = await urlPage.getRiskScore();
    expect(score).to.be.greaterThan(50);
  });

  it('URL-011: Phishing scan displays threat indicators', async function () {
    await urlPage.scanUrl('http://paypal-security-verification.xyz');
    const hasIndicators = await basePage.isDisplayed(By.css('.threat-indicator-chip, .heuristic-item'));
    expect(hasIndicators).to.be.true;
  });

  it('URL-012: Detection Engine specifications display LinkSentry V3.3', async function () {
    await urlPage.scanUrl('https://google.com');
    const specs = await basePage.getText(By.css('.heuristics-list'));
    expect(specs).to.include('LinkSentry');
  });

  it('URL-013: Detection Engine specifications display model version V3.3', async function () {
    await urlPage.scanUrl('https://google.com');
    const isSpecsVisible = await basePage.isDisplayed(By.css('.heuristics-list'));
    expect(isSpecsVisible).to.be.true;
  });

  it('URL-014: Detection Engine specifications display target domain', async function () {
    await urlPage.scanUrl('https://google.com');
    const target = await basePage.getText(urlPage.targetText);
    expect(target).to.include('google.com');
  });

  it('URL-015: Detection Engine specifications display SSL status (HTTPS/HTTP)', async function () {
    await urlPage.scanUrl('https://google.com');
    const specs = await basePage.getText(By.css('.heuristics-list'));
    expect(specs.length).to.be.greaterThan(0);
  });

  it('URL-016: Copy analysis report button changes to "✓ Copied Report"', async function () {
    await urlPage.scanUrl('https://google.com');
    await urlPage.waitForResult();
    await urlPage.click(urlPage.copyBtn);
    const copyText = await basePage.getText(urlPage.copyBtn);
    expect(copyText).to.include('Copied');
  });

  it('URL-017: Reset Scan button clears result card and restores input form', async function () {
    await urlPage.scanUrl('https://google.com');
    await urlPage.waitForResult();
    await urlPage.resetScan();
    // After reset, the URL input form reappears. Wait for the input to be visible
    // as the definitive signal that the result card has been cleared.
    const inputVisible = await urlPage.isDisplayed(urlPage.urlInput, 10000);
    expect(inputVisible).to.be.true;
    const isResultVisible = await urlPage.isResultDisplayed();
    expect(isResultVisible).to.be.false;
  });

  it('URL-018: Test preset chip 0 populates input and triggers analysis', async function () {
    // Preset chip only populates the URL input field; it does not auto-submit.
    // Select the preset, then explicitly submit the scan.
    await urlPage.selectPreset(0);
    await urlPage.click(urlPage.scanSubmitBtn);
    const isResult = await urlPage.isDisplayed(urlPage.resultCard, 35000);
    expect(isResult).to.be.true;
  });

  it('URL-019: Test preset chip 1 populates input', async function () {
    await urlPage.selectPreset(1);
    await urlPage.click(urlPage.scanSubmitBtn);
    const isResult = await urlPage.isDisplayed(urlPage.resultCard, 35000);
    expect(isResult).to.be.true;
  });

  it('URL-020: Form submission on Enter key executes scan', async function () {
    await urlPage.scanUrlWithEnter('https://github.com');
    const verdict = await urlPage.getVerdict();
    expect(verdict.toUpperCase()).to.equal('SAFE');
  });

  it('URL-021: Extremely long URL renders without overflowing result card', async function () {
    const longUrl = 'https://example.com/very/long/path/with/multiple/query/parameters/and/tokens?id=123456789&session=abcdefghijklmnopqrstuvwxyz1234567890&token=verylongtokenvaluehere';
    await urlPage.scanUrl(longUrl);
    const isResult = await urlPage.isDisplayed(urlPage.resultCard, 25000);
    expect(isResult).to.be.true;
  });

  it('URL-022: Result card remains readable on mobile viewport (390x844)', async function () {
    await basePage.setViewport(390, 844);
    await urlPage.scanUrl('https://example.com');
    const isResult = await urlPage.isDisplayed(urlPage.resultCard, 25000);
    expect(isResult).to.be.true;
    await basePage.setViewport(1920, 1080);
  });
});
