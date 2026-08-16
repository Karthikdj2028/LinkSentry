/**
 * Appium Base Screen Page Object Model for Native Compose App
 */
export class BaseAndroidScreen {
  constructor(driver) {
    this.driver = driver;
  }

  async findByAccessibilityId(id, timeout = 10000) {
    return await this.driver.$(`~${id}`);
  }

  async findByText(text, timeout = 10000) {
    return await this.driver.$(`//*[@text="${text}"]`);
  }

  async clickAccessibilityId(id) {
    const el = await this.findByAccessibilityId(id);
    await el.click();
  }

  async clickText(text) {
    const el = await this.findByText(text);
    await el.click();
  }

  async typeAccessibilityId(id, text) {
    const el = await this.findByAccessibilityId(id);
    await el.setValue(text);
  }

  async typeText(label, text) {
    const el = await this.findByText(label);
    await el.setValue(text);
  }

  async isTextVisible(text) {
    try {
      const el = await this.findByText(text);
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }

  async executeAdbShell(command, args = []) {
    return await this.driver.execute('mobile: shell', { command, args });
  }

  async triggerIntent(action, extraKey, extraValue) {
    const args = ['am', 'start', '-a', action, '-t', 'text/plain', '--es', extraKey, extraValue, 'com.linksentry.app/.MainActivity'];
    return await this.executeAdbShell('am', args);
  }
}
