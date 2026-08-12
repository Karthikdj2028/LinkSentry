import { useState } from 'react';
import ScanResultCard from '../../components/ScanResultCard';
import { PRESET_SAMPLES } from '../../data/mockData';
import { useAuth } from '../../context';
import { saveScan, mapBackendScanToFirestoreDoc } from '../../firebase';
import { API_BASE_URL } from '../../config/api';

/**
 * URL Scanner
 *
 * Connects the React frontend to the LinkSentry FastAPI V3.3
 * URL phishing detection pipeline.
 *
 * Flow:
 *
 * User URL
 *    ↓
 * POST /api/scan/url
 *    ↓
 * FastAPI
 *    ↓
 * V3.3 ML + trusted-domain + typosquatting + decision fusion
 *    ↓
 * ScanResultCard
 *    ↓
 * Optional Firestore history
 */
export default function UrlScanner() {
  const { currentUser } = useAuth();

  const [urlInput, setUrlInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // ------------------------------------------------------------
  // URL VALIDATION
  // ------------------------------------------------------------

  const validateUrl = (value) => {
    if (!value || value.trim() === '') {
      return 'Please enter a URL to scan.';
    }

    const trimmed = value.trim();

    try {
      const normalized = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;

      const parsed = new URL(normalized);

      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        return 'Please enter a valid domain or URL.';
      }

      return '';
    } catch {
      return 'Please enter a valid URL.';
    }
  };

  // ------------------------------------------------------------
  // SCAN
  // ------------------------------------------------------------

  const handleScan = async (e) => {
    e?.preventDefault();

    const error = validateUrl(urlInput);

    if (error) {
      setValidationError(error);
      setScanResult(null);
      setSaveWarning('');
      return;
    }

    const targetUrl = urlInput.trim();

    setValidationError('');
    setSaveWarning('');
    setIsScanning(true);
    setScanResult(null);

    try {
      console.log(
        '[LinkSentry] Sending URL to backend:',
        `${API_BASE_URL}/api/scan/url`
      );

      const response = await fetch(`${API_BASE_URL}/api/scan/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: targetUrl,
        }),
      });

      if (!response.ok) {
        let serverMessage = `Server returned HTTP ${response.status}`;

        try {
          const errorData = await response.json();

          if (errorData?.detail) {
            serverMessage =
              typeof errorData.detail === 'string'
                ? errorData.detail
                : JSON.stringify(errorData.detail);
          }
        } catch {
          // Keep default HTTP error message.
        }

        throw new Error(serverMessage);
      }

      const data = await response.json();

      console.log('[LinkSentry] Backend response:', data);

      // ----------------------------------------------------------
      // RESPONSE VALIDATION
      // ----------------------------------------------------------

      if (!data || typeof data !== 'object') {
        throw new Error(
          'Invalid response received from LinkSentry backend.'
        );
      }

      // ----------------------------------------------------------
      // INVALID URL RESPONSE
      // ----------------------------------------------------------

      if (data.verdict === 'invalid') {
        const errorMsg =
          Array.isArray(data.indicators) && data.indicators.length > 0
            ? data.indicators.join(', ')
            : 'Invalid URL format provided.';

        setValidationError(errorMsg);
        setScanResult(null);
        return;
      }

      // ----------------------------------------------------------
      // VERDICT
      // ----------------------------------------------------------

      const rawVerdict =
        typeof data.verdict === 'string'
          ? data.verdict.toLowerCase()
          : 'safe';

      const formattedVerdict =
        rawVerdict.charAt(0).toUpperCase() +
        rawVerdict.slice(1);

      // ----------------------------------------------------------
      // INDICATORS
      // ----------------------------------------------------------

      const indicators =
        Array.isArray(data.indicators) && data.indicators.length > 0
          ? data.indicators
          : ['No threat indicators detected'];

      const suspiciousSignals =
        Array.isArray(data.suspicious_signals)
          ? data.suspicious_signals
          : [];

      // ----------------------------------------------------------
      // V3.3 SECURITY DETAILS
      // ----------------------------------------------------------

      const details = {
        domain: data.domain || 'N/A',

        detectionEngine:
          data.engine ||
          'LinkSentry V3.3 Detection Engine',

        modelVersion:
          data.model_version ||
          'V3.3',

        mlPrediction:
          data.ml_prediction || 'N/A',

        finalModelPrediction:
          data.model_prediction || 'N/A',

        trustedDomain:
          typeof data.trusted_domain === 'boolean'
            ? data.trusted_domain
            : false,

        trustOverride:
          typeof data.trust_override === 'boolean'
            ? data.trust_override
            : false,

        ruleOverride:
          typeof data.rule_override === 'boolean'
            ? data.rule_override
            : false,

        impersonatedDomain:
          data.impersonated_domain || 'None',

        typosquatDomain:
          data.typosquat_domain || 'None',

        suspiciousSignals:
          suspiciousSignals.length > 0
            ? suspiciousSignals
            : 'None detected',

        threatIndicators: indicators,

        decisionScores:
          data.decision_scores
            ? JSON.stringify(data.decision_scores)
            : 'N/A',

        sslStatus: (data.url || targetUrl).startsWith('https://')
          ? 'HTTPS Enabled (Encrypted)'
          : 'HTTP Only (Unencrypted / Insecure)',
      };

      // ----------------------------------------------------------
      // CONFIDENCE
      // ----------------------------------------------------------

      const confidenceDisplay =
        typeof data.confidence === 'number'
          ? `${Math.round(data.confidence * 100)}%`
          : 'N/A';

      // ----------------------------------------------------------
      // RISK SCORE
      // ----------------------------------------------------------

      const riskScore =
        typeof data.risk_score === 'number'
          ? Math.max(0, Math.min(100, data.risk_score))
          : 0;

      // ----------------------------------------------------------
      // BUILD RESULT FOR UI
      // ----------------------------------------------------------

      const result = {
        target: data.url || targetUrl,

        verdict: formattedVerdict,

        riskScore,

        confidence: confidenceDisplay,

        details,

        // Keep complete V3.3 backend analysis available
        // for future UI components.
        backendAnalysis: {
          prediction: data.verdict,

          mlPrediction: data.ml_prediction,

          modelPrediction: data.model_prediction,

          confidence: data.confidence,

          riskScore: data.risk_score,

          domain: data.domain,

          trustedDomain: data.trusted_domain,

          trustOverride: data.trust_override,

          ruleOverride: data.rule_override,

          impersonatedDomain:
            data.impersonated_domain,

          typosquatDomain:
            data.typosquat_domain,

          suspiciousSignals:
            suspiciousSignals,

          indicators,

          decisionScores:
            data.decision_scores,

          modelVersion:
            data.model_version,

          engine:
            data.engine,
        },

        timestamp: new Date().toLocaleTimeString(),
      };

      console.log(
        '[LinkSentry] Final frontend scan result:',
        result
      );

      setScanResult(result);

      // ----------------------------------------------------------
      // FIRESTORE HISTORY
      // ----------------------------------------------------------

      if (currentUser?.uid) {
        try {
          const firestorePayload =
            mapBackendScanToFirestoreDoc(
              currentUser.uid,
              targetUrl,
              data,
              'url'
            );

          await saveScan(
            currentUser.uid,
            firestorePayload
          );

          console.log(
            '[LinkSentry] Scan saved to Firestore.'
          );
        } catch (saveErr) {
          console.error(
            '[LinkSentry] Cloud Firestore scan save error:',
            saveErr
          );

          setSaveWarning(
            'Scan completed, but the result could not be saved to history.'
          );
        }
      }
    } catch (err) {
      console.error(
        '[LinkSentry] URL scan error:',
        err
      );

      setValidationError(
        err?.message?.includes('HTTP')
          ? `Backend error: ${err.message}`
          : 'Unable to connect to LinkSentry backend.'
      );

      setScanResult(null);
    } finally {
      setIsScanning(false);
    }
  };

  // ------------------------------------------------------------
  // PRESET
  // ------------------------------------------------------------

  const handlePresetSelect = (preset) => {
    setUrlInput(preset.url);
    setValidationError('');
    setSaveWarning('');
    setScanResult(null);
  };

  // ------------------------------------------------------------
  // CLEAR
  // ------------------------------------------------------------

  const handleClear = () => {
    setUrlInput('');
    setValidationError('');
    setSaveWarning('');
    setScanResult(null);
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <div className="scanner-tab-content">

      {/* ======================================================
          SCANNER CONTROL BOX
      ====================================================== */}

      <div className="cyber-card scanner-box">

        <div className="scanner-header-row">

          <div className="scanner-title-group">

            <h2 className="scanner-title">
              <span className="scanner-icon">
                🔍
              </span>

              Advanced URL Phishing Scanner
            </h2>

            <p className="scanner-description">
              Analyze suspicious links, shortened URLs,
              brand impersonations, typosquatting,
              and credential harvesting attempts
              using the LinkSentry V3.3 detection pipeline.
            </p>

          </div>

          <span className="font-mono scanner-mode-pill">
            V3.3: ML + RULE FUSION
          </span>

        </div>

        {/* ====================================================
            INPUT FORM
        ==================================================== */}

        <form
          onSubmit={handleScan}
          className="scan-form"
        >

          <div className="form-group">

            <label
              htmlFor="url-input"
              className="form-label"
            >
              Target URL or Domain Name
            </label>

            <div className="input-with-button-wrapper">

              <div className="input-icon-prefix">
                🔗
              </div>

              <input
                id="url-input"
                type="text"
                className={`form-input font-mono ${
                  validationError
                    ? 'input-error'
                    : ''
                }`}
                placeholder="https://example.com/login or paste suspicious link..."
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);

                  if (validationError) {
                    setValidationError('');
                  }

                  if (saveWarning) {
                    setSaveWarning('');
                  }
                }}
                disabled={isScanning}
                autoComplete="off"
                spellCheck="false"
              />

              {urlInput && !isScanning && (
                <button
                  type="button"
                  className="input-clear-btn"
                  onClick={handleClear}
                  title="Clear input"
                >
                  ×
                </button>
              )}

            </div>

            {validationError && (
              <div className="validation-error-message animate-fade-in">
                ⚠️ {validationError}
              </div>
            )}

          </div>

          {/* ==================================================
              ACTION BAR
          ================================================== */}

          <div className="scanner-actions-bar">

            <button
              type="submit"
              className="btn btn-primary btn-lg scan-submit-btn"
              disabled={isScanning}
            >

              {isScanning ? (
                <>
                  <span className="spinner-border" />

                  <span>
                    Analyzing with LinkSentry V3.3...
                  </span>
                </>
              ) : (
                <>
                  <span>
                    ⚡ Scan URL Now
                  </span>
                </>
              )}

            </button>

            {/* =================================================
                PRESETS
            ================================================= */}

            <div className="preset-quick-group">

              <span className="preset-label">
                Test Presets:
              </span>

              <div className="preset-chips">

                {PRESET_SAMPLES.urls.map(
                  (preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`preset-chip chip-${preset.type.toLowerCase()}`}
                      onClick={() =>
                        handlePresetSelect(preset)
                      }
                      disabled={isScanning}
                    >
                      {preset.label}
                    </button>
                  )
                )}

              </div>

            </div>

          </div>

        </form>

      </div>

      {/* ======================================================
          SCANNING ANIMATION
      ====================================================== */}

      {isScanning && (
        <div className="cyber-card scanning-in-progress animate-pulse">

          <div className="scanning-radar-container">
            <div className="scanning-radar-sweep" />
            <div className="scanning-radar-grid" />
            <div className="scanning-radar-crosshair" />
          </div>

          <div className="scanning-status-texts font-mono">

            <p className="status-primary-text">
              INSPECTING TARGET: {urlInput}
            </p>

            <p className="status-sub-text">
              Querying LinkSentry V3.3 •
              Running ML classifier •
              Checking trusted domains •
              Detecting typosquatting •
              Applying decision-fusion rules...
            </p>

          </div>

        </div>
      )}

      {/* ======================================================
          FIRESTORE WARNING
      ====================================================== */}

      {saveWarning && (
        <div
          className="auth-error-alert animate-fade-in"
          style={{
            borderColor: 'rgba(234, 179, 8, 0.4)',
            background: 'rgba(234, 179, 8, 0.1)',
            color: '#fef08a',
            marginBottom: '1rem',
          }}
          role="alert"
        >
          <span className="error-icon">
            ⚠️
          </span>

          <span className="error-text">
            {saveWarning}
          </span>
        </div>
      )}

      {/* ======================================================
          RESULT
      ====================================================== */}

      {scanResult && !isScanning && (
        <ScanResultCard
          resultData={scanResult}
          scanType="URL"
          onReset={handleClear}
        />
      )}

      {/* ======================================================
          EMPTY STATE
      ====================================================== */}

      {!scanResult && !isScanning && (
        <div className="cyber-card scanner-guide-card">

          <h3 className="guide-title">
            How LinkSentry Analyzes URLs
          </h3>

          <div className="guide-grid">

            <div className="guide-item">

              <div className="guide-step-num font-mono">
                01
              </div>

              <h4>
                URL Structure & Typosquatting
              </h4>

              <p>
                Detects suspicious hostname
                structures, typo-squatted domains,
                impersonation attempts,
                suspicious TLDs, and deceptive
                URL patterns.
              </p>

            </div>

            <div className="guide-item">

              <div className="guide-step-num font-mono">
                02
              </div>

              <h4>
                Trusted-Domain Verification
              </h4>

              <p>
                Checks the registrable domain
                against the LinkSentry trusted-domain
                layer while preserving protection
                against deceptive domains.
              </p>

            </div>

            <div className="guide-item">

              <div className="guide-step-num font-mono">
                03
              </div>

              <h4>
                V3.3 ML Threat Classification
              </h4>

              <p>
                Uses the LinkSentry LinearSVC
                classifier with hard-negative
                training and decision-fusion rules
                to determine the final verdict.
              </p>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}