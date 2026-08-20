import { loadScenarios } from './scenarios/load-scenarios-definitions.js';
import fs from 'fs';
import path from 'path';

export function getLoadTestInventory() {
  return loadScenarios.map(sc => ({
    id: sc.id,
    title: sc.name,
    module: sc.category,
    priority: sc.vus >= 100 ? 'High' : 'Medium',
    preconditions: `LinkSentry FastAPI backend online at target URL; target endpoint ${sc.endpoint}`,
    testSteps: `1. Initialize HTTP load generator with ${sc.vus} Virtual Users\n2. Target ${sc.method} ${sc.endpoint}\n3. Generate ${sc.traffic} pattern for duration ${sc.duration}\n4. Collect response latency, RPS, error rate, throughput`,
    expectedResult: `P95 latency within threshold, zero unhandled 500 exceptions, error rate < 1.0%`,
    automationFile: sc.vus === 300 ? 'load-tests/baseline-300-users.js' : 'load-tests/run-load-tests.js',
    automationStatus: 'AUTOMATED',
  }));
}

export function generateLoadInventoryJson() {
  const inventory = getLoadTestInventory();
  const outDir = path.resolve('load-tests', 'results');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, 'load-test-inventory.json');
  fs.writeFileSync(outFile, JSON.stringify(inventory, null, 2));
  console.log(`[LinkSentry QA] Load Test Inventory (${inventory.length} cases) saved at: ${outFile}`);
  return inventory;
}

if (process.argv[1]?.endsWith('load-test-inventory.js')) {
  generateLoadInventoryJson();
}
