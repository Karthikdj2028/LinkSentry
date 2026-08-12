import Badge from '../components/Badge';
import { MOCK_DASHBOARD_STATS } from '../data/mockData';

/**
 * HomePage Component
 * Landing page showcasing LinkSentry capabilities, scanner launchpads, and live cyber defense metrics
 */
export default function HomePage({ onNavigateToScanner, onSelectTab }) {
  const stats = MOCK_DASHBOARD_STATS;

  const scannerCards = [
    {
      subTab: 'url',
      icon: '🌐',
      title: 'URL Phishing Scanner',
      desc: 'Analyze URLs for suspicious domains, typosquatting, redirects, and phishing indicators using LinkSentry threat detection.',
      badge: 'Most Popular',
      badgeStatus: 'Info',
      actionText: 'Scan URL Target ➔'
    },
    {
      subTab: 'qr',
      icon: '📷',
      title: 'QR Code (Quishing) Scanner',
      desc: 'Scan QR codes from uploaded images or camera input and analyze decoded content for malicious or suspicious destinations.',
      badge: 'Zero-Day Shield',
      badgeStatus: 'Suspicious',
      actionText: 'Inspect QR Code ➔'
    },
    {
      subTab: 'message',
      icon: '💬',
      title: 'SMS & Message Analyzer',
      desc: 'Inspect SMS messages, emails, and chat text for smishing lures, urgency pressure, and fraudulent links.',
      badge: 'NLP Engine',
      badgeStatus: 'Safe',
      actionText: 'Analyze Message ➔'
    }
  ];

  const threatVectors = [
    {
      icon: '🪝',
      title: 'Typosquatting & Lookalike Domains',
      desc: 'Attackers register domains visually indistinguishable from legitimate brands (e.g., using Cyrillic "а" or subtle missing letters) to harvest credentials.'
    },
    {
      icon: '🎯',
      title: 'Targeted Smishing Campaigns',
      desc: 'High-urgency SMS alerts claiming banking freezes, courier delays, or urgent password resets designed to bypass corporate firewalls.'
    },
    {
      icon: '📱',
      title: 'Physical Quishing Attacks',
      desc: 'Malicious QR codes affixed to public kiosks and meters that redirect users directly to mobile-optimized phishing login portals.'
    },
    {
      icon: '🎭',
      title: 'Dynamic Fast-Flux Infrastructure',
      desc: 'Phishing kits that rotate IP addresses every few minutes through proxy networks to evade traditional static domain blocklists.'
    }
  ];

  return (
    <div className="page-container home-page animate-fade-in">
      <div className="container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-badge-row">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: '#06b6d4' }} />
            <span className="font-mono text-cyan">NEXT-GEN CYBER DEFENSE • MULTI-VECTOR THREAT SHIELD</span>
          </div>

          <h1 className="hero-headline">
            Proactive Phishing Protection for <span className="text-cyan-glow">URLs, QR Codes</span> & Messages
          </h1>

          <p className="hero-description">
            LinkSentry neutralizes social engineering threats before they reach your infrastructure. 
            Detonate suspicious links, inspect deceptive QR codes, and classify malicious SMS alerts in real time.
          </p>

          <div className="hero-cta-group">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => onNavigateToScanner('url')}
            >
              <span>🛡️ Launch Defense Scanner</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => onSelectTab('dashboard')}
            >
              <span>📊 View SOC Dashboard</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hero-metrics-bar">
            <div className="hero-metric-item">
              <span className="metric-val font-mono">{stats.totalScans.toLocaleString()}+</span>
              <span className="metric-lbl">Threat Scans Run</span>
            </div>
            <div className="hero-metric-divider" />
            <div className="hero-metric-item">
              <span className="metric-val font-mono text-green">{stats.defenseEfficiencyRate}</span>
              <span className="metric-lbl">Detection Efficiency</span>
            </div>
            <div className="hero-metric-divider" />
            <div className="hero-metric-item">
              <span className="metric-val font-mono text-cyan">&lt; {stats.avgResponseMs}ms</span>
              <span className="metric-lbl">Analysis Latency</span>
            </div>
            <div className="hero-metric-divider" />
            <div className="hero-metric-item">
              <span className="metric-val font-mono text-purple">{stats.activeThreatSignatures.toLocaleString()}</span>
              <span className="metric-lbl">Threat Signature</span>
            </div>
          </div>
        </section>

        {/* 3 Core Scanner Launchpads */}
        <section className="launchpads-section">
          <div className="section-header-center">
            <span className="font-mono text-cyan text-sm">[UNIFIED SECURITY ARSENAL]</span>
            <h2 className="section-title">Comprehensive Multi-Vector Defense</h2>
            <p className="section-subtitle">
              Choose an inspection vector below to test links, physical QR codes, or SMS text messages.
            </p>
          </div>

          <div className="grid grid-cols-3 launchpad-grid">
            {scannerCards.map((card) => (
              <div 
                key={card.subTab} 
                className="cyber-card launchpad-card cyber-card-interactive"
                onClick={() => onNavigateToScanner(card.subTab)}
                role="button"
                tabIndex={0}
              >
                <div className="launchpad-top">
                  <span className="launchpad-icon">{card.icon}</span>
                  <Badge status={card.badgeStatus} size="sm">
                    {card.badge}
                  </Badge>
                </div>

                <h3 className="launchpad-title">{card.title}</h3>
                <p className="launchpad-desc">{card.desc}</p>

                <div className="launchpad-action-row">
                  <span className="launchpad-action-link font-mono">{card.actionText}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Threat Intelligence / Education Section */}
        <section className="threat-education-section">
          <div className="cyber-card threat-intel-container">
            <div className="section-header-left">
              <span className="font-mono text-cyan text-sm">[THREAT INTELLIGENCE DOSSIER]</span>
              <h2 className="section-title">Anatomy of Modern Phishing Attacks</h2>
              <p className="section-subtitle">
                Understand common phishing techniques and how LinkSentry evaluates their observable threat indicators.
              </p>
            </div>

            <div className="grid grid-cols-2 threat-vectors-grid">
              {threatVectors.map((threat, idx) => (
                <div key={idx} className="threat-vector-card">
                  <div className="threat-vector-icon">{threat.icon}</div>
                  <div className="threat-vector-info">
                    <h4 className="threat-vector-title">{threat.title}</h4>
                    <p className="threat-vector-desc">{threat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Start Callout */}
        <section className="ready-scan-banner">
          <div className="cyber-card ready-card">
            <div className="ready-content">
              <h3 className="ready-title">Ready to verify a suspicious URL, QR code, or message?</h3>
              <p className="ready-desc">
                Access LinkSentry's unified inspection suite to analyze URLs, QR codes, and messages using the active threat-detection engine.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => onNavigateToScanner('url')}
            >
              Start Free Inspection ➔
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
