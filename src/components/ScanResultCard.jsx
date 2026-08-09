import { useState } from 'react';
import Badge from './Badge';
import RiskScoreMeter from './RiskScoreMeter';

/**
 * ScanResultCard Component
 * Displays detailed threat assessment results for URL, QR, or Message scans
 * 
 * TODO: Connect to ML model classification endpoint & Firebase Firestore for permanent logging
 */
export default function ScanResultCard({ resultData, scanType = 'URL', onReset }) {
  const [copied, setCopied] = useState(false);

  if (!resultData) return null;

  const {
    target,
    verdict = 'Safe',
    riskScore = 0,
    confidence = '98.5%',
    details = {},
    timestamp = new Date().toLocaleTimeString()
  } = resultData;

  const handleCopy = () => {
    const summary = `[LinkSentry Threat Report]
Type: ${scanType}
Target: ${target}
Verdict: ${verdict}
Risk Score: ${riskScore}/100
Confidence: ${confidence}
Details: ${JSON.stringify(details, null, 2)}`;
    
    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getVerdictDescription = () => {
    switch (verdict.toLowerCase()) {
      case 'phishing':
      case 'critical':
        return 'CRITICAL THREAT: High confidence of malicious intent, deceptive branding, or credential harvesting.';
      case 'suspicious':
        return 'WARNING: Anomalous patterns detected. Domain age, redirect structure, or phrasing raises suspicion.';
      default:
        return 'SAFE: No known phishing signatures, brand spoofing, or malicious payload signatures detected.';
    }
  };

  return (
    <div className="cyber-card scan-result-card animate-fade-in">
      <div className="scan-result-header">
        <div className="scan-result-title-group">
          <div className="scan-type-badge">
            <span className="font-mono text-cyan">[{scanType} SCAN RESULT]</span>
            <span className="scan-timestamp">Timestamp: {timestamp}</span>
          </div>
          <h3 className="scan-target-text font-mono" title={target}>
            {target}
          </h3>
        </div>

        <div className="scan-result-actions">
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={handleCopy}
          >
            {copied ? '✓ Copied Report' : '📋 Copy Analysis'}
          </button>
          {onReset && (
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={onReset}
            >
              🔄 New Scan
            </button>
          )}
        </div>
      </div>

      <div className="scan-result-grid">
        {/* Left Column: Verdict & Score Meter */}
        <div className="scan-verdict-pane">
          <div className="verdict-banner-box">
            <span className="verdict-label-sub">Security Verdict</span>
            <div className="verdict-main-row">
              <Badge status={verdict} size="lg" pulse={verdict !== 'Safe'}>
                {verdict.toUpperCase()}
              </Badge>
              <span className="verdict-confidence">Confidence: <strong>{confidence}</strong></span>
            </div>
            <p className="verdict-description-text">{getVerdictDescription()}</p>
          </div>

          <RiskScoreMeter score={riskScore} />
        </div>

        {/* Right Column: Detailed Security Heuristics */}
        <div className="scan-heuristics-pane">
          <h4 className="heuristics-title">Heuristic Breakdown & Threat Signals</h4>

          <div className="heuristics-list">
            {Object.entries(details).map(([key, val]) => (
              <div key={key} className="heuristic-item">
                <span className="heuristic-key">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
                <span className={`heuristic-val font-mono ${typeof val === 'boolean' ? (val ? 'text-green' : 'text-red') : ''}`}>
                  {typeof val === 'boolean' 
                    ? (val ? '✓ Valid / Verified' : '✗ Invalid / Failed')
                    : Array.isArray(val)
                      ? (val.length > 0 ? val.join(', ') : 'None detected')
                      : String(val)
                  }
                </span>
              </div>
            ))}
          </div>

          {/* Action Recommendation */}
          <div className={`recommendation-box rec-${verdict.toLowerCase()}`}>
            <strong>Security Recommendation:</strong>
            <p>
              {verdict.toLowerCase() === 'phishing'
                ? '🚫 Immediate Action: Block domain at DNS/firewall level, report to abuse registrar, and delete the message.'
                : verdict.toLowerCase() === 'suspicious'
                  ? '⚠️ Caution: Do not input passwords, MFA tokens, or financial details. Verify source out-of-band.'
                  : '✅ Safe to proceed: No indicators of malicious behavior found.'}
            </p>
          </div>
        </div>
      </div>

      {/* Stage 1 Notice Banner */}
      <div className="stage-notice-footer">
        <span className="font-mono text-cyan">ℹ Stage 1 Prototype:</span>
        <span>Local heuristic simulation active. TODO: Connect to LinkSentry ML inference pipeline & Firebase backend.</span>
      </div>
    </div>
  );
}
