import { useState } from 'react';
import Badge from './Badge';
import RiskScoreMeter from './RiskScoreMeter';

/**
 * ScanResultCard
 *
 * Displays the complete LinkSentry V3.3 URL/QR/Message
 * threat analysis returned by the FastAPI backend.
 */
export default function ScanResultCard({ resultData, scanType = 'URL', onReset }) {
  const [copied, setCopied] = useState(false);

  if (!resultData) return null;

  const {
    target,
    verdict = 'Safe',
    riskScore = 0,
    confidence = '0%',
    details = {},
    timestamp = new Date().toLocaleTimeString(),

    // Optional V3.3 backend metadata
    backendAnalysis = {},
  } = resultData;

  const {
    mlPrediction,
    trustedDomain,
    impersonatedDomain,
    typosquatDomain,
    suspiciousSignals,
    decisionScores,
    modelVersion,
    engine,
  } = backendAnalysis;

  const normalizedVerdict = String(verdict).toLowerCase();

  const handleCopy = async () => {
    const report = [
      '[LinkSentry V3.3 Threat Report]',
      `Type: ${scanType}`,
      `Target: ${target}`,
      `Verdict: ${verdict}`,
      `Risk Score: ${riskScore}/100`,
      `Confidence: ${confidence}`,
      '',
      '--- Detection Details ---',
      `Domain: ${details.domain || 'N/A'}`,
      `Engine: ${engine || details.detectionEngine || 'LinkSentry V3.3'}`,
      details.messageRiskScore ? `Message Heuristic Risk: ${details.messageRiskScore}` : '',
      details.extractedPhoneNumbers ? `Extracted Contacts: ${details.extractedPhoneNumbers}` : '',
      `Indicators: ${Array.isArray(details.threatIndicators) && details.threatIndicators.length
        ? details.threatIndicators.join(', ')
        : 'None'
      }`,
      `Model Version: ${modelVersion || details.modelVersion || 'V3.3'}`,
      '',
      `Timestamp: ${timestamp}`,
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard?.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy report failed:', error);
    }
  };

  const getVerdictDescription = () => {
    switch (normalizedVerdict) {
      case 'phishing':
      case 'critical':
        return 'CRITICAL THREAT: LinkSentry detected strong indicators of phishing, deceptive branding, or credential harvesting.';

      case 'malware':
        return 'MALWARE THREAT: Characteristics associated with malicious payload delivery or malware activity were detected.';

      case 'defacement':
        return 'DEFACEMENT THREAT: Characteristics associated with compromised or defaced infrastructure were detected.';

      case 'suspicious':
        return 'WARNING: Suspicious characteristics or coercive lures were detected. Exercise extreme caution.';

      default:
        return 'SAFE: No malicious indicators were detected by the LinkSentry decision-fusion engine.';
    }
  };

  const formatKey = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase());
  };

  const renderBoolean = (value) => {
    if (value === true) {
      return <span className="text-green">✓ Yes</span>;
    }
    if (value === false) {
      return <span className="text-red">✗ No</span>;
    }
    return <span className="font-mono">N/A</span>;
  };

  const hasBackendAnalysis = Object.keys(backendAnalysis).length > 0;

  return (
    <div className="cyber-card scan-result-card animate-fade-in" data-testid="scan-result-card">
      {/* HEADER */}
      <div className="scan-result-header">
        <div className="scan-result-title-group">
          <div className="scan-type-badge">
            <span className="font-mono text-cyan">
              [{scanType.toUpperCase()} SCAN RESULT]
            </span>
            <span className="scan-timestamp">
              Timestamp: {timestamp}
            </span>
          </div>

          <h3 className="scan-target-text font-mono" title={target} data-testid="scan-result-target">
            {target}
          </h3>
        </div>

        <div className="scan-result-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCopy}
            data-testid="scan-copy-button"
          >
            {copied ? '✓ Copied Report' : '📋 Copy Analysis'}
          </button>

          {onReset && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onReset}
              data-testid="scan-reset-button"
            >
              🔄 New Scan
            </button>
          )}
        </div>
      </div>

      {/* MAIN RESULT GRID */}
      <div className="scan-result-grid">
        {/* LEFT COLUMN */}
        <div className="scan-verdict-pane">
          <div className="verdict-banner-box">
            <span className="verdict-label-sub">
              Security Verdict
            </span>

            <div className="verdict-main-row">
              <Badge
                status={verdict}
                size="lg"
                pulse={normalizedVerdict !== 'safe'}
                data-testid="scan-result-verdict"
              >
                {String(verdict).toUpperCase()}
              </Badge>

              <span className="verdict-confidence" data-testid="scan-result-confidence">
                Confidence: <strong>{confidence}</strong>
              </span>
            </div>

            <p className="verdict-description-text">
              {getVerdictDescription()}
            </p>
          </div>

          <RiskScoreMeter score={riskScore} />

          {/* ENGINE SUMMARY */}
          <div className="cyber-card" style={{ marginTop: '1rem' }}>
            <h4 className="heuristics-title">
              Detection Engine Specifications
            </h4>

            <div className="heuristics-list">
              <div className="heuristic-item">
                <span className="heuristic-key">Engine Architecture</span>
                <span className="heuristic-val font-mono">
                  {engine || details.detectionEngine || 'LinkSentry V3.3 Fusion'}
                </span>
              </div>

              {details.messageRiskScore && (
                <div className="heuristic-item">
                  <span className="heuristic-key">Message Heuristics</span>
                  <span className="heuristic-val font-mono text-amber">
                    {details.messageRiskScore}
                  </span>
                </div>
              )}

              {details.extractedPhoneNumbers && (
                <div className="heuristic-item">
                  <span className="heuristic-key">Extracted Contacts</span>
                  <span className="heuristic-val font-mono text-cyan">
                    {details.extractedPhoneNumbers}
                  </span>
                </div>
              )}

              {details.qrPayloadCategory && (
                <div className="heuristic-item">
                  <span className="heuristic-key">QR Format Category</span>
                  <span className="heuristic-val font-mono">
                    {details.qrPayloadCategory}
                  </span>
                </div>
              )}

              {hasBackendAnalysis && (
                <>
                  <div className="heuristic-item">
                    <span className="heuristic-key">ML Model Prediction</span>
                    <span className="heuristic-val font-mono">
                      {mlPrediction || 'N/A'}
                    </span>
                  </div>

                  <div className="heuristic-item">
                    <span className="heuristic-key">Trusted Domain Check</span>
                    <span className="heuristic-val font-mono">
                      {renderBoolean(trustedDomain)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="scan-heuristics-pane">
          <h4 className="heuristics-title">
            Detection Analysis & Threat Evidence
          </h4>

          {/* DOMAIN & NETWORK INFO */}
          <div className="heuristics-list">
            {details.domain && (
              <div className="heuristic-item">
                <span className="heuristic-key">Registrable Domain</span>
                <span className="heuristic-val font-mono">{details.domain}</span>
              </div>
            )}

            {details.sslStatus && (
              <div className="heuristic-item">
                <span className="heuristic-key">SSL / Transport Layer</span>
                <span className="heuristic-val font-mono">{details.sslStatus}</span>
              </div>
            )}

            {hasBackendAnalysis && (
              <>
                {impersonatedDomain && impersonatedDomain !== 'None' && (
                  <div className="heuristic-item">
                    <span className="heuristic-key">Target Brand Impersonated</span>
                    <span className="heuristic-val font-mono text-red">⚠ {impersonatedDomain}</span>
                  </div>
                )}

                {typosquatDomain && typosquatDomain !== 'None' && (
                  <div className="heuristic-item">
                    <span className="heuristic-key">Typosquatting Signature</span>
                    <span className="heuristic-val font-mono text-red">⚠ {typosquatDomain}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* MULTI-SIGNAL: EMBEDDED URLS BREAKDOWN */}
          {Array.isArray(details.embeddedUrls) && details.embeddedUrls.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <h4 className="heuristics-title">
                Embedded Link Risk Breakdown
              </h4>
              <div className="heuristics-list">
                {details.embeddedUrls.map((emb, idx) => {
                  const embVerdict = emb.verdict || 'Safe';
                  const embScore = typeof emb.risk_score === 'number' ? emb.risk_score : (emb.riskScore || 0);
                  return (
                    <div key={idx} className="heuristic-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="heuristic-val font-mono" style={{ fontSize: '0.85rem', color: '#00f2fe' }}>
                          🔗 {emb.domain || emb.url}
                        </span>
                        <Badge status={embVerdict}>
                          {embVerdict.toUpperCase()} ({embScore})
                        </Badge>
                      </div>
                      {emb.impersonated_domain && (
                        <span style={{ fontSize: '0.75rem', color: '#f87171' }}>
                          Target Brand: {emb.impersonated_domain}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* THREAT INDICATORS */}
          <div style={{ marginTop: '1.25rem' }}>
            <h4 className="heuristics-title">
              Observed Risk Indicators
            </h4>
            <div className="heuristics-list">
              {Array.isArray(details.threatIndicators) && details.threatIndicators.length > 0 ? (
                details.threatIndicators.map((indicator, index) => (
                  <div key={`${indicator}-${index}`} className="heuristic-item">
                    <span className="heuristic-key">Signal {String(index + 1).padStart(2, '0')}</span>
                    <span className="heuristic-val font-mono text-red">⚠ {indicator}</span>
                  </div>
                ))
              ) : (
                <div className="heuristic-item">
                  <span className="heuristic-key">Status</span>
                  <span className="heuristic-val font-mono text-green">✓ No threat indicators detected</span>
                </div>
              )}
            </div>
          </div>

          {/* V3.3 SUSPICIOUS SIGNALS */}
          {Array.isArray(suspiciousSignals) && suspiciousSignals.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <h4 className="heuristics-title">
                V3.3 Rule Decision Signals
              </h4>
              <div className="heuristics-list">
                {suspiciousSignals.map((signal, index) => (
                  <div key={`${signal}-${index}`} className="heuristic-item">
                    <span className="heuristic-key">Detection {String(index + 1).padStart(2, '0')}</span>
                    <span className="heuristic-val font-mono text-red">{formatKey(signal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DECISION SCORES */}
          {decisionScores && typeof decisionScores === 'object' && (
            <div style={{ marginTop: '1.25rem' }}>
              <h4 className="heuristics-title">
                Decision Scores
              </h4>
              <div className="heuristics-list">
                {Object.entries(decisionScores).map(([key, value]) => (
                  <div key={key} className="heuristic-item">
                    <span className="heuristic-key">{formatKey(key)}</span>
                    <span className="heuristic-val font-mono">
                      {typeof value === 'number' ? value.toFixed(4) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECURITY RECOMMENDATION */}
          <div className={`recommendation-box rec-${normalizedVerdict}`}>
            <strong>Security Recommendation:</strong>
            <p>
              {normalizedVerdict === 'phishing' || normalizedVerdict === 'critical' ? (
                '🚫 Do not open, authenticate, download attachments, or disburse funds. Block or report this communication.'
              ) : normalizedVerdict === 'malware' ? (
                '🚫 Do not access the payload or download content from it. Isolate affected devices immediately.'
              ) : normalizedVerdict === 'defacement' ? (
                '⚠ Avoid interacting with the destination until its integrity and ownership have been verified.'
              ) : normalizedVerdict === 'suspicious' ? (
                '⚠ Do not enter credentials, OTP codes, or financial information. Verify the identity through independent channels.'
              ) : (
                '✅ No malicious indicators were detected. Continue to follow standard security protocols.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ENGINE NOTICE FOOTER */}
      <div className="engine-notice-footer">
        <span className="font-mono text-cyan">ℹ LinkSentry V3.3:</span>
        <span>
          LinearSVC classification + hard-negative training + brand impersonation detection + multi-signal smishing heuristics + decision-fusion layer.
        </span>
      </div>
    </div>
  );
}