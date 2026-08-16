import { useState } from 'react';
import ScanResultCard from '../../components/ScanResultCard';
import { PRESET_SAMPLES } from '../../data/mockData';
import { useAuth, useTheme } from '../../context';
import { saveScan, mapBackendScanToFirestoreDoc } from '../../firebase';
import { API_BASE_URL } from '../../config/api';
import { saveLocalScan, createLocalTimestamp } from '../../utils/localHistory';

export default function MessageScanner() {
  const { currentUser } = useAuth();
  const { securityPreferences } = useTheme();
  const [messageText, setMessageText] = useState('');
  const [validationError, setValidationError] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const validateMessage = (text) => {
    if (!text || !text.trim()) {
      return 'Please enter a message or SMS payload to analyze.';
    }
    return '';
  };

  const handleScan = async (e) => {
    e?.preventDefault();
    const error = validateMessage(messageText);
    if (error) {
      setValidationError(error);
      setScanResult(null);
      return;
    }

    const payloadText = messageText.trim();
    setValidationError('');
    setSaveWarning('');
    setIsScanning(true);
    setScanResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/scan/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: payloadText }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.verdict === 'invalid') {
        const errorMsg = Array.isArray(data.indicators) && data.indicators.length > 0
          ? data.indicators.join(', ')
          : 'Invalid message content provided.';
        setValidationError(errorMsg);
        setScanResult(null);
        return;
      }

      const rawVerdict = typeof data.verdict === 'string' ? data.verdict : 'safe';
      const formattedVerdict = rawVerdict.charAt(0).toUpperCase() + rawVerdict.slice(1);

      const details = {
        detectionEngine: data.engine || 'LinkSentry Multi-Signal Message Threat Engine V3.3',
        threatIndicators: Array.isArray(data.indicators) && data.indicators.length > 0
          ? data.indicators
          : ['No threat indicators detected'],
        messageRiskScore: typeof data.message_risk === 'number' ? `${data.message_risk} / 100` : undefined,
        embeddedUrls: Array.isArray(data.embedded_urls) && data.embedded_urls.length > 0
          ? data.embedded_urls
          : undefined,
        extractedPhoneNumbers: Array.isArray(data.extracted_phone_numbers) && data.extracted_phone_numbers.length > 0
          ? data.extracted_phone_numbers.join(', ')
          : undefined,
        analyzedLength: `${data.message?.length || payloadText.length} characters`,
      };

      const confidenceDisplay = typeof data.confidence === 'number'
        ? `${Math.round(data.confidence * 100)}%`
        : '85%';

      const targetSnippet = payloadText.length > 75
        ? `${payloadText.slice(0, 75)}...`
        : payloadText;

      // 1. Render ScanResultCard with multi-signal evidence
      setScanResult({
        target: `Message: "${targetSnippet}"`,
        verdict: formattedVerdict,
        riskScore: typeof data.risk_score === 'number' ? data.risk_score : 0,
        confidence: confidenceDisplay,
        details,
        timestamp: new Date().toLocaleTimeString(),
      });

      // 2. Persist successful scan to Cloud Firestore under authenticated user
      // Persist scan: ALWAYS to local history
      const scanDoc = mapBackendScanToFirestoreDoc(
        currentUser?.uid || 'anonymous',
        payloadText,
        data,
        'message'
      );
      scanDoc.createdAt = createLocalTimestamp();
      scanDoc.isLocalOnly = securityPreferences?.cloudSync === false || !currentUser?.uid;

      saveLocalScan(currentUser?.uid || 'anonymous', scanDoc);

      // Persist to Cloud Firestore (if authenticated and Cloud Sync is ON)
      if (currentUser?.uid && securityPreferences?.cloudSync !== false) {
        try {
          await saveScan(currentUser.uid, scanDoc);
          console.log('[LinkSentry] Message scan synchronized to Cloud Firestore.');
        } catch (saveErr) {
          console.error('Cloud Firestore Message scan save error:', saveErr);
          setSaveWarning('Message scan stored locally, but cloud synchronization failed.');
        }
      }
    } catch (err) {
      console.error('Message threat scan backend error:', err);
      setValidationError('Unable to connect to LinkSentry backend.');
      setScanResult(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePresetSelect = (preset) => {
    setMessageText(preset.text);
    setValidationError('');
    setSaveWarning('');
    setScanResult(null);
  };

  const handleClear = () => {
    setMessageText('');
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
              <span className="scanner-icon">💬</span> SMS & Message Phishing (Smishing) Scanner
            </h2>
            <p className="scanner-description">
              Paste suspicious SMS text messages, loan offers, WhatsApp alerts, or email bodies to evaluate multi-signal social engineering tactics, urgency levels, and embedded threat links.
            </p>
          </div>
          <span className="font-mono scanner-mode-pill">MULTI-SIGNAL FUSION • CLOUD SYNCHRONIZED</span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleScan} className="scan-form">
          <div className="form-group">
            <div className="message-label-row">
              <label htmlFor="message-input" className="form-label">
                Paste Message Body
              </label>
              <span className="character-counter font-mono">
                {messageText.length} characters
              </span>
            </div>
            <textarea
              id="message-input"
              className={`form-textarea font-mono ${validationError ? 'input-error' : ''}`}
              placeholder="Paste SMS content, loan solicitation, WhatsApp alert, or email body here..."
              rows={5}
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                if (validationError) setValidationError('');
              }}
              disabled={isScanning}
              data-testid="message-input"
            />
            {validationError && (
              <div className="validation-error-message animate-fade-in" data-testid="message-validation-error">
                ⚠️ {validationError}
              </div>
            )}
          </div>

          <div className="scanner-actions-bar">
            <div className="action-buttons-group">
              <button
                type="submit"
                className="btn btn-primary btn-lg scan-submit-btn"
                disabled={isScanning || !messageText.trim()}
                data-testid="message-scan-submit"
              >
                {isScanning ? (
                  <>
                    <span className="spinner-border" />
                    <span>Evaluating Multi-Signal Threat Evidence...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Analyze Message Threat</span>
                  </>
                )}
              </button>

              {messageText && !isScanning && (
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  onClick={handleClear}
                  data-testid="message-scan-clear"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Test Presets */}
            <div className="preset-quick-group">
              <span className="preset-label">Sample Threat Messages:</span>
              <div className="preset-chips">
                {PRESET_SAMPLES.messages.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`preset-chip chip-${preset.type.toLowerCase()}`}
                    onClick={() => handlePresetSelect(preset)}
                    disabled={isScanning}
                    data-testid={`preset-message-${idx}`}
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
            <p className="status-primary-text">EVALUATING MESSAGE INTENT & THREAT SIGNALS...</p>
            <p className="status-sub-text">
              Querying FastAPI V3.3 threat engine • Detecting smishing heuristics • Detonating embedded URLs...
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

      {/* Results Display */}
      {scanResult && !isScanning && (
        <ScanResultCard
          resultData={scanResult}
          scanType="Message / SMS"
          onReset={handleClear}
        />
      )}

      {/* Smishing Education Guide */}
      {!scanResult && !isScanning && (
        <div className="cyber-card scanner-guide-card">
          <h3 className="guide-title">How LinkSentry Multi-Signal Engine Detects Threats</h3>
          <div className="guide-grid">
            <div className="guide-item">
              <div className="guide-step-num font-mono">01</div>
              <h4>Urgency & Financial Scam Lures</h4>
              <p>Detects pre-approved instant loan scams, unauthorized debit alerts, and aggressive deadline coercions.</p>
            </div>
            <div className="guide-item">
              <div className="guide-step-num font-mono">02</div>
              <h4>Brand Impersonation Signatures</h4>
              <p>Flags spoofed banking, carrier, and government communication patterns paired with unverified contact points.</p>
            </div>
            <div className="guide-item">
              <div className="guide-step-num font-mono">03</div>
              <h4>Embedded Threat Link Detonation</h4>
              <p>Isolates and inspects every embedded URL through the LinkSentry V3.3 ML & rule-fusion engine.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
