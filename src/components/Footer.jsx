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
              <span className="cyber-badge-dot" style={{ backgroundColor: '#06b6d4' }} />
              <span className="font-mono text-cyan">Stage 1 Prototype • UI Architecture Active</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Platform Modules</h4>
            <ul className="footer-links-list">
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onSelectTab('home')}>
                  Overview & Threat Intel
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onSelectTab('scanner')}>
                  Unified Scanner Hub (URL / QR / SMS)
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onSelectTab('history')}>
                  Scan Audit Trail & History
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onSelectTab('dashboard')}>
                  SOC Analytics & Dashboard
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Roadmap & Security Specs */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Engineering Roadmap</h4>
            <ul className="footer-roadmap-list font-mono">
              <li className="roadmap-current">
                <span className="roadmap-bullet">▶</span> Stage 1: Frontend UI & Cyber Design System
              </li>
              <li className="roadmap-upcoming">
                <span className="roadmap-bullet">○</span> Stage 2: Firebase Auth & Cloud Firestore
              </li>
              <li className="roadmap-upcoming">
                <span className="roadmap-bullet">○</span> Stage 3: ML Phishing Classifiers & NLP
              </li>
              <li className="roadmap-upcoming">
                <span className="roadmap-bullet">○</span> Stage 4: Android App & Mobile Agent
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p className="footer-copyright">
            © {new Date().getFullYear()} LinkSentry CyberDefense Technologies. All rights reserved.
          </p>
          <div className="footer-badges font-mono">
            <span className="footer-badge">VITE + REACT 19</span>
            <span className="footer-badge">SECURE CLIENT</span>
            <span className="footer-badge">MOCK STATE MODE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
