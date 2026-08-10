/**
 * LinkSentry E2E Environment Configuration
 * Manages target environment URLs, browser settings, timeouts, and credentials.
 */

export const config = {
  // Target application URL (local development or deployed Firebase app)
  baseUrl: process.env.E2E_BASE_URL || 'https://linksentry-7e694.web.app',

  // Authentication credentials (must be provided via CI Secrets or .env in local runs)
  testEmail: process.env.E2E_TEST_EMAIL || '',
  testPassword: process.env.E2E_TEST_PASSWORD || '',

  // Browser configuration
  browser: (process.env.BROWSER || 'chrome').toLowerCase(),
  headless: process.env.HEADLESS !== 'false', // Default to headless in CI/automated runs

  // Timeouts in milliseconds
  timeouts: {
    pageLoad: 30000,
    script: 30000,
    explicit: 15000,
    scanResult: 20000,
  },

  /**
   * Validates that required authentication credentials are provided.
   * Throws an actionable error without leaking sensitive values.
   */
  requireAuthCredentials() {
    if (!this.testEmail || !this.testPassword) {
      throw new Error(
        'E2E Authentication tests require E2E_TEST_EMAIL and E2E_TEST_PASSWORD environment variables.\n' +
        'Please supply valid test account credentials via environment variables or GitHub Actions Secrets.'
      );
    }
  }
};

export default config;
