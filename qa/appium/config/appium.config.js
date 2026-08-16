/**
 * LinkSentry Appium Android Configuration
 */
export const APPIUM_CONFIG = {
  hostname: process.env.APPIUM_HOST || '127.0.0.1',
  port: parseInt(process.env.APPIUM_PORT || '4723', 10),
  path: '/',
  capabilities: {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Samsung SM_E055F',
    'appium:udid': process.env.ANDROID_SERIAL || 'R9ZY105SN5M',
    'appium:appPackage': 'com.linksentry.app',
    'appium:appActivity': 'com.linksentry.app.MainActivity',
    'appium:app': process.env.ANDROID_APK_PATH || 'android/app/build/outputs/apk/debug/app-debug.apk',
    'appium:noReset': false,
    'appium:fullReset': false,
    'appium:autoGrantPermissions': true,
    'appium:newCommandTimeout': 180
  },
  testAccount: {
    email: process.env.TEST_USER_EMAIL || 'analyst.qa.test@linksentry.io',
    password: process.env.TEST_USER_PASSWORD || 'TestPass123!',
    uid: 'oz7yHWnrMrR6U6QFbrHYTNpq9Eg2'
  }
};
