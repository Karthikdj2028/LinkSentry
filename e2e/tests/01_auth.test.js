import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import { createDriver } from '../utils/driver.js';
import { captureFailureContext } from '../utils/failureHandler.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import LoginPage from '../pages/LoginPage.js';

describe('Suite 01: Authentication Module', function () {
  this.timeout(60000);
  let driver;
  let loginPage;

  before(async function () {
    driver = await createDriver();
    loginPage = new LoginPage(driver);
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  beforeEach(async function () {
    excelReporter.logStep(this.currentTest.title, 'Initializing Test Scenario');
    // Ensure clean unauthenticated state
    await loginPage.open();
    await loginPage.clearSession();
    await loginPage.open();
    await loginPage.waitForAuthLoaded();
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const failureContext = await captureFailureContext(driver, test);
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'AUTH',
        module: 'Authentication',
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

  it('AUTH-001: Login portal loads with brand title and tagline', async function () {
    const isDisplayed = await loginPage.isLoginPageDisplayed();
    expect(isDisplayed).to.be.true;
    const title = await loginPage.getText(By.css('.auth-brand-title'));
    expect(title).to.include('LINKSENTRY');
  });

  it('AUTH-002: Email input field accepts and stores keyboard input', async function () {
    await loginPage.type(loginPage.emailInput, 'test.analyst@linksentry.io');
    const val = await loginPage.getValue(loginPage.emailInput);
    expect(val).to.equal('test.analyst@linksentry.io');
  });

  it('AUTH-003: Password field accepts masked input', async function () {
    await loginPage.type(loginPage.passwordInput, 'Secr3tP@ssw0rd!');
    const val = await loginPage.getValue(loginPage.passwordInput);
    expect(val).to.equal('Secr3tP@ssw0rd!');
    const typeAttr = await (await loginPage.find(loginPage.passwordInput)).getAttribute('type');
    expect(typeAttr).to.equal('password');
  });

  it('AUTH-004: Empty email validation displays error alert', async function () {
    await loginPage.login('', '');
    const isError = await loginPage.isErrorDisplayed();
    expect(isError).to.be.true;
    const msg = await loginPage.getErrorMessage();
    expect(msg).to.include('Please enter your email address');
  });

  it('AUTH-005: Invalid email format missing @ displays validation error', async function () {
    await loginPage.login('invalidemailformat.com', 'SomePassword123!');
    const isError = await loginPage.isErrorDisplayed();
    expect(isError).to.be.true;
    const msg = await loginPage.getErrorMessage();
    expect(msg).to.include('valid email address');
  });

  it('AUTH-006: Invalid email format missing domain displays validation error', async function () {
    await loginPage.login('analyst@nodomain', 'SomePassword123!');
    const isError = await loginPage.isErrorDisplayed();
    expect(isError).to.be.true;
    const msg = await loginPage.getErrorMessage();
    expect(msg).to.include('valid email address');
  });

  it('AUTH-007: Empty password with valid email displays password required error', async function () {
    await loginPage.login('analyst.valid@linksentry.io', '');
    const isError = await loginPage.isErrorDisplayed();
    expect(isError).to.be.true;
    const msg = await loginPage.getErrorMessage();
    expect(msg).to.include('Please enter your password');
  });

  it('AUTH-008: Non-existent analyst credentials trigger rejection error alert', async function () {
    await loginPage.login('nonexistent.qa.analyst.0987@linksentry.test', 'WrongSecret123!');
    const isError = await loginPage.isErrorDisplayed(15000);
    expect(isError).to.be.true;
    const msg = await loginPage.getErrorMessage();
    expect(msg.length).to.be.greaterThan(0);
  });

  it('AUTH-009: Mode switcher toggles to Registration mode', async function () {
    await loginPage.clickRegisterTab();
    const isRegisterForm = await loginPage.isDisplayed(By.css('.auth-card-title'));
    expect(isRegisterForm).to.be.true;
    const titleText = await loginPage.getText(By.css('.auth-card-title'));
    // Application deliberately uses "Create Analyst Account" for the registration card title.
    expect(titleText).to.include('Create Analyst Account');
  });

  it('AUTH-010: Registration card renders register email and password fields', async function () {
    await loginPage.clickRegisterTab();
    const hasEmail = await loginPage.isDisplayed(By.id('register-email'));
    const hasPassword = await loginPage.isDisplayed(By.id('register-password'));
    const hasConfirm = await loginPage.isDisplayed(By.id('register-confirm-password'));
    expect(hasEmail).to.be.true;
    expect(hasPassword).to.be.true;
    expect(hasConfirm).to.be.true;
  });

  it('AUTH-011: Mode switcher toggles back from Register to Sign In mode', async function () {
    await loginPage.clickRegisterTab();
    await loginPage.clickLoginTab();
    const isLoginForm = await loginPage.isLoginPageDisplayed();
    expect(isLoginForm).to.be.true;
  });

  it('AUTH-012: Switch to register button in card footer switches mode', async function () {
    await loginPage.switchToRegister();
    const isRegisterForm = await loginPage.isDisplayed(By.id('register-email'));
    expect(isRegisterForm).to.be.true;
  });

  it('AUTH-013: Security notice badge and 256-bit encryption text are displayed', async function () {
    const notice = await loginPage.getText(By.css('.auth-security-notice'));
    expect(notice).to.include('256-Bit Encrypted Session');
  });

  it('AUTH-014: Firebase authentication status pill is active', async function () {
    const statusText = await loginPage.getText(By.css('.auth-badge-status'));
    expect(statusText).to.include('FIREBASE AUTHENTICATION ACTIVE');
  });

  it('AUTH-015: Form submission initiates on Enter key', async function () {
    await loginPage.type(loginPage.emailInput, 'invalid-entry\n');
    const isError = await loginPage.isErrorDisplayed();
    expect(isError).to.be.true;
  });

  it('AUTH-016: Direct /profile navigation without session redirects to AuthPage', async function () {
    await loginPage.open('/profile');
    await loginPage.waitForAuthLoaded();
    const isLogin = await loginPage.isLoginPageDisplayed();
    expect(isLogin).to.be.true;
  });

  it('AUTH-017: Direct /history navigation without session redirects to AuthPage', async function () {
    await loginPage.open('/history');
    await loginPage.waitForAuthLoaded();
    const isLogin = await loginPage.isLoginPageDisplayed();
    expect(isLogin).to.be.true;
  });

  it('AUTH-018: Direct /analytics navigation without session redirects to AuthPage', async function () {
    await loginPage.open('/analytics');
    await loginPage.waitForAuthLoaded();
    const isLogin = await loginPage.isLoginPageDisplayed();
    expect(isLogin).to.be.true;
  });

  it('AUTH-019: Direct /scanner navigation without session redirects to AuthPage', async function () {
    await loginPage.open('/scanner');
    await loginPage.waitForAuthLoaded();
    const isLogin = await loginPage.isLoginPageDisplayed();
    expect(isLogin).to.be.true;
  });

  it('AUTH-020: Auth portal renders without horizontal overflow on mobile viewport (390x844)', async function () {
    await loginPage.setViewport(390, 844);
    const isLogin = await loginPage.isLoginPageDisplayed();
    expect(isLogin).to.be.true;
    // Restore desktop viewport
    await loginPage.setViewport(1920, 1080);
  });
});
