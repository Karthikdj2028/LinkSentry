import { useState } from 'react';
import ScanResultCard from '../../components/ScanResultCard';
import { PRESET_SAMPLES } from '../../data/mockData';
import { useAuth } from '../../context';
import { saveScan, mapBackendScanToFirestoreDoc } from '../../firebase';

// Backend API configuration from environment with local development fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * URL Scanner Component
 * Handles URL phishing detection interface, input validation, real HTTP API requests to FastAPI,
 * and saving scan results into Cloud Firestore scan history for authenticated users.
 */
export default function UrlScanner() {
  const { currentUser } = useAuth();
  const [urlInput, setUrlInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Validate URL input
  const validateUrl = (value) => {
    if (!value || value.trim() === '') {
      return 'Please enter a URL to scan.';
    }
    return '';
  };

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
      const response = await fetch(`${API_BASE_URL}/api/scan/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response received from LinkSentry backend.');
      }

      // Handle backend-reported invalid URL verdict
      if (data.verdict === 'invalid') {
        const errorMsg = Array.isArray(data.indicators) && data.indicators.length > 0
          ? data.indicators.join(', ')
          : 'Invalid URL format provided.';
        setValidationError(errorMsg);
        setScanResult(null);
        return;
      }

      // Format verdict to Title Case for UI display (safe -> Safe, suspicious -> Suspicious, phishing -> Phishing)
      const rawVerdict = typeof data.verdict === 'string' ? data.verdict : 'safe';
      const formattedVerdict = rawVerdict.charAt(0).toUpperCase() + rawVerdict.slice(1);

      // Build structured details mapping from FastAPI backend response
      const details = {
        domain: data.domain || 'N/A',
        detectionEngine: data.engine || 'LinkSentry Rule-Based Detector',
        threatIndicators: Array.isArray(data.indicators) && data.indicators.length > 0
          ? data.indicators
          : ['No threat indicators detected'],
        sslStatus: (data.url || targetUrl).startsWith('https://')
          ? 'HTTPS Enabled (Encrypted)'
          : 'HTTP Only (Unencrypted / Insecure)',
      };

      const confidenceDisplay = typeof data.confidence === 'number'
        ? `${Math.round(data.confidence * 100)}%`
        : '70%';

      // 1. Display scan result to user
      setScanResult({
        target: data.url || targetUrl,
        verdict: formattedVerdict,
        riskScore: typeof data.risk_score === 'number' ? data.risk_score : 0,
        confidence: confidenceDisplay,
        details,
        timestamp: new Date().toLocaleTimeString(),
      });

      // 2. Save scan result to Cloud Firestore history for authenticated user
      if (currentUser?.uid) {
        try {
          const firestorePayload = mapBackendScanToFirestoreDoc(
            currentUser.uid,
            targetUrl,
            data,
            'url'
          );
          await saveScan(currentUser.uid, firestorePayload);
        } catch (saveErr) {
          console.error('Cloud Firestore scan save error:', saveErr);
          setSaveWarning('Scan completed, but the result could not be saved to history.');
        }
      }
    } catch (err) {
      console.error('URL scan error:', err);
      setValidationError('Unable to connect to LinkSentry backend.');
      setScanResult(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePresetSelect = (preset) => {
    setUrlInput(preset.url);
    setValidationError('');
    setSaveWarning('');
    setScanResult(null);
  };

  const handleClear = () => {
    setUrlInput('');
    setValidationError('');
    setSaveWarning('');
    setScanResult(null);
  };

  return (
    <div className="scanner-tab-content">
      {/* Scanner Control Box */}
      <div className="cyber-card scanner-box">
        <div className="scanner-header-row">
          <div className="scanner-title-group">
            <h2 className="scanner-title">
              <span className="scanner-icon">🌐</span> Advanced URL Phishing Scanner
            </h2>
            <p className="scanner-description">
              Analyze suspicious links, shortened URLs, brand impersonations, and credential harvesting kits in real-time.
            </p>
          </div>
          <span className="font-mono scanner-mode-pill">STAGE 3: FASTAPI + FIRESTORE</span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleScan} className="scan-form">
          <div className="form-group">
            <label htmlFor="url-input" className="form-label">
              Target URL or Domain Name
            </label>
            <div className="input-with-button-wrapper">
              <div className="input-icon-prefix">🔗</div>
              <input
                id="url-input"
                type="text"
                className={`form-input font-mono ${validationError ? 'input-error' : ''}`}
                placeholder="https://example.com/login or paste suspicious link..."
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (validationError) setValidationError('');
                  if (saveWarning) setSaveWarning('');
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
                  ✕
                </button>
              )}
            </div>
            {validationError && (
              <div className="validation-error-message animate-fade-in">
                ⚠️ {validationError}
              </div>
            )}
          </div>

          <div className="scanner-actions-bar">
            <button
              type="submit"
              className="btn btn-primary btn-lg scan-submit-btn"
              disabled={isScanning}
            >
              {isScanning ? (
                <>
                  <span className="spinner-border" />
                  <span>Connecting to FastAPI Backend...</span>
                </>
              ) : (
                <>
                  <span>⚡ Scan URL Now</span>
                </>
              )}
            </button>

            {/* Quick Test Presets */}
            <div className="preset-quick-group">
              <span className="preset-label">Test Presets:</span>
              <div className="preset-chips">
                {PRESET_SAMPLES.urls.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`preset-chip chip-${preset.type.toLowerCase()}`}
                    onClick={() => handlePresetSelect(preset)}
                    disabled={isScanning}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Scanning In-Progress Animation */}
      {isScanning && (
        <div className="cyber-card scanning-in-progress animate-pulse">
          <div className="scanning-radar-container">
            <div className="scanning-radar-sweep" />
            <div className="scanning-radar-grid" />
            <div className="scanning-radar-crosshair" />
          </div>
          <div className="scanning-status-texts font-mono">
            <p className="status-primary-text">INSPECTING TARGET: {urlInput}</p>
            <p className="status-sub-text">
              Querying FastAPI detection engine • Evaluating URL lexical rules • Analyzing heuristics & threat indicators...
            </p>
          </div>
        </div>
      )}

      {/* Firestore Save Warning Banner (Non-blocking) */}
      {saveWarning && (
        <div 
          className="auth-error-alert animate-fade-in" 
          style={{ 
            borderColor: 'rgba(234, 179, 8, 0.4)', 
            background: 'rgba(234, 179, 8, 0.1)', 
            color: '#fef08a',
            marginBottom: '1rem'
          }}
          role="alert"
        >
          <span className="error-icon">⚠️</span>
          <span className="error-text">{saveWarning}</span>
        </div>
      )}

      {/* Scan Results Display */}
      {scanResult && !isScanning && (
        <ScanResultCard
          resultData={scanResult}
          scanType="URL"
          onReset={handleClear}
        />
      )}

      {/* Empty State / Instructional Guide */}
      {!scanResult && !isScanning && (
        <div className="cyber-card scanner-guide-card">
          <h3 className="guide-title">How LinkSentry Analyzes URLs</h3>
          <div className="guide-grid">
            <div className="guide-item">
              <div className="guide-step-num font-mono">01</div>
              <h4>Lexical & Homoglyph Checks</h4>
              <p>Detects Unicode lookalike letters (e.g. Cyrillic 'a'), typo-squatted domains, and excessive subdomains.</p>
            </div>
            <div className="guide-item">
              <div className="guide-step-num font-mono">02</div>
              <h4>Certificate & Domain Age</h4>
              <p>Evaluates SSL issuer reputation, newly registered domain (NRD) risks, and fast-flux DNS patterns.</p>
            </div>
            <div className="guide-item">
              <div className="guide-step-num font-mono">03</div>
              <h4>Deep AI Threat Classification</h4>
              <p>Categorizes potential targets against real-time phishing kits, credential harvesting pages, and malware vectors.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
