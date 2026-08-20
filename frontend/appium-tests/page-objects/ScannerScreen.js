import { BaseMobileScreen } from './BaseMobileScreen.js';

export class ScannerScreen extends BaseMobileScreen {
  constructor(driver) {
    super(driver);
  }

  async getUrlInputField() {
    return await this.driver.$('android=new UiSelector().className("android.widget.EditText")');
  }

  async getScanButton() {
    return await this.driver.$('android=new UiSelector().textContains("SCAN").className("android.widget.Button")');
  }

  async getQrButton() {
    return await this.findByDesc('QR');
  }

  async scanUrl(url) {
    const input = await this.getUrlInputField();
    await input.setValue(url);
    const btn = await this.getScanButton();
    await btn.click();
  }

  async isVerdictCardDisplayed() {
    try {
      const card = await this.findByText('FINAL SECURITY VERDICT');
      return await card.isDisplayed();
    } catch {
      return false;
    }
  }
}
