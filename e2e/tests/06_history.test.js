import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import { createDriver } from '../utils/driver.js';
import { captureFailureContext } from '../utils/failureHandler.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import excelReporter from '../utils/excelReporter.js';
import BasePage from '../pages/BasePage.js';
import HistoryPage from '../pages/HistoryPage.js';

describe('Suite 06: Scan History & Audit Trail', function () {
  this.timeout(60000);
  let driver;
  let basePage;
  let historyPage;

  before(async function () {
    driver = await createDriver();
    basePage = new BasePage(driver);
    historyPage = new HistoryPage(driver);

    // Seed session token and open history
    await basePage.open();
    await basePage.setSession({ uid: 'e2e-analyst-history-uid', email: 'analyst.history@linksentry.io' });
    await basePage.open('/history');
    await historyPage.waitForHistoryLoaded();
  });

  after(async function () {
    if (driver) {
      await basePage.clearSession();
      await driver.quit();
    }
  });

  beforeEach(async function () {
    excelReporter.logStep(this.currentTest.title, 'Initializing Test Scenario');
    await basePage.open('/history');
    await historyPage.waitForHistoryLoaded();
  });

  afterEach(async function () {
    const test = this.currentTest;
    const duration = test.duration || 0;
    if (test.state === 'failed') {
      const failureContext = await captureFailureContext(driver, test);
      excelReporter.recordTest({
        id: test.title.split(':')[0] || 'HIST',
        module: 'History',
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
        id: test.title.split(':')[0] || 'HIST',
        module: 'History',
        scenario: test.title,
        browser: config.browser,
        status: 'PASSED',
        duration,
      });
      logger.info(`Test PASSED: ${test.title}`);
    }
  });

  it('HIST-001: History page loads and search input is visible', async function () {
    const isSearchVisible = await historyPage.isDisplayed(historyPage.searchInput);
    expect(isSearchVisible).to.be.true;
  });

  it('HIST-002: Refresh Logs button is present and clickable', async function () {
    const isRefreshVisible = await historyPage.isDisplayed(historyPage.refreshBtn);
    expect(isRefreshVisible).to.be.true;
  });

  it('HIST-003: Refresh Logs button triggers visual refresh action', async function () {
    await historyPage.refreshLogs();
    const isLoaded = await historyPage.isDisplayed(historyPage.searchInput, 10000);
    expect(isLoaded).to.be.true;
  });

  it('HIST-004: Filter by Type: ALL is selected by default', async function () {
    const allChip = await basePage.find(By.css('[data-testid="filter-chip-all"], [data-testid="filter-type-all"]'));
    const classes = await allChip.getAttribute('className');
    expect(classes).to.include('active');
  });

  it('HIST-005: Filter by Type: URL chip selectable', async function () {
    await historyPage.filterByType('URL');
    const urlChip = await basePage.find(By.css('[data-testid="filter-chip-url"], [data-testid="filter-type-url"]'));
    const classes = await urlChip.getAttribute('className');
    expect(classes).to.include('active');
  });

  it('HIST-006: Filter by Type: QR chip selectable', async function () {
    await historyPage.filterByType('QR');
    const qrChip = await basePage.find(By.css('[data-testid="filter-chip-qr"], [data-testid="filter-type-qr"]'));
    const classes = await qrChip.getAttribute('className');
    expect(classes).to.include('active');
  });

  it('HIST-007: Filter by Type: MESSAGE chip selectable', async function () {
    await historyPage.filterByType('MESSAGE');
    const msgChip = await basePage.find(By.css('[data-testid="filter-chip-message"], [data-testid="filter-type-message"]'));
    const classes = await msgChip.getAttribute('className');
    expect(classes).to.include('active');
  });

  it('HIST-008: Filter by Verdict: ALL is selected by default', async function () {
    const allVerdict = await basePage.find(By.css('[data-testid="filter-chip-all"], [data-testid="filter-verdict-all"]'));
    const classes = await allVerdict.getAttribute('className');
    expect(classes).to.include('active');
  });

  it('HIST-009: Filter by Verdict: Safe chip selectable', async function () {
    await historyPage.filterByVerdict('Safe');
    const safeChip = await basePage.find(By.css('[data-testid="filter-chip-safe"], [data-testid="filter-verdict-safe"]'));
    const classes = await safeChip.getAttribute('className');
    expect(classes).to.include('active');
  });

  it('HIST-010: Filter by Verdict: Suspicious chip selectable', async function () {
    await historyPage.filterByVerdict('Suspicious');
    const suspChip = await basePage.find(By.css('[data-testid="filter-chip-suspicious"], [data-testid="filter-verdict-suspicious"]'));
    const classes = await suspChip.getAttribute('className');
    expect(classes).to.include('active');
  });

  it('HIST-011: Filter by Verdict: Phishing chip selectable', async function () {
    await historyPage.filterByVerdict('Phishing');
    const phishChip = await basePage.find(By.css('[data-testid="filter-chip-phishing"], [data-testid="filter-verdict-phishing"]'));
    const classes = await phishChip.getAttribute('className');
    expect(classes).to.include('active');
  });

  it('HIST-012: Search input accepts queries and clear button wipes query', async function () {
    await historyPage.searchHistory('test-query-search');
    const val = await basePage.getValue(historyPage.searchInput);
    expect(val).to.equal('test-query-search');
    await basePage.click(historyPage.searchClearBtn);
    const clearedVal = await basePage.getValue(historyPage.searchInput);
    expect(clearedVal).to.equal('');
  });
});
