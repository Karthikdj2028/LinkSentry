import { useState } from 'react';
import UrlScanner from './scanners/UrlScanner';
import QrScanner from './scanners/QrScanner';
import MessageScanner from './scanners/MessageScanner';

/**
 * ScannerPage Component
 * Primary Multi-Vector Security Scanner Hub for LinkSentry V3.4.
 * Features 3 clearly differentiated vector cards:
 * 1. URL Scanner (Cyan accent)
 * 2. QR Scanner (Emerald accent)
 * 3. Message Scanner (Amber accent)
 */
export default function ScannerPage({ initialSubTab = 'url' }) {
  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type');
      if (type && ['url', 'qr', 'message'].includes(type.toLowerCase())) {
        return type.toLowerCase();
      }
    }
    return initialSubTab;
  });

  const scanVectors = [
    {
      id: 'url',
      title: 'URL Scanner',
      subtitle: 'Web Links & Domains',
      accentColor: 'cyan',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" x2="22" y1="12" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
      description: 'Evaluates web addresses and domains for phishing heuristics, deceptive lookalike brands, and live DNS reachability.',
      capabilities: ['LinearSVC ML Classifier', 'Domain Typosquatting', 'DNS & Reachability Probe'],
      actionLabel: 'Active Scanner',
      inactiveActionLabel: 'Launch URL Scanner',
    },
    {
      id: 'qr',
      title: 'QR Scanner',
      subtitle: 'Quishing & Optical Codes',
      accentColor: 'emerald',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="5" height="5" x="3" y="3" rx="1" />
          <rect width="5" height="5" x="16" y="3" rx="1" />
          <rect width="5" height="5" x="3" y="16" rx="1" />
          <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
          <path d="M21 21v.01" />
          <path d="M12 7v3a2 2 0 0 1-2 2H7" />
          <path d="M3 12h.01" />
          <path d="M12 3h.01" />
          <path d="M12 16v.01" />
          <path d="M16 12h1" />
          <path d="M21 12v.01" />
          <path d="M12 21v-1" />
        </svg>
      ),
      description: 'Decodes physical or digital QR barcodes client-side and safely analyzes embedded destinations before network execution.',
      capabilities: ['Optical Matrix Decoding', 'Safe Payload Inspection', 'URL Detonation Route'],
      actionLabel: 'Active Scanner',
      inactiveActionLabel: 'Launch QR Scanner',
    },
    {
      id: 'message',
      title: 'Message Scanner',
      subtitle: 'SMS & Chat Smishing',
      accentColor: 'amber',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      description: 'Analyzes SMS, email, and chat messages for conversational phishing lures, urgency coercion, and embedded threat links.',
      capabilities: ['Urgency NLP Heuristics', 'Link Extraction & Scan', 'Sender Reputation Signal'],
      actionLabel: 'Active Scanner',
      inactiveActionLabel: 'Launch Message Scanner',
    },
  ];

  return (
    <div className="page-container scanner-page animate-fade-in">
      <div className="container">
        {/* Scanner Hub Page Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--brand-cyan)' }} />
            <span className="font-mono">LINK SENTRY • V3.4 DETECTION HUB</span>
          </div>
          <h1 className="page-main-heading">Multi-Vector Security Scanner</h1>
          <p className="page-subheading">
            Choose a detection vector below to inspect web links, optical QR matrices, or message content with real-time LinkSentry intelligence.
          </p>
        </div>

        {/* 3 Differentiated Scanner Cards (Vector Hub Grid) */}
        <div className="scanner-vectors-hub-grid" role="tablist" aria-label="Scanner Vector Selector">
          {scanVectors.map((vector) => {
            const isActive = activeSubTab === vector.id;
            return (
              <div
                key={vector.id}
                className={`scanner-vector-card accent-${vector.accentColor} ${isActive ? 'active' : ''}`}
                onClick={() => setActiveSubTab(vector.id)}
                role="tab"
                tabIndex={0}
                aria-selected={isActive}
                data-testid={`subtab-${vector.id}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveSubTab(vector.id);
                  }
                }}
              >
                {/* Top Accent Line */}
                <div className="vector-card-accent-bar" />

                {/* Card Header with Icon & Active Pill */}
                <div className="vector-card-header">
                  <div className="vector-icon-badge">
                    {vector.icon}
                  </div>
                  {isActive ? (
                    <span className="vector-status-badge active font-mono">
                      ● ACTIVE
                    </span>
                  ) : (
                    <span className="vector-status-badge ready font-mono">
                      READY
                    </span>
                  )}
                </div>

                {/* Card Titles & Scope */}
                <div className="vector-card-body">
                  <div className="vector-title-group">
                    <h3 className="vector-title">{vector.title}</h3>
                    <span className="vector-subtitle font-mono">{vector.subtitle}</span>
                  </div>

                  <p className="vector-desc">
                    {vector.description}
                  </p>

                  {/* Capabilities Chip List */}
                  <div className="vector-capabilities-list">
                    {vector.capabilities.map((cap, idx) => (
                      <span key={idx} className="vector-cap-chip font-mono">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="vector-card-footer">
                  <button
                    type="button"
                    className={`btn btn-sm vector-action-btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSubTab(vector.id);
                    }}
                    data-testid={`launch-${vector.id}-btn`}
                  >
                    <span>{isActive ? `✓ ${vector.actionLabel}` : vector.inactiveActionLabel}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Scanner Workspace */}
        <div className="scanner-subtab-body" style={{ marginTop: '2.5rem' }}>
          {activeSubTab === 'url' && <UrlScanner />}
          {activeSubTab === 'qr' && <QrScanner />}
          {activeSubTab === 'message' && <MessageScanner />}
        </div>
      </div>
    </div>
  );
}

