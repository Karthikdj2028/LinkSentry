import { useState } from 'react';
import UrlAnatomy from './UrlAnatomy';
import SpotTheTrap from './SpotTheTrap';

const SAMPLE_PRESETS = [
  {
    id: 'sample-deceptive',
    label: 'Deceptive Subdomain Lure',
    url: 'https://secure-paypal.example.com/login?verify=true#account',
    metadata: {
      impersonatedDomain: 'paypal.com',
      indicators: ['Possible trusted-brand impersonation: paypal.com in subdomain prefix'],
    },
  },
  {
    id: 'sample-typosquat',
    label: 'Typosquatting Lookalike',
    url: 'https://www.paypa1-security.xyz/login/verify',
    metadata: {
      typosquatDomain: 'paypa1-security.xyz',
      potentialBrand: 'paypal.com',
      indicators: ['Observed domain resembles protected brand (paypal.com): paypa1-security.xyz'],
    },
  },
  {
    id: 'sample-safe',
    label: 'Legitimate Corporate Portal',
    url: 'https://accounts.google.com/signin/v2/identifier',
    metadata: {
      threatAnalysis: { verdict: 'safe', risk_score: 0 },
      domainVerification: { status: 'reachable', tls_valid: true },
      indicators: ['Domain verified reachable (HTTP 200)'],
    },
  },
];

const KNOWLEDGE_CARDS = [
  {
    id: 'padlock-myth',
    icon: '🔒',
    title: 'The "Padlock Myth"',
    keyTakeaway: 'HTTPS encrypts data in transit—it does NOT prove that a website is authentic or trustworthy.',
    explanation:
      'Modern phishers routinely obtain free, automated SSL certificates for disposable domains. The browser padlock only ensures the connection cannot be read by eavesdroppers, not that the recipient is honest.',
    linkSentryAction:
      'LinkSentry evaluates transport encryption independently from domain reputation and brand similarity, never assuming HTTPS equals safety.',
  },
  {
    id: 'subdomain-masking',
    icon: '🏷️',
    title: 'Subdomain Masking Tricks',
    keyTakeaway: 'Attackers place trusted brand names at the start of a link to create a false sense of security.',
    explanation:
      'In a link like "microsoft.com.security-portal.top", the true recipient receiving your credentials is "security-portal.top". The "microsoft.com" portion is merely an arbitrary host label controlled by the owner.',
    linkSentryAction:
      'LinkSentry extracts the true registrable domain using public suffix boundaries and flags brand names appearing inside unauthorized prefix labels.',
  },
  {
    id: 'unreachable-vs-malicious',
    icon: '🌐',
    title: 'Unreachable ≠ Malicious',
    keyTakeaway: 'A website that cannot be reached is not automatically dangerous or safe.',
    explanation:
      'Domains frequently fail to load due to temporary network glitches, server outages, geo-blocking, or expired DNS records. Treating connection errors as malware causes false alarms, while treating them as safe exposes users to fast-flux phishing.',
    linkSentryAction:
      'LinkSentry separates ML threat scoring from domain reachability, returning specific Non-Existent or Unreachable status without conflating them with threat verdicts.',
  },
  {
    id: 'lookalike-typosquatting',
    icon: '👁️',
    title: 'Lookalike Domains & Typosquatting',
    keyTakeaway: 'Single-character substitutions (e.g., paypa1, go0gle) mimic legitimate brands.',
    explanation:
      'Attackers register misspelled domain variants hoping victims will fail to notice subtle swaps like "1" for "l", "0" for "o", or omitted letters before entering sensitive credentials.',
    linkSentryAction:
      'LinkSentry runs real-time Levenshtein distance calculations against high-value protected brands to catch deceptive lookalikes before users click.',
  },
];

export default function UnderstandTheLink({
  currentScanUrl = '',
  scanAnalysisMetadata = null,
  onSelectSampleUrl = null,
  defaultExpanded = false,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState('anatomy'); // 'anatomy' | 'trap' | 'knowledge'
  const [selectedPresetId, setSelectedPresetId] = useState('sample-deceptive');

  // If a live scan URL is active, give option to view live scan or curated educational sample
  const isLiveScan = Boolean(currentScanUrl && scanAnalysisMetadata);
  const activePreset = SAMPLE_PRESETS.find((p) => p.id === selectedPresetId) || SAMPLE_PRESETS[0];

  const displayUrl = isLiveScan ? currentScanUrl : activePreset.url;
  const displayMetadata = isLiveScan ? scanAnalysisMetadata : activePreset.metadata;

  return (
    <div className="understand-link-section">
      {/* EXPANDABLE ACCORDION HEADER */}
      <button
        type="button"
        className="understand-link-toggle-btn cyber-card"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls="understand-link-body"
      >
        <div className="toggle-btn-left">
          <span className="toggle-icon-badge">💡</span>
          <div className="toggle-text-block">
            <div className="toggle-title-row">
              <h3 className="toggle-title">Understand the Link</h3>
              <span className="toggle-tag-pill font-mono">EDUCATIONAL MODULE</span>
            </div>
            <p className="toggle-subtitle">
              See what LinkSentry checks inside a URL and learn how to identify deception.
            </p>
          </div>
        </div>

        <div className="toggle-btn-right font-mono">
          <span className="toggle-action-text">{isExpanded ? 'Collapse' : 'Explore'}</span>
          <span className={`toggle-chevron ${isExpanded ? 'rotated' : ''}`}>▼</span>
        </div>
      </button>

      {/* EXPANDABLE BODY */}
      {isExpanded && (
        <div id="understand-link-body" className="understand-link-body animate-fade-in">
          {/* TAB BAR */}
          <div className="understand-tabs-bar" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'anatomy'}
              className={`understand-tab-btn ${activeTab === 'anatomy' ? 'active' : ''}`}
              onClick={() => setActiveTab('anatomy')}
            >
              <span className="tab-icon">🔬</span>
              <span>Interactive URL Anatomy</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'trap'}
              className={`understand-tab-btn ${activeTab === 'trap' ? 'active' : ''}`}
              onClick={() => setActiveTab('trap')}
            >
              <span className="tab-icon">🎯</span>
              <span>Try 3 Phishing Tricks</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'knowledge'}
              className={`understand-tab-btn ${activeTab === 'knowledge' ? 'active' : ''}`}
              onClick={() => setActiveTab('knowledge')}
            >
              <span className="tab-icon">🛡️</span>
              <span>Security Knowledge</span>
            </button>
          </div>

          {/* TAB 1: URL ANATOMY */}
          {activeTab === 'anatomy' && (
            <div className="anatomy-tab-pane animate-fade-in" role="tabpanel">
              {/* SAMPLE PRESET CONTROLS IF NOT VIEWING A LIVE SCAN */}
              {!isLiveScan && (
                <div className="preset-selector-bar">
                  <span className="preset-selector-label font-mono text-cyan">EDUCATIONAL PRESETS:</span>
                  <div className="preset-chip-group">
                    {SAMPLE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`preset-chip ${selectedPresetId === preset.id ? 'active' : ''}`}
                        onClick={() => setSelectedPresetId(preset.id)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isLiveScan && (
                <div className="live-scan-banner font-mono">
                  <span className="live-dot pulse" />
                  <span>ANALYZING ACTIVE SCAN PAYLOAD: <strong>{currentScanUrl}</strong></span>
                </div>
              )}

              <UrlAnatomy
                url={displayUrl}
                analysisMetadata={displayMetadata}
                showTitle={false}
              />
            </div>
          )}

          {/* TAB 2: SPOT THE TRAP */}
          {activeTab === 'trap' && (
            <div className="trap-tab-pane animate-fade-in" role="tabpanel">
              <SpotTheTrap
                onTestUrlInScanner={(trapUrl) => {
                  if (onSelectSampleUrl) {
                    onSelectSampleUrl(trapUrl);
                  }
                }}
              />
            </div>
          )}

          {/* TAB 3: SECURITY KNOWLEDGE CARDS */}
          {activeTab === 'knowledge' && (
            <div className="knowledge-cards-grid animate-fade-in" role="tabpanel">
              {KNOWLEDGE_CARDS.map((card) => (
                <div key={card.id} className="knowledge-card cyber-card">
                  <div className="knowledge-card-header">
                    <span className="knowledge-card-icon">{card.icon}</span>
                    <h4 className="knowledge-card-title">{card.title}</h4>
                  </div>

                  <div className="knowledge-takeaway-box font-mono">
                    <strong>KEY TAKEAWAY:</strong> {card.keyTakeaway}
                  </div>

                  <p className="knowledge-card-desc">{card.explanation}</p>

                  <div className="knowledge-sentry-box">
                    <span className="knowledge-sentry-label font-mono text-cyan">LINKSENTRY DEFENSE:</span>
                    <p className="knowledge-sentry-text">{card.linkSentryAction}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
