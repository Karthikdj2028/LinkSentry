import { until, By } from 'selenium-webdriver';

export async function waitForElement(driver, locator, timeout = 10000) {
  return await driver.wait(until.elementLocated(locator), timeout);
}

export async function waitForVisible(driver, element, timeout = 10000) {
  return await driver.wait(until.elementIsVisible(element), timeout);
}

export async function safeClick(driver, locator, timeout = 10000) {
  const el = await waitForElement(driver, locator, timeout);
  await waitForVisible(driver, el, timeout);
  await el.click();
  return el;
}

export async function safeType(driver, locator, text, timeout = 10000) {
  const el = await waitForElement(driver, locator, timeout);
  await waitForVisible(driver, el, timeout);
  await el.clear();
  await el.sendKeys(text);
  return el;
}
