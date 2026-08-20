export class BaseMobileScreen {
  constructor(driver) {
    this.driver = driver;
  }

  async findByText(text) {
    return await this.driver.$(`android=new UiSelector().textContains("${text}")`);
  }

  async findByDesc(desc) {
    return await this.driver.$(`android=new UiSelector().descriptionContains("${desc}")`);
  }

  async findByTestTag(tag) {
    return await this.driver.$(`~${tag}`);
  }

  async isVisible(element) {
    try {
      return await element.isDisplayed();
    } catch {
      return false;
    }
  }

  async takeScreenshot(filepath) {
    return await this.driver.saveScreenshot(filepath);
  }
}
