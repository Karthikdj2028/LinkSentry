import { runSeleniumTestSuite } from './selenium/tests/selenium-suite-runner.js';
import { runAppiumTestSuite } from './appium/tests/appium-suite-runner.js';
import { runK6ChecksSuite } from './k6/scenarios/k6-suite-runner.js';
import { generateQAReports } from './utilities/report-generator.js';

async function executeFullQAFramework() {
  console.log('================================================================');
  console.log('       LINKSENTRY AUTOMATED QA FRAMEWORK EXECUTION ENGINE       ');
  console.log('================================================================');

  const startAll = Date.now();

  // Phase 2A: Selenium Web Automation
  const seleniumResults = await runSeleniumTestSuite();

  // Phase 2B: Appium Native Android Automation
  const appiumResults = await runAppiumTestSuite();

  // Phase 2C: k6 Backend API Performance Checks
  const k6Results = await runK6ChecksSuite();

  // Phase 2D: Generate Unified Excel & HTML Reports
  const reportStats = await generateQAReports(seleniumResults, appiumResults, k6Results);

  const durationSec = ((Date.now() - startAll) / 1000).toFixed(1);

  console.log('\n================================================================');
  console.log('                    FINAL QA EXECUTION SUMMARY                  ');
  console.log('================================================================');
  console.log(`Selenium Web Tests Executed:     ${seleniumResults.length} (Passed: ${seleniumResults.filter(r => r.status === 'PASS').length})`);
  console.log(`Appium Android Tests Executed:  ${appiumResults.length} (Passed: ${appiumResults.filter(r => r.status === 'PASS').length})`);
  console.log(`k6 Performance Checks Executed: ${k6Results.length} (Passed: ${k6Results.filter(r => r.status === 'PASS').length})`);
  console.log('----------------------------------------------------------------');
  console.log(`TOTAL EXECUTED:                 ${reportStats.totalExecuted}`);
  console.log(`TOTAL PASSED:                   ${reportStats.totalPassed}`);
  console.log(`TOTAL FAILED:                   ${reportStats.totalFailed}`);
  console.log(`OVERALL PASS RATE:              ${reportStats.passRate}%`);
  console.log(`EXECUTION TIME:                 ${durationSec}s`);
  console.log('================================================================');
  console.log(`Excel Report Generated: ${reportStats.excelPath}`);
  console.log(`HTML Dashboard Generated: ${reportStats.htmlPath}`);
  console.log('================================================================\n');
}

executeFullQAFramework();
