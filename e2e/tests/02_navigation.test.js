import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import { createDriver } from '../utils/driver.js';
import { captureFailureContext } from '../utils/failureHandler.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import BasePage from '../pages/BasePage.js';
import NavigationBar from '../pages/NavigationBar.js';

describe('Suite 02: Top-Level & Deep-Link Navigation', function () {
  this.timeout(60000);
  let driver;
  let basePage;
  let navBar;

  before(async function () {
    driver = await createDriver();
    basePage = new BasePage(driver);
    navBar = new NavigationBar(driver);

    // Seed session token and open home page
    await basePage.open();
    await basePage.setSession({ uid: 'e2e-analyst-nav-uid', email: 'analyst.nav@linksentry.io' });
    await basePage.open();
    await navBar.waitForVisible(navBar.brandLogo, 15000);
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
        id: test.title.split(':')[0] || 'NAV',
        module: 'Navigation',
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
        id: test.title.split(':')[0] || 'NAV',
        module: 'Navigation',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('NAV-001: Authenticated session reaches Home page and hero section renders', async function () {
    await navBar.goToHome();
    const heroTitle = await basePage.getText(By.css('.hero-headline, .page-main-heading'));
    expect(heroTitle).to.include('Security Overview');
  });

  it('NAV-002: Top navbar renders brand logo and system status pill', async function () {
    const isBrandVisible = await navBar.isNavbarVisible();
    expect(isBrandVisible).to.be.true;
    const isStatusVisible = await basePage.isDisplayed(navBar.statusPill);
    expect(isStatusVisible).to.be.true;
  });

  it('NAV-003: Navigation to Scanner page (/scanner) renders multi-vector scanner hub', async function () {
    await navBar.goToScanner();
    const heading = await basePage.getText(By.css('.page-main-heading'));
    expect(heading).to.include('Multi-Vector Security Scanner');
  });

  it('NAV-004: Scanner tab shows active indicator when selected', async function () {
    await navBar.goToScanner();
    const isActive = await navBar.isTabActive('scanner');
    expect(isActive).to.be.true;
  });

  it('NAV-005: Navigation to History page (/history) renders audit trail controls', async function () {
    await navBar.goToHistory();
    const isHistoryVisible = await basePage.isDisplayed(By.css('.history-controls-card, [data-testid="history-search-input"]'));
    expect(isHistoryVisible).to.be.true;
  });

  it('NAV-006: History tab shows active indicator when selected', async function () {
    await navBar.goToHistory();
    const isActive = await navBar.isTabActive('history');
    expect(isActive).to.be.true;
  });

  it('NAV-007: Navigation to Analytics page (/analytics) renders telemetry dossier', async function () {
    await navBar.goToAnalytics();
    const title = await basePage.getText(By.css('.page-title, .page-main-heading'));
    expect(title).to.include('Threat Analytics');
  });

  it('NAV-008: Analytics tab shows active indicator when selected', async function () {
    await navBar.goToAnalytics();
    const isActive = await navBar.isTabActive('analytics');
    expect(isActive).to.be.true;
  });

  it('NAV-009: Navigation to Dashboard page (/dashboard) renders telemetry overview', async function () {
    await navBar.goToDashboard();
    const heading = await basePage.getText(By.css('.page-main-heading'));
    expect(heading).to.include('Security Overview');
  });

  it('NAV-010: Dashboard tab shows active indicator when selected', async function () {
    await navBar.goToDashboard();
    const isActive = await navBar.isTabActive('dashboard');
    expect(isActive).to.be.true;
  });

  it('NAV-011: Navigation to Profile page (/profile) renders analyst profile settings', async function () {
    await navBar.goToProfile();
    const heading = await basePage.getText(By.css('.page-main-heading'));
    expect(heading).to.include('Profile & Account Security');
  });

  it('NAV-012: Profile tab shows active indicator when selected', async function () {
    await navBar.goToProfile();
    const isActive = await navBar.isTabActive('profile');
    expect(isActive).to.be.true;
  });

  it('NAV-013: Brand logo click navigates back to Home from any page', async function () {
    await navBar.goToProfile();
    await navBar.click(navBar.brandLogo);
    const heroTitle = await basePage.getText(By.css('.hero-headline, .page-main-heading'));
    expect(heroTitle).to.include('Security Overview');
  });

  it('NAV-014: Browser Back button returns to previous active tab', async function () {
    await navBar.goToScanner();
    await navBar.goToHistory();
    await driver.navigate().back();
    const isScannerHeading = await basePage.isDisplayed(By.css('.scanner-page'));
    expect(isScannerHeading).to.be.true;
  });

  it('NAV-015: Browser Forward button advances back to navigated tab', async function () {
    await driver.navigate().forward();
    const isHistory = await basePage.isDisplayed(By.css('.history-page, [data-testid="history-search-input"]'));
    expect(isHistory).to.be.true;
  });

  it('NAV-016: Scanner subtab URL switch toggles active subtab to QR scanner', async function () {
    await navBar.goToScanner();
    await navBar.selectQrScannerSubTab();
    const isQrVisible = await basePage.isDisplayed(By.css('[data-testid="qr-dropzone"], .qr-dropzone, .camera-viewfinder, .qr-camera-placeholder'));
    expect(isQrVisible).to.be.true;
  });

  it('NAV-017: Scanner subtab switch toggles to Message scanner', async function () {
    await navBar.goToScanner();
    await navBar.selectMessageScannerSubTab();
    const isMsgVisible = await basePage.isDisplayed(By.css('[data-testid="message-input"], #message-input'));
    expect(isMsgVisible).to.be.true;
  });

  it('NAV-018: Direct deep link /scanner?type=qr activates QR scanner subtab', async function () {
    await basePage.open('/scanner?type=qr');
    await basePage.waitForVisible(By.css('.scanner-page'), 10000);
    const isQrVisible = await basePage.isDisplayed(By.css('[data-testid="qr-dropzone"], .qr-dropzone, .camera-viewfinder, .qr-camera-placeholder'));
    expect(isQrVisible).to.be.true;
  });

  it('NAV-019: Direct deep link /scanner?type=message activates Message scanner subtab', async function () {
    await basePage.open('/scanner?type=message');
    await basePage.waitForVisible(By.css('.scanner-page'), 10000);
    const isMsgVisible = await basePage.isDisplayed(By.css('[data-testid="message-input"], #message-input'));
    expect(isMsgVisible).to.be.true;
  });

  it('NAV-020: Direct deep link /scanner?type=url activates URL scanner subtab', async function () {
    await basePage.open('/scanner?type=url');
    await basePage.waitForVisible(By.css('.scanner-page'), 10000);
    const isUrlVisible = await basePage.isDisplayed(By.css('[data-testid="url-input"], #url-input'));
    expect(isUrlVisible).to.be.true;
  });
});
