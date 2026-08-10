import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

export const testData = {
  // URL Test Data
  urls: {
    safe: 'https://example.com',
    phishing: 'http://paypal-security-verification.xyz',
    invalid: 'not-a-valid-protocol://invalid',
  },

  // Message / SMS Test Data
  messages: {
    safe: 'Meeting is scheduled for tomorrow at 10 AM.',
    suspicious: 'Your account has been locked. Verify your account now.',
    otpPhishing: 'Your bank account is suspended. Send the OTP immediately to restore access.',
    stage6cRenewalPhishing: 'Dear user, your cloud storage subscription could not renew automatically. To keep your files safe, check billing at http://cloud-storage-renewal-fix.net/pay today.',
  },

  // QR Fixture File Paths
  fixtures: {
    safeQr: path.join(fixturesDir, 'sample_safe_qr.png'),
    phishingQr: path.join(fixturesDir, 'sample_phishing_qr.png'),
    mailtoQr: path.join(fixturesDir, 'sample_mailto_qr.png'),
  },

  // Non-URL QR Payloads
  nonUrlPayloads: {
    email: 'mailto:security-alert@linksentry.io',
    phone: 'tel:+18005550199',
  }
};

export default testData;
