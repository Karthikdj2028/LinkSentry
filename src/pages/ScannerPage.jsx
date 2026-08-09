import { useState } from 'react';
import UrlScanner from './scanners/UrlScanner';
import QrScanner from './scanners/QrScanner';
import MessageScanner from './scanners/MessageScanner';

/**
 * ScannerPage Container Component
 * Houses the 3 sub-scanners: URL Scanner, QR Scanner, Message Scanner
 */
export default function ScannerPage({ initialSubTab = 'url' }) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  const subTabs = [
    { id: 'url', label: 'URL Scanner', icon: '🌐', desc: 'Links, Domains & Typosquats' },
    { id: 'qr', label: 'QR Scanner', icon: '📷', desc: 'Quishing & Matrix Codes' },
    { id: 'message', label: 'Message Scanner', icon: '💬', desc: 'SMS, Emails & Smishing' }
  ];

  return (
    <div className="page-container scanner-page animate-fade-in">
      <div className="container">
        {/* Scanner Hub Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: '#06b6d4' }} />
            <span className="font-mono text-cyan">UNIFIED PHISHING DETONATION CHAMBER</span>
          </div>
          <h1 className="page-main-heading">Multi-Vector Security Scanner</h1>
          <p className="page-subheading">
            Analyze suspicious artifacts across web URLs, optical QR barcodes, and SMS/chat messages in a single unified defense hub.
          </p>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="scanner-subtabs-nav">
          {subTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`scanner-subtab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveSubTab(tab.id)}
              >
                <span className="subtab-icon">{tab.icon}</span>
                <div className="subtab-text-group">
                  <span className="subtab-label">{tab.label}</span>
                  <span className="subtab-desc">{tab.desc}</span>
                </div>
                {isActive && <div className="subtab-active-indicator" />}
              </button>
            );
          })}
        </div>

        {/* Subtab Content Area */}
        <div className="scanner-subtab-body">
          {activeSubTab === 'url' && <UrlScanner />}
          {activeSubTab === 'qr' && <QrScanner />}
          {activeSubTab === 'message' && <MessageScanner />}
        </div>
      </div>
    </div>
  );
}
