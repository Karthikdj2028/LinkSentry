/**
 * LinkSentry Mock Dataset - Stage 1
 * 
 * TODO: In Stage 2, connect this to Firebase Firestore:
 * - collection('scans') for real-time history logs
 * - collection('telemetry') for dynamic dashboard metrics
 * - collection('users') for user profiles and API usage
 */

export const MOCK_HISTORY = [
  {
    id: 'scan-001',
    scanType: 'URL',
    input: 'https://chase-bank-online-security-auth-check.xyz/login.php',
    result: 'Phishing',
    riskScore: 96,
    date: '2026-08-09 14:15:22',
    details: {
      domainAge: '3 days old',
      sslValid: false,
      typosquatting: 'Impersonates chase.com',
      ipCountry: 'RU (High-risk ASN)',
      threatClassification: 'Credential Harvesting / Banking Trojan',
      confidence: '99.4%'
    }
  },
  {
    id: 'scan-002',
    scanType: 'Message',
    input: '[URGENT] PayPal Notice: Unauthorized transaction of $649.99 detected. Call +1-800-555-0199 or verify now: http://ppal-dispute-resolution.co/review',
    result: 'Phishing',
    riskScore: 92,
    date: '2026-08-09 13:48:10',
    details: {
      urgencyLevel: 'Critical / Deceptive Urgency',
      deceptiveKeywords: ['URGENT', 'Unauthorized transaction', 'verify now'],
      extractedUrl: 'http://ppal-dispute-resolution.co/review',
      nlpVerdict: 'Social Engineering / Impersonation Attack',
      confidence: '98.1%'
    }
  },
  {
    id: 'scan-003',
    scanType: 'URL',
    input: 'https://github.com/tensorflow/tensorflow/releases',
    result: 'Safe',
    riskScore: 4,
    date: '2026-08-09 12:30:45',
    details: {
      domainAge: '17+ years',
      sslValid: true,
      typosquatting: 'None detected',
      ipCountry: 'US (Verified Cloud Provider)',
      threatClassification: 'Legitimate Developer Platform',
      confidence: '99.9%'
    }
  },
  {
    id: 'scan-004',
    scanType: 'QR',
    input: 'QR_Code_Promo_Poster_Discount.png (Decoded: http://free-giftcard-claim2026.net/claim?id=99)',
    result: 'Phishing',
    riskScore: 88,
    date: '2026-08-09 11:22:18',
    details: {
      payloadType: 'Redirect URL',
      decodedData: 'http://free-giftcard-claim2026.net/claim?id=99',
      qrDeobfuscation: 'Dynamic QR Redirect cloaking',
      threatClassification: 'Quishing / Malicious Survey Scam',
      confidence: '94.2%'
    }
  },
  {
    id: 'scan-005',
    scanType: 'URL',
    input: 'http://discount-shoes-sale-outlet-warehouse.info/deal',
    result: 'Suspicious',
    riskScore: 68,
    date: '2026-08-09 10:14:02',
    details: {
      domainAge: '18 days old',
      sslValid: false,
      typosquatting: 'Generic ecommerce scam pattern',
      ipCountry: 'NL (Shared Hosting)',
      threatClassification: 'Counterfeit Goods / Untrusted Merchant',
      confidence: '82.0%'
    }
  },
  {
    id: 'scan-006',
    scanType: 'Message',
    input: 'Your package from Amazon is out for delivery with tracking #940011189922. Driver will arrive by 5 PM.',
    result: 'Safe',
    riskScore: 6,
    date: '2026-08-09 09:05:14',
    details: {
      urgencyLevel: 'Low / Informational',
      deceptiveKeywords: [],
      extractedUrl: 'None',
      nlpVerdict: 'Legitimate Notification',
      confidence: '99.2%'
    }
  },
  {
    id: 'scan-007',
    scanType: 'QR',
    input: 'QR_Menu_Cafe_Downtown.png (Decoded: https://order.toasttab.com/online/downtown-bistro)',
    result: 'Safe',
    riskScore: 3,
    date: '2026-08-09 08:30:19',
    details: {
      payloadType: 'Direct URL',
      decodedData: 'https://order.toasttab.com/online/downtown-bistro',
      qrDeobfuscation: 'Direct Point of Sale Link',
      threatClassification: 'Legitimate Restaurant Menu',
      confidence: '99.8%'
    }
  },
  {
    id: 'scan-008',
    scanType: 'Message',
    input: 'Bank of America Security Alert: We detected an unusual sign-in from Lagos, Nigeria. If this was not you, confirm identity at http://bofa-verify-sessions.top',
    result: 'Phishing',
    riskScore: 95,
    date: '2026-08-08 23:41:00',
    details: {
      urgencyLevel: 'Severe / Fear Inducing',
      deceptiveKeywords: ['Security Alert', 'unusual sign-in', 'confirm identity'],
      extractedUrl: 'http://bofa-verify-sessions.top',
      nlpVerdict: 'Brand Impersonation & Credential Theft',
      confidence: '98.9%'
    }
  },
  {
    id: 'scan-009',
    scanType: 'URL',
    input: 'https://docs.python.org/3/tutorial/index.html',
    result: 'Safe',
    riskScore: 1,
    date: '2026-08-08 21:19:33',
    details: {
      domainAge: '25+ years',
      sslValid: true,
      typosquatting: 'None detected',
      ipCountry: 'US (Verified Foundation CDN)',
      threatClassification: 'Official Open Source Documentation',
      confidence: '100%'
    }
  },
  {
    id: 'scan-010',
    scanType: 'URL',
    input: 'http://192.168.1.1.updater-router-firmware-patch.xyz/setup',
    result: 'Suspicious',
    riskScore: 62,
    date: '2026-08-08 18:02:11',
    details: {
      domainAge: '12 days old',
      sslValid: false,
      typosquatting: 'Subdomain spoofing of private IP RFC-1918',
      ipCountry: 'SC (Offshore Registrar)',
      threatClassification: 'DNS Hijack / Router Exploit Lure',
      confidence: '78.5%'
    }
  }
];

export const MOCK_DASHBOARD_STATS = {
  totalScans: 14892,
  safeScans: 11420,
  suspiciousScans: 2145,
  phishingScans: 1327,
  avgResponseMs: 42,
  activeThreatSignatures: 84321,
  defenseEfficiencyRate: '99.82%',
  threatVectors: [
    { name: 'URL Scans', count: 9530, percentage: 64, color: '#06b6d4' },
    { name: 'QR Codes (Quishing)', count: 2680, percentage: 18, color: '#8b5cf6' },
    { name: 'SMS / Messages (Smishing)', count: 2682, percentage: 18, color: '#f59e0b' }
  ],
  recentAlerts: [
    {
      id: 'alert-1',
      title: 'High Volume Banking Smishing Campaign',
      vector: 'SMS / Message',
      severity: 'Critical',
      timestamp: '12 minutes ago',
      details: 'Detected 42 variants spoofing major US retail banks using dynamic .xyz subdomains.'
    },
    {
      id: 'alert-2',
      title: 'Malicious QR Code Infiltration (Quishing)',
      vector: 'QR Code',
      severity: 'High',
      timestamp: '1 hour ago',
      details: 'Parking meter sticker scam impersonating municipal payment gateways.'
    },
    {
      id: 'alert-3',
      title: 'Zero-Day Typosquatted Domain Registered',
      vector: 'URL Scanner',
      severity: 'Medium',
      timestamp: '3 hours ago',
      details: 'Novel homograph attack detected using Cyrillic "a" in cloud portal login URLs.'
    }
  ]
};

export const PRESET_SAMPLES = {
  urls: [
    {
      label: 'Safe URL (GitHub Docs)',
      url: 'https://docs.github.com/en/get-started',
      type: 'Safe',
      score: 5,
      verdict: 'Verified Safe'
    },
    {
      label: 'Suspicious URL (Untrusted Host)',
      url: 'http://login-verify-account-security-update.com/reset',
      type: 'Suspicious',
      score: 64,
      verdict: 'Suspicious Domain'
    },
    {
      label: 'Malicious URL (Phishing Clone)',
      url: 'http://chase-bank-online-security-auth-check.xyz/login.php',
      type: 'Phishing',
      score: 96,
      verdict: 'High-Risk Phishing'
    }
  ],
  messages: [
    {
      label: 'Legitimate SMS (Doctor Appt)',
      text: 'Hello! Your dental cleaning appointment with Dr. Alvarez is scheduled for Thursday, Aug 14 at 10:00 AM. Please reply YES to confirm or NO to reschedule.',
      type: 'Safe',
      score: 4,
      verdict: 'Legitimate Message'
    },
    {
      label: 'Suspicious SMS (Subscription Alert)',
      text: 'Dear user, your cloud storage subscription could not renew automatically. To keep your files safe, check billing at http://cloud-storage-renewal-fix.net/pay today.',
      type: 'Suspicious',
      score: 67,
      verdict: 'Suspicious Lure'
    },
    {
      label: 'Phishing SMS (Urgent Bank Lock)',
      text: '[URGENT] CHASE ALERT: Unauthorized wire transfer of $2,850.00 detected on your debit card ending in 4109. If this was NOT you, click immediately to dispute & lock card: http://chase-security-auth-alert.xyz/dispute',
      type: 'Phishing',
      score: 95,
      verdict: 'Malicious Smishing'
    }
  ],
  qrCodes: [
    {
      label: 'Legitimate QR (Restaurant Menu)',
      name: 'restaurant_menu_qr.png',
      decoded: 'https://downtownbistro.com/menu.pdf',
      type: 'Safe',
      score: 2,
      verdict: 'Verified Safe QR'
    },
    {
      label: 'Suspicious QR (Cryptocurrency Voucher)',
      name: 'crypto_giveaway_qr.png',
      decoded: 'http://claim-airdrop-eth-bonus2026.xyz/wallet-connect',
      type: 'Suspicious',
      score: 72,
      verdict: 'Suspicious Web3 Lure'
    },
    {
      label: 'Malicious QR (Parking Meter Quishing)',
      name: 'malicious_parking_payment_qr.png',
      decoded: 'http://park-city-fastpay-meter-login.top/cc-entry.php',
      type: 'Phishing',
      score: 93,
      verdict: 'Quishing / Credential Theft'
    }
  ]
};

export const MOCK_USER_PROFILE = {
  name: 'Alex Vance',
  role: 'Senior Cyber Threat Analyst',
  organization: 'CyberDefend Global SOC',
  email: 'alex.vance@linksentry-soc.io',
  avatarInitials: 'AV',
  tier: 'Enterprise Sentinel Plan',
  apiKey: 'ls_live_948f102a39d84c17b88e104f02',
  joinedDate: 'January 2026',
  totalScansRan: 842,
  preferences: {
    realTimeAlerts: true,
    autoQuarantine: true,
    telemetrySharing: false,
    soundNotifications: true
  }
};
