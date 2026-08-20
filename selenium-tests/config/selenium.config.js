/**
 * LinkSentry Selenium Configuration
 */
export const config = {
  baseUrl: process.env.WEB_BASE_URL || 'http://localhost:5173',
  backendUrl: process.env.API_BASE_URL || 'http://127.0.0.1:8000',
  browser: process.env.BROWSER || 'chrome',
  headless: process.env.HEADLESS !== 'false',
  timeout: {
    implicit: 5000,
    pageLoad: 30000,
    script: 30000,
    element: 10000,
  },
  viewport: {
    width: 1280,
    height: 800,
    mobile: {
      width: 375,
      height: 667,
    },
    tablet: {
      width: 768,
      height: 1024,
    }
  },
  reportsDir: './reports',
  screenshotsDir: './screenshots',
  logsDir: './logs',
  rawResultsDir: './raw-test-results',
};
