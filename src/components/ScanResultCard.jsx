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
    modelPrediction,
    trustedDomain,
    trustOverride,
    ruleOverride,
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
      `Engine: ${engine || details.detectionEngine || 'N/A'}`,
      `ML Prediction: ${mlPrediction || 'N/A'}`,
      `Final Model Prediction: ${modelPrediction || 'N/A'}`,
      `Trusted Domain: ${trustedDomain === true
        ? 'Yes'
        : trustedDomain === false
          ? 'No'
          : 'N/A'
      }`,
      `Trust Override: ${trustOverride === true
        ? 'Yes'
        : trustOverride === false
          ? 'No'
          : 'N/A'
      }`,
      `Rule Override: ${ruleOverride === true
        ? 'Yes'
        : ruleOverride === false
          ? 'No'
          : 'N/A'
      }`,
      `Impersonated Domain: ${impersonatedDomain || 'None'}`,
      `Typosquat Domain: ${typosquatDomain || 'None'}`,
      `Suspicious Signals: ${Array.isArray(suspiciousSignals) && suspiciousSignals.length
        ? suspiciousSignals.join(', ')
        : 'None'
      }`,
      `Indicators: ${Array.isArray(details.threatIndicators) &&
        details.threatIndicators.length
        ? details.threatIndicators.join(', ')
        : 'None'
      }`,
      `Model Version: ${modelVersion || 'N/A'}`,
      '',
      `Timestamp: ${timestamp}`,
    ].join('\n');

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
        return 'MALWARE THREAT: The URL shows characteristics associated with malicious payload delivery or malware activity.';

      case 'defacement':
        return 'DEFACEMENT THREAT: The URL has characteristics associated with compromised or defaced web infrastructure.';

      case 'suspicious':
        return 'WARNING: Suspicious URL characteristics were detected. Avoid entering credentials or sensitive information until verified.';

      default:
        return 'SAFE: No strong malicious indicators were detected by the LinkSentry V3.3 decision-fusion engine.';
    }
  };

  const formatKey = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase());
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'None';
    }

    if (typeof value === 'boolean') {
      return value ? '✓ Yes' : '✗ No';
    }

    if (Array.isArray(value)) {
      return value.length > 0
        ? value.join(', ')
        : 'None detected';
    }

    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([key, val]) => `${key}: ${val}`)
        .join(' | ');
    }

    return String(value);
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

  const hasBackendAnalysis =
    Object.keys(backendAnalysis).length > 0;

  return (
    <div className="cyber-card scan-result-card animate-fade-in">

      {/* =========================================================
          HEADER
      ========================================================== */}
      <div className="scan-result-header">
        <div className="scan-result-title-group">

          <div className="scan-type-badge">
            <span className="font-mono text-cyan">
              [{scanType} SCAN RESULT]
            </span>

            <span className="scan-timestamp">
              Timestamp: {timestamp}
            </span>
          </div>

          <h3
            className="scan-target-text font-mono"
            title={target}
          >
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

      {/* =========================================================
          MAIN RESULT GRID
      ========================================================== */}
      <div className="scan-result-grid">

        {/* =======================================================
            LEFT COLUMN
        ======================================================== */}
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
              >
                {String(verdict).toUpperCase()}
              </Badge>

              <span className="verdict-confidence">
                Confidence:{' '}
                <strong>{confidence}</strong>
              </span>

            </div>

            <p className="verdict-description-text">
              {getVerdictDescription()}
            </p>

          </div>

          <RiskScoreMeter score={riskScore} />

          {/* =====================================================
              V3.3 ENGINE SUMMARY
          ====================================================== */}
          {hasBackendAnalysis && (
            <div
              className="cyber-card"
              style={{ marginTop: '1rem' }}
            >

              <h4 className="heuristics-title">
                LinkSentry V3.3 Engine
              </h4>

              <div className="heuristics-list">

                {/* Model Version */}
                <div className="heuristic-item">
                  <span className="heuristic-key">
                    Model Version
                  </span>

                  <span className="heuristic-val font-mono">
                    {modelVersion || 'N/A'}
                  </span>
                </div>

                {/* ML Prediction */}
                <div className="heuristic-item">
                  <span className="heuristic-key">
                    ML Prediction
                  </span>

                  <span className="heuristic-val font-mono">
                    {mlPrediction || 'N/A'}
                  </span>
                </div>

                {/* Final Model Prediction */}
                <div className="heuristic-item">
                  <span className="heuristic-key">
                    Final Prediction
                  </span>

                  <span className="heuristic-val font-mono">
                    {modelPrediction || verdict}
                  </span>
                </div>

                {/* Trusted Domain */}
                <div className="heuristic-item">
                  <span className="heuristic-key">
                    Trusted Domain
                  </span>

                  <span className="heuristic-val font-mono">
                    {renderBoolean(trustedDomain)}
                  </span>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* =======================================================
            RIGHT COLUMN
        ======================================================== */}
        <div className="scan-heuristics-pane">

          <h4 className="heuristics-title">
            Detection Analysis & Threat Signals
          </h4>

          {/* =====================================================
              DOMAIN
          ====================================================== */}
          <div className="heuristics-list">

            <div className="heuristic-item">
              <span className="heuristic-key">
                Domain
              </span>

              <span className="heuristic-val font-mono">
                {details.domain || 'N/A'}
              </span>
            </div>

            <div className="heuristic-item">
              <span className="heuristic-key">
                Detection Engine
              </span>

              <span className="heuristic-val font-mono">
                {engine ||
                  details.detectionEngine ||
                  'LinkSentry V3.3'}
              </span>
            </div>

            <div className="heuristic-item">
              <span className="heuristic-key">
                HTTPS Status
              </span>

              <span className="heuristic-val font-mono">
                {details.sslStatus || 'N/A'}
              </span>
            </div>

            {/* =================================================
                TRUST / OVERRIDE INFORMATION
            ================================================== */}

            {hasBackendAnalysis && (
              <>
                <div className="heuristic-item">
                  <span className="heuristic-key">
                    Trusted Domain
                  </span>

                  <span className="heuristic-val font-mono">
                    {renderBoolean(trustedDomain)}
                  </span>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-key">
                    Trust Override
                  </span>

                  <span className="heuristic-val font-mono">
                    {renderBoolean(trustOverride)}
                  </span>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-key">
                    Rule Override
                  </span>

                  <span className="heuristic-val font-mono">
                    {renderBoolean(ruleOverride)}
                  </span>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-key">
                    Impersonated Domain
                  </span>

                  <span className="heuristic-val font-mono">
                    {impersonatedDomain || 'None'}
                  </span>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-key">
                    Typosquat Domain
                  </span>

                  <span className="heuristic-val font-mono">
                    {typosquatDomain || 'None'}
                  </span>
                </div>
              </>
            )}

          </div>

          {/* =====================================================
              THREAT INDICATORS
          ====================================================== */}
          <div style={{ marginTop: '1.25rem' }}>

            <h4 className="heuristics-title">
              Threat Indicators
            </h4>

            <div className="heuristics-list">

              {Array.isArray(details.threatIndicators) &&
                details.threatIndicators.length > 0 ? (

                details.threatIndicators.map((indicator, index) => (
                  <div
                    key={`${indicator}-${index}`}
                    className="heuristic-item"
                  >
                    <span className="heuristic-key">
                      Signal {String(index + 1).padStart(2, '0')}
                    </span>

                    <span className="heuristic-val font-mono text-red">
                      ⚠ {indicator}
                    </span>
                  </div>
                ))

              ) : (

                <div className="heuristic-item">
                  <span className="heuristic-key">
                    Status
                  </span>

                  <span className="heuristic-val font-mono text-green">
                    ✓ No threat indicators detected
                  </span>
                </div>

              )}

            </div>

          </div>

          {/* =====================================================
              V3.3 SUSPICIOUS SIGNALS
          ====================================================== */}
          {Array.isArray(suspiciousSignals) &&
            suspiciousSignals.length > 0 && (

              <div style={{ marginTop: '1.25rem' }}>

                <h4 className="heuristics-title">
                  V3.3 Suspicious Signals
                </h4>

                <div className="heuristics-list">

                  {suspiciousSignals.map((signal, index) => (
                    <div
                      key={`${signal}-${index}`}
                      className="heuristic-item"
                    >
                      <span className="heuristic-key">
                        Detection {String(index + 1).padStart(2, '0')}
                      </span>

                      <span className="heuristic-val font-mono text-red">
                        {formatKey(signal)}
                      </span>
                    </div>
                  ))}

                </div>

              </div>
            )}

          {/* =====================================================
              DECISION SCORES
          ====================================================== */}
          {decisionScores &&
            typeof decisionScores === 'object' && (

              <div style={{ marginTop: '1.25rem' }}>

                <h4 className="heuristics-title">
                  Decision Scores
                </h4>

                <div className="heuristics-list">

                  {Object.entries(decisionScores).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="heuristic-item"
                      >
                        <span className="heuristic-key">
                          {formatKey(key)}
                        </span>

                        <span className="heuristic-val font-mono">
                          {typeof value === 'number'
                            ? value.toFixed(4)
                            : String(value)}
                        </span>
                      </div>
                    )
                  )}

                </div>

              </div>
            )}

          {/* =====================================================
              SECURITY RECOMMENDATION
          ====================================================== */}
          <div
            className={`recommendation-box rec-${normalizedVerdict}`}
          >

            <strong>
              Security Recommendation:
            </strong>

            <p>

              {normalizedVerdict === 'phishing' ? (
                '🚫 Do not open, authenticate, download files, or enter credentials. Block or report the URL if it is confirmed malicious.'
              ) : normalizedVerdict === 'malware' ? (
                '🚫 Do not access the URL or download content from it. Isolate affected systems and investigate the source.'
              ) : normalizedVerdict === 'defacement' ? (
                '⚠ Avoid interacting with the site until its integrity and ownership have been verified.'
              ) : normalizedVerdict === 'suspicious' ? (
                '⚠ Do not enter passwords, MFA codes, or financial information. Verify the destination through an independent trusted source.'
              ) : (
                '✅ No strong malicious indicators were detected. Continue to follow normal security precautions.'
              )}

            </p>

          </div>

        </div>
      </div>

      {/* =========================================================
          ENGINE FOOTER
      ========================================================== */}
      <div className="engine-notice-footer">

        <span className="font-mono text-cyan">
          ℹ LinkSentry V3.3:
        </span>

        <span>
          LinearSVC classification + hard-negative training +
          trusted-domain analysis + typosquatting detection +
          brand impersonation + decision-fusion layer.
        </span>

      </div>

    </div>
  );
}