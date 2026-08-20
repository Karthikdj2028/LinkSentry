import { webTestCases } from './tests/web-test-definitions.js';
import fs from 'fs';
import path from 'path';

export function getWebTestInventory() {
  return webTestCases.map(tc => ({
    id: tc.id,
    title: tc.name,
    module: tc.module,
    priority: tc.priority,
    preconditions: 'LinkSentry Web Application active on localhost / test environment',
    testSteps: `1. Open LinkSentry Web App\n2. Navigate to module ${tc.module}\n3. Execute verification for: ${tc.name}\n4. Validate response/UI state`,
    expectedResult: tc.expected,
    automationFile: 'selenium-tests/run-web-tests.js',
    automationStatus: 'AUTOMATED',
  }));
}

export function generateWebInventoryJson() {
  const inventory = getWebTestInventory();
  const outDir = path.resolve('selenium-tests', 'reports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, 'web-test-inventory.json');
  fs.writeFileSync(outFile, JSON.stringify(inventory, null, 2));
  console.log(`[LinkSentry QA] Web Test Inventory (${inventory.length} cases) saved at: ${outFile}`);
  return inventory;
}

if (process.argv[1]?.endsWith('generate-test-case-inventory.js')) {
  generateWebInventoryJson();
}
