/**
 * LinkSentry Selenium Configuration
 */
export const SELENIUM_CONFIG = {
  baseUrl: process.env.SELENIUM_BASE_URL || 'https://linksentry-7e694.web.app',
  localUrl: 'http://localhost:5173',
  timeoutMs: 15000,
  implicitWaitMs: 3000,
  headless: process.env.HEADLESS !== 'false',
  browser: 'chrome',
  testAccount: {
    email: process.env.TEST_USER_EMAIL || 'analyst.qa.test@linksentry.io',
    password: process.env.TEST_USER_PASSWORD || 'TestPass123!',
    uid: 'oz7yHWnrMrR6U6QFbrHYTNpq9Eg2'
  },
  viewports: {
    desktop: { width: 1280, height: 800 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 390, height: 844 }
  }
};
