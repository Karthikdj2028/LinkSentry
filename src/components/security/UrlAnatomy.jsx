import { useState, useId } from 'react';
import { parseUrlAnatomy } from '../../utils/urlParser';

/**
 * Educational segment metadata database
 */
const SEGMENT_DEFINITIONS = {
  scheme: {
    title: 'Protocol Scheme',
    subtitle: 'Transport Layer Security',
    icon: '🔒',
    whatIsIt: 'The protocol defining how your browser communicates with the web server (HTTPS vs HTTP).',
    whyItMatters: 'HTTPS encrypts data in transit. However, HTTPS alone does NOT prove that a site is safe or legitimate—phishers use free SSL certificates too.',
    whatLinkSentryChecks: 'LinkSentry verifies SSL/TLS encryption, certificate validity, and prevents deception based solely on the padlock myth.',
  },
  subdomain: {
    title: 'Subdomain Prefix',
    subtitle: 'Host Routing Identifier',
    icon: '🏷️',
    whatIsIt: 'A prefix added before the registered domain to organize services (e.g., mail, accounts, app).',
    whyItMatters: 'Attackers often place legitimate brand names in the subdomain (e.g., "paypal.com.evil-domain.xyz") to trick users into trusting the link.',
    whatLinkSentryChecks: 'LinkSentry analyzes subdomain depth, checks for brand impersonation across labels, and identifies deceptive sub-label stacking.',
  },
  domain: {
    title: 'Registered Domain',
    subtitle: 'Primary Domain Identity (SLD)',
    icon: '🌐',
    whatIsIt: 'The actual name registered by an individual or organization controlling the website.',
    whyItMatters: 'This is the most critical part of a URL. Attackers use lookalike domains (typosquatting, character replacement) to impersonate trusted companies.',
    whatLinkSentryChecks: 'LinkSentry runs fuzzy Levenshtein typosquatting detection, checks the Tranco top-1M reputation whitelist, and verifies live DNS records.',
  },
  tld: {
    title: 'Top-Level Domain (TLD)',
    subtitle: 'Public Suffix Registry',
    icon: '🚩',
    whatIsIt: 'The domain extension at the end of the web address (e.g., .com, .org, .co.uk, .xyz).',
    whyItMatters: 'Certain free or low-cost TLDs (.xyz, .top, .tk, .work) are statistically abused by phishing syndicates due to minimal registration vetting.',
    whatLinkSentryChecks: 'LinkSentry cross-references the TLD against known high-abuse registrar lists and penalizes high-risk TLD patterns in the LinearSVC model.',
  },
  path: {
    title: 'Resource Path',
    subtitle: 'Server Route / Destination File',
    icon: '📂',
    whatIsIt: 'The location path pointing to a specific page or script on the host server.',
    whyItMatters: 'Phishers often craft credential-harvesting paths like "/signin", "/verify-account", or append fake file extensions like "invoice.pdf.exe".',
    whatLinkSentryChecks: 'LinkSentry inspects path depth, checks for credential harvesting keywords, and flags executable or double file extensions.',
  },
  query: {
    title: 'Query Parameters',
    subtitle: 'Dynamic Request Payload',
    icon: '⚡',
    whatIsIt: 'Key-value pairs separated by "&" that send parameters to the web page or application.',
    whyItMatters: 'Attackers abuse open-redirect parameters (e.g., "?redirect_url=http://malicious.com") to launch attacks from reputable websites.',
    whatLinkSentryChecks: 'LinkSentry parses query strings for open-redirect targets, encoded payloads, tracking parameters, and cross-site scripting lures.',
  },
  fragment: {
    title: 'Fragment / Anchor',
    subtitle: 'Client-Side Anchor Marker',
    icon: '⚓',
    whatIsIt: 'An internal anchor identifying a specific section on a page, processed entirely by the browser.',
    whyItMatters: 'Client-side phishing kits can use fragments to hide payload arguments from server-side security proxies.',
    whatLinkSentryChecks: 'LinkSentry evaluates hash parameters for hidden base64 or obfuscated redirection markers.',
  },
};

export default function UrlAnatomy({
  url = 'https://secure-paypal.example.com/login?verify=true#top',
  analysisMetadata = null,
  showTitle = true,
  compact = false,
}) {
  const [activeSegmentKey, setActiveSegmentKey] = useState('domain');
  const componentId = useId();

  const anatomy = parseUrlAnatomy(url);
  if (!anatomy) return null;

  // Correlate live scan findings if analysisMetadata is supplied
  const getSecurityWarningForSegment = (segmentKey) => {
    if (!analysisMetadata) return null;

    const {
      typosquatDomain,
      impersonatedDomain,
      potentialBrand,
      threatAnalysis,
      domainVerification,
      indicators = [],
      suspiciousSignals = [],
    } = analysisMetadata;

    if (segmentKey === 'domain') {
      if (typosquatDomain && typosquatDomain !== 'None') {
        return {
          severity: 'high',
          message: `Typosquatting Detected: This domain resembles protected brand "${potentialBrand || 'known brand'}".`,
        };
      }
      if (domainVerification?.status === 'non_existent') {
        return {
          severity: 'medium',
          message: 'Non-Existent Domain: No live DNS records found in public root zone.',
        };
      }
      if (domainVerification?.status === 'unreachable') {
        return {
          severity: 'medium',
          message: 'Unreachable Host: Server failed to respond to secure HTTP probes.',
        };
      }
      if (threatAnalysis?.verdict === 'phishing' || threatAnalysis?.verdict === 'malicious') {
        return {
          severity: 'high',
          message: `Malicious Domain: Flagged by LinkSentry ML threat classifier (Risk Score: ${threatAnalysis.risk_score || 70}).`,
        };
      }
    }

    if (segmentKey === 'subdomain') {
      if (impersonatedDomain && impersonatedDomain !== 'None') {
        return {
          severity: 'high',
          message: `Subdomain Brand Impersonation: Target brand "${impersonatedDomain}" appears in subdomain prefix to mimic a trusted portal.`,
        };
      }
    }

    if (segmentKey === 'scheme') {
      if (!anatomy.hasHttps) {
        return {
          severity: 'medium',
          message: 'Insecure Protocol: URL uses unencrypted plain HTTP transport.',
        };
      }
      if (domainVerification && domainVerification.tls_valid === false) {
        return {
          severity: 'high',
          message: 'Invalid TLS Certificate: HTTPS connection failed TLS security verification.',
        };
      }
    }

    if (segmentKey === 'tld') {
      const isSuspiciousTld = indicators.some((ind) => ind.toLowerCase().includes('tld')) ||
        (Array.isArray(suspiciousSignals) && suspiciousSignals.some((s) => String(s).toLowerCase().includes('tld')));
      if (isSuspiciousTld) {
        return {
          severity: 'medium',
          message: `High-Risk TLD: Extension "${anatomy.tld}" is commonly abused by disposable phishing campaigns.`,
        };
      }
    }

    if (segmentKey === 'path') {
      const pathIndicator = indicators.find((ind) => ind.toLowerCase().includes('path') || ind.toLowerCase().includes('executable'));
      if (pathIndicator) {
        return {
          severity: 'medium',
          message: pathIndicator,
        };
      }
    }

    if (segmentKey === 'query') {
      const queryIndicator = indicators.find((ind) => ind.toLowerCase().includes('redirect') || ind.toLowerCase().includes('parameter'));
      if (queryIndicator) {
        return {
          severity: 'medium',
          message: queryIndicator,
        };
      }
    }

    return null;
  };

  const activeDef = SEGMENT_DEFINITIONS[activeSegmentKey] || SEGMENT_DEFINITIONS.domain;
  const activeWarning = getSecurityWarningForSegment(activeSegmentKey);

  // Define segments to render
  const segments = [
    { key: 'scheme', text: anatomy.scheme, label: 'Scheme' },
    anatomy.subdomain ? { key: 'subdomain', text: `${anatomy.subdomain}.`, label: 'Subdomain' } : null,
    { key: 'domain', text: anatomy.domain, label: 'Domain' },
    anatomy.tld ? { key: 'tld', text: anatomy.tld, label: 'TLD' } : null,
    anatomy.port ? { key: 'port', text: anatomy.port, label: 'Port' } : null,
    anatomy.path ? { key: 'path', text: anatomy.path, label: 'Path' } : null,
    anatomy.query ? { key: 'query', text: anatomy.query, label: 'Query' } : null,
    anatomy.fragment ? { key: 'fragment', text: anatomy.fragment, label: 'Fragment' } : null,
  ].filter(Boolean);

  return (
    <div className={`url-anatomy-wrapper cyber-card ${compact ? 'url-anatomy-compact' : ''}`}>
      {showTitle && (
        <div className="url-anatomy-header">
          <div className="url-anatomy-title-group">
            <span className="url-anatomy-icon">🔬</span>
            <div>
              <h4 className="url-anatomy-heading">Interactive URL Anatomy</h4>
              <p className="url-anatomy-sub">
                Click or tap any segment to explore its cybersecurity role and how LinkSentry analyzes it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SEGMENTED VISUAL URL BAR */}
      <div
        className="url-segments-container font-mono"
        role="region"
        aria-label="Interactive URL Anatomy Visualizer"
      >
        {segments.map((seg) => {
          const isActive = activeSegmentKey === seg.key;
          const warning = getSecurityWarningForSegment(seg.key);
          const hasWarning = Boolean(warning);

          return (
            <button
              key={`${componentId}-${seg.key}`}
              type="button"
              className={`url-segment-btn segment-${seg.key} ${isActive ? 'active' : ''} ${hasWarning ? `has-warning severity-${warning.severity}` : ''}`}
              onClick={() => setActiveSegmentKey(seg.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveSegmentKey(seg.key);
                }
              }}
              title={`${seg.label}: ${seg.text}${hasWarning ? ` (⚠ ${warning.message})` : ''}`}
              aria-pressed={isActive}
              aria-label={`${seg.label}: ${seg.text}`}
            >
              <span className="segment-text">{seg.text}</span>
              <span className="segment-badge">{seg.label}</span>
              {hasWarning && <span className="segment-warning-dot" aria-hidden="true">⚠</span>}
            </button>
          );
        })}
      </div>

      {/* DETAIL CONTEXT CARD */}
      <div className="url-segment-card animate-fade-in" role="article">
        <div className="segment-card-header">
          <div className="segment-icon-box" aria-hidden="true">
            {activeDef.icon}
          </div>
          <div className="segment-header-text">
            <span className="segment-category-label">{activeDef.title.toUpperCase()}</span>
            <h4 className="segment-main-title">{activeDef.subtitle}</h4>
            <span className="segment-scope-pill font-mono">{activeSegmentKey.toUpperCase()}</span>
          </div>
        </div>

        {/* ACTIVE LIVE SECURITY ALERT IF PRESENT */}
        {activeWarning && (
          <div className={`segment-security-alert alert-${activeWarning.severity} animate-fade-in`}>
            <div className="alert-badge-label">
              <span className="alert-icon">⚠</span>
              <strong>LinkSentry Detection Signal:</strong>
            </div>
            <p className="alert-message-text">{activeWarning.message}</p>
          </div>
        )}

        <div className="segment-qa-grid">
          <div className="qa-item">
            <span className="qa-label font-mono text-cyan">WHAT IS IT?</span>
            <p className="qa-body">{activeDef.whatIsIt}</p>
          </div>

          <div className="qa-item">
            <span className="qa-label font-mono text-amber">WHY DOES IT MATTER?</span>
            <p className="qa-body">{activeDef.whyItMatters}</p>
          </div>

          <div className="qa-item full-width">
            <span className="qa-label font-mono text-green">WHAT LINKSENTRY CHECKS:</span>
            <p className="qa-body">{activeDef.whatLinkSentryChecks}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
