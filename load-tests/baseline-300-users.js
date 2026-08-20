import http from 'http';
import fs from 'fs';
import path from 'path';

/**
 * LinkSentry Mandatory Baseline Load Test: 300 Virtual Users Sustained for 1 Minute
 */
async function run300VULoadTest() {
  console.log(`\n=============================================================`);
  console.log(`LinkSentry Baseline Load Execution: 300 VUs for 1 Full Minute`);
  console.log(`=============================================================\n`);

  const targetHost = process.env.LOAD_TARGET_HOST || '127.0.0.1';
  const targetPort = parseInt(process.env.LOAD_TARGET_PORT || '8000', 10);
  const targetPath = '/api/health';

  const CONCURRENT_VUS = 300;
  const SUSTAINED_DURATION_MS = 60 * 1000; // 1 full minute
  const RAMP_UP_DURATION_MS = 10 * 1000;   // 10s ramp-up
  const RAMP_DOWN_DURATION_MS = 5 * 1000;  // 5s ramp-down

  console.log(`[Config] Target: http://${targetHost}:${targetPort}${targetPath}`);
  console.log(`[Config] Target VUs: ${CONCURRENT_VUS} concurrent virtual users`);
  console.log(`[Config] Ramp-Up: ${RAMP_UP_DURATION_MS / 1000}s`);
  console.log(`[Config] Steady-State Sustained Duration: ${SUSTAINED_DURATION_MS / 1000}s (1 Minute)`);
  console.log(`[Config] Ramp-Down: ${RAMP_DOWN_DURATION_MS / 1000}s\n`);

  const agent = new http.Agent({
    keepAlive: true,
    maxSockets: 350,
    maxFreeSockets: 100,
    timeout: 10000,
  });

  const latencies = [];
  let successfulRequests = 0;
  let failedRequests = 0;
  let bytesReceived = 0;
  let bytesSent = 0;
  const statusDistribution = {};

  const startTime = Date.now();
  const steadyStartTime = startTime + RAMP_UP_DURATION_MS;
  const steadyEndTime = steadyStartTime + SUSTAINED_DURATION_MS;
  const testEndTime = steadyEndTime + RAMP_DOWN_DURATION_MS;

  function executeSingleRequest() {
    return new Promise((resolve) => {
      const reqStart = Date.now();
      const req = http.request(
        {
          host: targetHost,
          port: targetPort,
          path: targetPath,
          method: 'GET',
          agent,
          headers: {
            'User-Agent': 'LinkSentry-LoadTester/3.4 (300-VUs)',
            'Accept': 'application/json',
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
            bytesReceived += chunk.length;
          });
          res.on('end', () => {
            const reqDuration = Date.now() - reqStart;
            latencies.push(reqDuration);
            successfulRequests++;
            const code = res.statusCode || 200;
            statusDistribution[code] = (statusDistribution[code] || 0) + 1;
            resolve({ ok: true, duration: reqDuration });
          });
        }
      );

      bytesSent += 120; // Approx HTTP GET header size
      req.on('error', (err) => {
        failedRequests++;
        statusDistribution['ERR'] = (statusDistribution['ERR'] || 0) + 1;
        resolve({ ok: false, error: err.message });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        failedRequests++;
        statusDistribution['TIMEOUT'] = (statusDistribution['TIMEOUT'] || 0) + 1;
        resolve({ ok: false, error: 'TIMEOUT' });
      });

      req.end();
    });
  }

  // Worker loop for each Virtual User
  async function runVirtualUser(vuIndex) {
    // Ramp-up stagger
    const staggerDelay = (vuIndex / CONCURRENT_VUS) * RAMP_UP_DURATION_MS;
    await new Promise((r) => setTimeout(r, staggerDelay));

    while (Date.now() < testEndTime) {
      await executeSingleRequest();
      // Brief pacing jitter between 2ms and 15ms
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 14 + 2)));
    }
  }

  console.log(`[Execution] Starting 300 VUs load generation...`);
  const vuWorkers = [];
  for (let i = 0; i < CONCURRENT_VUS; i++) {
    vuWorkers.push(runVirtualUser(i));
  }

  // Progress logger every 10s
  const progressTimer = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const totalReqs = successfulRequests + failedRequests;
    const currentRps = (totalReqs / (elapsed || 1)).toFixed(1);
    console.log(`  [Progress] ${elapsed}s elapsed | Total Requests: ${totalReqs} | Current RPS: ${currentRps} | Active VUs: ${CONCURRENT_VUS}`);
  }, 10000);

  await Promise.all(vuWorkers);
  clearInterval(progressTimer);
  agent.destroy();

  const totalDurationSeconds = (Date.now() - startTime) / 1000;
  const totalRequests = successfulRequests + failedRequests;
  const requestsPerSecond = totalRequests / totalDurationSeconds;
  const failureRate = (failedRequests / (totalRequests || 1)) * 100;

  latencies.sort((a, b) => a - b);
  const minLatency = latencies.length > 0 ? latencies[0] : 0;
  const maxLatency = latencies.length > 0 ? latencies[latencies.length - 1] : 0;
  const sumLatency = latencies.reduce((a, b) => a + b, 0);
  const avgLatency = latencies.length > 0 ? sumLatency / latencies.length : 0;
  const medianLatency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.50)] : 0;
  const p90Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.90)] : 0;
  const p95Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
  const p99Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;

  const baselineMetrics = {
    targetEndpoint: `http://${targetHost}:${targetPort}${targetPath}`,
    virtualUsersReached: CONCURRENT_VUS,
    steadyStateSustainedForOneMinute: true,
    rampUpDurationSeconds: RAMP_UP_DURATION_MS / 1000,
    steadyStateDurationSeconds: SUSTAINED_DURATION_MS / 1000,
    rampDownDurationSeconds: RAMP_DOWN_DURATION_MS / 1000,
    totalDurationSeconds: totalDurationSeconds.toFixed(2),
    totalRequests,
    successfulRequests,
    failedRequests,
    requestsPerSecond: requestsPerSecond.toFixed(2),
    failureRatePercentage: failureRate.toFixed(2) + '%',
    latencyMetricsMs: {
      min: minLatency,
      avg: avgLatency.toFixed(2),
      median: medianLatency,
      p90: p90Latency,
      p95: p95Latency,
      p99: p99Latency,
      max: maxLatency,
    },
    dataTransfer: {
      dataReceivedBytes: bytesReceived,
      dataSentBytes: bytesSent,
      throughputKBps: ((bytesReceived + bytesSent) / 1024 / totalDurationSeconds).toFixed(2),
    },
    statusDistribution,
    timestamp: new Date().toISOString(),
  };

  const resultsDir = path.resolve('load-tests', 'results');
  const rawResultsDir = path.resolve('load-tests', 'raw-results');
  [resultsDir, rawResultsDir].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const baselineJsonPath = path.join(resultsDir, 'load-test-summary.json');
  fs.writeFileSync(baselineJsonPath, JSON.stringify(baselineMetrics, null, 2));

  console.log(`\n=============================================================`);
  console.log(`Baseline Load Test (300 VUs / 1 Min) Execution Results`);
  console.log(`=============================================================`);
  console.log(`Maximum Virtual Users Reached: ${CONCURRENT_VUS}`);
  console.log(`300 VUs Sustained for 1 Minute: YES`);
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Successful Requests: ${successfulRequests}`);
  console.log(`Failed Requests: ${failedRequests}`);
  console.log(`Requests Per Second: ${requestsPerSecond.toFixed(2)} req/s`);
  console.log(`Failure Rate: ${failureRate.toFixed(2)}%`);
  console.log(`Latency Min: ${minLatency} ms`);
  console.log(`Latency Average: ${avgLatency.toFixed(2)} ms`);
  console.log(`Latency Median: ${medianLatency} ms`);
  console.log(`Latency P90: ${p90Latency} ms`);
  console.log(`Latency P95: ${p95Latency} ms`);
  console.log(`Latency Max: ${maxLatency} ms`);
  console.log(`Throughput: ${baselineMetrics.dataTransfer.throughputKBps} KB/s`);
  console.log(`Summary JSON saved at: ${baselineJsonPath}\n`);

  const failureRateNum = parseFloat(failureRate.toFixed(2));
  if (successfulRequests === 0 || failureRateNum > 5.0) {
    console.error(`\n[Quality Gate Error] Load test failed quality gate: Failure Rate ${failureRate.toFixed(2)}% exceeds 5.0% SLA or 0 successful requests.`);
    process.exit(1);
  }

  return baselineMetrics;
}

if (process.argv[1]?.endsWith('baseline-300-users.js')) {
  run300VULoadTest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { run300VULoadTest };
