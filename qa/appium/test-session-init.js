import { remote } from 'webdriverio';

async function testAppiumSession() {
  console.log('=== TESTING REAL APPIUM 2.X SESSION CREATION (PHYSICAL DEVICE) ===');
  const opts = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'Samsung SM_E055F',
      'appium:udid': 'R9ZY105SN5M',
      'appium:appPackage': 'com.linksentry.app',
      'appium:appActivity': 'com.linksentry.app.MainActivity',
      'appium:noReset': true,
      'appium:autoGrantPermissions': true,
      'appium:newCommandTimeout': 300,
      'appium:uiautomator2ServerInstallTimeout': 60000,
      'appium:adbExecTimeout': 60000
    }
  };

  try {
    console.log('Connecting to Appium server on http://127.0.0.1:4723...');
    const driver = await remote(opts);
    console.log('====================================================');
    console.log('SUCCESS! REAL APPIUM DRIVER SESSION ESTABLISHED!');
    console.log('Session ID:', driver.sessionId);
    console.log('Device UDID: R9ZY105SN5M');
    console.log('App Package: com.linksentry.app');
    console.log('====================================================');

    const source = await driver.getPageSource();
    console.log('App DOM Hierarchy Bytes:', source.length);

    await driver.deleteSession();
    console.log('Appium session closed cleanly.');
  } catch (err) {
    console.error('Appium Session Error:', err);
  }
}

testAppiumSession();
