import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import { createDriver } from '../utils/driver.js';
import { captureFailureContext } from '../utils/failureHandler.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import BasePage from '../pages/BasePage.js';
import ProfilePage from '../pages/ProfilePage.js';
import UrlScannerPage from '../pages/UrlScannerPage.js';
import MessageScannerPage from '../pages/MessageScannerPage.js';

describe('Suite 10: Error Boundaries & App Resilience', function () {
  this.timeout(60000);
  let driver;
  let basePage;
  let urlPage;
  let msgPage;
  let profilePage;

  before(async function () {
    driver = await createDriver();
    basePage = new BasePage(driver);
    urlPage = new UrlScannerPage(driver);
    msgPage = new MessageScannerPage(driver);
    profilePage = new ProfilePage(driver);

    // Seed session token and open home page
    await basePage.open();
    await basePage.setSession({ uid: 'e2e-analyst-err-uid', email: 'analyst.err@linksentry.io' });
    await basePage.open();
  });

  after(async function () {
    if (driver) {
      await basePage.clearSession();
      await driver.quit();
    }
  });

  beforeEach(function () {
    excelReporter.logStep(this.currentTest.title, 'Initializing Test Scenario');
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const failureContext = await captureFailureContext(driver, test);
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'ERR',
        module: 'Error Resilience',
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
        id: test.title.split(':')[0] || 'ERR',
        module: 'Error Resilience',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('ERR-001: Scanner handles whitespace-only URL input with validation error', async function () {
    await basePage.open('/scanner?type=url');
    await urlPage.scanUrl('     ');
    const isError = await urlPage.isValidationErrorDisplayed();
    expect(isError).to.be.true;
    const msg = await urlPage.getValidationError();
    expect(msg).to.include('Please enter a URL');
  });

  it('ERR-002: Message scanner rejects blank whitespace-only submission', async function () {
    await basePage.open('/scanner?type=message');
    await msgPage.type(msgPage.messageInput, '     ');
    const isSubmitDisabled = await msgPage.find(msgPage.scanSubmitBtn);
    const disabled = await isSubmitDisabled.getAttribute('disabled');
    expect(disabled).to.not.be.null;
  });

  it('ERR-003: Scanner gracefully handles invalid schema protocols', async function () {
    await basePage.open('/scanner?type=url');
    await urlPage.scanUrl('javascript:alert(1)');
    const isError = await urlPage.isValidationErrorDisplayed();
    expect(isError).to.be.true;
  });

  it('ERR-004: Rapid consecutive submissions prevent duplicate requests via isScanning state', async function () {
    await basePage.open('/scanner?type=url');
    await urlPage.type(urlPage.urlInput, 'https://example.org');
    const submitBtn = await urlPage.find(urlPage.scanSubmitBtn);
    await submitBtn.click();
    // Verify submit button is disabled during scanning
    const isScanningOrDisabled = await urlPage.isSubmitDisabled();
    expect(isScanningOrDisabled).to.be.true;
  });

  it('ERR-005: History page handles empty records gracefully with empty state notice', async function () {
    await basePage.open('/history');
    const isControls = await basePage.isDisplayed(By.css('[data-testid="history-search-input"]'), 5000);
    expect(isControls).to.be.true;
  });

  it('ERR-006: Dashboard page handles zero scan history without crashing', async function () {
    await basePage.open('/dashboard');
    const isDashboard = await basePage.isDisplayed(By.css('.dashboard-page, .overview-page'), 5000);
    expect(isDashboard).to.be.true;
  });

  it('ERR-007: Unknown query parameter on /scanner defaults safely to url subtab', async function () {
    await basePage.open('/scanner?type=nonexistenttype12345');
    const isUrlInput = await basePage.isDisplayed(By.css('[data-testid="url-input"], #url-input'), 5000);
    expect(isUrlInput).to.be.true;
  });

  it('ERR-008: Page refresh preserves current active URL path', async function () {
    await basePage.open('/analytics');
    await driver.navigate().refresh();
    const isAnalytics = await basePage.isDisplayed(By.css('.analytics-page-container, .analytics-page'), 10000);
    expect(isAnalytics).to.be.true;
  });

  it('ERR-009: Logging out completely purges session token from storage', async function () {
    await basePage.open('/profile');
    await profilePage.logout();
    const token = await driver.executeScript("return localStorage.getItem('linksentry_e2e_session');");
    expect(token).to.be.null;
  });

  it('ERR-010: Session termination returns user to unauthenticated login view', async function () {
    // After ERR-009 cleared the session + clicked logout, navigate to root so
    // the auth guard re-evaluates and redirects to the login page.
    await basePage.open('/');
    const loginInput = By.css('[data-testid="login-email-input"], #login-email');
    const isLogin = await basePage.isDisplayed(loginInput, 10000);
    expect(isLogin).to.be.true;
  });
});
