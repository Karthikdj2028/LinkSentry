import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

async function test() {
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--disable-gpu', '--no-sandbox');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  
  try {
    await driver.get('http://localhost:5173');
    await driver.executeScript(() => {
      localStorage.setItem('linksentry_e2e_session', JSON.stringify({ uid: 'analyst', email: 'analyst@linksentry.io' }));
    });
    await driver.get('http://localhost:5173/scanner?type=url');
    await driver.sleep(1000);

    const input = await driver.findElement(By.css('[data-testid="url-scan-input"]'));
    await input.sendKeys('https://google.com');

    const submit = await driver.findElement(By.css('[data-testid="url-scan-submit"]'));
    await driver.executeScript('arguments[0].scrollIntoView({ block: "center" });', submit);
    await driver.sleep(200);
    await driver.executeScript('arguments[0].click();', submit);

    console.log('Clicked submit! Waiting 4s...');
    await driver.sleep(4000);

    const card = await driver.findElements(By.css('[data-testid="scan-result-card"]'));
    console.log('Found scan-result-card count:', card.length);

    if (card.length > 0) {
      const verdict = await driver.findElement(By.css('[data-testid="scan-result-verdict"]')).getText();
      console.log('Verdict text:', verdict);
    } else {
      const pageText = await driver.findElement(By.css('body')).getText();
      console.log('Body text:', pageText.slice(0, 500));
      const logs = await driver.manage().logs().get('browser');
      console.log('Browser logs:', logs);
    }
  } finally {
    await driver.quit();
  }
}

test().catch(console.error);
