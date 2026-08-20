import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { getWebTestInventory } from '../selenium-tests/generate-test-case-inventory.js';
import { getMobileTestInventory } from '../frontend/appium-tests/generate-test-case-inventory.js';
import { getLoadTestInventory } from '../load-tests/load-test-inventory.js';
import { getSecurityTestInventory } from '../vulnerability-tests/generate-security-inventory.js';

export async function generateCompleteMasterInventory() {
  const outputDir = path.resolve('test-reports', 'combined');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const webCases = getWebTestInventory();
  const mobileCases = getMobileTestInventory();
  const loadCases = getLoadTestInventory();
  const securityCases = getSecurityTestInventory();

  const totalCases = webCases.length + mobileCases.length + loadCases.length + securityCases.length;

  console.log(`\n========================================================================`);
  console.log(`Generating LinkSentry Master Test Inventory (${totalCases} Unique Test Cases)`);
  console.log(`========================================================================`);
  console.log(`  - Web Test Cases:      ${webCases.length}`);
  console.log(`  - Mobile Test Cases:   ${mobileCases.length}`);
  console.log(`  - Load Test Cases:     ${loadCases.length}`);
  console.log(`  - Security Test Cases: ${securityCases.length}`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LinkSentry QA & Security Engineering';
  workbook.created = new Date();

  function addInventorySheet(sheetName, testCases, headerColor) {
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1, showGridLines: true }]
    });

    sheet.columns = [
      { header: 'Test Case ID', key: 'id', width: 15 },
      { header: 'Test Case Title', key: 'title', width: 42 },
      { header: 'Module / Category', key: 'module', width: 24 },
      { header: 'Priority', key: 'priority', width: 14 },
      { header: 'Preconditions', key: 'preconditions', width: 35 },
      { header: 'Test Steps', key: 'testSteps', width: 45 },
      { header: 'Expected Result', key: 'expectedResult', width: 45 },
      { header: 'Automation File', key: 'automationFile', width: 35 },
      { header: 'Automation Status', key: 'automationStatus', width: 18 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    testCases.forEach((tc, idx) => {
      const row = sheet.addRow(tc);
      row.alignment = { vertical: 'middle', wrapText: true };

      const statusCell = row.getCell('automationStatus');
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      statusCell.font = { color: { argb: 'FF065F46' }, bold: true };
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: testCases.length + 1, column: 9 }
    };
  }

  addInventorySheet('Web Test Cases', webCases, 'FF0369A1');       // Deep Sky Blue
  addInventorySheet('Mobile Test Cases', mobileCases, 'FF047857');   // Emerald Green
  addInventorySheet('Load Test Cases', loadCases, 'FFB45309');       // Amber Orange
  addInventorySheet('Security Test Cases', securityCases, 'FFB91C1C'); // Crimson Red

  const outputPath = path.join(outputDir, 'Complete_Test_Case_Inventory.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`\n[Master Inventory] Successfully generated Excel workbook at: ${outputPath}\n`);
  return outputPath;
}

if (process.argv[1]?.endsWith('generate-complete-inventory.js')) {
  generateCompleteMasterInventory().catch(console.error);
}
