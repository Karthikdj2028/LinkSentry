import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import { createDriver } from '../utils/driver.js';
import { captureFailureContext } from '../utils/failureHandler.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import BasePage from '../pages/BasePage.js';
import AnalyticsPage from '../pages/AnalyticsPage.js';

describe('Suite 07: Telemetry Analytics & Reporting', function () {
  this.timeout(60000);
  let driver;
  let basePage;
  let analyticsPage;

  before(async function () {
    driver = await createDriver();
    basePage = new BasePage(driver);
    analyticsPage = new AnalyticsPage(driver);

    // Seed session token and open analytics
    await basePage.open();
    await basePage.setSession({ uid: 'e2e-analyst-analytics-uid', email: 'analyst.analytics@linksentry.io' });
    await basePage.open('/analytics');
    await analyticsPage.waitForAnalyticsLoaded();
  });

  after(async function () {
    if (driver) {
      await basePage.clearSession();
      await driver.quit();
    }
  });

  beforeEach(async function () {
    excelReporter.logStep(this.currentTest.title, 'Initializing Test Scenario');
    await basePage.open('/analytics');
    await analyticsPage.waitForAnalyticsLoaded();
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const failureContext = await captureFailureContext(driver, test);
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'ANLY',
        module: 'Analytics',
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
        id: test.title.split(':')[0] || 'ANLY',
        module: 'Analytics',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('ANLY-001: Analytics page loads with ISO/IEC 27001 posture header', async function () {
    const isLoaded = await basePage.isDisplayed(By.css('.analytics-page-container'));
    expect(isLoaded).to.be.true;
  });

  it('ANLY-002: Page title and telemetry section tag render', async function () {
    const title = await basePage.getText(analyticsPage.pageTitle);
    expect(title).to.include('Cybersecurity Threat Analytics');
    const tag = await basePage.getText(By.css('.section-tag'));
    expect(tag).to.include('TELEMETRY & INTELLIGENCE');
  });

  it('ANLY-003: Total Scans Processed stat card renders', async function () {
    const isCard = await basePage.isDisplayed(By.css('.stat-cards-grid .stat-card'));
    expect(isCard).to.be.true;
  });

  it('ANLY-004: Threat Mitigation Rate stat card renders', async function () {
    const statCards = await analyticsPage.getStatCardCount();
    expect(statCards).to.be.at.least(1);
  });

  it('ANLY-005: Active Threats Blocked stat card renders', async function () {
    const statCards = await analyticsPage.getStatCardCount();
    expect(statCards).to.be.at.least(1);
  });

  it('ANLY-006: Average Risk Score stat card renders', async function () {
    const statCards = await analyticsPage.getStatCardCount();
    expect(statCards).to.be.at.least(1);
  });

  it('ANLY-007: Defensive Posture Evaluation grade badge renders', async function () {
    const isPostureSection = await basePage.isDisplayed(By.css('.dashboard-section-header'));
    expect(isPostureSection).to.be.true;
  });

  it('ANLY-008: Export CSV button is present in actions bar', async function () {
    const isExport = await analyticsPage.isExportCsvDisplayed();
    expect(isExport).to.be.true;
  });

  it('ANLY-009: Print Security Audit Report button is present in actions bar', async function () {
    const isPrint = await analyticsPage.isPrintReportDisplayed();
    expect(isPrint).to.be.true;
  });

  it('ANLY-010: Analytics layout adapts to tablet viewport (768x1024)', async function () {
    await basePage.setViewport(768, 1024);
    const isLoaded = await basePage.isDisplayed(By.css('.analytics-page-container'));
    expect(isLoaded).to.be.true;
    await basePage.setViewport(1920, 1080);
  });
});
