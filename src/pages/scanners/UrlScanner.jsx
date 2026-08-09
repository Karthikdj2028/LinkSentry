import { useState } from 'react';
import ScanResultCard from '../../components/ScanResultCard';
import { PRESET_SAMPLES } from '../../data/mockData';

/**
 * URL Scanner Component
 * Handles URL phishing detection interface, validation, mock analysis, and result presentation
 * 
 * TODO: Connect to backend API / Firebase Functions in Stage 2
 * TODO: Integrate ML URL phishing classification model in Stage 3
 */
export default function UrlScanner() {
  const [urlInput, setUrlInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Validate URL format
  const validateUrl = (value) => {
    if (!value || value.trim() === '') {
      return 'Please enter a URL to scan.';
    }
    const trimmed = value.trim();
    // Basic regex check for URL / domain format
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i;
    if (!urlPattern.test(trimmed) && !trimmed.includes('localhost')) {
      return 'Please enter a valid URL or domain (e.g., https://example.com or example.com/path).';
    }
    return '';
  };

  const handleScan = (e) => {
    e?.preventDefault();
    const error = validateUrl(urlInput);
    if (error) {
      setValidationError(error);
      setScanResult(null);
      return;
    }

    setValidationError('');
    setIsScanning(true);
    setScanResult(null);

    // Mock scan latency simulation
    // TODO: Replace with real POST request: await fetch('/api/v1/scan/url', { body: JSON.stringify({ url: urlInput }) })
    setTimeout(() => {
      const lower = urlInput.toLowerCase();
      let verdict = 'Safe';
      let riskScore = 8;
      let details = {
        domainAge: '8+ years old',
        sslValid: true,
        typosquatting: 'None detected',
        ipCountry: 'US (Verified ASN)',
        threatClassification: 'Legitimate Web Resource',
        dnsRecords: 'A, AAAA, MX, TXT (Verified)',
        phishingPatternConfidence: '99.1%'
      };

      if (lower.includes('phish') || lower.includes('chase-bank') || lower.includes('auth-check') || lower.includes('.xyz') || lower.includes('dispute')) {
        verdict = 'Phishing';
        riskScore = 96;
        details = {
          domainAge: '2 days old (High Risk)',
          sslValid: false,
          typosquatting: 'Deceptive Chase Bank Impersonation',
          ipCountry: 'RU (High-Risk Offshore Host)',
          threatClassification: 'Active Credential Harvester',
          dnsRecords: 'Fast-flux DNS rotation detected',
          phishingPatternConfidence: '99.8%'
        };
      } else if (lower.includes('suspicious') || lower.includes('verify') || lower.includes('login-verify') || lower.includes('.top') || lower.includes('.info')) {
        verdict = 'Suspicious';
        riskScore = 65;
        details = {
          domainAge: '14 days old',
          sslValid: false,
          typosquatting: 'Generic account security lure pattern',
          ipCountry: 'PA (Privacy Protected Registrar)',
          threatClassification: 'Untrusted Domain / Unverified SSL',
          dnsRecords: 'Standard DNS without SPF/DKIM',
          phishingPatternConfidence: '84.2%'
        };
      }

      setScanResult({
        target: urlInput.trim(),
        verdict,
        riskScore,
        confidence: details.phishingPatternConfidence,
        details,
        timestamp: new Date().toLocaleTimeString()
      });
      setIsScanning(false);
    }, 1200);
  };

  const handlePresetSelect = (preset) => {
    setUrlInput(preset.url);
    setValidationError('');
    setScanResult(null);
  };

  const handleClear = () => {
    setUrlInput('');
    setValidationError('');
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
          <span className="font-mono scanner-mode-pill">STAGE 1: HEURISTIC MOCK</span>
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
                  <span>Analyzing Heuristics & Signatures...</span>
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
              Checking DNS records • SSL certificate verification • Lexical & Typosquatting heuristic analysis...
            </p>
          </div>
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
