import { BaseMobileScreen } from './BaseMobileScreen.js';

export class BottomNav extends BaseMobileScreen {
  constructor(driver) {
    super(driver);
  }

  async tapScannerTab() {
    const tab = await this.findByText('Scanner');
    await tab.click();
  }

  async tapHistoryTab() {
    const tab = await this.findByText('History');
    await tab.click();
  }

  async tapProfileTab() {
    const tab = await this.findByText('Profile');
    await tab.click();
  }
}
