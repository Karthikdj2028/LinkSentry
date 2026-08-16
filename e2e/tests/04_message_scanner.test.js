import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import { createDriver } from '../utils/driver.js';
import { captureFailureContext } from '../utils/failureHandler.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import BasePage from '../pages/BasePage.js';
import NavigationBar from '../pages/NavigationBar.js';
import MessageScannerPage from '../pages/MessageScannerPage.js';

describe('Suite 04: Message & SMS Smishing Scanner', function () {
  this.timeout(60000);
  let driver;
  let basePage;
  let navBar;
  let msgPage;

  before(async function () {
    driver = await createDriver();
    basePage = new BasePage(driver);
    navBar = new NavigationBar(driver);
    msgPage = new MessageScannerPage(driver);

    // Seed session token and open message scanner
    await basePage.open();
    await basePage.setSession({ uid: 'e2e-analyst-msg-uid', email: 'analyst.msg@linksentry.io' });
    await basePage.open('/scanner?type=message');
    await msgPage.waitForVisible(msgPage.messageInput, 15000);
  });

  after(async function () {
    if (driver) {
      await basePage.clearSession();
      await driver.quit();
    }
  });

  beforeEach(async function () {
    excelReporter.logStep(this.currentTest.title, 'Initializing Test Scenario');
    await basePage.open('/scanner?type=message');
    await msgPage.waitForVisible(msgPage.messageInput, 15000);
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const failureContext = await captureFailureContext(driver, test);
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'MSG',
        module: 'Message Scanner',
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
        id: test.title.split(':')[0] || 'MSG',
        module: 'Message Scanner',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('MSG-001: Message scanner loads and textarea is visible', async function () {
    const isVisible = await msgPage.isDisplayed(msgPage.messageInput);
    expect(isVisible).to.be.true;
    const heading = await basePage.getText(By.css('.scanner-title'));
    expect(heading).to.include('Message Phishing');
  });

  it('MSG-002: Character counter updates dynamically as message text is typed', async function () {
    await msgPage.type(msgPage.messageInput, 'Testing character counter update.');
    const countText = await msgPage.getCharacterCountText();
    expect(countText).to.include('33 characters');
  });

  it('MSG-003: Submit button is disabled when input is empty', async function () {
    await msgPage.clear(msgPage.messageInput);
    const btn = await msgPage.find(msgPage.scanSubmitBtn);
    const disabled = await btn.getAttribute('disabled');
    expect(disabled).to.not.be.null;
  });

  it('MSG-004: Clear button resets textarea and character count to 0', async function () {
    await msgPage.type(msgPage.messageInput, 'Sample message text to clear.');
    await msgPage.clearInput();
    const val = await msgPage.getInputValue();
    expect(val).to.equal('');
    const countText = await msgPage.getCharacterCountText();
    expect(countText).to.include('0 characters');
  });

  it('MSG-005: Sample threat message preset chip 0 populates textarea', async function () {
    await msgPage.selectPreset(0);
    const val = await msgPage.getInputValue();
    expect(val.length).to.be.greaterThan(0);
  });

  it('MSG-006: Sample threat message preset chip 1 populates textarea', async function () {
    await msgPage.selectPreset(1);
    const val = await msgPage.getInputValue();
    expect(val.length).to.be.greaterThan(0);
  });

  it('MSG-007: Scanning normal legitimate meeting message returns Safe verdict', async function () {
    await msgPage.scanMessage('Hi team, our sprint retrospective is scheduled for Thursday at 3 PM in meeting room B.');
    const verdict = await msgPage.getVerdict();
    expect(verdict.toUpperCase()).to.equal('SAFE');
  });

  it('MSG-008: Legitimate message produces low risk score (0-30)', async function () {
    await msgPage.scanMessage('The project documentation has been updated on the internal wiki.');
    const score = await msgPage.getRiskScore();
    expect(score).to.be.at.most(30);
  });

  it('MSG-009: Scanning suspicious urgency alert message returns Suspicious or Phishing verdict', async function () {
    await msgPage.scanMessage('URGENT: Your bank account will be suspended within 24 hours. Send OTP immediately to verify your identity.');
    const verdict = await msgPage.getVerdict();
    expect(['PHISHING', 'SUSPICIOUS']).to.include(verdict.toUpperCase());
  });

  it('MSG-010: Suspicious message displays elevated risk score', async function () {
    await msgPage.scanMessage('FINAL WARNING: Unauthorized transaction detected on your debit card. Call immediate security line now.');
    const score = await msgPage.getRiskScore();
    expect(score).to.be.greaterThan(25);
  });

  it('MSG-011: Embedded URL in message evaluates embedded link threat', async function () {
    await msgPage.scanMessage('Your parcel delivery could not be completed. Update shipping address at http://parcel-redelivery-urgent.com');
    const verdict = await msgPage.getVerdict();
    expect(['PHISHING', 'SUSPICIOUS']).to.include(verdict.toUpperCase());
  });

  it('MSG-012: Multi-line text input with linebreaks is accepted and scanned', async function () {
    const multiLine = 'Dear customer,\n\nWe detected a login from an unknown device.\n\nPlease verify your account immediately.';
    await msgPage.scanMessage(multiLine);
    const isResult = await msgPage.isDisplayed(msgPage.resultCard, 25000);
    expect(isResult).to.be.true;
  });

  it('MSG-013: Detection specifications display Message Heuristics breakdown', async function () {
    await msgPage.scanMessage('Security notice: password expiration in 2 days.');
    const isResult = await msgPage.isDisplayed(msgPage.resultCard, 25000);
    expect(isResult).to.be.true;
  });

  it('MSG-014: Copy analysis button copies report to clipboard', async function () {
    await msgPage.scanMessage('Routine IT security maintenance notice.');
    await msgPage.waitForResult();
    const copyBtn = By.css('[data-testid="scan-copy-button"]');
    await basePage.click(copyBtn);
    const copyText = await basePage.getText(copyBtn);
    expect(copyText).to.include('Copied');
  });

  it('MSG-015: Reset Scan button clears result card and restores textarea form', async function () {
    await msgPage.scanMessage('Routine system maintenance.');
    await msgPage.waitForResult();
    const resetBtn = By.css('[data-testid="scan-reset-button"]');
    await basePage.click(resetBtn);
    const isResultVisible = await msgPage.isResultDisplayed();
    expect(isResultVisible).to.be.false;
  });

  it('MSG-016: Message scanner results render cleanly on mobile viewport (390x844)', async function () {
    await basePage.setViewport(390, 844);
    await msgPage.scanMessage('Simple mobile test text.');
    const isResult = await msgPage.isDisplayed(msgPage.resultCard, 25000);
    expect(isResult).to.be.true;
    await basePage.setViewport(1920, 1080);
  });
});
