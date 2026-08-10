import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsDir = path.resolve(__dirname, '../reports');

/**
 * Generates structured Excel E2E execution report
 * with Summary, Test Cases, Failed Tests, and Execution Logs.
 */
export class ExcelReporter {
  constructor() {
    this.testResults = [];
    this.failedTests = [];
    this.executionLogs = [];
    this.startTime = new Date();
  }

  logStep(testName, step, result = 'SUCCESS', remarks = '') {
    this.executionLogs.push({
      timestamp: new Date().toISOString(),
      testName,
      step,
      result,
      remarks,
    });
  }

  recordTest(result) {
    this.testResults.push(result);
    if (result.status === 'FAILED') {
      this.failedTests.push(result);
    }
  }

  async generateReport(metadata = {}) {
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, 'E2E_Report.xlsx');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LinkSentry QA Automation Framework';
    workbook.created = new Date();

    const totalTests = this.testResults.length;
    const passed = this.testResults.filter((t) => t.status === 'PASSED').length;
    const failed = this.testResults.filter((t) => t.status === 'FAILED').length;
    const skipped = this.testResults.filter((t) => t.status === 'SKIPPED').length;
    const passPercentage = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) + '%' : '0%';
    const duration = ((new Date() - this.startTime) / 1000).toFixed(2) + 's';

    // -------------------------------------------------------------------------
    // 1. Summary Sheet
    // -------------------------------------------------------------------------
    const summarySheet = workbook.addWorksheet('Summary', {
      views: [{ showGridLines: true }],
    });

    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 40 },
    ];

    summarySheet.addRows([
      { metric: 'Execution Date', value: new Date().toLocaleString() },
      { metric: 'Target Environment', value: metadata.baseUrl || 'https://linksentry-7e694.web.app' },
      { metric: 'Browser Engine', value: metadata.browser || 'Chrome' },
      { metric: 'Total Tests Executed', value: totalTests },
      { metric: 'Passed Tests', value: passed },
      { metric: 'Failed Tests', value: failed },
      { metric: 'Skipped Tests', value: skipped },
      { metric: 'Pass Percentage', value: passPercentage },
      { metric: 'Total Execution Duration', value: duration },
    ]);

    // Style Summary header
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF06B6D4' },
    };

    // -------------------------------------------------------------------------
    // 2. Test Cases Sheet
    // -------------------------------------------------------------------------
    const testCasesSheet = workbook.addWorksheet('Test Cases', {
      views: [{ showGridLines: true }],
    });

    testCasesSheet.columns = [
      { header: 'Test ID', key: 'id', width: 15 },
      { header: 'Module', key: 'module', width: 20 },
      { header: 'Scenario', key: 'scenario', width: 45 },
      { header: 'Browser', key: 'browser', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Duration (ms)', key: 'duration', width: 18 },
    ];

    this.testResults.forEach((test) => {
      const row = testCasesSheet.addRow(test);
      if (test.status === 'PASSED') {
        row.getCell('status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDCFCE7' },
        };
        row.getCell('status').font = { color: { argb: 'FF15803D' }, bold: true };
      } else if (test.status === 'FAILED') {
        row.getCell('status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' },
        };
        row.getCell('status').font = { color: { argb: 'FFB91C1C' }, bold: true };
      }
    });

    testCasesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    testCasesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0E7490' },
    };

    // -------------------------------------------------------------------------
    // 3. Failed Tests Sheet
    // -------------------------------------------------------------------------
    const failedSheet = workbook.addWorksheet('Failed Tests', {
      views: [{ showGridLines: true }],
    });

    failedSheet.columns = [
      { header: 'Test Name', key: 'scenario', width: 35 },
      { header: 'Failure Reason', key: 'error', width: 50 },
      { header: 'Screenshot File', key: 'screenshot', width: 35 },
      { header: 'URL at Failure', key: 'url', width: 35 },
    ];

    this.failedTests.forEach((failure) => {
      failedSheet.addRow({
        scenario: failure.scenario,
        error: failure.error || 'Assertion failed',
        screenshot: failure.screenshot || 'N/A',
        url: failure.url || 'N/A',
      });
    });

    failedSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    failedSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC2626' },
    };

    // -------------------------------------------------------------------------
    // 4. Execution Logs Sheet
    // -------------------------------------------------------------------------
    const logsSheet = workbook.addWorksheet('Execution Logs', {
      views: [{ showGridLines: true }],
    });

    logsSheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 24 },
      { header: 'Test Name', key: 'testName', width: 30 },
      { header: 'Step', key: 'step', width: 45 },
      { header: 'Result', key: 'result', width: 15 },
      { header: 'Remarks', key: 'remarks', width: 35 },
    ];

    this.executionLogs.forEach((log) => {
      logsSheet.addRow(log);
    });

    logsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    logsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' },
    };

    await workbook.xlsx.writeFile(filePath);
    logger.info(`Excel E2E Report generated at: ${filePath}`);
    return filePath;
  }
}

export const excelReporter = new ExcelReporter();
export default excelReporter;
