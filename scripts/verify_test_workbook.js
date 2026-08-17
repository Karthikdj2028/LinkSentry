import path from 'path';
import ExcelJS from 'exceljs';

async function verify() {
  const filePath = path.resolve('testing/LinkSentry_Test_Cases.xlsx');
  console.log(`Verifying workbook at: ${filePath}`);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log(`\nWorkbook Sheet Count: ${workbook.worksheets.length}`);
  
  let totalRows = 0;
  const sheetStats = [];

  workbook.worksheets.forEach((ws, index) => {
    const rowCount = ws.rowCount;
    sheetStats.push({
      index: index + 1,
      name: ws.name,
      rows: rowCount,
      columns: ws.columnCount
    });
    if (index >= 2 && index <= 4) {
      // Main 3 suites
      totalRows += (rowCount - 1); // exclude header
    }
  });

  console.table(sheetStats);
  console.log(`\nTotal Test Cases across 3 Master Suites (Selenium + Appium + Load): ${totalRows}`);
  
  if (totalRows === 1015) {
    console.log('✅ PASS: Exactly 1,015 test cases preserved in the 3 master suites!');
  } else {
    console.warn(`⚠️ Warning: Found ${totalRows} test cases, expected 1015.`);
  }

  // Check for duplicate test IDs
  const allIds = new Set();
  const duplicates = [];

  const mainSheets = ['Selenium Web Tests', 'Appium Android Tests', 'Load Performance Tests'];
  mainSheets.forEach(sheetName => {
    const ws = workbook.getWorksheet(sheetName);
    ws.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const id = row.getCell(1).value;
        if (allIds.has(id)) {
          duplicates.push(id);
        } else {
          allIds.add(id);
        }
      }
    });
  });

  console.log(`\nUnique Test Case IDs Count: ${allIds.size}`);
  if (duplicates.length === 0) {
    console.log('✅ PASS: Zero duplicate Test Case IDs found!');
  } else {
    console.error(`❌ FAIL: Found ${duplicates.length} duplicate IDs:`, duplicates);
  }
}

verify().catch(console.error);
