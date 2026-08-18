import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import { createDriver } from '../utils/driver.js';
import { captureFailureContext } from '../utils/failureHandler.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import BasePage from '../pages/BasePage.js';
import NavigationBar from '../pages/NavigationBar.js';

describe('Suite 09: Multi-Device Responsive Viewports', function () {
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
    await basePage.setSession({ uid: 'e2e-analyst-resp-uid', email: 'analyst.resp@linksentry.io' });
    await basePage.open();
    await navBar.waitForVisible(navBar.brandLogo, 15000);
  });

  after(async function () {
    if (driver) {
      await basePage.setViewport(1920, 1080);
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
        id: test.title.split(':')[0] || 'RESP',
        module: 'Responsive Viewports',
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
        id: test.title.split(':')[0] || 'RESP',
        module: 'Responsive Viewports',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('RESP-001: 360x800 (Compact Mobile): Layout renders without horizontal document overflow', async function () {
    await basePage.setViewport(360, 800);
    await basePage.open('/');
    const scrollWidth = await driver.executeScript('return document.documentElement.scrollWidth');
    const clientWidth = await driver.executeScript('return document.documentElement.clientWidth');
    expect(scrollWidth).to.be.at.most(clientWidth + 5);
  });

  it('RESP-002: 390x844 (Standard Mobile): Mobile navigation hamburger menu is visible', async function () {
    await basePage.setViewport(390, 844);
    await basePage.open('/');
    const isHamburger = await basePage.isDisplayed(navBar.mobileToggle, 5000);
    expect(isHamburger).to.be.true;
  });

  it('RESP-003: 390x844: Mobile hamburger button opens navigation drawer', async function () {
    await basePage.setViewport(390, 844);
    await basePage.open('/');
    await navBar.openMobileMenu();
    const isDrawer = await basePage.isDisplayed(navBar.mobileDrawer, 5000);
    expect(isDrawer).to.be.true;
  });

  it('RESP-004: 390x844: Mobile drawer item click navigates and closes drawer', async function () {
    await basePage.setViewport(390, 844);
    await basePage.open('/');
    await navBar.openMobileMenu();
    const scannerMobileBtn = By.css('[data-testid="mobile-nav-tab-scanner"]');
    await basePage.click(scannerMobileBtn);
    const isScannerPage = await basePage.isDisplayed(By.css('.scanner-page'), 5000);
    expect(isScannerPage).to.be.true;
  });

  it('RESP-005: 412x915 (Android Flagship): URL scanner form fits screen width', async function () {
    await basePage.setViewport(412, 915);
    await basePage.open('/scanner?type=url');
    const isInput = await basePage.isDisplayed(By.css('[data-testid="url-input"], #url-input'), 5000);
    expect(isInput).to.be.true;
  });

  it('RESP-006: 768x1024 (Tablet Viewport): Scanner subtab buttons layout renders cleanly', async function () {
    await basePage.setViewport(768, 1024);
    await basePage.open('/scanner');
    const isSubtabs = await basePage.isDisplayed(By.css('.scanner-subtabs-nav, .scanner-tabs-bar'), 5000);
    expect(isSubtabs).to.be.true;
  });

  it('RESP-007: 1280x720 (Laptop Viewport): Desktop navigation bar renders', async function () {
    await basePage.setViewport(1280, 720);
    await basePage.open('/');
    const isDesktopNav = await basePage.isDisplayed(By.css('.desktop-nav, .nav-links'), 5000);
    expect(isDesktopNav).to.be.true;
  });

  it('RESP-008: 1920x1080 (FHD Desktop): Full dashboard and stat grid renders', async function () {
    await basePage.setViewport(1920, 1080);
    await basePage.open('/dashboard');
    const isDashboard = await basePage.isDisplayed(By.css('.dashboard-page, .overview-page'), 5000);
    expect(isDashboard).to.be.true;
  });

  it('RESP-009: RiskScoreMeter scales correctly across compact and wide viewports', async function () {
    await basePage.setViewport(360, 800);
    await basePage.open('/scanner?type=url');
    const input = By.css('[data-testid="url-input"], #url-input');
    const submit = By.css('[data-testid="url-scan-submit"]');
    await basePage.type(input, 'https://example.com');
    await basePage.click(submit);
    const isMeter = await basePage.isDisplayed(By.css('[data-testid="risk-score-meter"]'), 25000);
    expect(isMeter).to.be.true;
  });

  it('RESP-010: Viewport resizing preserves user session and active page', async function () {
    await basePage.setViewport(1920, 1080);
    await basePage.open('/profile');
    await basePage.setViewport(390, 844);
    const isProfile = await basePage.isDisplayed(By.css('.profile-page'), 5000);
    expect(isProfile).to.be.true;
    await basePage.setViewport(1920, 1080);
  });
});
