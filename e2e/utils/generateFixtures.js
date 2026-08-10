import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

async function generateQrFixtures() {
  console.log('Generating deterministic QR test fixtures...');

  // 1. Safe URL QR
  await QRCode.toFile(
    path.join(fixturesDir, 'sample_safe_qr.png'),
    'https://example.com',
    { width: 300, margin: 2 }
  );

  // 2. Phishing URL QR
  await QRCode.toFile(
    path.join(fixturesDir, 'sample_phishing_qr.png'),
    'http://paypal-security-verification.xyz',
    { width: 300, margin: 2 }
  );

  // 3. Mailto Non-URL QR
  await QRCode.toFile(
    path.join(fixturesDir, 'sample_mailto_qr.png'),
    'mailto:security-alert@linksentry.io',
    { width: 300, margin: 2 }
  );

  console.log('✓ QR test fixtures generated successfully in e2e/fixtures/');
}

generateQrFixtures().catch((err) => {
  console.error('Failed to generate QR fixtures:', err);
  process.exit(1);
});
