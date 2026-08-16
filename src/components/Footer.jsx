/**
 * Footer Component for LinkSentry
 */
export default function Footer({ onSelectTab }) {
  return (
    <footer className="site-footer">
      <div className="container footer-container">
        <div className="footer-top-grid">
          {/* Col 1: Brand & Mission */}
          <div className="footer-brand-col">
            <div className="footer-logo">
              <div className="logo-shield-small">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="brand-title-footer">LINK<strong>SENTRY</strong></span>
            </div>
            <p className="footer-description">
              Next-generation proactive phishing detection platform safeguarding users against deceptive URLs, malicious QR codes, and smishing attacks.
            </p>
            <div className="footer-status-tag">
              <span className="cyber-badge-dot" style={{ backgroundColor: '#10b981' }} />
              <span className="font-mono text-cyan">Threat Intelligence & Detonation Active</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Platform Modules</h4>
            <ul className="footer-links-list">
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onSelectTab('overview')}>
                  Security Overview & Telemetry
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onSelectTab('scanner')}>
                  Multi-Vector Scanner (Link / QR / SMS)
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onSelectTab('history')}>
                  Scan Audit Trail & History
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onSelectTab('analytics')}>
                  Threat Intelligence Analytics
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Security Specifications */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Security Architecture</h4>
            <ul className="footer-roadmap-list font-mono">
              <li className="roadmap-current">
                <span className="roadmap-bullet">🛡️</span> V3.3 ML + Rule Fusion Engine
              </li>
              <li className="roadmap-current">
                <span className="roadmap-bullet">🔐</span> Firebase 256-Bit Auth Security
              </li>
              <li className="roadmap-current">
                <span className="roadmap-bullet">☁️</span> Cloud Firestore Audit Persistence
              </li>
              <li className="roadmap-current">
                <span className="roadmap-bullet">📱</span> Cross-Platform Android Client Ready
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p className="footer-copyright">
            © {new Date().getFullYear()} LinkSentry CyberDefense Technologies. All rights reserved.
          </p>
          <div className="footer-badges font-mono">
            <span className="footer-badge">FASTAPI + V3.3 ML</span>
            <span className="footer-badge">FIRESTORE CLUSTER</span>
            <span className="footer-badge">ENTERPRISE SOC</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
