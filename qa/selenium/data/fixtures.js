/**
 * LinkSentry Selenium Test Fixtures & Data Oracle
 */

export const AUTH_FIXTURES = {
  validUser: {
    email: 'analyst.qa.test@linksentry.io',
    password: 'TestPass123!',
    displayName: 'QA Security Analyst'
  },
  invalidUsers: [
    { email: '', password: '', desc: 'Empty credentials' },
    { email: 'invalid-email', password: 'TestPass123!', desc: 'Invalid email format' },
    { email: 'analyst.qa.test@linksentry.io', password: 'WrongPassword!', desc: 'Incorrect password' },
    { email: 'nonexistent.user.999@linksentry.io', password: 'SomePassword123!', desc: 'Non-existent account' },
    { email: '  analyst.qa.test@linksentry.io  ', password: 'TestPass123!', desc: 'Whitespace email' }
  ]
};

export const URL_FIXTURES = {
  safe: [
    'https://google.com',
    'https://github.com/security/advisories',
    'https://wikipedia.org/wiki/Cybersecurity',
    'https://microsoft.com',
    'https://apple.com',
    'https://amazon.com',
    'https://cloudflare.com',
    'https://stackoverlow.com',
    'https://python.org',
    'https://fastapi.tiangolo.com'
  ],
  phishing: [
    'https://login-apple-security-check.xyz/auth',
    'https://secure-bank-verify-account.info/login.php',
    'http://paypal-security-alert-update.top/account',
    'https://account-update-amazon-support.top/signin',
    'https://netflix-subscription-update.info/renew',
    'http://192.168.1.1/login.html?redirect=phish.xyz',
    'https://chase-bank-verify-pin.online/secure',
    'https://wellsfargo-online-banking.tech/login'
  ],
  suspicious: [
    'http://suspicious-download-portal.site/setup.exe',
    'http://free-crypto-rewards-claim.xyz/bonus',
    'http://urgent-notice-security.online',
    'http://untrusted-domain-check.xyz/test'
  ]
};

export const MESSAGE_FIXTURES = {
  legitimate: [
    'Your OTP for login is 482910. Valid for 5 minutes. Do not share.',
    'Hey John, meeting is scheduled for 3 PM today.',
    'Your Amazon package has been delivered to your front porch.',
    'Reminder: Dentist appointment tomorrow at 10 AM.'
  ],
  phishing: [
    'URGENT: Your bank account will be locked within 24 hours. Verify your PIN now at https://secure-bank-verify-account.info',
    'ALERT: Suspicious activity on your Apple ID. Click http://login-apple-security-check.xyz to secure your account.',
    'CONGRATS! You won $5,000 gift card. Claim immediately at http://free-crypto-rewards-claim.xyz/bonus',
    'FINAL NOTICE: Tax refund of $1,250 is pending. Update info at https://account-update-amazon-support.top'
  ]
};
