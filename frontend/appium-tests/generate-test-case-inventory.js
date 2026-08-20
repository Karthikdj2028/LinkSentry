import { mobileTestCases } from './tests/mobile-test-definitions.js';
import fs from 'fs';
import path from 'path';

export function getMobileTestInventory() {
  return mobileTestCases.map(tc => ({
    id: tc.id,
    title: tc.name,
    module: tc.module,
    priority: tc.priority,
    preconditions: 'LinkSentry Android APK installed on target device/emulator',
    testSteps: `1. Launch LinkSentry Android App\n2. Navigate to screen ${tc.module}\n3. Execute verification for: ${tc.name}\n4. Validate Compose UI state & backend sync`,
    expectedResult: tc.expected,
    automationFile: 'frontend/appium-tests/run-mobile-tests.js',
    automationStatus: 'AUTOMATED',
  }));
}

export function generateMobileInventoryJson() {
  const inventory = getMobileTestInventory();
  const outDir = path.resolve('frontend', 'appium-tests', 'reports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, 'mobile-test-inventory.json');
  fs.writeFileSync(outFile, JSON.stringify(inventory, null, 2));
  console.log(`[LinkSentry QA] Mobile Test Inventory (${inventory.length} cases) saved at: ${outFile}`);
  return inventory;
}

if (process.argv[1]?.endsWith('generate-test-case-inventory.js')) {
  generateMobileInventoryJson();
}
