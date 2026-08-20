import { useState } from 'react';
import Badge from './Badge';
import RiskScoreMeter from './RiskScoreMeter';
import UrlAnatomy from './security/UrlAnatomy';

/**
 * ScanResultCard
 *
 * Displays the complete LinkSentry V3.4 URL/QR/Message
 * threat analysis and domain reachability verification returned by the FastAPI backend.
 */
export default function ScanResultCard({ resultData, scanType = 'URL', onReset }) {
  const [copied, setCopied] = useState(false);
  const [showTechnicalAnalysis, setShowTechnicalAnalysis] = useState(true);

  if (!resultData) return null;

  const {
    target,
    verdict = 'Safe',
    riskScore = 0,
    confidence = '0%',
    details = {},
    domainVerification: directDomainVerification,
    threatAnalysis: directThreatAnalysis,
    timestamp = new Date().toLocaleTimeString(),

    // Optional V3.4 backend metadata
    backendAnalysis = {},
  } = resultData;

  const {
    mlPrediction,
    trustedDomain,
    impersonatedDomain,
    typosquatDomain,
    potentialBrand,
    suspiciousSignals,
    decisionScores: rawBackendScores,
    modelVersion,
    engine,
  } = backendAnalysis;

  let rawDecisionScores = rawBackendScores || resultData.decisionScores || threatAnalysis?.decision_scores || threatAnalysis?.decision_margins || details.decisionScores || null;
  let decisionScores = null;
  if (rawDecisionScores && typeof rawDecisionScores === 'object') {
    decisionScores = rawDecisionScores;
  } else if (typeof rawDecisionScores === 'string' && rawDecisionScores !== 'N/A') {
    try {
      decisionScores = JSON.parse(rawDecisionScores);
    } catch {
      decisionScores = null;
    }
  }

  const domainVerification = directDomainVerification || backendAnalysis.domainVerification || details.domainVerification || null;
  const threatAnalysis = directThreatAnalysis || backendAnalysis.threatAnalysis || null;

  const normalizedVerdict = String(verdict).toLowerCase().replace(/[\s-]/g, '_');

  const handleCopy = async () => {
    const report = [
      '[LinkSentry V3.4 Threat & Reachability Report]',
      `Type: ${scanType}`,
      `Target: ${target}`,
      `Security Verdict: ${verdict}`,
      `Risk Score: ${riskScore}/100`,
      `Confidence: ${confidence}`,
      '',
      '--- Threat Classification ---',
      `ML Model Prediction: ${mlPrediction || threatAnalysis?.ml_prediction || 'N/A'}`,
      `Threat Classification: ${threatAnalysis?.verdict || 'N/A'}`,
      '',
      '--- Domain Verification ---',
      domainVerification ? `Verification Status: ${domainVerification.status || 'N/A'}` : '',
      domainVerification ? `DNS Resolution: ${domainVerification.dns_status || (domainVerification.dns_resolved ? 'Resolved' : 'Failed')}` : '',
      domainVerification ? `HTTP Reachability: ${domainVerification.http_reachable ? 'Reachable' : 'Unreachable'}` : '',
      domainVerification?.http_status ? `HTTP Status: ${domainVerification.http_status}` : '',
      domainVerification?.tls_valid !== undefined ? `TLS Encrypted: ${domainVerification.tls_valid ? 'Yes' : 'No'}` : '',
      '',
      '--- Detection Details ---',
      `Domain: ${details.domain || 'N/A'}`,
      `Engine: ${engine || details.detectionEngine || 'LinkSentry V3.4'}`,
      details.messageRiskScore ? `Message Heuristic Risk: ${details.messageRiskScore}` : '',
      details.extractedPhoneNumbers ? `Extracted Contacts: ${details.extractedPhoneNumbers}` : '',
      `Indicators: ${Array.isArray(details.threatIndicators) && details.threatIndicators.length
        ? details.threatIndicators.join(', ')
        : 'None'
      }`,
      `Model Version: ${modelVersion || details.modelVersion || 'V3.4'}`,
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
      case 'malicious':
        return 'CRITICAL THREAT: LinkSentry detected strong indicators of phishing, deceptive branding, or credential harvesting.';

      case 'malware':
        return 'MALWARE THREAT: Characteristics associated with malicious payload delivery or malware activity were detected.';

      case 'defacement':
        return 'DEFACEMENT THREAT: Characteristics associated with compromised or defaced infrastructure were detected.';

      case 'suspicious':
        return 'WARNING: Suspicious characteristics, brand lookalikes, or coercive lures were detected. Exercise extreme caution.';

      case 'non_existent':
        return 'NON-EXISTENT DOMAIN: Domain lookup failed in public DNS (NXDOMAIN). The destination domain does not resolve to an active server.';

      case 'unreachable':
        return 'UNREACHABLE DESTINATION: Domain DNS resolved but an HTTP/HTTPS connection could not be established (network timeout or connection refused).';

      case 'invalid':
        return 'INVALID TARGET: The input target is malformed, invalid, or uses an unsupported URI scheme.';

      default:
        return 'SAFE: Domain is verified reachable and no malicious indicators were detected by the LinkSentry decision-fusion engine.';
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
            <div className="verdict-header-row">
              <span className="verdict-label-sub">
                Final Security Verdict
              </span>
              <span className="verdict-engine-tag font-mono">
                Multi-Signal Fusion
              </span>
            </div>

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

            <p className="verdict-engine-note font-mono">
              Determined by LinkSentry's multi-signal fusion engine combining ML heuristics, DNS, reachability, and brand reputation.
            </p>
          </div>

          <RiskScoreMeter score={riskScore} />

          {/* DOMAIN VERIFICATION CARD */}
          {(domainVerification || scanType === 'URL') && (
            <div className="cyber-card domain-verification-card" style={{ marginTop: '1rem' }} data-testid="domain-verification-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 className="heuristics-title" style={{ margin: 0 }}>
                  Domain Existence & Reachability
                </h4>
                <Badge status={domainVerification?.status || (trustedDomain || normalizedVerdict === 'safe' ? 'reachable' : 'unknown')} size="sm" data-testid="domain-verification-status-badge">
                  {(domainVerification?.status || (trustedDomain || normalizedVerdict === 'safe' ? 'REACHABLE' : 'UNKNOWN')).toUpperCase()}
                </Badge>
              </div>

              <div className="domain-heuristics-list">
                <div className="heuristic-item">
                  <span className="heuristic-key">DNS Resolution</span>
                  <span className="heuristic-val font-mono" data-testid="domain-dns-status">
                    {domainVerification ? (
                      domainVerification.dns_resolved ? (
                        <span className="text-green">✓ Resolved ({Array.isArray(domainVerification.resolved_ips) && domainVerification.resolved_ips.length ? domainVerification.resolved_ips.slice(0, 2).join(', ') : 'IP Found'})</span>
                      ) : (
                        <span className="text-red">✗ {domainVerification.dns_status || 'Domain Not Found (NXDOMAIN)'}</span>
                      )
                    ) : (
                      <span className="text-green">✓ Resolved (Verified Host)</span>
                    )}
                  </span>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-key">Website Reachability</span>
                  <span className="heuristic-val font-mono" data-testid="domain-reachability-status">
                    {domainVerification ? (
                      domainVerification.http_reachable ? (
                        <span className="text-green">✓ Reachable {domainVerification.http_status ? `(HTTP ${domainVerification.http_status})` : ''}</span>
                      ) : (
                        <span className="text-red">✗ Not Reachable</span>
                      )
                    ) : (
                      <span className="text-green">✓ Reachable (HTTP Probed)</span>
                    )}
                  </span>
                </div>

                {domainVerification?.http_status && (
                  <div className="heuristic-item">
                    <span className="heuristic-key">HTTP Status Code</span>
                    <span className="heuristic-val font-mono text-cyan" data-testid="domain-http-status">
                      {domainVerification.http_status}
                    </span>
                  </div>
                )}

                <div className="heuristic-item">
                  <span className="heuristic-key">TLS / Encryption</span>
                  <span className="heuristic-val font-mono" data-testid="domain-tls-status">
                    {domainVerification?.tls_valid === true ? (
                      <span className="text-green">✓ HTTPS Active</span>
                    ) : domainVerification?.tls_valid === false ? (
                      <span className="text-red">✗ TLS Error / Insecure</span>
                    ) : (
                      <span className="font-mono">N/A</span>
                    )}
                  </span>
                </div>

                {typeof domainVerification?.response_time_ms === 'number' && domainVerification.response_time_ms > 0 && (
                  <div className="heuristic-item">
                    <span className="heuristic-key">Response Latency</span>
                    <span className="heuristic-val font-mono">
                      {domainVerification.response_time_ms} ms
                    </span>
                  </div>
                )}

                {typeof domainVerification?.redirect_count === 'number' && domainVerification.redirect_count > 0 && (
                  <div className="heuristic-item">
                    <span className="heuristic-key">Redirects</span>
                    <span className="heuristic-val font-mono text-amber">
                      {domainVerification.redirect_count} hops {domainVerification.final_url ? `→ ${domainVerification.final_url}` : ''}
                    </span>
                  </div>
                )}

                {domainVerification?.error && (
                  <div className="heuristic-item">
                    <span className="heuristic-key">Verification Note</span>
                    <span className="heuristic-val font-mono text-amber" style={{ fontSize: '0.8rem' }}>
                      ℹ {domainVerification.error}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ENGINE SUMMARY */}
          <div className="cyber-card" style={{ marginTop: '1rem' }}>
            <h4 className="heuristics-title">
              Detection Engine Specifications
            </h4>

            <div className="heuristics-list">
              <div className="heuristic-item">
                <span className="heuristic-key">Engine Architecture</span>
                <span className="heuristic-val font-mono">
                  {engine || details.detectionEngine || 'LinkSentry V3.4 Fusion'}
                </span>
              </div>

              <div className="heuristic-item">
                <span className="heuristic-key">Model Version</span>
                <span className="heuristic-val font-mono">
                  {modelVersion || details.modelVersion || 'V3.4'}
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
                    <span className="heuristic-val font-mono" data-testid="scan-ml-prediction">
                      {mlPrediction || threatAnalysis?.ml_prediction || 'N/A'}
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
                    <span className="heuristic-val font-mono text-red">⚠ {typosquatDomain}{potentialBrand ? ` (Target: ${potentialBrand})` : ''}</span>
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

          {/* V3.4 SUSPICIOUS SIGNALS */}
          {Array.isArray(suspiciousSignals) && suspiciousSignals.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <h4 className="heuristics-title">
                Rule Decision Signals
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

          {/* MODEL DECISION SIGNALS */}
          {decisionScores && typeof decisionScores === 'object' && Object.keys(decisionScores).length > 0 && (
            <div className="model-decision-signals-card" style={{ marginTop: '1.25rem' }}>
              <div
                className="signals-header-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setShowTechnicalAnalysis((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowTechnicalAnalysis((prev) => !prev);
                  }
                }}
                aria-expanded={showTechnicalAnalysis}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 className="heuristics-title" style={{ margin: 0 }}>
                    Technical ML Decision Margins
                  </h4>
                  <span className="font-mono text-cyan" style={{ fontSize: '0.75rem' }}>
                    {showTechnicalAnalysis ? '▲' : '▼'}
                  </span>
                </div>

                <span className="signal-note-pill font-mono" title="LinearSVC decision scores represent relative class margin distances from hyperplanes, not independent probabilities.">
                  ℹ Relative Margins (Not Probabilities)
                </span>
              </div>

              {showTechnicalAnalysis && (
                <div className="signals-collapsible-body animate-fade-in">
                  <p className="signals-subtext">
                    These values are relative classifier decision margins, not probabilities. The final verdict combines ML evidence with domain, DNS, TLS, reachability, reputation, and brand-impersonation signals.
                  </p>

                  <div className="decision-meters-list">
                    {Object.entries(decisionScores).map(([key, value]) => {
                      const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
                      const formattedVal = `${numVal > 0 ? '+' : ''}${numVal.toFixed(4)}`;
                      const isPositive = numVal > 0;
                      const isLeading = key.toLowerCase() === (mlPrediction || threatAnalysis?.ml_prediction || '').toLowerCase();

                      // Map value into a visual indicator width (0 to 100%)
                      // LinearSVC margins generally fall between -5.0 and +2.0
                      const normalizedWidth = Math.max(8, Math.min(95, Math.round(((numVal + 5) / 7.5) * 85) + 10));

                      let dotClass = 'dot-neutral';
                      let barColor = 'var(--text-muted)';
                      if (key.toLowerCase() === 'benign') {
                        dotClass = 'dot-benign';
                        barColor = 'var(--status-safe)';
                      } else if (key.toLowerCase() === 'defacement') {
                        dotClass = 'dot-defacement';
                        barColor = 'var(--status-warning)';
                      } else if (key.toLowerCase() === 'malware') {
                        dotClass = 'dot-malware';
                        barColor = 'var(--status-suspicious)';
                      } else if (key.toLowerCase() === 'phishing') {
                        dotClass = 'dot-phishing';
                        barColor = 'var(--status-phishing)';
                      }

                      return (
                        <div key={key} className={`decision-meter-row ${isLeading ? 'leading-signal' : ''}`}>
                          <div className="meter-class-group">
                            <span className={`meter-dot ${dotClass}`} />
                            <span className="meter-class-label">{formatKey(key)}</span>
                          </div>

                          <div className="meter-track" role="progressbar" aria-valuenow={numVal} aria-valuetext={`${key}: ${formattedVal}`}>
                            <div
                              className="meter-bar"
                              style={{ width: `${normalizedWidth}%`, backgroundColor: barColor }}
                            />
                          </div>

                          <div className={`meter-score-val font-mono ${isPositive ? 'score-positive' : 'score-negative'}`}>
                            {formattedVal}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EMBEDDED URL ANATOMY FOR SCANNED URL TARGET */}
          {scanType === 'URL' && target && (
            <div style={{ marginTop: '1.25rem' }}>
              <UrlAnatomy
                url={target}
                analysisMetadata={backendAnalysis}
                compact={true}
                showTitle={true}
              />
            </div>
          )}

          {/* SECURITY RECOMMENDATION */}
          <div className={`recommendation-box rec-${normalizedVerdict}`}>
            <strong>Security Recommendation:</strong>
            <p>
              {normalizedVerdict === 'phishing' || normalizedVerdict === 'critical' || normalizedVerdict === 'malicious' ? (
                '🚫 Do not open, authenticate, download attachments, or disburse funds. Block or report this communication.'
              ) : normalizedVerdict === 'malware' ? (
                '🚫 Do not access the payload or download content from it. Isolate affected devices immediately.'
              ) : normalizedVerdict === 'defacement' ? (
                '⚠ Avoid interacting with the destination until its integrity and ownership have been verified.'
              ) : normalizedVerdict === 'suspicious' ? (
                '⚠ Do not enter credentials, OTP codes, or financial information. Verify the identity through independent channels.'
              ) : normalizedVerdict === 'non_existent' ? (
                'ℹ This domain does not exist in public DNS. It cannot be reached or used for live interaction.'
              ) : normalizedVerdict === 'unreachable' ? (
                'ℹ The target server is currently unreachable. If this is unexpected, verify the link or try again later.'
              ) : (
                '✅ No malicious indicators were detected. Continue to follow standard security protocols.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ENGINE NOTICE FOOTER */}
      <div className="engine-notice-footer">
        <span className="font-mono text-cyan">ℹ LinkSentry V3.4:</span>
        <span>
          LinearSVC classification + hard-negative training + brand impersonation & typosquatting detection + real domain existence/reachability verification + decision-fusion layer.
        </span>
      </div>
    </div>
  );
}