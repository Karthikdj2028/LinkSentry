const BACKEND_URL = 'http://127.0.0.1:8000';

const TEST_URLS = [
  'https://google.com',
  'https://amazon.in',
  'https://www.ggle.com',
  'https://www.micros0ft.com',
  'http://login-verify-account-security-update.example.com/resetPath',
  'http://chase-bank-online-security-auth--check.xyz/login.php',
];

async function main() {
  console.log('=== TESTING DIRECT BACKEND API SCANS ===\n');

  for (const url of TEST_URLS) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BACKEND_URL}/api/scan/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      const elapsed = Date.now() - t0;
      console.log(`URL: ${url} (${elapsed}ms)`);
      console.log('  Verdict:', data.verdict);
      console.log('  Risk Score:', data.risk_score);
      console.log('  ML Prediction:', data.ml_prediction);
      console.log('  Trusted Domain:', data.trusted_domain);
      console.log('  Decision Scores:', data.decision_scores);
      console.log('  Domain Verification:', {
        dns_status: data.domain_verification?.dns_status,
        http_status: data.domain_verification?.http_status,
        http_reachable: data.domain_verification?.http_reachable,
      });
      console.log('');
    } catch (err) {
      console.error(`Error scanning ${url}:`, err.message);
    }
  }
}

main();
