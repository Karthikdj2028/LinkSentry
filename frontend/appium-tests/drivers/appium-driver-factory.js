import { remote } from 'webdriverio';
import { config } from '../config/appium.config.js';

export async function createAppiumDriver(customCaps = {}) {
  const options = {
    hostname: config.host,
    port: config.port,
    path: '/',
    capabilities: {
      ...config.capabilities,
      ...customCaps,
    },
    logLevel: 'warn',
  };

  return await remote(options);
}
