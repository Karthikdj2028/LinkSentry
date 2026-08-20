/**
 * LinkSentry Appium Mobile Test Configuration
 */
import path from 'path';

export const config = {
  host: process.env.APPIUM_HOST || '127.0.0.1',
  port: parseInt(process.env.APPIUM_PORT || '4723', 10),
  capabilities: {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
    'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION || '14.0',
    'appium:app': path.resolve('android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    'appium:appPackage': 'com.linksentry.app',
    'appium:appActivity': 'com.linksentry.app.MainActivity',
    'appium:noReset': false,
    'appium:fullReset': false,
    'appium:newCommandTimeout': 300,
    'appium:autoGrantPermissions': true,
  },
  timeouts: {
    implicit: 5000,
    element: 10000,
    command: 60000,
  },
  reportsDir: './reports',
  screenshotsDir: './screenshots',
  logsDir: './logs',
  rawResultsDir: './raw-test-results',
};
