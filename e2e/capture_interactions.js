import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = 'd:/LinkSentry/web_audit_screenshots';

async function captureInteractions() {
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1');

  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // 1. Desktop 1280x800 - QR scanner tab
    await driver.manage().window().setRect({ width: 1280, height: 800 });
    await driver.get('http://localhost:5173/scanner');
    await new Promise(r => setTimeout(r, 1000));
    
    // Find QR tab button
    try {
      const qrTab = await driver.findElement(By.xpath("//button[contains(., 'QR') or contains(., 'qr')]"));
      await qrTab.click();
      await new Promise(r => setTimeout(r, 800));
      const qrShot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, 'scanner_qr_desktop_1280x800.png'), qrShot, 'base64');
      console.log('Saved: scanner_qr_desktop_1280x800.png');
    } catch (e) {
      console.log('QR Tab click issue:', e.message);
    }

    // Find Message tab button
    try {
      const msgTab = await driver.findElement(By.xpath("//button[contains(., 'Message') or contains(., 'SMS') or contains(., 'message')]"));
      await msgTab.click();
      await new Promise(r => setTimeout(r, 800));
      const msgShot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, 'scanner_msg_desktop_1280x800.png'), msgShot, 'base64');
      console.log('Saved: scanner_msg_desktop_1280x800.png');
    } catch (e) {
      console.log('Message Tab click issue:', e.message);
    }

    // 2. Mobile 390x844 - QR & Message scanner tabs
    await driver.manage().window().setRect({ width: 390, height: 844 });
    await driver.get('http://localhost:5173/scanner');
    await new Promise(r => setTimeout(r, 1000));
    try {
      const qrTabMob = await driver.findElement(By.xpath("//button[contains(., 'QR') or contains(., 'qr')]"));
      await qrTabMob.click();
      await new Promise(r => setTimeout(r, 800));
      const qrMobShot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, 'scanner_qr_mobile_390x844.png'), qrMobShot, 'base64');
      console.log('Saved: scanner_qr_mobile_390x844.png');
    } catch (e) {}

    try {
      const msgTabMob = await driver.findElement(By.xpath("//button[contains(., 'Message') or contains(., 'SMS') or contains(., 'message')]"));
      await msgTabMob.click();
      await new Promise(r => setTimeout(r, 800));
      const msgMobShot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(OUTPUT_DIR, 'scanner_msg_mobile_390x844.png'), msgMobShot, 'base64');
      console.log('Saved: scanner_msg_mobile_390x844.png');
    } catch (e) {}

  } finally {
    if (driver) await driver.quit();
  }
}

captureInteractions().then(() => console.log('Interaction capture complete!')).catch(console.error);
