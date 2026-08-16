import { useState } from 'react';
import UrlScanner from './scanners/UrlScanner';
import QrScanner from './scanners/QrScanner';
import MessageScanner from './scanners/MessageScanner';

/**
 * ScannerPage Container Component
 * Multi-vector scanner hub: Link / URL, Optical QR Barcode, Message / SMS
 */
export default function ScannerPage({ initialSubTab = 'url' }) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  const subTabs = [
    { id: 'url', label: 'Link', icon: '🌐', subtitle: 'URLs & Domains' },
    { id: 'qr', label: 'QR Code', icon: '📷', subtitle: 'Quishing & Codes' },
    { id: 'message', label: 'Message', icon: '💬', subtitle: 'SMS & Smishing' }
  ];

  return (
    <div className="page-container scanner-page animate-fade-in">
      <div className="container">
        {/* Scanner Hub Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--brand-cyan)' }} />
            <span className="font-mono">THREAT DETECTION & ANALYSIS</span>
          </div>
          <h1 className="page-main-heading">Multi-Vector Security Scanner</h1>
          <p className="page-subheading">
            Analyze suspicious web links, optical QR barcodes, and SMS/chat messages with real-time heuristic & ML intelligence.
          </p>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="scanner-tabs-bar">
          {subTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`scanner-tab-pill ${isActive ? 'active' : ''}`}
                onClick={() => setActiveSubTab(tab.id)}
                data-testid={`subtab-${tab.id}`}
              >
                <span className="tab-pill-icon">{tab.icon}</span>
                <div className="tab-pill-text">
                  <span className="tab-pill-label">{tab.label}</span>
                  <span className="tab-pill-sub desktop-only">{tab.subtitle}</span>
                </div>
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
