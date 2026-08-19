/**
 * LinkSentry Educational URL Parser Utility
 *
 * Deconstructs full URLs into human-understandable, semantically accurate segments:
 * - Scheme (http, https)
 * - Subdomain (e.g., 'secure-login', 'login.accounts')
 * - Registered Domain / SLD (e.g., 'paypal', 'example', 'paypa1')
 * - Top-Level Domain / Public Suffix (e.g., '.com', '.co.uk', '.com.au')
 * - Path (e.g., '/signin/auth')
 * - Query String (e.g., '?verify=true&ref=email')
 * - Fragment / Hash (e.g., '#section2')
 *
 * Implements a conservative public-suffix list parser supporting common
 * multi-part public suffixes (.co.uk, .com.au, etc.) without simplistic split('.') assumptions.
 */

// Common multi-part public suffixes to avoid incorrect registered domain splits
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'me.uk', 'net.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.nz', 'net.nz', 'org.nz', 'govt.nz',
  'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 'ind.in', 'nic.in', 'gov.in',
  'co.jp', 'ne.jp', 'or.jp', 'go.jp', 'ac.jp',
  'com.br', 'net.br', 'org.br', 'gov.br',
  'com.sg', 'edu.sg', 'gov.sg', 'net.sg', 'org.sg',
  'com.mx', 'org.mx', 'gob.mx', 'edu.mx',
  'co.za', 'org.za', 'gov.za', 'ac.za',
  'com.cn', 'net.cn', 'org.cn', 'gov.cn',
  'co.kr', 'ne.kr', 'or.kr', 'go.kr',
  'com.tr', 'org.tr', 'gov.tr',
  'com.tw', 'org.tw', 'gov.tw',
  'com.hk', 'org.hk', 'gov.hk',
  'com.ar', 'org.ar', 'gov.ar',
  'co.il', 'org.il', 'gov.il',
  'co.id', 'web.id', 'or.id', 'go.id',
]);

/**
 * Break a hostname into subdomain, domain name (SLD), and TLD/suffix.
 *
 * Examples:
 * - 'google.com' -> { subdomain: '', domain: 'google', tld: '.com', registrableDomain: 'google.com' }
 * - 'www.google.com' -> { subdomain: 'www', domain: 'google', tld: '.com', registrableDomain: 'google.com' }
 * - 'login.accounts.example.co.uk' -> { subdomain: 'login.accounts', domain: 'example', tld: '.co.uk', registrableDomain: 'example.co.uk' }
 * - '192.168.1.1' -> { subdomain: '', domain: '192.168.1.1', tld: '', registrableDomain: '192.168.1.1' }
 */
export function parseHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    return {
      subdomain: '',
      domain: '',
      tld: '',
      registrableDomain: '',
      isIp: false,
    };
  }

  const cleanHost = hostname.trim().toLowerCase();

  // Check for IPv4 / IPv6
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost.startsWith('[') || cleanHost.includes(':');
  if (isIp) {
    return {
      subdomain: '',
      domain: cleanHost,
      tld: '',
      registrableDomain: cleanHost,
      isIp: true,
    };
  }

  const parts = cleanHost.split('.');
  if (parts.length <= 1) {
    return {
      subdomain: '',
      domain: cleanHost,
      tld: '',
      registrableDomain: cleanHost,
      isIp: false,
    };
  }

  // Check for multi-part suffix (e.g. .co.uk, .com.au)
  if (parts.length >= 3) {
    const twoPartSuffix = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (MULTI_PART_SUFFIXES.has(twoPartSuffix)) {
      const tld = `.${twoPartSuffix}`;
      const domain = parts[parts.length - 3];
      const subdomain = parts.slice(0, parts.length - 3).join('.');
      const registrableDomain = `${domain}${tld}`;
      return { subdomain, domain, tld, registrableDomain, isIp: false };
    }
  }

  // Standard single TLD (e.g. .com, .org, .xyz)
  const tld = `.${parts[parts.length - 1]}`;
  const domain = parts[parts.length - 2];
  const subdomain = parts.slice(0, parts.length - 2).join('.');
  const registrableDomain = `${domain}${tld}`;

  return {
    subdomain,
    domain,
    tld,
    registrableDomain,
    isIp: false,
  };
}

/**
 * Full URL anatomy breakdown
 */
export function parseUrlAnatomy(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  let input = rawUrl.trim();
  if (!input.startsWith('http://') && !input.startsWith('https://')) {
    input = `https://${input}`;
  }

  try {
    const urlObj = new URL(input);
    const scheme = `${urlObj.protocol}//`;
    const hostInfo = parseHostname(urlObj.hostname);
    const port = urlObj.port ? `:${urlObj.port}` : '';
    const path = urlObj.pathname && urlObj.pathname !== '/' ? urlObj.pathname : (rawUrl.includes('/') && !rawUrl.endsWith('://') ? urlObj.pathname : '');
    const query = urlObj.search || '';
    const fragment = urlObj.hash || '';

    return {
      raw: rawUrl,
      href: urlObj.href,
      scheme,
      subdomain: hostInfo.subdomain,
      domain: hostInfo.domain,
      tld: hostInfo.tld,
      registrableDomain: hostInfo.registrableDomain,
      port,
      path,
      query,
      fragment,
      isIp: hostInfo.isIp,
      hasHttps: urlObj.protocol === 'https:',
    };
  } catch {
    // Graceful fallback for incomplete or partially typed URLs
    return {
      raw: rawUrl,
      href: rawUrl,
      scheme: rawUrl.startsWith('http://') ? 'http://' : rawUrl.startsWith('https://') ? 'https://' : 'https://',
      subdomain: '',
      domain: rawUrl,
      tld: '',
      registrableDomain: rawUrl,
      port: '',
      path: '',
      query: '',
      fragment: '',
      isIp: false,
      hasHttps: rawUrl.startsWith('https://'),
    };
  }
}
