import { useState } from 'react';

/**
 * ScanDetailModal Component
 * Displays complete diagnostic telemetry, threat indicators, risk score, and payload details for a selected scan.
 */
export default function ScanDetailModal({ scan, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!scan) return null;

  const handleCopyPayload = () => {
    const textToCopy = scan.url || scan.input || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const getVerdictBadgeClass = (verdict) => {
    const v = (verdict || '').toLowerCase();
    if (v === 'phishing') return 'badge-phishing';
    if (v === 'suspicious') return 'badge-suspicious';
    return 'badge-safe';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleString();
    }
    return 'Recently';
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card scan-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">
              {scan.type === 'qr' ? '📷' : scan.type === 'message' ? '💬' : '🌐'}
            </span>
            <div>
              <h3 className="modal-title">Threat Assessment Details</h3>
              <p className="modal-subtitle">
                {scan.type === 'qr' ? 'Optical QR Barcode Payload' : scan.type === 'message' ? 'SMS / Chat Message Artifact' : 'Web URL & Domain Analysis'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Verdict & Score Banner */}
          <div className={`scan-detail-verdict-card ${getVerdictBadgeClass(scan.verdict)}`}>
            <div className="verdict-banner-left">
              <span className="verdict-pill-large">
                {scan.verdict ? scan.verdict.toUpperCase() : 'SAFE'}
              </span>
              <span className="verdict-confidence">
                Confidence: {Math.round((scan.confidence || 0.85) * 100)}%
              </span>
            </div>
            <div className="verdict-banner-right">
              <span className="risk-score-large">{scan.riskScore ?? scan.risk_score ?? 0}</span>
              <span className="risk-score-max">/ 100 Risk</span>
            </div>
          </div>

          {/* Original Payload & Copy */}
          <div className="detail-section">
            <div className="section-header-row">
              <label className="section-label">Inspected Payload / Artifact</label>
              <button 
                type="button" 
                className="btn-copy-action"
                onClick={handleCopyPayload}
              >
                {copied ? '✓ Copied' : '📋 Copy Payload'}
              </button>
            </div>
            <div className="payload-box font-mono">
              {scan.input || scan.url || 'No payload recorded'}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="detail-meta-grid">
            <div className="meta-card">
              <span className="meta-label">Domain / Host</span>
              <span className="meta-value font-mono">{scan.domain || 'N/A (Non-URL)'}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Scan Vector</span>
              <span className="meta-value" style={{ textTransform: 'capitalize' }}>
                {scan.type ? `${scan.type} Scan` : 'URL Scan'}
              </span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Detection Engine</span>
              <span className="meta-value">{scan.engine || 'LinkSentry V3.4 ML Engine'}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Logged Timestamp</span>
              <span className="meta-value">{formatTimestamp(scan.createdAt)}</span>
            </div>
          </div>

          {/* Threat Indicators */}
          <div className="detail-section">
            <label className="section-label">Observed Threat Indicators & Heuristics</label>
            {scan.indicators && scan.indicators.length > 0 ? (
              <div className="indicators-chip-list">
                {scan.indicators.map((ind, idx) => (
                  <div key={idx} className="indicator-chip">
                    <span className="indicator-dot" />
                    <span>{ind}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-indicators-box">
                <span>🛡️ No malicious or suspicious indicators detected.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
