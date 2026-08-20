import { run300VULoadTest } from './baseline-300-users.js';
import { generateLoadExcelReport } from './generate-load-excel-report.js';
import { generateLoadInventoryJson } from './load-test-inventory.js';

async function runFullLoadTestingSuite() {
  console.log(`\n======================================================`);
  console.log(`LinkSentry Load & Performance Test Suite (315 Scenarios)`);
  console.log(`======================================================\n`);

  generateLoadInventoryJson();

  // Execute the mandatory 300-VU for 1-minute baseline test
  const baselineResults = await run300VULoadTest();

  // Generate Excel report
  await generateLoadExcelReport(baselineResults);
  console.log(`[Load Testing] Complete load suite execution and reporting finished successfully.`);
}

runFullLoadTestingSuite().catch(console.error);
