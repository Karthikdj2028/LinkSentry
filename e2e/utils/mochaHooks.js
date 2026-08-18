import excelReporter from './excelReporter.js';
import config from '../config/environment.js';

export const mochaHooks = {
  async afterAll() {
    await excelReporter.generateReport({
      baseUrl: config.baseUrl,
      browser: config.browser,
    });
  },
};
